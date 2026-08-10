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
} = require("../controllers/expenseController");

// All expense routes require login
router.use(protect);

// Create Expense
router.post("/", createExpense);

// Get Total Expenses
// IMPORTANT: this must come BEFORE /:id
router.get("/total", getTotalExpenses);

// Get All Expenses
router.get("/", getAllExpenses);

// Get Single Expense
router.get("/:id", getSingleExpense);

// Update Expense
router.put("/:id", editExpense);

// Delete Expense
router.delete("/:id", removeExpense);

module.exports = router;