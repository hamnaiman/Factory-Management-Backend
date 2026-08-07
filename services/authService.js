const bcrypt = require("bcrypt");
const User = require("../models/User");
const ApiError = require("../utils/apiError");
const generateToken = require("../utils/jwt");

const registerUser = async ({ name, email, password }) => {

  // Check if admin already exists
  const adminExists = await User.findOne({ role: "admin" });

  if (adminExists) {
    throw new ApiError(403, "Admin already exists. Please login.");
  }

  // Check duplicate email
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw new ApiError(409, "Email already exists");
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create Admin
  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role: "admin",
  });

  return user;
};


const loginUser = async ({ email, password }) => {

  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw new ApiError(401, "Invalid email or password");
  }

  const token = generateToken(user._id);

  return {
    user,
    token,
  };
};

const getCurrentUser = async (userId) => {
  const user = await User.findById(userId).select("-password");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return user;
};



module.exports = {
  registerUser,
  loginUser,
    getCurrentUser,
};