const express = require("express");

const router = express.Router();

const { register, login ,  logout,  getMe, } = require("../controllers/authController");
const {
  registerValidation,
  loginValidation,
} = require("../validators/authValidator");
const validateRequest = require("../middleware/validateRequest");

const protect = require("../middleware/authMiddleware");

router.post(
  "/register",
  registerValidation,
  validateRequest,
  register
);

router.post(
  "/login",
  loginValidation,
  validateRequest,
  login
);

router.post("/logout", logout);

router.get("/me", protect, getMe);

module.exports = router;