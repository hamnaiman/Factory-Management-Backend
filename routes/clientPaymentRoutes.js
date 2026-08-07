const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const {
  receivePayment,
  getClientPayments,
} = require("../controllers/clientPaymentController");

router.use(authMiddleware);

// Receive Payment
router.post("/:id/payment", receivePayment);

// Get Client Payment History
router.get("/:id/payments", getClientPayments);

module.exports = router;