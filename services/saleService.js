// server/services/saleService.js

const Decimal = require("decimal.js");
const Sale = require("../models/Sale");
const Product = require("../models/Product");
const StockMovement = require("../models/StockMovement");
const StockService = require("./stockService");

class SaleService {
  /**
   * Helper: Calculate totals & map exact fields expected by Mongoose Schema
   */
  calculateTotals(items = [], taxRate = 0, discountAmount = 0) {
    let subtotal = new Decimal(0);

    const processedItems = items.map((item) => {
      // Rates, Quantities aur Amounts ki Fallbacks
      const qtyVal = item.quantity ?? item.qty ?? 0;
      const rateVal = item.rate ?? item.unitPrice ?? item.price ?? 0;
      const itemDiscountVal = item.discount ?? 0;

      const qty = new Decimal(qtyVal);
      const rate = new Decimal(rateVal);
      const itemDiscount = new Decimal(itemDiscountVal);

      // Line Total (Amount) = (Rate * Quantity) - Item Discount
      const lineTotal = rate.times(qty).minus(itemDiscount);
      subtotal = subtotal.plus(lineTotal);

      // IMPORTANT: Schema ke required fields exact name ke saath return karein
      return {
        product: item.product || item.productId || item._id,
        productName: item.productName || item.name || "Product", // Required by Schema
        stockType: item.stockType || "Local",                  // Required by Schema (Local / Imported)
        quantity: qty.toNumber(),
        rate: rate.toNumber(),                                 // Required by Schema (unitPrice ki jagah rate)
        amount: lineTotal.toNumber(),                          // Required by Schema (totalPrice ki jagah amount)
        discount: itemDiscount.toNumber(),
      };
    });

    const safeTaxRate = new Decimal(taxRate || 0);
    const safeDiscount = new Decimal(discountAmount || 0);

    const tax = subtotal.times(safeTaxRate).dividedBy(100);
    const grandTotal = subtotal.plus(tax).minus(safeDiscount);

    return {
      items: processedItems,
      subtotal: subtotal.toNumber(),
      tax: tax.toNumber(),
      discountAmount: safeDiscount.toNumber(),
      grandTotal: grandTotal.toNumber(),
    };
  }

  /**
   * Read-only pre-check: does each product have enough stock in the
   * requested bucket (Local/Imported)? This is NOT stock mutation logic —
   * it only reads Product balances so we can fail fast with a clear error
   * before creating a Sale/touching StockService. The authoritative
   * mutation + balance math still lives entirely in StockService.
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

      const bucket = item.stockType === "Imported" ? "importedStock" : "localStock";
      const available = product[bucket] || 0;

      if (available < item.quantity) {
        throw new Error(
          `Insufficient ${item.stockType || "Local"} stock for "${product.productName}". ` +
          `Available: ${available}, Requested: ${item.quantity}`
        );
      }
    }
  }

  /**
   * Deduct stock for every sale item via StockService (single source of
   * truth for inventory). Returns the list of created movement ids so the
   * caller can compensate (reverse) if a later item in the loop fails.
   */
  async applyStockForItems(items, { referenceId, remarks, userId }) {
    const completedMovementIds = [];

    try {
      for (const item of items) {
        if (!item.product) continue;

        const { movement } = await StockService.sellStock({
          productId: item.product,
          quantity: item.quantity,
          stockType: item.stockType,
          referenceType: "Sale",
          referenceId,
          remarks,
          userId,
        });

        completedMovementIds.push(movement._id);
      }
    } catch (error) {
      // Compensate: undo whatever stock movements already succeeded in
      // this loop before propagating the error.
      await this.reverseMovementsById(completedMovementIds, userId, "Auto-reversal: sale stock update failed");
      throw error;
    }

    return completedMovementIds;
  }

  async reverseMovementsById(movementIds = [], userId, remarks) {
    for (const movementId of movementIds) {
      try {
        await StockService.reverseMovement({ movementId, remarks, userId });
      } catch (reverseError) {
        // Log and continue — we still want to attempt reversing the rest.
        console.error(`Failed to reverse stock movement ${movementId}:`, reverseError.message);
      }
    }
  }

  /**
   * Find the active stock movements originally created for this sale, so
   * we can properly reverse them via StockService (instead of guessing at
   * quantities or touching Product directly).
   */
  async getActiveMovementsForSale(saleId) {
    return StockMovement.find({
      referenceId: saleId,
      status: "Active",
      isDeleted: false,
    });
  }

  async getSales(query = {}) {
    const { search, limit = 50, page = 1 } = query;
    let filter = {};

    if (search) {
      filter.$or = [{ invoiceNumber: { $regex: search, $options: "i" } }];
    }

    const sales = await Sale.find(filter)
      .populate("client", "clientName name phone email")
      .populate("items.product", "name sku price")
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    return sales;
  }

  async getSaleById(id) {
    const sale = await Sale.findById(id)
      .populate("client")
      .populate("items.product");

    if (!sale) {
      throw new Error("Sale record not found");
    }
    return sale;
  }

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

