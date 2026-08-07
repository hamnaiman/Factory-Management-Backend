

const Sale = require("../models/Sale");
const Client = require("../models/Client");
const Product = require("../models/Product");
const Production = require("../models/Production");
const Labour = require("../models/Labour");
const Attendance = require("../models/Attendance");
const Payment = require("../models/Payment");

const StockService = require("./stockService");
const ReportService = require("./reportService");

const getTodayBounds = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const getDashboardData = async () => {
  const { start: todayStart, end: todayEnd } = getTodayBounds();

  const [
    totalWorkers,
    presentToday,
    absentToday,
    leaveToday,
    stockAgg,
    lowStockRaw,
    labourOutstandingRows,
    todayPaymentsAgg,
    todayAdvanceAgg,
    recentAttendance,
    recentPayments,

    // extra (not yet consumed by any component, kept for future cards)
    todaySalesAgg,
    totalSalesAgg,
    receivablesAgg,
    todayProductionCount,
  ] = await Promise.all([
    Labour.countDocuments({ status: "active" }),
    Attendance.countDocuments({ status: "present", date: { $gte: todayStart, $lte: todayEnd } }),
    Attendance.countDocuments({ status: "absent", date: { $gte: todayStart, $lte: todayEnd } }),
    Attendance.countDocuments({ status: "leave", date: { $gte: todayStart, $lte: todayEnd } }),

    Product.aggregate([
      { $match: { isDeleted: false, status: "active" } },
      {
        $group: {
          _id: null,
          totalCurrentStock: { $sum: "$currentStock" },
          productCount: { $sum: 1 },
        },
      },
    ]),

    // Reuse StockService — never re-derive low-stock logic here
    StockService.getLowStockProducts(),

    // Reuse ReportService — all-time labour outstanding balance
    ReportService.getLabourOutstandingBalanceReport({}),

    Payment.aggregate([
      { $match: { paymentDate: { $gte: todayStart, $lte: todayEnd } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),

    Payment.aggregate([
      {
        $match: {
          paymentType: "Advance",
          paymentDate: { $gte: todayStart, $lte: todayEnd },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),

    Attendance.find()
      .populate("worker", "name")
      .sort({ createdAt: -1 })
      .limit(5),

    Payment.find()
      .populate("worker", "name")
      .sort({ createdAt: -1 })
      .limit(5),

    // --- extra aggregates ---
    Sale.aggregate([
      {
        $match: {
          saleStatus: "Completed",
          invoiceDate: { $gte: todayStart, $lte: todayEnd },
        },
      },
      { $group: { _id: null, total: { $sum: "$grandTotal" } } },
    ]),
    Sale.aggregate([
      { $match: { saleStatus: "Completed" } },
      { $group: { _id: null, total: { $sum: "$grandTotal" } } },
    ]),
    Client.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: null, total: { $sum: "$outstandingBalance" } } },
    ]),
    Production.countDocuments({
      status: "Active",
      productionDate: { $gte: todayStart, $lte: todayEnd },
    }),
  ]);

  const pendingSalary = labourOutstandingRows.reduce(
    (sum, row) => sum + (row.remainingBalance > 0 ? row.remainingBalance : 0),
    0
  );

  // Reshape StockService's inventory-view items into what <LowStock/> expects
  const lowStockProducts = lowStockRaw.map((item) => ({
    _id: item.productId,
    name: item.productName,
    quantity: item.currentStock,
  }));

  return {
    // --- consumed by AttendanceHero / StatsSection / TodaySummary ---
    totalWorkers,
    presentToday,
    absentToday,
    leaveToday,

    // --- consumed by StatsSection ---
    totalProducts: stockAgg[0]?.productCount || 0,
    pendingSalary,
    todaySalaryExpense: todayPaymentsAgg[0]?.total || 0,

    // --- consumed by TodaySummary ---
    advancePayments: todayAdvanceAgg[0]?.total || 0,

    // --- consumed by LowStock ---
    lowStockProducts,

    // --- consumed by RecentActivity ---
    recentAttendance,
    recentPayments,

    // --- extra, for future Sales/Production cards ---
    todaySales: todaySalesAgg[0]?.total || 0,
    totalSales: totalSalesAgg[0]?.total || 0,
    totalReceivables: receivablesAgg[0]?.total || 0,
    todayProductionCount,
    currentStockUnits: stockAgg[0]?.totalCurrentStock || 0,
  };
};

module.exports = { getDashboardData };