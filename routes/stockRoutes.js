const express = require("express");
const StockController = require("../controllers/Stockcontroller.js");
const auth = require("../middleware/authMiddleware.js");

const router = express.Router();

/**
 * ============================================================
 * Stock Read Operations
 * Note: Specific/Static routes MUST come BEFORE dynamic params!
 * ============================================================
 */

// Bulk Inventory List (Inventory Page / Dashboard / Reports)
router.get(
  "/inventory",
  auth,
  StockController.getInventoryList
);

// Low Stock Products
router.get(
  "/low-stock",
  auth,
  StockController.getLowStockProducts
);

// Current Product Stock
router.get(
  "/products/:productId",
  auth,
  StockController.getProductStock
);

// Product Stock History
router.get(
  "/products/:productId/history",
  auth,
  StockController.getStockHistory
);

// Product Stock Summary
router.get(
  "/products/:productId/summary",
  auth,
  StockController.getStockSummary
);

/**
 * ============================================================
 * Stock Write Operations
 * ============================================================
 */

// Purchase Stock
router.post(
  "/purchase",
  auth,
  StockController.purchaseStock
);

// Sell Stock
router.post(
  "/sale",
  auth,
  StockController.sellStock
);

// Consume Raw Material / Issue Stock
router.post(
  "/consume",
  auth,
  StockController.consumeStock
);

// Production Entry
router.post(
  "/production",
  auth,
  StockController.produceStock
);

// Manual Stock Adjustment
router.post(
  "/adjust",
  auth,
  StockController.adjustStock
);

// Reverse Stock Movement
router.post(
  "/movements/:movementId/reverse",
  auth,
  StockController.reverseMovement
);

module.exports = router;