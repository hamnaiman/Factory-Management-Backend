const Client = require("../models/Client");
const ClientLedger = require("../models/ClientLedger");

const getClientLedger = async (clientId, filters = {}) => {
  const { fromDate, toDate } = filters;

  const client = await Client.findOne({ _id: clientId, isDeleted: false });

  if (!client) {
    throw new Error("Client not found");
  }

  // 1. Build Query
  const query = { client: clientId };

  if (fromDate || toDate) {
    query.createdAt = {};
    if (fromDate) query.createdAt.$gte = new Date(fromDate);
    if (toDate) query.createdAt.$lte = new Date(toDate);
  }

  // 2. Fetch all entries (Sales, Updates, Cancellations & Payments) sorted by date
  const ledgerEntries = await ClientLedger.find(query)
    .sort({ createdAt: 1 })
    .populate("createdBy", "name")
    .lean();

  // 3. Format response aligned with FMS requirements
  return {
    clientSummary: {
      _id: client._id,
      clientName: client.clientName,
      companyName: client.companyName,
      phone: client.phone,
      openingBalance: Number(client.openingBalance || 0),
      totalPurchases: Number(client.totalPurchases || 0),
      totalPayments: Number(client.totalPayments || 0),
      outstandingBalance: Number(client.outstandingBalance || 0),
    },
    ledger: ledgerEntries.map((entry) => ({
      _id: entry._id,
      date: entry.createdAt,
      type: entry.type,
      description: entry.description,
      invoiceNumber: entry.invoiceNumber || "-",
      referenceId: entry.referenceId,
      debit: Number(entry.debit || 0),
      credit: Number(entry.credit || 0),
      balance: Number(entry.balance || 0),
      createdBy: entry.createdBy?.name || "System",
    })),
  };
};

module.exports = {
  getClientLedger,
};