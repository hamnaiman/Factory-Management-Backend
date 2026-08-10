const Expense = require("../models/Expense");

// ============================================================
// CREATE NORMAL EXPENSE
// ============================================================

const addExpense = async (expenseData, userId) => {
  const expense = await Expense.create({
    ...expenseData,
    amount: Number(expenseData.amount || 0),
    createdBy: userId,
    sourceType: expenseData.sourceType || "Manual",
  });

  return expense;
};

// ============================================================
// CREATE AUTOMATIC LABOUR EXPENSE
// ============================================================

const createLabourExpense = async ({
  paymentId,
  workerName,
  amount,
  date,
  notes,
  userId,
}) => {
  if (!paymentId) {
    throw new Error("Labour payment ID is required.");
  }

  const paymentAmount = Number(amount || 0);

  if (paymentAmount <= 0) {
    throw new Error(
      "Labour payment amount must be greater than 0."
    );
  }

  // ----------------------------------------------------------
  // Prevent duplicate expense
  // ----------------------------------------------------------

  const existingExpense = await Expense.findOne({
    sourceType: "LabourPayment",
    sourceId: paymentId,
    isDeleted: false,
  });

  if (existingExpense) {
    return existingExpense;
  }

  // ----------------------------------------------------------
  // Create expense
  // ----------------------------------------------------------

  const expense = await Expense.create({
    title: `Labour Payment - ${workerName || "Worker"}`,
    category: "Labour",
    amount: paymentAmount,
    date: date || new Date(),

    notes:
      notes ||
      "Automatic expense created from labour payment.",

    sourceType: "LabourPayment",
    sourceId: paymentId,

    createdBy: userId,
  });

  return expense;
};

// ============================================================
// UPDATE AUTOMATIC LABOUR EXPENSE
// ============================================================

const updateLabourExpense = async ({
  paymentId,
  workerName,
  amount,
  date,
  notes,
}) => {
  if (!paymentId) {
    return null;
  }

  const expense = await Expense.findOne({
    sourceType: "LabourPayment",
    sourceId: paymentId,
    isDeleted: false,
  });

  if (!expense) {
    return null;
  }

  expense.title = `Labour Payment - ${workerName || "Worker"}`;
  expense.category = "Labour";
  expense.amount = Number(amount || 0);

  if (date) {
    expense.date = date;
  }

  if (notes) {
    expense.notes = notes;
  }

  await expense.save();

  return expense;
};

// ============================================================
// DELETE AUTOMATIC LABOUR EXPENSE
// ============================================================

const deleteLabourExpense = async (paymentId) => {
  if (!paymentId) {
    return null;
  }

  const expense = await Expense.findOne({
    sourceType: "LabourPayment",
    sourceId: paymentId,
    isDeleted: false,
  });

  if (!expense) {
    return null;
  }

  expense.isDeleted = true;
  expense.deletedAt = new Date();

  await expense.save();

  return expense;
};

// ============================================================
// GET ALL EXPENSES
// ============================================================

const getExpenses = async (query = {}) => {
  const filter = {
    isDeleted: false,
  };

  // Category
  if (query.category && query.category !== "all") {
    filter.category = query.category;
  }

  // Date
  if (query.fromDate || query.toDate) {
    filter.date = {};

    if (query.fromDate) {
      const fromDate = new Date(query.fromDate);
      fromDate.setHours(0, 0, 0, 0);

      filter.date.$gte = fromDate;
    }

    if (query.toDate) {
      const toDate = new Date(query.toDate);
      toDate.setHours(23, 59, 59, 999);

      filter.date.$lte = toDate;
    }
  }

  // Search
  if (query.keyword || query.search) {
    const search = query.keyword || query.search;

    filter.$or = [
      {
        title: {
          $regex: search,
          $options: "i",
        },
      },
      {
        category: {
          $regex: search,
          $options: "i",
        },
      },
      {
        notes: {
          $regex: search,
          $options: "i",
        },
      },
    ];
  }

  return await Expense.find(filter)
    .populate("createdBy", "name email")
    .sort({
      date: -1,
      createdAt: -1,
    });
};

// ============================================================
// GET SINGLE EXPENSE
// ============================================================

const getExpenseById = async (id) => {
  const expense = await Expense.findOne({
    _id: id,
    isDeleted: false,
  }).populate("createdBy", "name email");

  if (!expense) {
    throw new Error("Expense not found");
  }

  return expense;
};

// ============================================================
// UPDATE EXPENSE
// ============================================================

const updateExpense = async (id, expenseData) => {
  const expense = await Expense.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!expense) {
    throw new Error("Expense not found");
  }

  // ----------------------------------------------------------
  // Do not allow manual editing of automatically generated
  // labour expenses from the normal Expense screen.
  // ----------------------------------------------------------

  if (expense.sourceType === "LabourPayment") {
    throw new Error(
      "Labour payment expenses must be updated from the payment record."
    );
  }

  Object.assign(expense, {
    ...expenseData,
    amount: Number(
      expenseData.amount ?? expense.amount
    ),
  });

  await expense.save();

  return expense;
};

// ============================================================
// DELETE EXPENSE
// ============================================================

const deleteExpense = async (id) => {
  const expense = await Expense.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!expense) {
    throw new Error("Expense not found");
  }

  // ----------------------------------------------------------
  // Labour expense should not be deleted independently
  // ----------------------------------------------------------

  if (expense.sourceType === "LabourPayment") {
    throw new Error(
      "Labour payment expenses cannot be deleted separately. Delete the related payment instead."
    );
  }

  expense.isDeleted = true;
  expense.deletedAt = new Date();

  await expense.save();

  return expense;
};

// ============================================================
// TOTAL EXPENSES
// ============================================================

const getExpenseTotal = async (query = {}) => {
  const filter = {
    isDeleted: false,
  };

  // Category
  if (query.category && query.category !== "all") {
    filter.category = query.category;
  }

  // Date
  if (query.fromDate || query.toDate) {
    filter.date = {};

    if (query.fromDate) {
      const fromDate = new Date(query.fromDate);
      fromDate.setHours(0, 0, 0, 0);

      filter.date.$gte = fromDate;
    }

    if (query.toDate) {
      const toDate = new Date(query.toDate);
      toDate.setHours(23, 59, 59, 999);

      filter.date.$lte = toDate;
    }
  }

  const result = await Expense.aggregate([
    {
      $match: filter,
    },
    {
      $group: {
        _id: null,

        totalExpenses: {
          $sum: {
            $ifNull: ["$amount", 0],
          },
        },
      },
    },
  ]);

  return {
    totalExpenses:
      result.length > 0
        ? Number(result[0].totalExpenses)
        : 0,
  };
};

module.exports = {
  addExpense,
  createLabourExpense,
  updateLabourExpense,
  deleteLabourExpense,

  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  getExpenseTotal,
};