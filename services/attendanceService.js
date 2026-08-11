const Attendance = require("../models/Attendance");

// =====================================================
// DATE HELPERS
// =====================================================

const getDateRange = (date) => {
  if (!date) {
    throw new Error("Attendance date is required");
  }

  const dateString = String(date).trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    throw new Error("Invalid attendance date. Use YYYY-MM-DD");
  }

  const start = new Date(`${dateString}T00:00:00.000Z`);
  const end = new Date(`${dateString}T23:59:59.999Z`);

  if (Number.isNaN(start.getTime())) {
    throw new Error("Invalid attendance date");
  }

  return {
    start,
    end,
  };
};

// =====================================================
// SAVE / UPDATE ATTENDANCE
// =====================================================

const markAttendance = async (attendanceData, adminId) => {
  if (!Array.isArray(attendanceData)) {
    throw new Error("Attendance data must be an array");
  }

  if (attendanceData.length === 0) {
    throw new Error("Please select attendance");
  }

  if (!adminId) {
    throw new Error("Admin authentication required");
  }

  const results = [];

  for (const item of attendanceData) {
    if (!item.worker) {
      throw new Error("Worker is required");
    }

    if (!item.status) {
      throw new Error(
        `Attendance status is required for worker ${item.worker}`
      );
    }

    if (!item.date) {
      throw new Error("Attendance date is required");
    }

    const status = String(item.status).toLowerCase().trim();

    if (!["present", "absent", "leave"].includes(status)) {
      throw new Error(`Invalid attendance status: ${item.status}`);
    }

    const { start, end } = getDateRange(item.date);

    // =================================================
    // FIND EXISTING RECORD
    // =================================================

    const existing = await Attendance.findOne({
      worker: item.worker,
      date: {
        $gte: start,
        $lte: end,
      },
    });

    // =================================================
    // IF EXISTS → UPDATE
    // NEVER CREATE SECOND RECORD
    // =================================================

    if (existing) {
      existing.status = status;
      existing.markedBy = adminId;

      const updatedRecord = await existing.save();

      results.push(updatedRecord);
      continue;
    }

    // =================================================
    // IF DOES NOT EXIST → CREATE
    // =================================================

    const newRecord = await Attendance.create({
      worker: item.worker,
      date: start,
      status,
      markedBy: adminId,
    });

    results.push(newRecord);
  }

  return results;
};

// =====================================================
// TODAY'S ATTENDANCE
// =====================================================

const getTodayAttendance = async () => {
  const pakistanDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const { start, end } = getDateRange(pakistanDate);

  return Attendance.find({
    date: {
      $gte: start,
      $lte: end,
    },
  })
    .populate("worker")
    .sort({ createdAt: -1 });
};

// =====================================================
// ATTENDANCE BY DATE
// =====================================================

const getAttendanceByDate = async (date) => {
  const { start, end } = getDateRange(date);

  return Attendance.find({
    date: {
      $gte: start,
      $lte: end,
    },
  })
    .populate("worker")
    .sort({ createdAt: -1 });
};

// =====================================================
// ATTENDANCE HISTORY
// =====================================================

const getAttendanceHistory = async () => {
  return Attendance.aggregate([
    {
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$date",
          },
        },

        total: {
          $sum: 1,
        },

        present: {
          $sum: {
            $cond: [
              { $eq: ["$status", "present"] },
              1,
              0,
            ],
          },
        },

        absent: {
          $sum: {
            $cond: [
              { $eq: ["$status", "absent"] },
              1,
              0,
            ],
          },
        },

        leave: {
          $sum: {
            $cond: [
              { $eq: ["$status", "leave"] },
              1,
              0,
            ],
          },
        },
      },
    },

    {
      $sort: {
        _id: -1,
      },
    },
  ]);
};

module.exports = {
  markAttendance,
  getTodayAttendance,
  getAttendanceHistory,
  getAttendanceByDate,
};