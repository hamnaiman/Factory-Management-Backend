// server/services/purchaseService.js

const Decimal = require("decimal.js");
const Purchase = require("../models/Purchase");
const Vendor = require("../models/Vendor");
const Product = require("../models/Product");
const StockMovement = require("../models/StockMovement");
const StockService = require("./stockService");
const ApiError = require("../utils/apiError");

/**
 * Calculate line totals + grand total. Pure math, no DB writes, no stock
 * mutation — mirrors SaleService.calculateTotals.
 */
const calculateTotals = (items = []) => {
  let totalAmount = new Decimal(0);

  const processedItems = items.map((item) => {
    const qty = new Decimal(item.quantity ?? 0);
    const rate = new Decimal(item.rate ?? 0);
    const lineTotal = qty.times(rate);
    totalAmount = totalAmount.plus(lineTotal);

    return {
      product: item.product || item.productId,
      productName: item.productName || "Product",
      stockType: item.stockType || "Local",
      quantity: qty.toNumber(),
      rate: rate.toNumber(),
      lineTotal: lineTotal.toNumber(),
    };
  });

  return { items: processedItems, totalAmount: totalAmount.toNumber() };
};

const validatePurchaseInput = ({ vendor, items }) => {
  if (!vendor) {
    throw new ApiError(400, "Vendor is required.");
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, "At least one product item is required.");
  }
  items.forEach((item, idx) => {
    if (!item.product && !item.productId) {
      throw new ApiError(400, `Product is required for item #${idx + 1}.`);
    }
    if (!item.quantity || Number(item.quantity) <= 0) {
      throw new ApiError(400, `Quantity must be greater than 0 for item #${idx + 1}.`);
    }
    if (item.rate === undefined || item.rate === null || Number(item.rate) < 0) {
      throw new ApiError(400, `A valid purchase rate is required for item #${idx + 1}.`);
    }
  });
};

const resolvePaymentStatus = (totalAmount, paidAmount) => {
  const paid = new Decimal(paidAmount || 0);
  if (paid.greaterThanOrEqualTo(totalAmount) && totalAmount > 0) return "Paid";
  if (paid.greaterThan(0)) return "Partial";
  return "Unpaid";
};

/**
 * Apply stock increases for every purchase item via StockService — never
 * mutate Product.currentStock directly here.
 */
const applyStockForItems = async (items, { referenceId, remarks, userId }) => {
  const completedMovementIds = [];

  try {
    for (const item of items) {
      const { movement } = await StockService.purchaseStock({
        productId: item.product,
        quantity: item.quantity,
        stockType: item.stockType,
        referenceType: "Purchase",
        referenceId,
        remarks,
        userId,
      });
      completedMovementIds.push(movement._id);
    }
  } catch (error) {
    await reverseMovementsById(completedMovementIds, userId, "Auto-reversal: purchase stock update failed");
    throw error;
  }

  return completedMovementIds;
};

const reverseMovementsById = async (movementIds = [], userId, remarks) => {
  for (const movementId of movementIds) {
    try {
      await StockService.reverseMovement({ movementId, remarks, userId });
    } catch (reverseError) {
      console.error(`Failed to reverse stock movement ${movementId}:`, reverseError.message);
    }
  }
};

const getActiveMovementsForPurchase = async (purchaseId) => {
  return StockMovement.find({
    referenceId: purchaseId,
    status: "Active",
    isDeleted: false,
  });
};

const createPurchase = async (data) => {
  const {
    vendor,
    items = [],
    invoiceNumber,
    purchaseDate,
    paidAmount = 0,
    notes,
    bill,
    createdBy,
  } = data;

  validatePurchaseInput({ vendor, items });

  const vendorDoc = await Vendor.findById(vendor);
  if (!vendorDoc) {
    throw new ApiError(404, "Vendor not found.");
  }

  // Resolve product names up-front so the record is self-contained even if
  // a product is renamed/deleted later.
  const productIds = items.map((i) => i.product || i.productId);
  const products = await Product.find({ _id: { $in: productIds } }).select("productName");
  const productNameMap = new Map(products.map((p) => [p._id.toString(), p.productName]));

  const itemsWithNames = items.map((item) => ({
    ...item,
    productName: productNameMap.get((item.product || item.productId)?.toString()) || item.productName,
  }));

  const { items: calculatedItems, totalAmount } = calculateTotals(itemsWithNames);
  const paymentStatus = resolvePaymentStatus(totalAmount, paidAmount);
  const remainingBalance = new Decimal(totalAmount).minus(paidAmount || 0).toNumber();

  if (!invoiceNumber || !invoiceNumber.trim()) {
    throw new ApiError(400, "Invoice/bill number is required.");
  }

  const existingInvoice = await Purchase.findOne({ invoiceNumber: invoiceNumber.trim() });
  if (existingInvoice) {
    throw new ApiError(409, `Invoice number "${invoiceNumber}" already exists.`);
  }

  const purchase = await Purchase.create({
    invoiceNumber: invoiceNumber.trim(),
    vendor,
    purchaseDate: purchaseDate || new Date(),
    items: calculatedItems,
    totalAmount,
    paidAmount,
    remainingBalance,
    paymentStatus,
    notes,
    bill: bill || null,
    createdBy,
  });

  try {
    await applyStockForItems(calculatedItems, {
      referenceId: purchase._id,
      remarks: `Purchase ${purchase.invoiceNumber}`,
      userId: createdBy,
    });
  } catch (error) {
    await Purchase.findByIdAndDelete(purchase._id);
    throw error;
  }

  return purchase;
};

