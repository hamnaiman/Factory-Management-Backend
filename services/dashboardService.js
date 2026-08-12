const Sale = require("../models/Sale");
const Client = require("../models/Client");
const Product = require("../models/Product");
const Production = require("../models/Production");
const Labour = require("../models/Labour");
const Attendance = require("../models/Attendance");
const Payment = require("../models/Payment");
const Expense = require("../models/Expense");

const StockService = require("./stockService");
const ReportService = require("./reportService");

// ============================================================
// DATE HELPERS
// ============================================================

const getTodayBounds = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

const getDateRange = (fromDate, toDate) => {
  let start = null;
  let end = null;

  if (fromDate) {
    const parsedStart = new Date(fromDate);

    if (!Number.isNaN(parsedStart.getTime())) {
      parsedStart.setHours(0, 0, 0, 0);
      start = parsedStart;
    }
  }

  if (toDate) {
    const parsedEnd = new Date(toDate);

    if (!Number.isNaN(parsedEnd.getTime())) {
      parsedEnd.setHours(23, 59, 59, 999);
      end = parsedEnd;
    }
  }

  return { start, end };
};

const getCurrentMonthBounds = () => {
  const now = new Date();

  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
    0,
    0,
    0,
    0
  );

  const end = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );

  return { start, end };
};

// ============================================================
// DASHBOARD DATA
// ============================================================

