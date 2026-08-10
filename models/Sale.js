const mongoose = require("mongoose");

const saleItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product reference is required"],
    },

    productName: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },

    color: {
      type: String,
      trim: true,
      default: "",
    },

    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [0.01, "Quantity must be greater than 0"],
    },

    // CUSTOMER SELLING RATE
    rate: {
      type: Number,
      required: [true, "Selling rate is required"],
      min: [0, "Selling rate cannot be negative"],
    },

    // SELLING AMOUNT
    amount: {
      type: Number,
      required: [true, "Line total amount is required"],
      min: [0, "Amount cannot be negative"],
    },

    // ACTUAL PRODUCT COST (weighted-average purchase rate at time of sale)
    costRate: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    // ACTUAL COST OF THE SOLD QUANTITY
    costAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    // PROFIT FOR THIS ITEM (amount - costAmount)
    grossProfit: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  { _id: false }
);

const saleSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      unique: true,
      required: [true, "Invoice number is required"],
      trim: true,
      index: true,
    },

    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: [true, "Client reference is required"],
      index: true,
    },

    invoiceDate: {
      type: Date,
      default: Date.now,
      index: true,
    },

    items: {
      type: [saleItemSchema],
      validate: {
        validator: function (items) {
          return Array.isArray(items) && items.length > 0;
        },
        message: "At least one product item is required in the sale.",
      },
    },

    subtotal: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    previousBalance: {
      type: Number,
      default: 0,
    },

    // Percentage tax rate applied to the subtotal (e.g. 17 for 17%)
    taxRate: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Tax amount in currency, derived from subtotal * taxRate / 100
    tax: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Renamed from "discount" so it matches the field name used
    // throughout saleService.js (subtotal, tax, discountAmount, grandTotal).
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    grandTotal: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    // TOTAL COST OF GOODS SOLD (COGS) FOR THIS SALE
    totalCost: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    // REVENUE (subtotal - discountAmount) - COGS
    grossProfit: {
      type: Number,
      required: true,
      default: 0,
    },

    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    remainingBalance: {
      type: Number,
      default: 0,
    },

    paymentStatus: {
      type: String,
      enum: ["Paid", "Partial", "Unpaid"],
      default: "Unpaid",
    },

    paymentMethod: {
      type: String,
      enum: ["Cash", "Bank", "JazzCash", "EasyPaisa"],
      default: "Cash",
    },

    saleStatus: {
      type: String,
      enum: ["Completed", "Cancelled"],
      default: "Completed",
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Created by user reference is required"],
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

saleSchema.index({ invoiceDate: -1, client: 1 });

module.exports = mongoose.model("Sale", saleSchema);