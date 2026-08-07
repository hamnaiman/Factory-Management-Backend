const clientProfileService = require("../services/clientProfileService");
const ApiResponse = require("../utils/apiResponse");

// Get Client Profile
const getClientProfile = async (req, res, next) => {
  try {
    const profile = await clientProfileService.getClientProfile(
      req.params.id
    );

    res.status(200).json(
      new ApiResponse(
        200,
        true,
        "Client profile fetched successfully",
        profile
      )
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getClientProfile,
};