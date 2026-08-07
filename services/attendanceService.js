

const markAttendance = async (attendanceData, adminId) => {
  const now = new Date();

const start = new Date(
  now.getFullYear(),
  now.getMonth(),
  now.getDate(),
  0,
  0,
  0,
  0
);

const end = new Date(
  now.getFullYear(),
  now.getMonth(),
  now.getDate(),
  23,
  59,
  59,
  999
);

  await Attendance.deleteMany({
    date: {
      $gte: start,
      $lte: end,
    },
  });

  const records = attendanceData.map((item) => ({
    worker: item.worker,
    status: item.status,
    date: start,
    markedBy: adminId,
  }));

  return await Attendance.insertMany(records);
};

const Attendance = require("../models/Attendance");

const getTodayAttendance = async () => {
  const today = new Date();

  const start = new Date(today);
  start.setHours(0, 0, 0, 0);

  const end = new Date(today);
  end.setHours(23, 59, 59, 999);

  return await Attendance.find({
    date: {
      $gte: start,
      $lte: end,
    },
  }).populate("worker");
};

const getAttendanceHistory = async () => {
  return await Attendance.aggregate([
    {
      $group: {
      _id: {
  $dateToString: {
    format: "%Y-%m-%d",
    date: "$date",
    timezone: "Asia/Karachi",
  },
},
        total: { $sum: 1 },
        present: {
          $sum: {
            $cond: [{ $eq: ["$status", "present"] }, 1, 0],
          },
        },
        absent: {
          $sum: {
            $cond: [{ $eq: ["$status", "absent"] }, 1, 0],
          },
        },
        leave: {
          $sum: {
            $cond: [{ $eq: ["$status", "leave"] }, 1, 0],
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

const getAttendanceByDate = async (date) => {

  const start = new Date(date);

  start.setHours(0,0,0,0);

  const end = new Date(date);

  end.setHours(23,59,59,999);

  return await Attendance.find({

    date:{
      $gte:start,
      $lte:end
    }

  }).populate("worker");

};

module.exports = {
  markAttendance,
  getTodayAttendance,
  getAttendanceByDate,
  getAttendanceHistory,
};