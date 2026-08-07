const Client = require("../models/Client");

// Get All Clients
const getClients = async (search = "", status = "") => {
  const filter = {
    status: "active",
  };

  if (search) {
    filter.$or = [
      {
        clientName: {
          $regex: search,
          $options: "i",
        },
      },
      {
        phoneNumber: {
          $regex: search,
          $options: "i",
        },
      },
    ];
  }

  if (status) {
    filter.status = status;
  }

  return await Client.find(filter).sort({
    createdAt: -1,
  });
};

// Get Client By Id
const getClientById = async (id) => {
  const client = await Client.findById(id);

  if (!client) {
    throw new Error("Client not found");
  }

  return client;
};

// Add Client
const createClient = async (clientData, userId) => {
  const existing = await Client.findOne({
    phoneNumber: clientData.phoneNumber,
  });

  if (existing) {
    throw new Error("Phone number already exists");
  }

  const client = await Client.create({
    ...clientData,
    outstandingBalance: Number(clientData.openingBalance || 0),
    createdBy: userId,
  });

  return client;
};

// Update Client
const updateClient = async (id, clientData) => {
  if (clientData.phoneNumber) {
    const existing = await Client.findOne({
      phoneNumber: clientData.phoneNumber,
      _id: { $ne: id },
    });

    if (existing) {
      throw new Error("Phone number already exists");
    }
  }

  if (clientData.openingBalance !== undefined) {
    clientData.outstandingBalance =
      Number(clientData.openingBalance || 0) +
      Number(clientData.totalPurchases || 0) -
      Number(clientData.totalPayments || 0);
  }

  const client = await Client.findOneAndUpdate(
    {
      _id: id,
      status: "active",
    },
    clientData,
    {
      new: true,
      runValidators: true,
    }
  );

  if (!client) {
    throw new Error("Active client not found");
  }

  return client;
};

// Soft Delete
const deleteClient = async (id) => {
  const client = await Client.findById(id);

  if (!client) {
    throw new Error("Client not found");
  }

  client.status = "inactive";

  await client.save();

  return client;
};

module.exports = {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
};