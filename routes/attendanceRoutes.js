const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
  createAttendance,
  getToday,
  attendanceHistory,
  attendanceByDate,
} = require("../controllers/attendanceController");

router.post("/", protect, createAttendance);
router.get("/today", protect, getToday);
router.get("/history", protect, attendanceHistory);
router.get("/:date", protect, attendanceByDate);

module.exports = router;