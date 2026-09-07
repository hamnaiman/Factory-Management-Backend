const Labour = require("../models/Labour");
const ApiError = require("../utils/apiError");

const createLabour = async (data) => {
  const exists = await Labour.findOne({
    phone: data.phone,
  });

  if (exists) {
    throw new ApiError(409, "Phone number already exists.");
  }

  // CNIC empty ho to field remove kar do
  if (!data.cnic || data.cnic.trim() === "") {
    delete data.cnic;
  }

  return await Labour.create(data);
};
const updateLabour = async (id, data) => {
  if (!data.cnic || data.cnic.trim() === "") {
    delete data.cnic;
  }

  const labour = await Labour.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });

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