const Client = require("../models/Client");
const ClientPayment = require("../models/ClientPayment");

// Receive Payment
const receivePayment = async (clientId, paymentData, userId) => {
  const client = await Client.findOne({
    _id: clientId,
    status: "active",
  });

  if (!client) {
    throw new Error("Client not found");
  }

  const amount = Number(paymentData.amount);

  if (amount <= 0) {
    throw new Error("Invalid payment amount");
  }

  if (amount > client.outstandingBalance) {
    throw new Error("Payment exceeds outstanding balance");
  }

  const payment = await ClientPayment.create({
    client: client._id,
    amount,
    paymentDate: paymentData.paymentDate || new Date(),
    paymentMethod: paymentData.paymentMethod,
    reference: paymentData.reference,
    notes: paymentData.notes,
    receivedBy: userId,
  });

  client.totalPayments += amount;

  client.outstandingBalance =
    Number(client.openingBalance) +
    Number(client.totalPurchases) -
    Number(client.totalPayments);

  await client.save();

  return payment;
};

// Get Client Payments
const getClientPayments = async (clientId) => {
  return await ClientPayment.find({
    client: clientId,
    status: "active",
  })
    .sort({
      paymentDate: -1,
    })
    .populate("receivedBy", "name");
};

module.exports = {
  receivePayment,
  getClientPayments,
};