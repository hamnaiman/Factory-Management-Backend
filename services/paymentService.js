const Payment = require("../models/Payment");

// Add Payment
const addPayment = async (paymentData, adminId) => {
  const payment = await Payment.create({
    ...paymentData,
    paidBy: adminId,
  });

  return payment.populate("worker", "name dailyWage");
};

// Get All Payments
const getPayments = async () => {
  return Payment.find()
    .populate("worker", "name dailyWage")
    .populate("paidBy", "name")
    .sort({ paymentDate: -1 });
};

// Get Payments By Worker
const getWorkerPayments = async (workerId) => {
  return Payment.find({
    worker: workerId,
  }).sort({ paymentDate: -1 });
};

// Update Payment
const updatePayment = async (id, data) => {
  return Payment.findByIdAndUpdate(
    id,
    data,
    {
      new: true,
      runValidators: true,
    }
  );
};

// Delete Payment
const deletePayment = async (id) => {
  return Payment.findByIdAndDelete(id);
};

module.exports = {
  addPayment,
  getPayments,
  getWorkerPayments,
  updatePayment,
  deletePayment,
};