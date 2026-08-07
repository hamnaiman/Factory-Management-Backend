// server/controllers/reportController.js

const ReportService = require("../services/reportService");

const handle = (fn) => async (req, res) => {
  try {
    const result = await fn(req);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  // Sales
  getSalesSummary: handle((req) => ReportService.getSalesSummaryReport(req.query)),
  getProductWiseSales: handle((req) => ReportService.getProductWiseSalesReport(req.query)),
  getClientWiseSales: handle((req) => ReportService.getClientWiseSalesReport(req.query)),
  getSalesByStockType: handle((req) => ReportService.getSalesByStockType(req.query)),

  // Stock
  getStockReport: handle((req) => ReportService.getStockReport(req.query)),
  getLocalStockReport: handle((req) => ReportService.getLocalStockReport(req.query)),
  getImportedStockReport: handle((req) => ReportService.getImportedStockReport(req.query)),
  getStockMovementReport: handle((req) => ReportService.getStockMovementReport(req.query)),
  getLowStockReport: handle((req) => ReportService.getLowStockReport(req.query)),

  // Production
  getDailyProductionReport: handle((req) => ReportService.getDailyProductionReport(req.query)),
  getProductionHistoryReport: handle((req) => ReportService.getProductionHistoryReport(req.query)),
  getRawMaterialConsumptionReport: handle((req) =>
    ReportService.getRawMaterialConsumptionReport(req.query)
  ),
  getFinishedGoodsStockReport: handle((req) =>
    ReportService.getFinishedGoodsStockReport(req.query)
  ),

  // Client
  getClientOutstandingBalanceReport: handle((req) =>
    ReportService.getClientOutstandingBalanceReport(req.query)
  ),
  getClientPaymentReport: handle((req) => ReportService.getClientPaymentReport(req.query)),
  getClientLedgerReport: handle((req) =>
    ReportService.getClientLedgerReport(req.params.clientId, req.query)
  ),

  // Labour
  getDailyAttendanceReport: handle((req) => ReportService.getDailyAttendanceReport(req.query)),
  getMonthlyAttendanceReport: handle((req) =>
    ReportService.getMonthlyAttendanceReport(req.query)
  ),
  getLabourWageReport: handle((req) => ReportService.getLabourWageReport(req.query)),
  getLabourPaymentReport: handle((req) => ReportService.getLabourPaymentReport(req.query)),
  getLabourOutstandingBalanceReport: handle((req) =>
    ReportService.getLabourOutstandingBalanceReport(req.query)
  ),
};