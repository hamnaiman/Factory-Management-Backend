const jwt = require("jsonwebtoken");
const User = require("../models/User");
const ApiError = require("../utils/apiError");

const protect = async (req, res, next) => {
  try {
    let token = null;

    // ============================================================
    // READ TOKEN FROM COOKIE
    // ============================================================

    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    // Debug
    console.log("========== AUTH CHECK ==========");
    console.log("Cookies available:", !!req.cookies);
    console.log("Token available:", !!token);

    if (!token) {
      console.log("❌ No authentication token found.");
      return next(
        new ApiError(401, "Unauthorized. Please login.")
      );
    }

    // ============================================================
    // JWT SECRET CHECK
    // ============================================================

    if (!process.env.JWT_SECRET) {
      console.error("❌ JWT_SECRET is missing from environment.");
      return next(
        new ApiError(500, "JWT configuration is missing.")
      );
    }

    // ============================================================
    // VERIFY JWT
    // ============================================================

    let decoded;

    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );
    } catch (jwtError) {
      console.error("❌ JWT VERIFY ERROR:");
      console.error(jwtError);

      return next(
        new ApiError(
          401,
          "Invalid or expired token."
        )
      );
    }

    console.log("✅ JWT decoded:", decoded);

    // ============================================================
    // FIND USER
    // ============================================================

    const user = await User.findById(decoded.id)
      .select("-password");

    if (!user) {
      console.log(
        "❌ User not found for JWT ID:",
        decoded.id
      );

      return next(
        new ApiError(401, "User not found.")
      );
    }

    // ============================================================
    // ATTACH USER
    // ============================================================

    req.user = user;

    console.log(
      "✅ Authenticated user:",
      user.email || user.username || user._id
    );

    console.log("================================");

    next();

  } catch (error) {
    console.error("❌ AUTH MIDDLEWARE ERROR:");
    console.error(error);

    return next(
      new ApiError(
        500,
        "Authentication middleware error."
      )
    );
  }
};

module.exports = protect;