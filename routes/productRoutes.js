const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
  getAllProducts,
  createProduct,
  restoreProduct,
  editProduct,
  removeProduct,
  searchProducts,
} = require("../controllers/productController");

// Get All Products
router.get("/", protect, getAllProducts);

router.get("/search", protect, searchProducts);

// Add Product
router.post("/", protect, createProduct);

// Update Product
router.put("/:id", protect, editProduct);

router.patch(
  "/:id/restore",
  protect,
  restoreProduct
);

// Delete Product
router.delete("/:id", protect, removeProduct);

module.exports = router;
