const Labour = require("../models/Labour");
const Attendance = require("../models/Attendance");
const Payment = require("../models/Payment");

const calculateLabourSalary = async (workerId) => {
  const worker = await Labour.findById(workerId);

  if (!worker) throw new Error("Worker not found");

const presentDays = await Attendance.countDocuments({
  worker: workerId,
  status: "present",
});

const absentDays = await Attendance.countDocuments({
  worker: workerId,
  status: "absent",
});

const leaveDays = await Attendance.countDocuments({
  worker: workerId,
  status: "leave",
});

  const payments = await Payment.find({ worker: workerId });

  const paidAmount = payments.reduce(
    (sum, payment) => sum + payment.amount,
    0
  );

  const earnedSalary = presentDays * worker.dailyWage;

  const remainingSalary = earnedSalary - paidAmount;

  return {
    worker,
    presentDays,
    absentDays,
    leaveDays,
    dailyWage: worker.dailyWage,
    earnedSalary,
    paidAmount,
    remainingSalary,
  };
};

module.exports = {
  calculateLabourSalary,
};