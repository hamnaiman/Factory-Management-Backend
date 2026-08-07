const Client = require("../models/Client");
const ClientPayment = require("../models/ClientPayment");
const clientLedgerService = require("./clientLedgerService");

const getClientProfile = async (clientId) => {
  const client = await Client.findOne({
    _id: clientId,
    status: "active",
  });

  if (!client) {
    throw new Error("Client not found");
  }

  const paymentHistory = await ClientPayment.find({
    client: clientId,
    status: "active",
  })
    .sort({ paymentDate: -1 })
    .populate("receivedBy", "name");

  const ledger = await clientLedgerService.getClientLedger(clientId);

  return {
    client,
    paymentHistory,
    ledger,
  };
};

module.exports = {
  getClientProfile,
};