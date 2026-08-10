

const mongoose = require("mongoose");

const Sale = require("../models/Sale");
const Client = require("../models/Client");
const ClientLedger = require("../models/ClientLedger");
const StockMovement = require("../models/StockMovement");
const Product = require("../models/Product");
const Production = require("../models/Production");
const Labour = require("../models/Labour");
const Attendance = require("../models/Attendance");
const Payment = require("../models/Payment");

const StockService = require("./stockService");
const ProductionService = require("./productionService");

// NOTE: adjust this path/name if your client-ledger read logic lives in a
// differently named file — it's the service that exposes getClientLedger().
const { getClientLedger } = require("./clientLedgerService");

const toObjectId = (id) => new mongoose.Types.ObjectId(id);

const buildDateFilter = (field, fromDate, toDate) => {
  if (!fromDate && !toDate) return {};
  const range = {};
  if (fromDate) range.$gte = new Date(fromDate);
  if (toDate) range.$lte = new Date(toDate);
  return { [field]: range };
};

const dayBounds = (date) => {
  const target = date ? new Date(date) : new Date();
  const start = new Date(target);
  start.setHours(0, 0, 0, 0);
  const end = new Date(target);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

class ReportService {
  // ============================================================
  // 1-3. SALES REPORTS — Daily / Weekly / Monthly (via groupBy)
  // ============================================================
  async getSalesSummaryReport({ fromDate, toDate, groupBy = "day" } = {}) {
    const match = {
      saleStatus: "Completed",
      ...buildDateFilter("invoiceDate", fromDate, toDate),
    };

    const dateFormat =
      groupBy === "month" ? "%Y-%m" : groupBy === "week" ? "%G-W%V" : "%Y-%m-%d";

    const rows = await Sale.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: "$invoiceDate" } },
          totalSales: { $sum: "$grandTotal" },
          totalDiscount: { $sum: "$discount" },
          totalPaid: { $sum: "$paidAmount" },
          salesCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return rows.map((row) => ({
      period: row._id,
      totalSales: row.totalSales,
      totalDiscount: row.totalDiscount,
      totalPaid: row.totalPaid,
      salesCount: row.salesCount,
    }));
  }

  // ============================================================
  // 4. Product-wise Sales Report
  // ============================================================
  async getProductWiseSalesReport({ fromDate, toDate, product } = {}) {
    const match = {
      saleStatus: "Completed",
      ...buildDateFilter("invoiceDate", fromDate, toDate),
    };

    const pipeline = [{ $match: match }, { $unwind: "$items" }];

    if (product) {
      pipeline.push({ $match: { "items.product": toObjectId(product) } });
    }

    pipeline.push(
      {
        $group: {
          _id: "$items.product",
          productName: { $first: "$items.productName" },
          totalQuantitySold: { $sum: "$items.quantity" },
          totalRevenue: { $sum: "$items.amount" },
          salesCount: { $sum: 1 },
        },
      },
      { $sort: { totalRevenue: -1 } }
    );

    return Sale.aggregate(pipeline);
  }

  // ============================================================
  // 5. Client-wise Sales Report
  // ============================================================
  async getClientWiseSalesReport({ fromDate, toDate, client } = {}) {
    const match = {
      saleStatus: "Completed",
      ...buildDateFilter("invoiceDate", fromDate, toDate),
    };
    if (client) match.client = toObjectId(client);

    const rows = await Sale.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$client",
          totalSales: { $sum: "$grandTotal" },
          totalPaid: { $sum: "$paidAmount" },
          totalRemaining: { $sum: "$remainingBalance" },
          salesCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "clients",
          localField: "_id",
          foreignField: "_id",
          as: "clientInfo",
        },
      },
      { $unwind: { path: "$clientInfo", preserveNullAndEmptyArrays: true } },
      { $sort: { totalSales: -1 } },
    ]);

    return rows.map((row) => ({
      clientId: row._id,
      clientName: row.clientInfo?.clientName || "Unknown",
      companyName: row.clientInfo?.companyName || "",
      totalSales: row.totalSales,
      totalPaid: row.totalPaid,
      totalRemaining: row.totalRemaining,
      salesCount: row.salesCount,
    }));
  }

  // ============================================================
  // 6-7. Local / Imported Sales Report
  // ============================================================
  async getSalesByStockType({ stockType, fromDate, toDate } = {}) {
    if (!stockType) {
      throw new Error("stockType (Local or Imported) is required");
    }

    const match = {
      saleStatus: "Completed",
      ...buildDateFilter("invoiceDate", fromDate, toDate),
    };

    return Sale.aggregate([
      { $match: match },
      { $unwind: "$items" },
      { $match: { "items.stockType": stockType } },
      {
        $group: {
          _id: "$items.product",
          productName: { $first: "$items.productName" },
          totalQuantitySold: { $sum: "$items.quantity" },
          totalRevenue: { $sum: "$items.amount" },
        },
      },
      { $sort: { totalRevenue: -1 } },
    ]);
  }

  // ============================================================
  // 8-10. Stock Report / Local Stock Report / Imported Stock Report
  //       (reuse StockService — never re-query Product balance logic here)
  // ============================================================
  async getStockReport({ category, stockType } = {}) {
    return StockService.getInventoryList({ category, stockType });
  }

  async getLocalStockReport({ category } = {}) {
    return StockService.getInventoryList({ category, stockType: "Local" });
  }

  async getImportedStockReport({ category } = {}) {
    return StockService.getInventoryList({ category, stockType: "Imported" });
  }

  // ============================================================
  // 11. Stock Movement Report
  // ============================================================
  async getStockMovementReport({
    product,
    stockType,
    movementType,
    referenceType,
    fromDate,
    toDate,
    page = 1,
    limit = 50,
  } = {}) {
    const query = { isDeleted: false };
    if (product) query.product = product;
    if (stockType) query.stockType = stockType;
    if (movementType) query.movementType = movementType;
    if (referenceType) query.referenceType = referenceType;
    Object.assign(query, buildDateFilter("movementDate", fromDate, toDate));

    const skip = (Number(page) - 1) * Number(limit);

    const [data, totalRecords] = await Promise.all([
      StockMovement.find(query)
        .populate("product", "productName productCode unit")
        .populate("createdBy", "name")
        .sort({ movementDate: -1 })
        .skip(skip)
        .limit(Number(limit)),
      StockMovement.countDocuments(query),
    ]);

    return {
      data,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalRecords,
        totalPages: Math.ceil(totalRecords / limit) || 1,
      },
    };
  }

  // ============================================================
  // 12. Low Stock Report (reuse StockService)
  // ============================================================
  async getLowStockReport({ category, stockType } = {}) {
    return StockService.getLowStockProducts({ category, stockType });
  }

  // ============================================================
  // 13. Daily Production Report
  // ============================================================
  async getDailyProductionReport({ date } = {}) {
    const { start, end } = dayBounds(date);

    return Production.find({
      productionDate: { $gte: start, $lte: end },
      status: "Active",
    })
      .populate("finishedProduct", "productName productCode unit")
      .populate("rawMaterials.product", "productName productCode unit")
      .sort({ productionDate: -1 });
  }

  // ============================================================
  // 14. Production History Report (reuse ProductionService)
  // ============================================================
  async getProductionHistoryReport(filters = {}) {
    return ProductionService.getProductions(filters);
  }

  // ============================================================
  // 15. Raw Material Consumption Report
  // ============================================================
  async getRawMaterialConsumptionReport({ fromDate, toDate, product } = {}) {
    const match = {
      status: "Active",
      ...buildDateFilter("productionDate", fromDate, toDate),
    };

    const pipeline = [{ $match: match }, { $unwind: "$rawMaterials" }];

    if (product) {
      pipeline.push({ $match: { "rawMaterials.product": toObjectId(product) } });
    }

    pipeline.push(
      {
        $group: {
          _id: "$rawMaterials.product",
          productName: { $first: "$rawMaterials.productName" },
          totalQuantityUsed: { $sum: "$rawMaterials.quantityUsed" },
          usedInRuns: { $sum: 1 },
        },
      },
      { $sort: { totalQuantityUsed: -1 } }
    );

    return Production.aggregate(pipeline);
  }

  // ============================================================
  // 16. Finished Goods Stock Report
  // ============================================================
  async getFinishedGoodsStockReport({ category, stockType } = {}) {
    const query = {
      isDeleted: false,
      status: "active",
      productType: "Finished Product",
    };
    if (category) query.category = category;

    const products = await Product.find(query).sort({ productName: 1 });

    return products.map((p) => {
      let checkStock = p.currentStock || 0;
      if (stockType === "Local") checkStock = p.localStock || 0;
      if (stockType === "Imported") checkStock = p.importedStock || 0;

      return {
        productId: p._id,
        productName: p.productName,
        productCode: p.productCode,
        category: p.category,
        localStock: p.localStock || 0,
        importedStock: p.importedStock || 0,
        currentStock: p.currentStock || 0,
        minimumStock: p.minimumStock || 0,
        relevantStock: checkStock,
      };
    });
  }

  // ============================================================
  // 17. Client Outstanding Balance Report
  // ============================================================
  async getClientOutstandingBalanceReport({ minBalance } = {}) {
    const query = { isDeleted: false };
    if (minBalance !== undefined) {
      query.outstandingBalance = { $gte: Number(minBalance) };
    }

    return Client.find(query)
      .select("clientName companyName phone openingBalance totalPurchases totalPayments outstandingBalance")
      .sort({ outstandingBalance: -1 });
  }

  // ============================================================
  // 18. Client Payment Report
  // ============================================================
  async getClientPaymentReport({ client, fromDate, toDate } = {}) {
    const query = { type: "Payment", ...buildDateFilter("date", fromDate, toDate) };
    if (client) query.client = client;

    return ClientLedger.find(query)
      .populate("client", "clientName companyName phone")
      .populate("createdBy", "name")
      .sort({ date: -1 });
  }

  // ============================================================
  // 19. Client Ledger (reuse existing service as-is)
  // ============================================================
  async getClientLedgerReport(clientId, filters = {}) {
    return getClientLedger(clientId, filters);
  }

  // ============================================================
  // 20. Daily Attendance Report
  // ============================================================
  async getDailyAttendanceReport({ date } = {}) {
    const { start, end } = dayBounds(date);

    return Attendance.find({ date: { $gte: start, $lte: end } })
      .populate("worker", "name phone department dailyWage")
      .populate("markedBy", "name")
      .sort({ createdAt: -1 });
  }

  // ============================================================
  // 21. Monthly Attendance Report
  // ============================================================
  // async getMonthlyAttendanceReport({ month, year, worker } = {}) {
  //   const now = new Date();
  //   const targetMonth = month ? Number(month) - 1 : now.getMonth();
  //   const targetYear = year ? Number(year) : now.getFullYear();

  //   const start = new Date(targetYear, targetMonth, 1);
  //   const end = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

  //   const match = { date: { $gte: start, $lte: end } };
  //   if (worker) match.worker = toObjectId(worker);

  //   const rows = await Attendance.aggregate([
  //     { $match: match },
  //     {
  //       $group: {
  //         _id: { worker: "$worker", status: "$status" },
  //         count: { $sum: 1 },
  //       },
  //     },
  //   ]);

  //   const summaryMap = {};
  //   for (const row of rows) {
  //     const workerId = row._id.worker.toString();
  //     if (!summaryMap[workerId]) {
  //       summaryMap[workerId] = { present: 0, absent: 0, leave: 0 };
  //     }
  //     summaryMap[workerId][row._id.status] = row.count;
  //   }

  //   const workerIds = Object.keys(summaryMap);
  //   const labourers = await Labour.find({ _id: { $in: workerIds } }).select(
  //     "name phone department dailyWage"
  //   );

  //   return labourers.map((w) => {
  //     const counts = summaryMap[w._id.toString()] || { present: 0, absent: 0, leave: 0 };
  //     return {
  //       workerId: w._id,
  //       name: w.name,
  //       department: w.department,
  //       presentDays: counts.present,
  //       absentDays: counts.absent,
  //       leaveDays: counts.leave,
  //       totalMarkedDays: counts.present + counts.absent + counts.leave,
  //     };
  //   });
  // }
