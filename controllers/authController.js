const { registerUser, loginUser } = require("../services/authService");
const ApiResponse = require("../utils/apiResponse");

const register = async (req, res, next) => {
  try {
    const user = await registerUser(req.body);

    res.status(201).json(
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
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { user, token } = await loginUser(req.body);

    res
      .cookie("token", token, {
        httpOnly: true,
        secure: true,           // sameSite: "none" ke sath secure hamesha true hona chahiye
        sameSite: "none",       // "lax" se "none" — cross-site cookie ke liye zaroori
        maxAge: 24 * 60 * 60 * 1000,
      })
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
  res.clearCookie("token", {
    httpOnly: true,
    secure: true,
    sameSite: "none",   // yahan bhi match hona chahiye, warna clearCookie kaam nahi karega
  });

  return res.status(200).json(
    new ApiResponse(200, true, "Logged out successfully", null)
  );
};

const getMe = (req, res) => {
  res.status(200).json(
    new ApiResponse(
      200,
      true,
      "Current user fetched successfully",
      req.user
    )
  );
};

module.exports = {
  register,
  login,
  logout,
  getMe,
};