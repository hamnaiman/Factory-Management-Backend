const Payment = require("../models/Payment");
const Labour = require("../models/Labour");
const ApiError = require("../utils/apiError");

const {
  createLabourExpense,
  updateLabourExpense,
  deleteLabourExpense,
} = require("./expenseService");

// ============================================================
// ADD PAYMENT
// ============================================================

const addPayment = async (data, userId) => {
  const {
    worker,
    amount,
    paymentDate,
    paymentMethod = "Cash",
    paymentType = "Salary",
    remark,
  } = data;

  if (!worker) {
    throw new ApiError(400, "Worker is required.");
  }

  if (!amount || Number(amount) <= 0) {
    throw new ApiError(
      400,
      "Payment amount must be greater than 0."
    );
  }

  const labour = await Labour.findById(worker);

  if (!labour) {
    throw new ApiError(404, "Worker not found.");
  }

  // ----------------------------------------------------------
  // Create payment
  // ----------------------------------------------------------

  const payment = await Payment.create({
    worker,
    amount: Number(amount),
    paymentDate: paymentDate || new Date(),
    paymentMethod,
    paymentType,
    remark,
    paidBy: userId,
  });

  // ----------------------------------------------------------
  // Automatically create Expense
  // ----------------------------------------------------------

  await createLabourExpense({
    paymentId: payment._id,
    workerName:
      labour.name ||
      labour.workerName ||
      labour.fullName ||
      "Worker",
    amount: payment.amount,
    date: payment.paymentDate,
    notes: payment.remark,
    userId,
  });

  // ----------------------------------------------------------
  // Return populated payment
  // ----------------------------------------------------------

  return await Payment.findById(payment._id)
    .populate("worker")
    .populate("paidBy", "name email");
};

// ============================================================
// GET ALL PAYMENTS
// ============================================================

const getPayments = async () => {
  return await Payment.find()
    .populate("worker")
    .populate("paidBy", "name email")
    .sort({
      paymentDate: -1,
      createdAt: -1,
    });
};

// ============================================================
// GET WORKER PAYMENT HISTORY
// ============================================================

const getWorkerPayments = async (workerId) => {
  const labour = await Labour.findById(workerId);

  if (!labour) {
    throw new ApiError(404, "Worker not found.");
  }

  return await Payment.find({
    worker: workerId,
  })
    .populate("worker")
    .populate("paidBy", "name email")
    .sort({
      paymentDate: -1,
      createdAt: -1,
    });
};

// ============================================================
// UPDATE PAYMENT
// ============================================================

const updatePayment = async (id, data) => {
  const payment = await Payment.findById(id);

  if (!payment) {
    throw new ApiError(404, "Payment not found.");
  }

  // ----------------------------------------------------------
  // Validate worker if changed
  // ----------------------------------------------------------

  let workerId = payment.worker;

  if (data.worker !== undefined) {
    const labour = await Labour.findById(data.worker);

    if (!labour) {
      throw new ApiError(404, "Worker not found.");
    }

    workerId = data.worker;
  }

  // ----------------------------------------------------------
  // Update payment
  // ----------------------------------------------------------

  const updatedPayment =
    await Payment.findByIdAndUpdate(
      id,
      {
        ...(data.worker !== undefined && {
          worker: data.worker,
        }),

        ...(data.amount !== undefined && {
          amount: Number(data.amount),
        }),

        ...(data.paymentDate !== undefined && {
          paymentDate: data.paymentDate,
        }),

        ...(data.paymentMethod !== undefined && {
          paymentMethod: data.paymentMethod,
        }),

        ...(data.paymentType !== undefined && {
          paymentType: data.paymentType,
        }),

        ...(data.remark !== undefined && {
          remark: data.remark,
        }),
      },
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("worker")
      .populate("paidBy", "name email");

  // ----------------------------------------------------------
  // Sync related Labour Expense
  // ----------------------------------------------------------

  const labour = await Labour.findById(workerId);

  if (labour) {
    await updateLabourExpense({
      paymentId: updatedPayment._id,
      workerName:
        labour.name ||
        labour.workerName ||
        labour.fullName ||
        "Worker",
      amount: updatedPayment.amount,
      date: updatedPayment.paymentDate,
      notes: updatedPayment.remark,
    });
  }

  return updatedPayment;
};

// ============================================================
// DELETE PAYMENT
// ============================================================

const deletePayment = async (id) => {
  const payment = await Payment.findById(id);

  if (!payment) {
    throw new ApiError(404, "Payment not found.");
  }

  // ----------------------------------------------------------
  // Delete/soft-delete linked Labour Expense first
  // ----------------------------------------------------------

  await deleteLabourExpense(payment._id);

  // ----------------------------------------------------------
  // Delete payment
  // ----------------------------------------------------------

  await Payment.findByIdAndDelete(id);

  return payment;
};

// ============================================================
// WORKER PAYMENT SUMMARY
// ============================================================

const getWorkerPaymentSummary = async (workerId) => {
  const labour = await Labour.findById(workerId);

  if (!labour) {
    throw new ApiError(404, "Worker not found.");
  }

  const result = await Payment.aggregate([
    {
      $match: {
        worker: labour._id,
      },
    },
    {
      $group: {
        _id: null,

        totalPaid: {
          $sum: "$amount",
        },

        salaryPaid: {
          $sum: {
            $cond: [
              {
                $eq: [
                  "$paymentType",
                  "Salary",
                ],
              },
              "$amount",
              0,
            ],
          },
        },

        advancePaid: {
          $sum: {
            $cond: [
              {
                $eq: [
                  "$paymentType",
                  "Advance",
                ],
              },
              "$amount",
              0,
            ],
          },
        },
      },
    },
  ]);

  const summary = result[0] || {
    totalPaid: 0,
    salaryPaid: 0,
    advancePaid: 0,
  };

  return {
    worker: labour,
    totalPaid: summary.totalPaid || 0,
    salaryPaid: summary.salaryPaid || 0,
    advancePaid: summary.advancePaid || 0,
  };
};

module.exports = {
  addPayment,
  getPayments,
  getWorkerPayments,
  updatePayment,
  deletePayment,
  getWorkerPaymentSummary,
};