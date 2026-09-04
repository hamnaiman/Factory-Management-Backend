const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
  createExpense,
  getAllExpenses,
  getSingleExpense,
  editExpense,
  removeExpense,
  getTotalExpenses,
  getAllLabourExpenses,
  getLabourExpensesTotal,
} = require("../controllers/expenseController");

// All expense routes require login
router.use(protect);

// Create Expense
router.post("/", createExpense);

// Get Total Expenses (Labour excluded)
// IMPORTANT: this must come BEFORE /:id
router.get("/total", getTotalExpenses);

// Labour Tab: Get Labour Expenses
// IMPORTANT: this must come BEFORE /:id
router.get("/labour", getAllLabourExpenses);

// Labour Tab: Get Labour Expenses Total
// IMPORTANT: this must come BEFORE /:id
router.get("/labour/total", getLabourExpensesTotal);

// Get All Expenses
router.get("/", getAllExpenses);

// Get Single Expense
router.get("/:id", getSingleExpense);

// Update Expense
router.put("/:id", editExpense);

// Delete Expense
router.delete("/:id", removeExpense);

module.exports = router;