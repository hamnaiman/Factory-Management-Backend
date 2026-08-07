const mongoose = require("mongoose");

const clientLedgerSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },

    type: {
      type: String,
      enum: [
        "Opening Balance",
        "Sale",
        "Payment",
        "Adjustment",
      ],
      required: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    invoiceNumber: {
      type: String,
      default: "",
    },

    debit: {
      type: Number,
      default: 0,
    },

    credit: {
      type: Number,
      default: 0,
    },

    balance: {
      type: Number,
      default: 0,
    },

    date: {
      type: Date,
      default: Date.now,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "ClientLedger",
  clientLedgerSchema
);