const Client = require("../models/Client");
const Sale = require("../models/Sale");

// =====================================================
// GET ALL CLIENTS
// =====================================================

const getClients = async (search = "", status = "") => {
    const filter = {
        status: status || "active",
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

    const clients = await Client.find(filter)
        .sort({
            createdAt: -1,
        })
        .lean();

    // =================================================
    // CALCULATE SALES DATA FOR EACH CLIENT
    // =================================================

    const clientIds = clients.map((client) => client._id);

    if (clientIds.length === 0) {
        return [];
    }

    const salesSummary = await Sale.aggregate([
        {
            $match: {
                client: {
                    $in: clientIds,
                },

                // Cancelled sales should not count
                saleStatus: {
                    $ne: "Cancelled",
                },
            },
        },

        {
            $group: {
                _id: "$client",

                // Total value of all sales
                totalPurchases: {
                    $sum: "$grandTotal",
                },

                // Total amount received from sales
                totalReceived: {
                    $sum: "$paidAmount",
                },

                // Total outstanding from sales
                totalOutstanding: {
                    $sum: "$remainingBalance",
                },
            },
        },
    ]);

    // =================================================
    // MAP SALES DATA BY CLIENT ID
    // =================================================

    const salesMap = new Map();

    salesSummary.forEach((item) => {
        salesMap.set(
            String(item._id),
            {
                totalPurchases:
                    Number(item.totalPurchases) || 0,

                totalReceived:
                    Number(item.totalReceived) || 0,

                totalOutstanding:
                    Number(item.totalOutstanding) || 0,
            }
        );
    });

    // =================================================
    // ATTACH SALES DATA TO CLIENT
    // =================================================

    return clients.map((client) => {
        const sales =
            salesMap.get(String(client._id)) || {
                totalPurchases: 0,
                totalReceived: 0,
                totalOutstanding: 0,
            };

        const openingBalance =
            Number(client.openingBalance) || 0;

        const totalPurchases =
            sales.totalPurchases;

        const totalReceived =
            sales.totalReceived;

        // Opening balance + sales - received
        const outstandingBalance =
            openingBalance +
            totalPurchases -
            totalReceived;

        return {
            ...client,

            // Sales based values
            totalPurchases,

            totalReceived,

            outstandingBalance:
                Math.max(0, outstandingBalance),
        };
    });
};


// =====================================================
// GET CLIENT BY ID
// =====================================================

const getClientById = async (id) => {
    const client = await Client.findById(id);

    if (!client) {
        throw new Error("Client not found");
    }

    return client;
};


// =====================================================
// CREATE CLIENT
// =====================================================

const createClient = async (clientData, userId) => {
    const existing = await Client.findOne({
        phoneNumber: clientData.phoneNumber,
    });

    if (existing) {
        throw new Error("Phone number already exists");
    }

    const client = await Client.create({
        ...clientData,

        outstandingBalance:
            Number(clientData.openingBalance || 0),

        createdBy: userId,
    });

    return client;
};


// =====================================================
// UPDATE CLIENT
// =====================================================

const updateClient = async (id, clientData) => {
    if (clientData.phoneNumber) {
        const existing = await Client.findOne({
            phoneNumber: clientData.phoneNumber,
            _id: {
                $ne: id,
            },
        });

        if (existing) {
            throw new Error(
                "Phone number already exists"
            );
        }
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
        throw new Error(
            "Active client not found"
        );
    }

    return client;
};


// =====================================================
// SOFT DELETE
// =====================================================

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