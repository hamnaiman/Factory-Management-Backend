const { calculateLabourSalary } = require("../services/salaryService");
const ApiResponse = require("../utils/apiResponse");

const getLabourSalary = async (req, res, next) => {
  try {
    const salary = await calculateLabourSalary(req.params.id);

    res.status(200).json(
      new ApiResponse(
        200,
        true,
        "Salary fetched successfully",
        salary
      )
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getLabourSalary,
};