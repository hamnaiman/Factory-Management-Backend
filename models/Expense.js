const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      enum: [
        "Electricity",
        "Labour",
        "Rent",
        "Transport",
        "Maintenance",
        "Purchase",
        "Other",
      ],
      default: "Other",
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    date: {
      type: Date,
      default: Date.now,
    },

    notes: {
      type: String,
      default: "",
      trim: true,
    },

    billImage: {
      type: String,
      default: "",
    },

    // Automatically created expenses can be linked
    // to their original transaction.
    sourceType: {
      type: String,
      enum: ["Manual", "LabourPayment"],
      default: "Manual",
    },

    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

expenseSchema.index({ category: 1 });
expenseSchema.index({ date: 1 });
expenseSchema.index({ sourceType: 1, sourceId: 1 });

module.exports = mongoose.model("Expense", expenseSchema);