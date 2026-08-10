const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
  getAllProducts,
  createProduct,
  editProduct,
  removeProduct,
  restoreProduct,
} = require("../controllers/productController");

// ============================================================
// PRODUCT ROUTES
// ============================================================

// Get all products
router.get("/", protect, getAllProducts);

// Create product
router.post("/", protect, createProduct);

// Update product
router.put("/:id", protect, editProduct);

// Deactivate product
router.delete("/:id", protect, removeProduct);

// Restore product
router.patch("/:id/restore", protect, restoreProduct);

module.exports = router;