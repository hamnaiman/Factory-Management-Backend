// server/routes/purchaseRoutes.js

const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const {
  addPurchase,
  getPurchases,
  getPurchaseById,
  editPurchase,
  removePurchase,
  getVendorSummary,
} = require("../controllers/purchaseController");

router.post("/", protect, addPurchase);
router.get("/", protect, getPurchases);
router.get("/vendor/:vendorId/summary", protect, getVendorSummary);
router.get("/:id", protect, getPurchaseById);
router.put("/:id", protect, editPurchase);
router.delete("/:id", protect, removePurchase);

module.exports = router;