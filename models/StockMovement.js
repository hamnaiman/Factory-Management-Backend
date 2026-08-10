const mongoose = require("mongoose");

const stockMovementSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
            index: true,
        },

        movementType: {
            type: String,
            enum: [
                "Purchase",
                "Receive",
                "Issue",
                "Production",
                "Sale",
                "Adjustment",
            ],
            required: true,
            index: true,
        },

        quantity: {
            type: Number,
            required: true,
            min: [0.01, "Quantity must be greater than 0"],
        },

        balanceAfterTransaction: {
            type: Number,
            required: true,
            min: 0,
        },

        referenceType: {
            type: String,
            enum: [
                "Manual",
                "Purchase",
                "Production",
                "Sale",
                "Stock Adjustment",
            ],
            default: "Manual",
        },

        referenceId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },

        movementDate: {
            type: Date,
            default: Date.now,
            index: true,
        },

        remarks: {
            type: String,
            trim: true,
            maxlength: 500,
        },

        status: {
            type: String,
            enum: ["Active", "Cancelled"],
            default: "Active",
            index: true,
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

/**
 * Indexes
 */
stockMovementSchema.index({
    product: 1,
    movementDate: -1,
});

stockMovementSchema.index({
    movementType: 1,
    movementDate: -1,
});

const StockMovement = mongoose.model(
    "StockMovement",
    stockMovementSchema
);

module.exports = StockMovement;