// server/services/purchaseService.js

const Decimal = require("decimal.js");

const Purchase = require("../models/Purchase");
const Vendor = require("../models/Vendor");
const Product = require("../models/Product");
const StockMovement = require("../models/StockMovement");

const StockService = require("./stockService");

const ApiError = require("../utils/apiError");

// ============================================================
// CALCULATE TOTALS
// ============================================================

const calculateTotals = (items = []) => {
  let totalAmount = new Decimal(0);

  const processedItems = items.map((item) => {
    const qty = new Decimal(item.quantity ?? 0);
    const rate = new Decimal(item.rate ?? 0);

    const lineTotal = qty.times(rate);

    totalAmount = totalAmount.plus(lineTotal);

    return {
      product: item.product || item.productId,

      productName:
        item.productName || "Product",

      stockType:
        item.stockType || "Local",

      quantity: qty.toNumber(),

      rate: rate.toNumber(),

      lineTotal: lineTotal.toNumber(),
    };
  });

  return {
    items: processedItems,

    totalAmount:
      totalAmount.toNumber(),
  };
};

// ============================================================
// VALIDATE PURCHASE
// ============================================================

const validatePurchaseInput = ({
  vendor,
  items,
}) => {
  if (!vendor) {
    throw new ApiError(
      400,
      "Vendor is required."
    );
  }

  if (
    !Array.isArray(items) ||
    items.length === 0
  ) {
    throw new ApiError(
      400,
      "At least one product item is required."
    );
  }

  items.forEach((item, idx) => {
    if (!item.product && !item.productId) {
      throw new ApiError(
        400,
        `Product is required for item #${idx + 1}.`
      );
    }

    if (
      !item.quantity ||
      Number(item.quantity) <= 0
    ) {
      throw new ApiError(
        400,
        `Quantity must be greater than 0 for item #${idx + 1}.`
      );
    }

    if (
      item.rate === undefined ||
      item.rate === null ||
      Number(item.rate) < 0
    ) {
      throw new ApiError(
        400,
        `A valid purchase rate is required for item #${idx + 1}.`
      );
    }
  });
};

// ============================================================
// PAYMENT STATUS
// ============================================================

const resolvePaymentStatus = (
  totalAmount,
  paidAmount
) => {
  const paid = new Decimal(
    paidAmount || 0
  );

  if (
    paid.greaterThanOrEqualTo(totalAmount) &&
    totalAmount > 0
  ) {
    return "Paid";
  }

  if (paid.greaterThan(0)) {
    return "Partial";
  }

  return "Unpaid";
};

// ============================================================
// GET ACTIVE STOCK MOVEMENTS FOR PURCHASE
// ============================================================

const getActiveMovementsForPurchase = async (
  purchaseId
) => {
  return StockMovement.find({
    referenceId: purchaseId,

    status: "Active",

    isDeleted: false,
  }).sort({
    createdAt: 1,
  });
};

// ============================================================
// APPLY PURCHASE STOCK
// ============================================================

const applyStockForItems = async (
  items,
  {
    referenceId,
    remarks,
    userId,
  }
) => {
  const completedMovementIds = [];

  try {
    for (const item of items) {
      if (!item.product) {
        throw new ApiError(
          400,
          "Product is missing from purchase item."
        );
      }

      const quantity = Number(
        item.quantity || 0
      );

      if (quantity <= 0) {
        throw new ApiError(
          400,
          "Purchase quantity must be greater than 0."
        );
      }

      const result =
        await StockService.purchaseStock({
          productId: item.product,

          quantity,

          referenceType: "Purchase",

          referenceId,

          remarks,

          userId,
        });

      if (!result?.movement?._id) {
        throw new ApiError(
          500,
          "Stock movement was not created for purchase."
        );
      }

      completedMovementIds.push(
        result.movement._id
      );
    }
  } catch (error) {
    // ========================================================
    // IMPORTANT:
    // If any purchase item fails, reverse everything
    // that was already added.
    // ========================================================

    if (
      completedMovementIds.length > 0
    ) {
      await reverseMovementsById(
        completedMovementIds,
        userId,
        "Auto-reversal: purchase stock operation failed"
      );
    }

    throw error;
  }

  return completedMovementIds;
};