// ============================================================
// 21. Monthly Attendance Report
// Worker + Month + Year
// Returns DAILY attendance records
// ============================================================
async getMonthlyAttendanceReport({
  month,
  year,
  worker,
} = {}) {
  const now = new Date();

  const targetMonth = month
    ? Number(month) - 1
    : now.getMonth();

  const targetYear = year
    ? Number(year)
    : now.getFullYear();

  const start = new Date(
    targetYear,
    targetMonth,
    1,
    0,
    0,
    0,
    0
  );

  const end = new Date(
    targetYear,
    targetMonth + 1,
    0,
    23,
    59,
    59,
    999
  );

  const match = {
    date: {
      $gte: start,
      $lte: end,
    },
  };

  // Worker filter
  if (worker) {
    match.worker = toObjectId(worker);
  }

  const records = await Attendance.find(match)
    .populate(
      "worker",
      "name department dailyWage"
    )
    .sort({
      date: 1,
    });

  return records.map((record) => {
    const attendanceDate =
      new Date(record.date);

    return {
      date: attendanceDate,

      day: attendanceDate.toLocaleDateString(
        "en-US",
        {
          weekday: "long",
        }
      ),

      status: record.status,
    };
  });
}
  // ============================================================
  // 22. Labour Wage Report
  // ============================================================
  async getLabourWageReport({ fromDate, toDate, worker } = {}) {
    const match = { status: "present", ...buildDateFilter("date", fromDate, toDate) };
    if (worker) match.worker = toObjectId(worker);

    const presentCounts = await Attendance.aggregate([
      { $match: match },
      { $group: { _id: "$worker", presentDays: { $sum: 1 } } },
    ]);

    const workerIds = presentCounts.map((row) => row._id);
    const labourers = await Labour.find({ _id: { $in: workerIds } }).select(
      "name phone department dailyWage"
    );
    const labourMap = new Map(labourers.map((l) => [l._id.toString(), l]));

    return presentCounts.map((row) => {
      const labourInfo = labourMap.get(row._id.toString());
      const dailyWage = labourInfo?.dailyWage || 0;

      return {
        workerId: row._id,
        name: labourInfo?.name || "Unknown",
        department: labourInfo?.department,
        dailyWage,
        presentDays: row.presentDays,
        totalWagesEarned: row.presentDays * dailyWage,
      };
    });
  }

  // ============================================================
  // 23. Labour Payment Report
  // ============================================================
  async getLabourPaymentReport({ worker, paymentType, fromDate, toDate } = {}) {
    const query = { ...buildDateFilter("paymentDate", fromDate, toDate) };
    if (worker) query.worker = worker;
    if (paymentType) query.paymentType = paymentType;

    return Payment.find(query)
      .populate("worker", "name phone department")
      .populate("paidBy", "name")
      .sort({ paymentDate: -1 });
  }

  // ============================================================
  // 24. Labour Outstanding Balance Report
  //     Formula (per client spec, Section 13):
  //     Remaining = Total Wages Earned − Total Payments Made − Advances Adjusted
  // ============================================================
  async getLabourOutstandingBalanceReport({ fromDate, toDate, worker } = {}) {
    const wageReport = await this.getLabourWageReport({ fromDate, toDate, worker });

    const paymentMatch = { ...buildDateFilter("paymentDate", fromDate, toDate) };
    if (worker) paymentMatch.worker = toObjectId(worker);

    const paymentTotals = await Payment.aggregate([
      { $match: paymentMatch },
      {
        $group: {
          _id: { worker: "$worker", type: "$paymentType" },
          total: { $sum: "$amount" },
        },
      },
    ]);

    const paymentMap = {};
    for (const row of paymentTotals) {
      const workerId = row._id.worker.toString();
      if (!paymentMap[workerId]) paymentMap[workerId] = { Salary: 0, Advance: 0 };
      paymentMap[workerId][row._id.type] = row.total;
    }

    return wageReport.map((row) => {
      const payments = paymentMap[row.workerId.toString()] || { Salary: 0, Advance: 0 };
      const remainingBalance = row.totalWagesEarned - payments.Salary - payments.Advance;

      return {
        ...row,
        totalSalaryPaid: payments.Salary,
        totalAdvancePaid: payments.Advance,
        remainingBalance,
      };
    });
  }
}

module.exports = new ReportService();