const clientLedgerService = require("../services/clientLedgerService");
const ApiResponse = require("../utils/apiResponse");

// Get Client Ledger
const getClientLedger = async (req, res, next) => {
  try {
    const ledger = await clientLedgerService.getClientLedger(
      req.params.id
    );

    res.status(200).json(
      new ApiResponse(
        200,
        true,
        "Client ledger fetched successfully",
        ledger
      )
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getClientLedger,
};