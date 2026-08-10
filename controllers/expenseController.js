
const {
  addExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  getExpenseTotal,
} = require("../services/expenseService");

const ApiResponse = require("../utils/apiResponse");

// ============================================================
// CREATE
// ============================================================

const createExpense = async (req, res, next) => {
  try {
    const expense = await addExpense(
      req.body,
      req.user._id
    );

    res.status(201).json(
      new ApiResponse(
        201,
        true,
        "Expense added successfully",
        expense
      )
    );
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET ALL
// ============================================================

const getAllExpenses = async (req, res, next) => {
  try {
    const expenses = await getExpenses(req.query);

    res.status(200).json(
      new ApiResponse(
        200,
        true,
        "Expenses fetched successfully",
        expenses
      )
    );
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET BY ID
// ============================================================

const getSingleExpense = async (req, res, next) => {
  try {
    const expense = await getExpenseById(
      req.params.id
    );

    res.status(200).json(
      new ApiResponse(
        200,
        true,
        "Expense fetched successfully",
        expense
      )
    );
  } catch (error) {
    next(error);
  }
};

// ============================================================
// UPDATE
// ============================================================

const editExpense = async (req, res, next) => {
  try {
    const expense = await updateExpense(
      req.params.id,
      req.body
    );

    res.status(200).json(
      new ApiResponse(
        200,
        true,
        "Expense updated successfully",
        expense
      )
    );
  } catch (error) {
    next(error);
  }
};

// ============================================================
// DELETE
// ============================================================

const removeExpense = async (req, res, next) => {
  try {
    await deleteExpense(req.params.id);

    res.status(200).json(
      new ApiResponse(
        200,
        true,
        "Expense deleted successfully",
        null
      )
    );
  } catch (error) {
    next(error);
  }
};

// ============================================================
// TOTAL
// ============================================================

const getTotalExpenses = async (req, res, next) => {
  try {
    const total = await getExpenseTotal(req.query);

    res.status(200).json(
      new ApiResponse(
        200,
        true,
        "Expense total fetched successfully",
        total
      )
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createExpense,
  getAllExpenses,
  getSingleExpense,
  editExpense,
  removeExpense,
  getTotalExpenses,
};