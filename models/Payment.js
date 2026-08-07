const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Labour",
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 1,
    },

    paymentDate: {
      type: Date,
      default: Date.now,
    },

    paymentMethod: {
      type: String,
      enum: ["Cash", "Bank", "JazzCash", "EasyPaisa"],
      default: "Cash",
    },

    paymentType: {
      type: String,
      enum: ["Salary", "Advance"],
      default: "Salary",
    },

    remark: {
      type: String,
      trim: true,
    },

    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Payment", paymentSchema);