const getDashboardData = async (filters = {}) => {
  const { fromDate, toDate } = filters;

  const {
    start: todayStart,
    end: todayEnd,
  } = getTodayBounds();

  const {
    start: monthStart,
    end: monthEnd,
  } = getCurrentMonthBounds();

  const {
    start: financialStart,
    end: financialEnd,
  } = getDateRange(fromDate, toDate);

  // ==========================================================
  // SALES FILTER
  // ==========================================================

  const salesMatch = {
    saleStatus: "Completed",

    $or: [
      { isDeleted: false },
      { isDeleted: { $exists: false } },
    ],
  };

  if (financialStart || financialEnd) {
    salesMatch.invoiceDate = {};

    if (financialStart) {
      salesMatch.invoiceDate.$gte = financialStart;
    }

    if (financialEnd) {
      salesMatch.invoiceDate.$lte = financialEnd;
    }
  }

  // ==========================================================
  // EXPENSE FILTER
  // ==========================================================

  const expenseMatch = {
    $or: [
      { isDeleted: false },
      { isDeleted: { $exists: false } },
    ],
  };

  if (financialStart || financialEnd) {
    expenseMatch.date = {};

    if (financialStart) {
      expenseMatch.date.$gte = financialStart;
    }

    if (financialEnd) {
      expenseMatch.date.$lte = financialEnd;
    }
  }

  // ==========================================================
  // TODAY EXPENSE FILTER
  // ==========================================================

  const todayExpenseMatch = {
    date: {
      $gte: todayStart,
      $lte: todayEnd,
    },

    $or: [
      { isDeleted: false },
      { isDeleted: { $exists: false } },
    ],
  };

  // ==========================================================
  // MONTH EXPENSE FILTER
  // ==========================================================

  const monthlyExpenseMatch = {
    date: {
      $gte: monthStart,
      $lte: monthEnd,
    },

    $or: [
      { isDeleted: false },
      { isDeleted: { $exists: false } },
    ],
  };

  // ==========================================================
  // TODAY SALES FILTER
  // ==========================================================

  const todaySalesMatch = {
    saleStatus: "Completed",

    invoiceDate: {
      $gte: todayStart,
      $lte: todayEnd,
    },

    $or: [
      { isDeleted: false },
      { isDeleted: { $exists: false } },
    ],
  };

  // ==========================================================
  // MONTH SALES FILTER
  // ==========================================================

  const monthlySalesMatch = {
    saleStatus: "Completed",

    invoiceDate: {
      $gte: monthStart,
      $lte: monthEnd,
    },

    $or: [
      { isDeleted: false },
      { isDeleted: { $exists: false } },
    ],
  };

  // ==========================================================
  // RUN DASHBOARD QUERIES
  // ==========================================================

  const [
    stockAgg,
    lowStockRaw,
    labourOutstandingRows,

    recentAttendance,

    todayPayments,

    salesAgg,
    expensesAgg,

    todaySalesAgg,
    todayExpensesAgg,

    monthlySalesAgg,
    monthlyExpensesAgg,

    receivablesAgg,

    todayProductionCount,

    totalWorkers,

    todayAttendance,
  ] = await Promise.all([
    // ========================================================
    // STOCK
    // ========================================================

    Product.aggregate([
      {
        $match: {
          isDeleted: false,
          status: "active",
        },
      },

      {
        $group: {
          _id: null,

          totalCurrentStock: {
            $sum: {
              $convert: {
                input: {
                  $ifNull: ["$currentStock", 0],
                },
                to: "double",
                onError: 0,
                onNull: 0,
              },
            },
          },

          productCount: {
            $sum: 1,
          },
        },
      },
    ]),

    // ========================================================
    // LOW STOCK
    // ========================================================

    StockService.getLowStockProducts(),

    // ========================================================
    // LABOUR OUTSTANDING
    // ========================================================

    ReportService.getLabourOutstandingBalanceReport({}),

    // ========================================================
    // RECENT ATTENDANCE
    // ========================================================

    Attendance.find()
      .populate("worker", "name")
      .sort({
        date: -1,
        createdAt: -1,
      })
      .limit(10),

    // ========================================================
    // TODAY PAYMENTS
    // ========================================================

    Payment.find({
      paymentDate: {
        $gte: todayStart,
        $lte: todayEnd,
      },
    })
      .populate("worker", "name")
      .sort({
        paymentDate: -1,
        createdAt: -1,
      }),

    // ========================================================
    // TOTAL REVENUE + COGS
    // ========================================================

    Sale.aggregate([
      {
        $match: salesMatch,
      },

      {
        $group: {
          _id: null,

          totalRevenue: {
            $sum: {
              $ifNull: ["$grandTotal", 0],
            },
          },

          totalCOGS: {
            $sum: {
              $ifNull: ["$totalCost", 0],
            },
          },
        },
      },
    ]),

    // ========================================================
    // TOTAL EXPENSES
    // ========================================================

    Expense.aggregate([
      {
        $match: expenseMatch,
      },

      {
        $group: {
          _id: null,

          total: {
            $sum: {
              $ifNull: ["$amount", 0],
            },
          },
        },
      },
    ]),

    // ========================================================
    // TODAY SALES
    // ========================================================

    Sale.aggregate([
      {
        $match: todaySalesMatch,
      },

      {
        $group: {
          _id: null,

          total: {
            $sum: {
              $ifNull: ["$grandTotal", 0],
            },
          },
        },
      },
    ]),

    // ========================================================
    // TODAY EXPENSES
    // ========================================================

    Expense.aggregate([
      {
        $match: todayExpenseMatch,
      },

      {
        $group: {
          _id: null,

          total: {
            $sum: {
              $ifNull: ["$amount", 0],
            },
          },
        },
      },
    ]),

    // ========================================================
    // MONTHLY REVENUE + COGS
    // ========================================================

    Sale.aggregate([
      {
        $match: monthlySalesMatch,
      },

      {
        $group: {
          _id: null,

          totalRevenue: {
            $sum: {
              $ifNull: ["$grandTotal", 0],
            },
          },

          totalCOGS: {
            $sum: {
              $ifNull: ["$totalCost", 0],
            },
          },
        },
      },
    ]),

    // ========================================================
    // MONTHLY EXPENSES
    // ========================================================

    Expense.aggregate([
      {
        // FIXED:
        // monthlyExpensesMatch -> monthlyExpenseMatch
        $match: monthlyExpenseMatch,
      },

      {
        $group: {
          _id: null,

          total: {
            $sum: {
              $ifNull: ["$amount", 0],
            },
          },
        },
      },
    ]),

    // ========================================================
    // CLIENT RECEIVABLES
    // ========================================================

    Client.aggregate([
      {
        $match: {
          $or: [
            { isDeleted: false },
            { isDeleted: { $exists: false } },
          ],
        },
      },

      {
        $group: {
          _id: null,

          total: {
            $sum: {
              $ifNull: ["$outstandingBalance", 0],
            },
          },
        },
      },
    ]),

    // ========================================================
    // TODAY PRODUCTION
    // ========================================================

    Production.countDocuments({
      status: "Active",

      productionDate: {
        $gte: todayStart,
        $lte: todayEnd,
      },
    }),

    // ========================================================
    // TOTAL ACTIVE WORKERS
    // ========================================================

    Labour.countDocuments({
      isDeleted: false,
      status: "active",
    }),

    // ========================================================
    // TODAY ATTENDANCE
    // ========================================================

    Attendance.find({
      date: {
        $gte: todayStart,
        $lte: todayEnd,
      },
    })
      .populate("worker", "name")
      .sort({
        date: -1,
        createdAt: -1,
      }),
  ]);

  // ==========================================================
  // FINANCIAL CALCULATIONS
  // ==========================================================

  const totalRevenue = Number(
    salesAgg?.[0]?.totalRevenue || 0
  );

  const totalCOGS = Number(
    salesAgg?.[0]?.totalCOGS || 0
  );

  const grossProfit =
    totalRevenue - totalCOGS;

  const totalExpenses = Number(
    expensesAgg?.[0]?.total || 0
  );

  const netProfit =
    grossProfit - totalExpenses;

  // ==========================================================
  // TODAY FINANCIALS
  // ==========================================================

  const todaySales = Number(
    todaySalesAgg?.[0]?.total || 0
  );

  const todayExpenses = Number(
    todayExpensesAgg?.[0]?.total || 0
  );

  const todayProfit =
    todaySales - todayExpenses;

  // ==========================================================
  // MONTHLY FINANCIALS
  // ==========================================================

  const monthlyRevenue = Number(
    monthlySalesAgg?.[0]?.totalRevenue || 0
  );

  const monthlyCOGS = Number(
    monthlySalesAgg?.[0]?.totalCOGS || 0
  );

  const monthlyGrossProfit =
    monthlyRevenue - monthlyCOGS;

  const monthlyExpenses = Number(
    monthlyExpensesAgg?.[0]?.total || 0
  );

  const monthlyNetProfit =
    monthlyGrossProfit - monthlyExpenses;

  // ==========================================================
  // LABOUR OUTSTANDING
  // ==========================================================

  const pendingSalary = (
    labourOutstandingRows || []
  ).reduce((sum, row) => {
    const remaining = Number(
      row?.remainingBalance || 0
    );

    return sum + (remaining > 0 ? remaining : 0);
  }, 0);

  // ==========================================================
  // LOW STOCK
  // ==========================================================

  const lowStockProducts = (
    lowStockRaw || []
  ).map((item) => ({
    _id: item.productId,

    name: item.productName,

    quantity: Number(
      item.currentStock || 0
    ),
  }));

  // ==========================================================
  // ATTENDANCE
  //
  // Only ONE attendance record per worker
  // ==========================================================

  const attendanceByWorker = new Map();

  if (Array.isArray(todayAttendance)) {
    todayAttendance.forEach((record) => {
      const workerId =
        record?.worker?._id?.toString() ||
        record?.worker?.toString();

      if (!workerId) {
        return;
      }

      if (!attendanceByWorker.has(workerId)) {
        attendanceByWorker.set(
          workerId,
          record
        );
      }
    });
  }

  const uniqueTodayAttendance =
    Array.from(
      attendanceByWorker.values()
    );

  let presentToday = 0;
  let absentToday = 0;
  let leaveToday = 0;

  uniqueTodayAttendance.forEach(
    (record) => {
      const status = String(
        record?.status || ""
      ).toLowerCase();

      if (status === "present") {
        presentToday += 1;
      }

      if (status === "absent") {
        absentToday += 1;
      }

      if (status === "leave") {
        leaveToday += 1;
      }
    }
  );

  const recordedToday = Math.min(
    uniqueTodayAttendance.length,
    Number(totalWorkers || 0)
  );

  const attendanceCompleted =
    Number(totalWorkers || 0) > 0 &&
    recordedToday >=
      Number(totalWorkers || 0);

  // ==========================================================
  // TODAY PAYMENT TOTAL
  // ==========================================================

  const todayPaymentTotal = (
    todayPayments || []
  ).reduce((sum, payment) => {
    return (
      sum +
      Number(payment?.amount || 0)
    );
  }, 0);

  // ==========================================================
  // STOCK TOTAL
  // ==========================================================

  const totalProducts = Number(
    stockAgg?.[0]?.productCount || 0
  );

  const totalStock = Number(
    stockAgg?.[0]?.totalCurrentStock || 0
  );

  // ==========================================================
  // FINAL RESPONSE
  // ==========================================================

  return {
    // ========================================================
    // FINANCIAL
    // ========================================================

    totalRevenue: Number(totalRevenue),

    totalCOGS: Number(totalCOGS),

    grossProfit: Number(grossProfit),

    totalExpenses: Number(totalExpenses),

    netProfit: Number(netProfit),

    totalSales: Number(totalRevenue),

    // ========================================================
    // TODAY FINANCIALS
    // ========================================================

    todaySales: Number(todaySales),

    todayExpenses: Number(todayExpenses),

    todayProfit: Number(todayProfit),

    // ========================================================
    // MONTHLY FINANCIALS
    // ========================================================

    monthlyRevenue: Number(monthlyRevenue),

    monthlyCOGS: Number(monthlyCOGS),

    monthlyGrossProfit:
      Number(monthlyGrossProfit),

    monthlyExpenses:
      Number(monthlyExpenses),

    monthlyNetProfit:
      Number(monthlyNetProfit),

    // ========================================================
    // PAYMENTS
    // ========================================================

    todayPayments:
      todayPayments || [],

    todayPaymentTotal:
      Number(todayPaymentTotal),

    recentPayments:
      todayPayments || [],

    // ========================================================
    // ATTENDANCE
    // ========================================================

    totalWorkers:
      Number(totalWorkers || 0),

    presentToday:
      Number(presentToday),

    absentToday:
      Number(absentToday),

    leaveToday:
      Number(leaveToday),

    recordedToday:
      Number(recordedToday),

    attendanceRecordedToday:
      Number(recordedToday),

    recordedWorkersToday:
      Number(recordedToday),

    attendanceCompleted,

    todayAttendance:
      uniqueTodayAttendance,

    // ========================================================
    // STOCK
    // ========================================================

    totalProducts,

    totalStock,

    // Existing compatibility field
    currentStockUnits:
      totalStock,

    lowStockProducts,

    // ========================================================
    // LABOUR
    // ========================================================

    pendingSalary:
      Number(pendingSalary),

    // ========================================================
    // CLIENTS
    // ========================================================

    totalReceivables:
      Number(
        receivablesAgg?.[0]?.total || 0
      ),

    // ========================================================
    // ACTIVITY
    // ========================================================

    recentAttendance:
      recentAttendance || [],

    // ========================================================
    // PRODUCTION
    // ========================================================

    todayProductionCount:
      Number(todayProductionCount || 0),
  };
};

module.exports = {
  getDashboardData,
};