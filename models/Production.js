// server/models/Production.js

const mongoose = require("mongoose");

const rawMaterialUsedSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    stockType: {
      type: String,
      enum: ["Local", "Imported"],
      default: "Local",
    },
    quantityUsed: {
      type: Number,
      required: true,
      min: [0.01, "Quantity used must be greater than 0"],
    },
  },
  { _id: false }
);

const productionSchema = new mongoose.Schema(
  {
    productionNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    productionDate: {
      type: Date,
      default: Date.now,
    },

    // Finished (produced) product
    finishedProduct: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    finishedProductName: {
      type: String,
      required: true,
      trim: true,
    },
    color: {
      type: String,
      trim: true,
    },
    stockType: {
      type: String,
      enum: ["Local", "Imported"],
      default: "Local",
    },
    producedQuantity: {
      type: Number,
      required: true,
      min: [0.01, "Produced quantity must be greater than 0"],
    },

    // Raw materials consumed for this production run
    rawMaterials: {
      type: [rawMaterialUsedSchema],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: "At least one raw material is required",
      },
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },

    // Soft-cancel support (mirrors Sale/StockMovement pattern)
    status: {
      type: String,
      enum: ["Active", "Cancelled"],
      default: "Active",
      index: true,
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

productionSchema.index({ productionDate: -1 });
productionSchema.index({ finishedProduct: 1 });
productionSchema.index({ "rawMaterials.product": 1 });

module.exports = mongoose.model("Production", productionSchema);