// ============================================================
// REVERSE STOCK MOVEMENTS
// ============================================================
//
// IMPORTANT FIX:
// Previously reversal errors were swallowed.
// Now an error is thrown so purchase cannot become
// Cancelled while its stock remains incorrectly increased.
//

const reverseMovementsById = async (
  movementIds = [],
  userId,
  remarks
) => {
  const reversedMovements = [];

  for (const movementId of movementIds) {
    try {
      const result =
        await StockService.reverseMovement({
          movementId,

          remarks,

          userId,
        });

      reversedMovements.push(result);
    } catch (reverseError) {
      console.error(
        `Failed to reverse stock movement ${movementId}:`,
        reverseError
      );

      // DO NOT SWALLOW THIS ERROR.
      // Purchase cancellation/update must stop.
      throw new ApiError(
        500,
        `Failed to reverse stock movement ${movementId}: ${
          reverseError.message ||
          "Unknown stock reversal error"
        }`
      );
    }
  }

  return reversedMovements;
};

// ============================================================
// CREATE PURCHASE
// ============================================================

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

  // ----------------------------------------------------------
  // Validate input
  // ----------------------------------------------------------

  validatePurchaseInput({
    vendor,
    items,
  });

  // ----------------------------------------------------------
  // Validate vendor
  // ----------------------------------------------------------

  const vendorDoc =
    await Vendor.findById(vendor);

  if (!vendorDoc) {
    throw new ApiError(
      404,
      "Vendor not found."
    );
  }

  // ----------------------------------------------------------
  // Get product names
  // ----------------------------------------------------------

  const productIds = items.map(
    (item) =>
      item.product || item.productId
  );

  const products =
    await Product.find({
      _id: {
        $in: productIds,
      },
    }).select("productName");

  const productNameMap =
    new Map(
      products.map((product) => [
        product._id.toString(),
        product.productName,
      ])
    );

  // ----------------------------------------------------------
  // Add product names
  // ----------------------------------------------------------

  const itemsWithNames =
    items.map((item) => ({
      ...item,

      productName:
        productNameMap.get(
          (
            item.product ||
            item.productId
          )?.toString()
        ) || item.productName,
    }));

  // ----------------------------------------------------------
  // Calculate totals
  // ----------------------------------------------------------

  const {
    items: calculatedItems,
    totalAmount,
  } = calculateTotals(
    itemsWithNames
  );

  const paymentStatus =
    resolvePaymentStatus(
      totalAmount,
      paidAmount
    );

  const remainingBalance =
    new Decimal(totalAmount)
      .minus(paidAmount || 0)
      .toNumber();

  // ----------------------------------------------------------
  // Invoice validation
  // ----------------------------------------------------------

  if (
    !invoiceNumber ||
    !invoiceNumber.trim()
  ) {
    throw new ApiError(
      400,
      "Invoice/bill number is required."
    );
  }

  const existingInvoice =
    await Purchase.findOne({
      invoiceNumber:
        invoiceNumber.trim(),
    });

  if (existingInvoice) {
    throw new ApiError(
      409,
      `Invoice number "${invoiceNumber}" already exists.`
    );
  }

  // ----------------------------------------------------------
  // Create purchase
  // ----------------------------------------------------------

  const purchase =
    await Purchase.create({
      invoiceNumber:
        invoiceNumber.trim(),

      vendor,

      purchaseDate:
        purchaseDate || new Date(),

      items: calculatedItems,

      totalAmount,

      paidAmount,

      remainingBalance,

      paymentStatus,

      notes,

      bill: bill || null,

      createdBy,
    });

  // ----------------------------------------------------------
  // Add stock
  // ----------------------------------------------------------

  try {
    await applyStockForItems(
      calculatedItems,
      {
        referenceId:
          purchase._id,

        remarks:
          `Purchase ${purchase.invoiceNumber}`,

        userId: createdBy,
      }
    );
  } catch (error) {
    // Purchase should not remain in DB
    // if its stock could not be created.

    await Purchase.findByIdAndDelete(
      purchase._id
    );

    throw error;
  }

  return purchase;
};

