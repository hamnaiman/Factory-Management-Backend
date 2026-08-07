const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
  getLabourSalary,
} = require("../controllers/salaryController");

router.get("/:id", protect, getLabourSalary);

module.exports = router;