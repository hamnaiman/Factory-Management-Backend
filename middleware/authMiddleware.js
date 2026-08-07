const jwt = require("jsonwebtoken");
const User = require("../models/User");
const ApiError = require("../utils/apiError");

const protect = async (req, res, next) => {
  try {
    let token;

    // Read token from cookie
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return next(new ApiError(401, "Unauthorized. Please login."));
    }

    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return next(new ApiError(401, "User not found."));
    }

    req.user = user;

    next();
  } catch (error) {
    next(new ApiError(401, "Invalid or expired token."));
  }
};

module.exports = protect;