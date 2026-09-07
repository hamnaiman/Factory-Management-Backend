const mongoose = require("mongoose");

const labourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      unique: true,
    },

    cnic: {
      type: String,
      unique: true,
      sparse: true,
    },

    department: {
      type: String,
      required: true,
      enum: [
        "Production",
        "Packing",
        "Warehouse",
        "Loading",
        "Office",
      ],
    },

    dailyWage: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Labour", labourSchema);