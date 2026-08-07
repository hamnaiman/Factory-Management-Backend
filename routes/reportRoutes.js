// server/routes/reportRoutes.js

const express = require("express");
const router = express.Router();

const {
  getSalesSummary,
  getProductWiseSales,
  getClientWiseSales,
  getSalesByStockType,
  getStockReport,
  getLocalStockReport,
  getImportedStockReport,
  getStockMovementReport,
  getLowStockReport,
  getDailyProductionReport,
  getProductionHistoryReport,
  getRawMaterialConsumptionReport,
  getFinishedGoodsStockReport,
  getClientOutstandingBalanceReport,
  getClientPaymentReport,
  getClientLedgerReport,
  getDailyAttendanceReport,
  getMonthlyAttendanceReport,
  getLabourWageReport,
  getLabourPaymentReport,
  getLabourOutstandingBalanceReport,
} = require("../controllers/reportController");

const protect = require("../middleware/authMiddleware");

router.use(protect);

// --- Sales reports (#1-7) ---
// groupBy=day|week|month covers Daily/Weekly/Monthly Sales Report
router.get("/sales/summary", getSalesSummary);
router.get("/sales/by-product", getProductWiseSales);
router.get("/sales/by-client", getClientWiseSales);
router.get("/sales/by-stock-type", getSalesByStockType);

// --- Stock reports (#8-12) ---
router.get("/stock", getStockReport);
router.get("/stock/local", getLocalStockReport);
router.get("/stock/imported", getImportedStockReport);
router.get("/stock/movements", getStockMovementReport);
router.get("/stock/low-stock", getLowStockReport);

// --- Production reports (#13-16) ---
router.get("/production/daily", getDailyProductionReport);
router.get("/production/history", getProductionHistoryReport);
router.get("/production/raw-material-consumption", getRawMaterialConsumptionReport);
router.get("/production/finished-goods", getFinishedGoodsStockReport);

// --- Client reports (#17-19) ---
router.get("/clients/outstanding-balance", getClientOutstandingBalanceReport);
router.get("/clients/payments", getClientPaymentReport);
router.get("/clients/:clientId/ledger", getClientLedgerReport);

// --- Labour reports (#20-24) ---
router.get("/labour/attendance/daily", getDailyAttendanceReport);
router.get("/labour/attendance/monthly", getMonthlyAttendanceReport);
router.get("/labour/wages", getLabourWageReport);
router.get("/labour/payments", getLabourPaymentReport);
router.get("/labour/outstanding-balance", getLabourOutstandingBalanceReport);

module.exports = router;