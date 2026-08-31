const { registerUser, loginUser } = require("../services/authService");
const ApiResponse = require("../utils/apiResponse");
const { loginCookieOptions, clearCookieOptions } = require("../utils/cookieOptions");

const register = async (req, res, next) => {
  try {
    const user = await registerUser(req.body);

    res.status(201).json(
      new ApiResponse(201, true, "Admin registered successfully", {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      })
    );
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { user, token } = await loginUser(req.body);

    // One-time cleanup for devices that already have a stale/duplicate
    // "token" cookie from before the path fix (e.g. path "/api/auth").
    // Clearing every possible old path first guarantees only ONE
    // correct cookie (path "/") remains after this response.
    res.clearCookie("token", { ...clearCookieOptions, path: "/api/auth" });
    res.clearCookie("token", { path: "/api/auth" }); // no options, in case it was set with defaults
    res.clearCookie("token", { path: "/" });

    res
      .cookie("token", token, loginCookieOptions)
      .status(200)
      .json(
        new ApiResponse(200, true, "Login successful", {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
        })
      );
  } catch (error) {
    next(error);
  }
};

const logout = (req, res) => {
  // Clear on every possible old path so nothing stale survives on
  // devices that had the pre-fix cookie.
  res.clearCookie("token", { ...clearCookieOptions, path: "/api/auth" });
  res.clearCookie("token", { path: "/api/auth" });
  res.clearCookie("token", clearCookieOptions); // path "/"

  return res.status(200).json(
    new ApiResponse(200, true, "Logged out successfully", null)
  );
};

const getMe = (req, res) => {
  res.status(200).json(
    new ApiResponse(200, true, "Current user fetched successfully", req.user)
  );
};

module.exports = {
  register,
  login,
  logout,
  getMe,
};