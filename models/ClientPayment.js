const mongoose = require("mongoose");

const clientPaymentSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
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
      enum: ["Cash", "Bank Transfer", "UPI", "Cheque"],
      default: "Cash",
    },

    reference: {
      type: String,
      trim: true,
    },

    notes: {
      type: String,
      trim: true,
    },

    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: ["active", "deleted"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "ClientPayment",
  clientPaymentSchema
);