// ============================================================
// GET PURCHASES
// ============================================================

const getPurchases = async (
  query = {}
) => {
  const {
    search,
    vendor,
    fromDate,
    toDate,
    paymentStatus,
    limit = 50,
    page = 1,
  } = query;

  const filter = {
    status: "Completed",
  };

  if (search) {
    filter.invoiceNumber = {
      $regex: search,
      $options: "i",
    };
  }

  if (vendor) {
    filter.vendor = vendor;
  }

  if (paymentStatus) {
    filter.paymentStatus =
      paymentStatus;
  }

  if (fromDate || toDate) {
    filter.purchaseDate = {};

    if (fromDate) {
      filter.purchaseDate.$gte =
        new Date(fromDate);
    }

    if (toDate) {
      filter.purchaseDate.$lte =
        new Date(toDate);
    }
  }

  const purchases =
    await Purchase.find(filter)
      .populate(
        "vendor",
        "name companyName phone"
      )
      .populate(
        "items.product",
        "productName productCode unit"
      )
      .sort({
        purchaseDate: -1,
      })
      .limit(Number(limit))
      .skip(
        (Number(page) - 1) *
          Number(limit)
      );

  const totalRecords =
    await Purchase.countDocuments(
      filter
    );

  return {
    data: purchases,

    pagination: {
      page: Number(page),

      limit: Number(limit),

      totalRecords,

      totalPages:
        Math.ceil(
          totalRecords / limit
        ) || 1,
    },
  };
};

// ============================================================
// GET PURCHASE BY ID
// ============================================================

const getPurchaseById = async (
  id
) => {
  const purchase =
    await Purchase.findById(id)
      .populate("vendor")
      .populate("items.product");

  if (!purchase) {
    throw new ApiError(
      404,
      "Purchase record not found."
    );
  }

  return purchase;
};

// ============================================================
// UPDATE PURCHASE
// ============================================================

const updatePurchase = async (
  id,
  updateData,
  userId
) => {
  const existing =
    await Purchase.findById(id);

  if (!existing) {
    throw new ApiError(
      404,
      "Purchase record not found to update."
    );
  }

  if (existing.status === "Cancelled") {
    throw new ApiError(
      400,
      "Cancelled purchase cannot be updated."
    );
  }

  // ----------------------------------------------------------
  // Determine items
  // ----------------------------------------------------------

  const items =
    updateData.items ||
    existing.items;

  const paidAmount =
    updateData.paidAmount ??
    existing.paidAmount;

  // ----------------------------------------------------------
  // Reverse previous purchase stock
  // ----------------------------------------------------------

  const previousMovements =
    await getActiveMovementsForPurchase(
      id
    );

  if (
    previousMovements.length > 0
  ) {
    await reverseMovementsById(
      previousMovements.map(
        (movement) =>
          movement._id
      ),

      userId,

      `Reversal for purchase update (${existing.invoiceNumber})`
    );
  }

  // ----------------------------------------------------------
  // Calculate new purchase
  // ----------------------------------------------------------

  const {
    items: calculatedItems,
    totalAmount,
  } = calculateTotals(items);

  const paymentStatus =
    resolvePaymentStatus(
      totalAmount,
      paidAmount
    );

  const remainingBalance =
    new Decimal(totalAmount)
      .minus(paidAmount || 0)
      .toNumber();

  // ----------------------------------------------------------
  // Apply NEW stock
  // ----------------------------------------------------------

  try {
    await applyStockForItems(
      calculatedItems,
      {
        referenceId:
          existing._id,

        remarks:
          `Purchase update (${existing.invoiceNumber})`,

        userId,
      }
    );
  } catch (error) {
    // --------------------------------------------------------
    // Restore ORIGINAL stock.
    // If restoration itself fails, throw that failure too.
    // --------------------------------------------------------

    try {
      await applyStockForItems(
        existing.items,
        {
          referenceId:
            existing._id,

          remarks:
            `Re-applied after failed update (${existing.invoiceNumber})`,

          userId,
        }
      );
    } catch (restoreError) {
      console.error(
        "CRITICAL: Failed to restore original purchase stock:",
        restoreError
      );

      throw new ApiError(
        500,
        `Purchase update failed and original stock could not be restored. ${restoreError.message}`
      );
    }

    throw error;
  }

  // ----------------------------------------------------------
  // Update purchase record
  // ----------------------------------------------------------

  const updated =
    await Purchase.findByIdAndUpdate(
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
      {
        new: true,
      }
    );

  return updated;
};

