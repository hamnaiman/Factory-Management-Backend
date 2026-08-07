const clientService = require("../services/clientService");
const ApiResponse = require("../utils/apiResponse");

// Get All Clients
const getClients = async (req, res, next) => {
  try {
    const { search = "", status = "" } = req.query;

    const clients = await clientService.getClients(search, status);

    res.status(200).json(
      new ApiResponse(
        200,
        true,
        "Clients fetched successfully",
        clients
      )
    );
  } catch (error) {
    next(error);
  }
};

// Get Client By ID
const getClientById = async (req, res, next) => {
  try {
    const client = await clientService.getClientById(req.params.id);

    res.status(200).json(
      new ApiResponse(
        200,
        true,
        "Client fetched successfully",
        client
      )
    );
  } catch (error) {
    next(error);
  }
};

// Create Client
const createClient = async (req, res, next) => {
  try {
    const client = await clientService.createClient(
      req.body,
      req.user._id
    );

    res.status(201).json(
      new ApiResponse(
        201,
        true,
        "Client created successfully",
        client
      )
    );
  } catch (error) {
    next(error);
  }
};

// Update Client
const updateClient = async (req, res, next) => {
  try {
    const client = await clientService.updateClient(
      req.params.id,
      req.body
    );

    res.status(200).json(
      new ApiResponse(
        200,
        true,
        "Client updated successfully",
        client
      )
    );
  } catch (error) {
    next(error);
  }
};

// Delete Client
const deleteClient = async (req, res, next) => {
  try {
    await clientService.deleteClient(req.params.id);

    res.status(200).json(
      new ApiResponse(
        200,
        true,
        "Client deleted successfully",
        null
      )
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
};