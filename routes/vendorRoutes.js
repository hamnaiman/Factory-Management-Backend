// server/routes/vendorRoutes.js

const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const {
  addVendor,
  getVendors,
  getVendorById,
  editVendor,
  removeVendor,
} = require("../controllers/vendorController");

router.post("/", protect, addVendor);
router.get("/", protect, getVendors);
router.get("/:id", protect, getVendorById);
router.put("/:id", protect, editVendor);
router.delete("/:id", protect, removeVendor);

module.exports = router;