// server/routes/notificationRoutes.js

const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const { notifications } = require("../controllers/notificationController");

router.get("/", protect, notifications);

module.exports = router;