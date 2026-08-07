// server/controllers/productionController.js

const ProductionService = require("../services/productionService");

const createProduction = async (req, res) => {
  try {
    const production = await ProductionService.createProduction({
      ...req.body,
      createdBy: req.user?._id,
    });

    res.status(201).json({ success: true, data: production });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getProductions = async (req, res) => {
  try {
    const productions = await ProductionService.getProductions(req.query);
    res.status(200).json({ success: true, data: productions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getProductionById = async (req, res) => {
  try {
    const production = await ProductionService.getProductionById(req.params.id);
    res.status(200).json({ success: true, data: production });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};

const updateProduction = async (req, res) => {
  try {
    const production = await ProductionService.updateProduction(
      req.params.id,
      req.body,
      req.user?._id
    );
    res.status(200).json({ success: true, data: production });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const cancelProduction = async (req, res) => {
  try {
    const production = await ProductionService.cancelProduction(req.params.id, req.user?._id);
    res.status(200).json({ success: true, data: production });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  createProduction,
  getProductions,
  getProductionById,
  updateProduction,
  cancelProduction,
};