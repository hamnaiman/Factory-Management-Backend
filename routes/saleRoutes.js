const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const SaleController = require("../controllers/saleController");

// All Sale routes are protected by authentication
router.use(authMiddleware);

/**
 * ============================================================
 * WRITE OPERATIONS
 * ============================================================
 */

// Create Sale
router.post("/", (req, res, next) => SaleController.createSale(req, res, next));

// Update Sale
router.put("/:id", (req, res, next) => SaleController.updateSale(req, res, next));

// Cancel Sale (Soft Delete)
router.delete("/:id", (req, res, next) => SaleController.cancelSale(req, res, next));

/**
 * ============================================================
 * READ OPERATIONS
 * ============================================================
 */

// Get All Sales (with pagination/filtering if applicable)
router.get("/", (req, res, next) => SaleController.getSales(req, res, next));

// Get Sale By ID
router.get("/:id", (req, res, next) => SaleController.getSaleById(req, res, next));

// Get Printable Invoice Data
router.get("/:id/invoice", (req, res, next) => SaleController.getInvoice(req, res, next));

module.exports = router;