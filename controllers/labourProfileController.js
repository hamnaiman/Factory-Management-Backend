const { getLabourProfile } = require("../services/labourProfileService");
const ApiResponse = require("../utils/apiResponse");

const labourProfile = async (req, res, next) => {
  try {
    const profile = await getLabourProfile(req.params.id);

    res.status(200).json(
      new ApiResponse(
        200,
        true,
        "Labour profile fetched successfully",
        profile
      )
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  labourProfile,
};