const getPurchases = async (query = {}) => {
  const { search, vendor, fromDate, toDate, paymentStatus, limit = 50, page = 1 } = query;

  const filter = { status: "Completed" };

  if (search) filter.invoiceNumber = { $regex: search, $options: "i" };
  if (vendor) filter.vendor = vendor;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (fromDate || toDate) {
    filter.purchaseDate = {};
    if (fromDate) filter.purchaseDate.$gte = new Date(fromDate);
    if (toDate) filter.purchaseDate.$lte = new Date(toDate);
  }

  const purchases = await Purchase.find(filter)
    .populate("vendor", "name companyName phone")
    .populate("items.product", "productName productCode unit")
    .sort({ purchaseDate: -1 })
    .limit(Number(limit))
    .skip((Number(page) - 1) * Number(limit));

  const totalRecords = await Purchase.countDocuments(filter);

  return {
    data: purchases,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      totalRecords,
      totalPages: Math.ceil(totalRecords / limit) || 1,
    },
  };
};

const getPurchaseById = async (id) => {
  const purchase = await Purchase.findById(id)
    .populate("vendor")
    .populate("items.product");

  if (!purchase) {
    throw new ApiError(404, "Purchase record not found.");
  }
  return purchase;
};

const updatePurchase = async (id, updateData, userId) => {
  const existing = await Purchase.findById(id);
  if (!existing) {
    throw new ApiError(404, "Purchase record not found to update.");
  }

  const items = updateData.items || existing.items;
  const paidAmount = updateData.paidAmount ?? existing.paidAmount;

  // 1. Reverse the purchase's current stock effect first.
  const previousMovements = await getActiveMovementsForPurchase(id);
  await reverseMovementsById(
    previousMovements.map((m) => m._id),
    userId,
    `Reversal for purchase update (${existing.invoiceNumber})`
  );

  const { items: calculatedItems, totalAmount } = calculateTotals(items);
  const paymentStatus = resolvePaymentStatus(totalAmount, paidAmount);
  const remainingBalance = new Decimal(totalAmount).minus(paidAmount || 0).toNumber();

  // 2. Apply stock for the NEW items.
  try {
    await applyStockForItems(calculatedItems, {
      referenceId: existing._id,
      remarks: `Purchase update (${existing.invoiceNumber})`,
      userId,
    });
  } catch (error) {
    // Restore original stock effect since the update failed.
    await applyStockForItems(existing.items, {
      referenceId: existing._id,
      remarks: `Re-applied after failed update (${existing.invoiceNumber})`,
      userId,
    });
    throw error;
  }

  const updated = await Purchase.findByIdAndUpdate(
    id,
    {
      ...updateData,
      items: calculatedItems,
      totalAmount,
      paidAmount,
      remainingBalance,
      paymentStatus,
      updatedBy: userId,
    },
    { new: true }
  );

  return updated;
};

const cancelPurchase = async (id, userId) => {
  const purchase = await Purchase.findById(id);
  if (!purchase) {
    throw new ApiError(404, "Purchase record not found.");
  }

  const movements = await getActiveMovementsForPurchase(id);
  await reverseMovementsById(
    movements.map((m) => m._id),
    userId,
    `Purchase cancelled (${purchase.invoiceNumber})`
  );

  purchase.status = "Cancelled";
  purchase.updatedBy = userId;
  await purchase.save();

  return purchase;
};

/**
 * Simple vendor purchase history summary — fulfils the "vendor history"
 * requirement now that Purchase records exist.
 */
const getVendorPurchaseSummary = async (vendorId) => {
  const result = await Purchase.aggregate([
    { $match: { vendor: new (require("mongoose").Types.ObjectId)(vendorId), status: "Completed" } },
    {
      $group: {
        _id: null,
        totalPurchases: { $sum: "$totalAmount" },
        purchaseCount: { $sum: 1 },
      },
    },
  ]);

  return {
    totalPurchases: result[0]?.totalPurchases || 0,
    purchaseCount: result[0]?.purchaseCount || 0,
  };
};

module.exports = {
  calculateTotals,
  createPurchase,
  getPurchases,
  getPurchaseById,
  updatePurchase,
  cancelPurchase,
  getVendorPurchaseSummary,
};