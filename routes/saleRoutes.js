const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
    createSale,
    getSales,
    getSalesTotal,
    getSaleById,
    updateSale,
    cancelSale,
    getInvoice,
} = require("../controllers/saleController");

// ============================================================
// SALES
// ============================================================

// Total sales
router.get(
    "/total",
    protect,
    getSalesTotal
);

// Get all sales
router.get(
    "/",
    protect,
    getSales
);

// Create sale
router.post(
    "/",
    protect,
    createSale
);

// Get single sale
router.get(
    "/:id",
    protect,
    getSaleById
);

// Update sale
router.put(
    "/:id",
    protect,
    updateSale
);

// Cancel sale
router.delete(
    "/:id",
    protect,
    cancelSale
);

// Invoice
router.get(
    "/:id/invoice",
    protect,
    getInvoice
);

module.exports = router;