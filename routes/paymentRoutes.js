const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
  createPayment,
  getAllPayments,
  getPaymentsByWorker,
  getWorkerPaymentSummaryController,
  editPayment,
  removePayment,
} = require("../controllers/paymentController");

// ============================================================
// WORKER PAYMENT SUMMARY
// GET /api/payments/worker/:id/summary
// ============================================================

router.get(
  "/worker/:id/summary",
  protect,
  getWorkerPaymentSummaryController
);

// ============================================================
// GET ALL PAYMENTS
// GET /api/payments
// ============================================================

router.get(
  "/",
  protect,
  getAllPayments
);

// ============================================================
// CREATE PAYMENT
// POST /api/payments
// ============================================================

router.post(
  "/",
  protect,
  createPayment
);

// ============================================================
// WORKER PAYMENT HISTORY
// GET /api/payments/worker/:id
// ============================================================

router.get(
  "/worker/:id",
  protect,
  getPaymentsByWorker
);

// ============================================================
// UPDATE PAYMENT
// PUT /api/payments/:id
// ============================================================

router.put(
  "/:id",
  protect,
  editPayment
);

// ============================================================
// DELETE PAYMENT
// DELETE /api/payments/:id
// ============================================================

router.delete(
  "/:id",
  protect,
  removePayment
);

module.exports = router;