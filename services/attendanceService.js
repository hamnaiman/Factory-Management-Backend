const Attendance = require("../models/Attendance");

// =====================================================
// DATE HELPERS
// =====================================================

// Convert YYYY-MM-DD into UTC start/end range
const getDateRange = (date) => {
  if (!date) {
    throw new Error("Attendance date is required");
  }

  const start = new Date(`${date}T00:00:00.000Z`);

  if (Number.isNaN(start.getTime())) {
    throw new Error("Invalid attendance date");
  }

  const end = new Date(`${date}T23:59:59.999Z`);

  return {
    start,
    end,
  };
};

// =====================================================
// SAVE ATTENDANCE
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
      throw new Error("Attendance status is required");
    }

    if (!item.date) {
      throw new Error("Attendance date is required");
    }

    if (
      !["present", "absent", "leave"].includes(
        item.status
      )
    ) {
      throw new Error("Invalid attendance status");
    }

    const { start, end } = getDateRange(item.date);

    // Check whether this worker already has attendance
    // for this exact date.
    const existing = await Attendance.findOne({
      worker: item.worker,
      date: {
        $gte: start,
        $lte: end,
      },
    });

    // Do NOT create duplicate attendance.
    if (existing) {
      continue;
    }

    const record = await Attendance.create({
      worker: item.worker,
      status: item.status,

      // Store exact calendar date
      date: start,

      markedBy: adminId,
    });

    results.push(record);
  }

  if (results.length === 0) {
    throw new Error(
      "Attendance is already saved for the selected worker(s) and date."
    );
  }

  return results;
};

// =====================================================
// TODAY'S ATTENDANCE
// =====================================================

const getTodayAttendance = async () => {
  // Pakistan date
  const pakistanDate = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Asia/Karachi",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).format(new Date());

  const { start, end } = getDateRange(
    pakistanDate
  );

  return await Attendance.find({
    date: {
      $gte: start,
      $lte: end,
    },
  }).populate("worker");
};

// =====================================================
// ATTENDANCE BY DATE
// =====================================================

const getAttendanceByDate = async (date) => {
  const { start, end } = getDateRange(date);

  return await Attendance.find({
    date: {
      $gte: start,
      $lte: end,
    },
  }).populate("worker");
};

// =====================================================
// ATTENDANCE HISTORY
// =====================================================

const getAttendanceHistory = async () => {
  return await Attendance.aggregate([
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
              {
                $eq: ["$status", "present"],
              },
              1,
              0,
            ],
          },
        },

        absent: {
          $sum: {
            $cond: [
              {
                $eq: ["$status", "absent"],
              },
              1,
              0,
            ],
          },
        },

        leave: {
          $sum: {
            $cond: [
              {
                $eq: ["$status", "leave"],
              },
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