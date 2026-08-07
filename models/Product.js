const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    productName: {
      type: String,
      required: true,
      trim: true,
    },

    productCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },

    category: {
      type: String,
      required: true,
      trim: true,
    },

    productType: {
      type: String,
      enum: ["Raw Material", "Finished Product"],
      required: true,
    },

    color: {
      type: String,
      required: true,
      trim: true,
    },

    unit: {
      type: String,
      enum: ["Kg", "Piece", "Box", "Litre", "Packet", "Meter", "Roll"],
      required: true,
    },

    // NOTE: stockType removed as a classifier of the product itself.
    // A product can hold BOTH Local and Imported stock simultaneously.
    // Kept only as an optional "default stock type" hint for forms/UI
    // that don't explicitly choose Local/Imported — NOT used to gate
    // which stock bucket a product can hold.
    defaultStockType: {
      type: String,
      enum: ["Local", "Imported"],
      default: "Local",
    },

    costPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    sellingPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    localStock: {
      type: Number,
      default: 0,
      min: 0,
    },

    importedStock: {
      type: Number,
      default: 0,
      min: 0,
    },

    // currentStock = localStock + importedStock, maintained automatically
    // by StockService on every transaction. Never set this directly.
    currentStock: {
      type: Number,
      default: 0,
      min: 0,
    },

    minimumStock: {
      type: Number,
      default: 5,
      min: 0,
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    deletedAt: {
      type: Date,
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

productSchema.index({ productName: 1 });
productSchema.index({ category: 1 });

module.exports = mongoose.model("Product", productSchema);