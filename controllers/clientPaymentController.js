const clientPaymentService = require("../services/clientPaymentService");
const ApiResponse = require("../utils/apiResponse");

// Receive Payment
const receivePayment = async (req, res, next) => {
  try {
    const payment = await clientPaymentService.receivePayment(
      req.params.id,
      req.body,
      req.user._id
    );

    res.status(201).json(
      new ApiResponse(
        201,
        true,
        "Payment received successfully",
        payment
      )
    );
  } catch (error) {
    next(error);
  }
};

// Get Client Payments
const getClientPayments = async (req, res, next) => {
  try {
    const payments = await clientPaymentService.getClientPayments(
      req.params.id
    );

    res.status(200).json(
      new ApiResponse(
        200,
        true,
        "Client payments fetched successfully",
        payments
      )
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  receivePayment,
  getClientPayments,
};