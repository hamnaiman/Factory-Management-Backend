const {
  createLabour,
  getAllLabours,
  updateLabour,
  deleteLabour,
} = require("../services/labourService");

const ApiResponse = require("../utils/apiResponse");

const addLabour = async (req, res, next) => {
  try {
    const labour = await createLabour(req.body);

    res.status(201).json(
      new ApiResponse(
        201,
        true,
        "Worker added successfully",
        labour
      )
    );
  } catch (error) {
    next(error);
  }
};

const getLabours = async (req, res, next) => {
  try {
    const labours = await getAllLabours();

    res.status(200).json(
      new ApiResponse(
        200,
        true,
        "Workers fetched successfully",
        labours
      )
    );
  } catch (error) {
    next(error);
  }
};

const editLabour = async (req, res, next) => {
  try {
    const labour = await updateLabour(
      req.params.id,
      req.body
    );

    res.status(200).json(
      new ApiResponse(
        200,
        true,
        "Worker updated successfully",
        labour
      )
    );
  } catch (error) {
    next(error);
  }
};

const removeLabour = async (req, res, next) => {
  try {
    await deleteLabour(req.params.id);

    res.status(200).json(
      new ApiResponse(
        200,
        true,
        "Worker deleted successfully"
      )
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addLabour,
  getLabours,
  editLabour,
  removeLabour,
};