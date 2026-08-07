const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
  createPayment,
  getAllPayments,
  getPaymentsByWorker,
  editPayment,
  removePayment,
} = require("../controllers/paymentController");

router.get("/", protect, getAllPayments);

router.post("/", protect, createPayment);

router.get("/worker/:id", protect, getPaymentsByWorker);

router.put("/:id", protect, editPayment);

router.delete("/:id", protect, removePayment);

module.exports = router;