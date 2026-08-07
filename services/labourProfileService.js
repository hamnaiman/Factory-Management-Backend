const Labour = require("../models/Labour");
const Attendance = require("../models/Attendance");
const Payment = require("../models/Payment");
const { calculateLabourSalary } = require("./salaryService");

const getLabourProfile = async (workerId) => {
  const worker = await Labour.findById(workerId);

  if (!worker) {
    throw new Error("Worker not found");
  }

  const attendanceHistory = await Attendance.find({
    worker: workerId,
  }).sort({ date: -1 });

  const paymentHistory = await Payment.find({
    worker: workerId,
  }).sort({ paymentDate: -1 });

  const salary = await calculateLabourSalary(workerId);

  return {
    worker,
    salary,
    attendanceHistory,
    paymentHistory,
  };
};

module.exports = {
  getLabourProfile,
};