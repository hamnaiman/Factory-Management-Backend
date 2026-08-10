// server/services/saleService.js

const mongoose = require("mongoose");
const Decimal = require("decimal.js");
const Sale = require("../models/Sale");
const Product = require("../models/Product");
const Purchase = require("../models/Purchase");
const StockMovement = require("../models/StockMovement");
const StockService = require("./stockService");

/**
 * Convert any incoming value (undefined, null, "", NaN, string, etc.)
 * into a safe finite number. Prevents `new Decimal(undefined)` crashes.
 */
const toSafeNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

class SaleService {
  /**
   * Calculate the historical, weighted-average purchase cost for a set of
   * products, based on existing Purchase records:
   *
   *   averageCost = (sum of lineTotal) / (sum of quantity)
   *
   * This is computed once per sale (at the moment the sale is created or
   * updated) and then stored on the sale item itself (costRate/costAmount),
   * so later purchase price changes never retroactively change historical
   * profit. If a product has no purchase history yet, cost defaults to 0.
   */
  async getAverageCostMap(productIds = []) {
    if (!productIds.length) return {};

    const rows = await Purchase.aggregate([
      { $match: { status: "Completed" } },
      { $unwind: "$items" },
      { $match: { "items.product": { $in: productIds } } },
      {
        $group: {
          _id: "$items.product",
          totalQty: { $sum: "$items.quantity" },
          totalCost: { $sum: "$items.lineTotal" },
        },
      },
    ]);

    const map = {};
    for (const row of rows) {
      map[row._id.toString()] =
        row.totalQty > 0 ? row.totalCost / row.totalQty : 0;
    }
    return map;
  }

