const Labour = require("../models/Labour");
const ApiError = require("../utils/apiError");

const createLabour = async (data) => {
  const exists = await Labour.findOne({
    phone: data.phone,
  });

  if (exists) {
    throw new ApiError(409, "Phone number already exists.");
  }

  return await Labour.create(data);
};

const getAllLabours = async () => {
  return await Labour.find().sort({
    createdAt: -1,
  });
};

const updateLabour = async (id, data) => {
  const labour = await Labour.findByIdAndUpdate(
    id,
    data,
    {
      new: true,
      runValidators: true,
    }
  );

  if (!labour) {
    throw new ApiError(404, "Worker not found");
  }

  return labour;
};

const deleteLabour = async (id) => {
  const labour = await Labour.findByIdAndDelete(id);

  if (!labour) {
    throw new ApiError(404, "Worker not found");
  }

  return labour;
};

module.exports = {
  createLabour,
  getAllLabours,
  updateLabour,
  deleteLabour,
};