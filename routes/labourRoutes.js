const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
  addLabour,
  getLabours,
  editLabour,
  removeLabour,
} = require("../controllers/labourController");

router.post("/", protect, addLabour);

router.get("/", protect, getLabours);

router.put("/:id", protect, editLabour);

router.delete("/:id", protect, removeLabour);

module.exports = router;