  /**
   * Calculate totals & map exact fields expected by Mongoose Schema
   */
  async calculateTotals(items = [], taxRate = 0, discountAmount = 0) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error("At least one sale item is required.");
    }

    // Resolve all products used in this sale in one query.
    const productIds = items.map(
      (item) => item.product || item.productId || item._id
    );

    const products = await Product.find({
      _id: { $in: productIds },
      isDeleted: false,
      status: "active",
    }).select("productName color");

    const productMap = {};
    products.forEach((product) => {
      productMap[product._id.toString()] = product;
    });

    // Resolve historical average cost for every product in one query.
    const objectIds = productIds.map(
      (id) => new mongoose.Types.ObjectId(id)
    );
    const costMap = await this.getAverageCostMap(objectIds);

    let subtotal = new Decimal(0);
    let totalCost = new Decimal(0);

    const processedItems = [];

    for (const item of items) {
      const productId = item.product || item.productId || item._id;
      const product = productMap[productId?.toString()];

      if (!product) {
        throw new Error(`Product not found: ${productId}`);
      }

      const qty = new Decimal(
        toSafeNumber(item.quantity ?? item.qty)
      );

      const sellingRate = new Decimal(
        toSafeNumber(item.rate ?? item.unitPrice ?? item.price)
      );

      if (qty.lessThanOrEqualTo(0)) {
        throw new Error(
          `Invalid quantity for "${product.productName}".`
        );
      }

      if (sellingRate.lessThan(0)) {
        throw new Error(
          `Invalid selling rate for "${product.productName}".`
        );
      }

      const costRate = new Decimal(
        toSafeNumber(costMap[productId.toString()])
      );

      const amount = sellingRate.times(qty);
      const costAmount = costRate.times(qty);
      const grossProfit = amount.minus(costAmount);

      subtotal = subtotal.plus(amount);
      totalCost = totalCost.plus(costAmount);

      processedItems.push({
        product: product._id,
        productName: product.productName,
        color: product.color || "",

        quantity: qty.toNumber(),

        // SELLING
        rate: sellingRate.toNumber(),
        amount: amount.toNumber(),

        // COST (snapshotted historical average purchase cost)
        costRate: costRate.toNumber(),
        costAmount: costAmount.toNumber(),

        // PROFIT
        grossProfit: grossProfit.toNumber(),
      });
    }

    const safeTaxRate = new Decimal(toSafeNumber(taxRate));
    const safeDiscount = new Decimal(toSafeNumber(discountAmount));

    const tax = subtotal.times(safeTaxRate).dividedBy(100);
    const grandTotal = subtotal.plus(tax).minus(safeDiscount);

    // Revenue used for profit purposes excludes tax (tax is not income)
    // but does account for the discount given to the customer.
    const netRevenueAfterDiscount = subtotal.minus(safeDiscount);
    const grossProfit = netRevenueAfterDiscount.minus(totalCost);

    return {
      items: processedItems,

      subtotal: subtotal.toNumber(),

      tax: tax.toNumber(),

      discountAmount: safeDiscount.toNumber(),

      grandTotal: grandTotal.toNumber(),

      totalCost: totalCost.toNumber(),

      grossProfit: grossProfit.toNumber(),
    };
  }

  /**
   * Check whether enough TOTAL stock is available.
   *
   * Local / Imported stock concept has been removed.
   * currentStock is now the single source for available stock.
   */
  async validateStockAvailability(items = []) {
    for (const item of items) {
      if (!item.product) continue;

      const product = await Product.findOne({
        _id: item.product,
        isDeleted: false,
      });

      if (!product) {
        throw new Error(`Product not found: ${item.product}`);
      }

      const available = toSafeNumber(product.currentStock);
      const requested = toSafeNumber(item.quantity);

      if (requested <= 0) {
        throw new Error(
          `Invalid quantity for "${product.productName}".`
        );
      }

      if (available < requested) {
        throw new Error(
          `Insufficient stock for "${product.productName}". ` +
            `Available: ${available}, Requested: ${requested}`
        );
      }
    }
  }

  /**
   * Deduct stock for every sale item via StockService.
   *
   * StockService is responsible for the actual inventory mutation.
   */
  async applyStockForItems(items, { referenceId, remarks, userId }) {
    const completedMovementIds = [];

    try {
      for (const item of items) {
        if (!item.product) continue;

        const result = await StockService.sellStock({
          productId: item.product,
          quantity: item.quantity,
          referenceType: "Sale",
          referenceId,
          remarks,
          userId,
        });

        if (result?.movement?._id) {
          completedMovementIds.push(result.movement._id);
        }
      }
    } catch (error) {
      // Reverse movements that were already completed
      await this.reverseMovementsById(
        completedMovementIds,
        userId,
        "Auto-reversal: sale stock update failed"
      );

      throw error;
    }

    return completedMovementIds;
  }

  /**
   * Reverse stock movements safely.
   */
  async reverseMovementsById(movementIds = [], userId, remarks) {
    for (const movementId of movementIds) {
      try {
        await StockService.reverseMovement({
          movementId,
          remarks,
          userId,
        });
      } catch (reverseError) {
        console.error(
          `Failed to reverse stock movement ${movementId}:`,
          reverseError.message
        );
      }
    }
  }

  /**
   * Find active stock movements created for a sale.
   */
  async getActiveMovementsForSale(saleId) {
    return StockMovement.find({
      referenceId: saleId,
      status: "Active",
      isDeleted: false,
    });
  }

  /**
   * Get all sales.
   */
  async getSales(query = {}) {
    const { search, limit = 50, page = 1 } = query;

    const filter = {};

    if (search) {
      filter.$or = [
        {
          invoiceNumber: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    const sales = await Sale.find(filter)
      .populate("client", "clientName name phone email")
      .populate(
        "items.product",
        "productName name productCode sku price"
      )
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    return sales;
  }

  /**
   * Get sale by ID.
   */
  async getSaleById(id) {
    const sale = await Sale.findById(id)
      .populate("client")
      .populate("items.product");

    if (!sale) {
      throw new Error("Sale record not found");
    }

    return sale;
  }

  /**
   * Create Sale
   */
  async createSale(saleData) {
    const {
      client,
      items = [],
      taxRate = 0,
      discountAmount = 0,
      paidAmount = 0,
      paymentMethod = "Cash",
      invoiceDate,
      notes,
      createdBy,
    } = saleData;

    // 1. Calculate sale totals (revenue, tax, discount, COGS, gross profit)
    const {
      items: calculatedItems,
      subtotal,
      tax,
      discountAmount: safeDiscountAmount,
      grandTotal,
      totalCost,
      grossProfit,
    } = await this.calculateTotals(items, taxRate, discountAmount);

    // 2. Validate TOTAL stock before creating sale
    await this.validateStockAvailability(calculatedItems);

    const paid = new Decimal(toSafeNumber(paidAmount));

    const remainingBalance = new Decimal(grandTotal)
      .minus(paid)
      .toNumber();

    let paymentStatus = "Unpaid";

    if (paid.greaterThanOrEqualTo(grandTotal) && grandTotal > 0) {
      paymentStatus = "Paid";
    } else if (paid.greaterThan(0)) {
      paymentStatus = "Partial";
    }

    const invoiceNumber =
      saleData.invoiceNumber ||
      `INV-${Date.now().toString().slice(-6)}`;

    // 3. Create Sale
    const sale = await Sale.create({
      invoiceNumber,
      client,

      items: calculatedItems,

      subtotal,
      tax,
      taxRate: toSafeNumber(taxRate),

      discountAmount: safeDiscountAmount,

      grandTotal,

      totalCost,
      grossProfit,

      paidAmount: paid.toNumber(),
      remainingBalance,

      paymentStatus,

      paymentMethod,

      invoiceDate: invoiceDate || new Date(),

      notes,

      createdBy,
    });

    // 4. Deduct stock
    try {
      await this.applyStockForItems(calculatedItems, {
        referenceId: sale._id,
        remarks: `Sale ${invoiceNumber}`,
        userId: createdBy,
      });
    } catch (error) {
      // Sale was created but stock update failed — roll the sale back.
      await Sale.findByIdAndDelete(sale._id);

      throw error;
    }

    return sale;
  }

  /**
   * Update Sale
   *
   * Two distinct cases are handled differently on purpose:
   *
   * 1. ITEMS CHANGED (updateData.items is a real, non-empty array):
   *    Full recalculation — cost is re-derived from current purchase
   *    history, stock movements are reversed and re-applied.
   *
   * 2. ITEMS NOT CHANGED (e.g. a payment-only update that only sends
   *    paidAmount): items, costRate/costAmount and totalCost are left
   *    completely untouched. This is required so that a later purchase
   *    price change — or simply recording a payment — never silently
   *    alters a sale's historical cost/profit. Stock is also left alone,
   *    since quantities didn't change.
   */
  async updateSale(id, updateData, userId) {
    const existingSale = await Sale.findById(id);

    if (!existingSale) {
      throw new Error("Sale not found to update");
    }

    const itemsProvided =
      Array.isArray(updateData.items) && updateData.items.length > 0;

    const taxRate =
      updateData.taxRate !== undefined
        ? updateData.taxRate
        : existingSale.taxRate;

    const discountAmount =
      updateData.discountAmount !== undefined
        ? updateData.discountAmount
        : existingSale.discountAmount;

    const paidAmount =
      updateData.paidAmount !== undefined
        ? updateData.paidAmount
        : existingSale.paidAmount;

    let calculatedItems;
    let subtotal;
    let tax;
    let safeDiscountAmount;
    let grandTotal;
    let totalCost;
    let grossProfit;

    if (itemsProvided) {
      // ---- Full recalculation path (items actually changed) ----

      ({
        items: calculatedItems,
        subtotal,
        tax,
        discountAmount: safeDiscountAmount,
        grandTotal,
        totalCost,
        grossProfit,
      } = await this.calculateTotals(
        updateData.items,
        taxRate,
        discountAmount
      ));

      // 1. Get existing stock movements
      const previousMovements = await this.getActiveMovementsForSale(id);

      const previousMovementIds = previousMovements.map(
        (movement) => movement._id
      );

      // 2. Restore old sale stock
      await this.reverseMovementsById(
        previousMovementIds,
        userId,
        `Reversal for sale update (${existingSale.invoiceNumber})`
      );

      // 3. Validate new stock
      try {
        await this.validateStockAvailability(calculatedItems);
      } catch (validationError) {
        // Restore old sale stock if validation fails
        await this.applyStockForItems(existingSale.items, {
          referenceId: existingSale._id,
          remarks: `Re-applied after failed update (${existingSale.invoiceNumber})`,
          userId,
        });

        throw validationError;
      }

      // 4. Apply new stock
      try {
        await this.applyStockForItems(calculatedItems, {
          referenceId: existingSale._id,
          remarks: `Sale update (${existingSale.invoiceNumber})`,
          userId,
        });
      } catch (stockError) {
        // Restore old stock if new stock update fails
        await this.applyStockForItems(existingSale.items, {
          referenceId: existingSale._id,
          remarks: `Re-applied after failed update (${existingSale.invoiceNumber})`,
          userId,
        });

        throw stockError;
      }
    } else {
      // ---- Payment / metadata-only path (items untouched) ----
      // Keep the historically stored items and cost exactly as they are.
      // Only re-derive tax/grandTotal/grossProfit from the EXISTING
      // subtotal, in case taxRate or discountAmount changed.

      calculatedItems = existingSale.items;

      const subtotalDecimal = new Decimal(
        toSafeNumber(existingSale.subtotal)
      );
      const totalCostDecimal = new Decimal(
        toSafeNumber(existingSale.totalCost)
      );

      const safeTaxRate = new Decimal(toSafeNumber(taxRate));
      const safeDiscount = new Decimal(toSafeNumber(discountAmount));

      const taxDecimal = subtotalDecimal
        .times(safeTaxRate)
        .dividedBy(100);

      subtotal = subtotalDecimal.toNumber();
      tax = taxDecimal.toNumber();
      safeDiscountAmount = safeDiscount.toNumber();
      grandTotal = subtotalDecimal
        .plus(taxDecimal)
        .minus(safeDiscount)
        .toNumber();
      totalCost = totalCostDecimal.toNumber();
      grossProfit = subtotalDecimal
        .minus(safeDiscount)
        .minus(totalCostDecimal)
        .toNumber();
    }

    const paid = new Decimal(toSafeNumber(paidAmount));

    const remainingBalance = new Decimal(grandTotal)
      .minus(paid)
      .toNumber();

    let paymentStatus = "Unpaid";

    if (paid.greaterThanOrEqualTo(grandTotal) && grandTotal > 0) {
      paymentStatus = "Paid";
    } else if (paid.greaterThan(0)) {
      paymentStatus = "Partial";
    }

    // Update sale record
    const updatedSale = await Sale.findByIdAndUpdate(
      id,
      {
        ...updateData,
        items: calculatedItems,
        subtotal,
        tax,
        taxRate: toSafeNumber(taxRate),
        discountAmount: safeDiscountAmount,
        grandTotal,
        totalCost,
        grossProfit,
        paidAmount: paid.toNumber(),
        remainingBalance,
        paymentStatus,
        updatedBy: userId,
      },
      {
        new: true,
      }
    );

    return updatedSale;
  }

  /**
   * Cancel Sale
   */
  async cancelSale(id, userId) {
    const sale = await Sale.findById(id);

    if (!sale) {
      throw new Error("Sale not found");
    }

    // Restore stock through StockService
    const movements = await this.getActiveMovementsForSale(id);

    await this.reverseMovementsById(
      movements.map((movement) => movement._id),
      userId,
      `Sale cancelled (${sale.invoiceNumber})`
    );

    await Sale.findByIdAndDelete(id);

    return sale;
  }

  // ============================================================
  // GET TOTAL SALES
  // ============================================================

  async getSalesTotal(query = {}) {
    const filter = {
      saleStatus: "Completed",
    };

    // Date filtering
    if (query.fromDate || query.toDate) {
      filter.invoiceDate = {};

      if (query.fromDate) {
        const fromDate = new Date(query.fromDate);
        fromDate.setHours(0, 0, 0, 0);

        filter.invoiceDate.$gte = fromDate;
      }

      if (query.toDate) {
        const toDate = new Date(query.toDate);
        toDate.setHours(23, 59, 59, 999);

        filter.invoiceDate.$lte = toDate;
      }
    }

    const result = await Sale.aggregate([
      {
        $match: filter,
      },
      {
        $group: {
          _id: null,
          totalSales: {
            $sum: "$grandTotal",
          },
          totalCOGS: {
            $sum: "$totalCost",
          },
        },
      },
    ]);

    const totalSales =
      result.length > 0 ? Number(result[0].totalSales || 0) : 0;

    const totalCOGS =
      result.length > 0 ? Number(result[0].totalCOGS || 0) : 0;

    const grossProfit = totalSales - totalCOGS;

    return {
      totalSales,
      totalCOGS,
      grossProfit,
    };
  }

  /**
   * Get Invoice
   */
  async getInvoice(id) {
    return this.getSaleById(id);
  }
}

module.exports = new SaleService();