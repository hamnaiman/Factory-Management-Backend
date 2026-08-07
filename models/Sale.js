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

    // ✅ Added: Client Document Section 7 & 8 requirement
    color: {
      type: String,
      trim: true,
      default: "",
    },

    stockType: {
      type: String,
      enum: {
        values: ["Local", "Imported"],
        message: "Stock type must be either Local or Imported",
      },
      required: [true, "Stock type (Local/Imported) is required"],
    },

    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [1, "Quantity must be at least 1"],
    },

    rate: {
      type: Number,
      required: [true, "Rate is required"],
      min: [0, "Rate cannot be negative"],
    },

    amount: {
      type: Number,
      required: [true, "Line total amount is required"],
      min: [0, "Amount cannot be negative"],
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

    discount: {
      type: Number,
      default: 0,
      min: 0,
    },

    grandTotal: {
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
  },
  {
    timestamps: true,
  }
);

// Search aur Filter Performance ke liye Compound Indexes
saleSchema.index({ invoiceDate: -1, client: 1 });

module.exports = mongoose.model("Sale", saleSchema);