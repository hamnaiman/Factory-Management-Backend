const mongoose = require("mongoose");

const purchaseItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product reference is required"],
    },
    productName: {
      type: String,
      trim: true,
      // Optional flag in case controller handles product population
    },
    stockType: {
      type: String,
      enum: ["Local", "Imported"],
      default: "Local",
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [0.01, "Quantity must be greater than 0"],
    },
    rate: {
      type: Number,
      required: [true, "Purchase rate is required"],
      min: [0, "Rate cannot be negative"],
    },
    lineTotal: {
      type: Number,
      default: function () {
        return (this.quantity || 0) * (this.rate || 0);
      },
    },
  },
  { _id: false }
);

// Optional Bill Document Schema
const billSchema = new mongoose.Schema(
  {
    url: { type: String, trim: true, default: "" },
    fileName: { type: String, trim: true, default: "" },
    fileType: { type: String, trim: true, default: "" },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const purchaseSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: [true, "Invoice number is required"],
      trim: true,
      unique: true,
      index: true,
    },

    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: [true, "Vendor is required"],
      index: true,
    },

    purchaseDate: {
      type: Date,
      default: Date.now,
      index: true,
    },

    items: {
      type: [purchaseItemSchema],
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: "At least one product item is required in the purchase.",
      },
    },

    totalAmount: {
      type: Number,
      default: 0,
      min: 0,
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

    notes: {
      type: String,
      trim: true,
      default: "",
    },

    // Completely optional field
    bill: {
      type: billSchema,
      required: false,
      default: null,
    },

    status: {
      type: String,
      enum: ["Completed", "Cancelled"],
      default: "Completed",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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

purchaseSchema.index({ purchaseDate: -1, vendor: 1 });

module.exports = mongoose.model("Purchase", purchaseSchema);