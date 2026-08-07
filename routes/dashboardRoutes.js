const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");

const { dashboard } = require("../controllers/dashboardController");

router.get("/", protect, dashboard);

module.exports = router;