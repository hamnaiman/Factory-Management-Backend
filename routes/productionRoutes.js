// server/routes/productionRoutes.js

const express = require("express");
const router = express.Router();

const {
  createProduction,
  getProductions,
  getProductionById,
  updateProduction,
  cancelProduction,
} = require("../controllers/productionController");

// NOTE: this middleware is a default export (module.exports = protect),
// not { protect } — adjust the path below if your project keeps it
// somewhere other than ../middleware/authMiddleware.
const protect = require("../middleware/authMiddleware");

router.use(protect); // every route below now requires a valid login cookie

router.post("/", createProduction);
router.get("/", getProductions);
router.get("/:id", getProductionById);
router.put("/:id", updateProduction);
router.delete("/:id", cancelProduction);

module.exports = router;