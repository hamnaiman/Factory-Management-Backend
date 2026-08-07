const {
  addPayment,
  getPayments,
  getWorkerPayments,
  updatePayment,
  deletePayment,
} = require("../services/paymentService");

const ApiResponse = require("../utils/apiResponse");

// Add Payment
const createPayment = async (req, res, next) => {
  try {
    const payment = await addPayment(req.body, req.user._id);

    res.status(201).json(
      new ApiResponse(
        201,
        true,
        "Payment added successfully",
        payment
      )
    );
  } catch (error) {
    next(error);
  }
};

// Get All Payments
const getAllPayments = async (req, res, next) => {
  try {
    const payments = await getPayments();

    res.status(200).json(
      new ApiResponse(
        200,
        true,
        "Payments fetched successfully",
        payments
      )
    );
  } catch (error) {
    next(error);
  }
};

// Get Payments of One Worker
const getPaymentsByWorker = async (req, res, next) => {
  try {
    const payments = await getWorkerPayments(req.params.id);

    res.status(200).json(
      new ApiResponse(
        200,
        true,
        "Worker payment history fetched successfully",
        payments
      )
    );
  } catch (error) {
    next(error);
  }
};

// Update Payment
const editPayment = async (req, res, next) => {
  try {
    const payment = await updatePayment(req.params.id, req.body);

    res.status(200).json(
      new ApiResponse(
        200,
        true,
        "Payment updated successfully",
        payment
      )
    );
  } catch (error) {
    next(error);
  }
};

// Delete Payment
const removePayment = async (req, res, next) => {
  try {
    await deletePayment(req.params.id);

    res.status(200).json(
      new ApiResponse(
        200,
        true,
        "Payment deleted successfully",
        null
      )
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPayment,
  getAllPayments,
  getPaymentsByWorker,
  editPayment,
  removePayment,
};