// ============================================================
// CANCEL / DELETE PURCHASE
// ============================================================
//
// IMPORTANT:
// This is the method called by:
// DELETE /api/purchases/:id
//
// It does NOT physically delete the purchase.
// It cancels the purchase and reverses every active
// stock movement belonging to that purchase.
//

const cancelPurchase = async (
  id,
  userId
) => {
  // ----------------------------------------------------------
  // Find purchase
  // ----------------------------------------------------------

  const purchase =
    await Purchase.findById(id);

  if (!purchase) {
    throw new ApiError(
      404,
      "Purchase record not found."
    );
  }

  // ----------------------------------------------------------
  // Already cancelled
  // ----------------------------------------------------------

  if (
    purchase.status === "Cancelled"
  ) {
    throw new ApiError(
      400,
      "Purchase is already cancelled."
    );
  }

  // ----------------------------------------------------------
  // Find ALL active stock movements
  // generated by this purchase
  // ----------------------------------------------------------

  const movements =
    await getActiveMovementsForPurchase(
      purchase._id
    );

  console.log(
    "========== PURCHASE CANCELLATION =========="
  );

  console.log(
    "Purchase ID:",
    purchase._id.toString()
  );

  console.log(
    "Invoice:",
    purchase.invoiceNumber
  );

  console.log(
    "Active stock movements:",
    movements.length
  );

  // ----------------------------------------------------------
  // REVERSE STOCK FIRST
  // ----------------------------------------------------------

  if (movements.length > 0) {
    await reverseMovementsById(
      movements.map(
        (movement) =>
          movement._id
      ),

      userId,

      `Purchase cancelled (${purchase.invoiceNumber})`
    );
  }

  // ----------------------------------------------------------
  // VERIFY NO ACTIVE PURCHASE MOVEMENTS REMAIN
  // ----------------------------------------------------------

  const remainingMovements =
    await getActiveMovementsForPurchase(
      purchase._id
    );

  if (
    remainingMovements.length > 0
  ) {
    throw new ApiError(
      500,
      `Purchase cannot be cancelled because ${remainingMovements.length} stock movement(s) are still active.`
    );
  }

  // ----------------------------------------------------------
  // ONLY NOW CANCEL PURCHASE
  // ----------------------------------------------------------

  purchase.status = "Cancelled";

  purchase.updatedBy = userId;

  await purchase.save();

  console.log(
    "Purchase cancelled successfully."
  );

  console.log(
    "Stock movements reversed:",
    movements.length
  );

  console.log(
    "=========================================="
  );

  return purchase;
};

// ============================================================
// VENDOR PURCHASE SUMMARY
// ============================================================

const getVendorPurchaseSummary =
  async (vendorId) => {
    const mongoose = require("mongoose");

    const result =
      await Purchase.aggregate([
        {
          $match: {
            vendor:
              new mongoose.Types.ObjectId(
                vendorId
              ),

            status: "Completed",
          },
        },

        {
          $group: {
            _id: null,

            totalPurchases: {
              $sum: "$totalAmount",
            },

            purchaseCount: {
              $sum: 1,
            },
          },
        },
      ]);

    return {
      totalPurchases:
        result[0]?.totalPurchases || 0,

      purchaseCount:
        result[0]?.purchaseCount || 0,
    };
  };

// ============================================================
// EXPORT
// ============================================================

module.exports = {
  calculateTotals,

  createPurchase,

  getPurchases,

  getPurchaseById,

  updatePurchase,

  cancelPurchase,

  getVendorPurchaseSummary,
};