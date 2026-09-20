const {
  registerUser,
  loginUser,
} = require("../services/authService");

const ApiResponse = require("../utils/apiResponse");

const {
  loginCookieOptions,
  clearCookieOptions,
} = require("../utils/cookieOptions");

// ============================================================
// REGISTER
// ============================================================

const register = async (req, res, next) => {
  try {
    const user = await registerUser(req.body);

    return res.status(201).json(
      new ApiResponse(
        201,
        true,
        "Admin registered successfully",
        {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        }
      )
    );
  } catch (error) {
    return next(error);
  }
};

// ============================================================
// LOGIN
// ============================================================

const login = async (req, res, next) => {
  try {
    const { user, token } = await loginUser(req.body);

    if (!token) {
      return next(
        new Error("Authentication token was not generated.")
      );
    }

    /**
     * Set ONE canonical authentication cookie.
     *
     * path: "/" ensures that the cookie is available to:
     *
     * /api/auth/*
     * /api/products/*
     * /api/notifications/*
     * /api/users/*
     * etc.
     */
    res.cookie(
      "token",
      token,
      loginCookieOptions
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        true,
        "Login successful",
        {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
        }
      )
    );
  } catch (error) {
    return next(error);
  }
};

// ============================================================
// LOGOUT
// ============================================================

const logout = (req, res, next) => {
  try {
    /**
     * Clear the canonical authentication cookie.
     */
    res.clearCookie(
      "token",
      clearCookieOptions
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        true,
        "Logged out successfully",
        null
      )
    );
  } catch (error) {
    return next(error);
  }
};

// ============================================================
// CURRENT USER
// ============================================================

const getMe = (req, res, next) => {
  try {
    return res.status(200).json(
      new ApiResponse(
        200,
        true,
        "Current user fetched successfully",
        req.user
      )
    );
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  register,
  login,
  logout,
  getMe,
};