    // 1. Process items with schema validation fields
    const {
      items: calculatedItems,
      subtotal,
      tax,
      grandTotal,
    } = this.calculateTotals(items, taxRate, discountAmount);

    // 2. Check stock availability BEFORE creating the sale
    await this.validateStockAvailability(calculatedItems);

    const paid = new Decimal(paidAmount || 0);
    const remainingBalance = new Decimal(grandTotal).minus(paid).toNumber();

    let paymentStatus = "Unpaid";
    if (paid.greaterThanOrEqualTo(grandTotal) && grandTotal > 0) {
      paymentStatus = "Paid";
    } else if (paid.greaterThan(0)) {
      paymentStatus = "Partial";
    }

    const invoiceNumber =
      saleData.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`;

    // 3. Create the Sale record
    const sale = await Sale.create({
      invoiceNumber,
      client,
      items: calculatedItems,
      subtotal,
      tax,
      taxRate,
      discountAmount,
      grandTotal,
      paidAmount: paid.toNumber(),
      remainingBalance,
      paymentStatus,
      paymentMethod,
      invoiceDate: invoiceDate || new Date(),
      notes,
      createdBy,
    });

    // 4. Reduce stock for each item via StockService (creates the
    //    StockMovement + updates Product.local/imported/currentStock).
    //    If any item fails, already-applied movements are reversed and the
    //    sale is rolled back so we never end up with a Sale that doesn't
    //    match actual inventory.
    try {
      await this.applyStockForItems(calculatedItems, {
        referenceId: sale._id,
        remarks: `Sale ${invoiceNumber}`,
        userId: createdBy,
      });
    } catch (error) {
      await Sale.findByIdAndDelete(sale._id);
      throw error;
    }

    return sale;
  }

  async updateSale(id, updateData, userId) {
    const existingSale = await Sale.findById(id);
    if (!existingSale) {
      throw new Error("Sale not found to update");
    }

    const {
      items = existingSale.items,
      taxRate = existingSale.taxRate,
      discountAmount = existingSale.discountAmount,
      paidAmount = existingSale.paidAmount,
    } = updateData;

    const {
      items: calculatedItems,
      subtotal,
      tax,
      grandTotal,
    } = this.calculateTotals(items, taxRate, discountAmount);

    // 1. Reverse the stock effect of the sale's CURRENT items first, so
    //    availability is checked against true, un-reserved stock.
    const previousMovements = await this.getActiveMovementsForSale(id);
    const previousMovementIds = previousMovements.map((m) => m._id);

    await this.reverseMovementsById(
      previousMovementIds,
      userId,
      `Reversal for sale update (${existingSale.invoiceNumber})`
    );

    // 2. Validate the NEW items against now-restored stock.
    try {
      await this.validateStockAvailability(calculatedItems);
    } catch (validationError) {
      // Put the old stock deduction back exactly as it was, since we
      // can't proceed with the update.
      await this.applyStockForItems(existingSale.items, {
        referenceId: existingSale._id,
        remarks: `Re-applied after failed update (${existingSale.invoiceNumber})`,
        userId,
      });
      throw validationError;
    }

    const paid = new Decimal(paidAmount || 0);
    const remainingBalance = new Decimal(grandTotal).minus(paid).toNumber();

    let paymentStatus = "Unpaid";
    if (paid.greaterThanOrEqualTo(grandTotal) && grandTotal > 0) {
      paymentStatus = "Paid";
    } else if (paid.greaterThan(0)) {
      paymentStatus = "Partial";
    }

    // 3. Apply stock for the NEW items.
    try {
      await this.applyStockForItems(calculatedItems, {
        referenceId: existingSale._id,
        remarks: `Sale update (${existingSale.invoiceNumber})`,
        userId,
      });
    } catch (stockError) {
      // Best-effort: restore the original stock state so inventory isn't
      // left short, then surface the error without saving the update.
      await this.applyStockForItems(existingSale.items, {
        referenceId: existingSale._id,
        remarks: `Re-applied after failed update (${existingSale.invoiceNumber})`,
        userId,
      });
      throw stockError;
    }

    const updatedSale = await Sale.findByIdAndUpdate(
      id,
      {
        ...updateData,
        items: calculatedItems,
        subtotal,
        tax,
        grandTotal,
        paidAmount: paid.toNumber(),
        remainingBalance,
        paymentStatus,
        updatedBy: userId,
      },
      { new: true }
    );

    return updatedSale;
  }

  async cancelSale(id, userId) {
    const sale = await Sale.findById(id);
    if (!sale) {
      throw new Error("Sale not found");
    }

    // Reverse every active stock movement tied to this sale via
    // StockService (restores localStock/importedStock/currentStock and
    // writes the reversal StockMovement entry).
    const movements = await this.getActiveMovementsForSale(id);
    await this.reverseMovementsById(
      movements.map((m) => m._id),
      userId,
      `Sale cancelled (${sale.invoiceNumber})`
    );

    await Sale.findByIdAndDelete(id);
    return sale;
  }

  async getInvoice(id) {
    return await this.getSaleById(id);
  }
}

module.exports = new SaleService();