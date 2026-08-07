const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const { labourProfile } = require("../controllers/labourProfileController");

router.get("/:id", protect, labourProfile);

module.exports = router;