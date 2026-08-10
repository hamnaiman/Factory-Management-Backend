// server/controllers/purchaseController.js

const purchaseService = require("../services/purchaseService");

const addPurchase = async (req, res, next) => {
  try {
    const purchase = await purchaseService.createPurchase({
      ...req.body,
      createdBy: req.user?._id,
    });
    res.status(201).json({ success: true, data: purchase });
  } catch (err) {
    next(err);
  }
};

const getPurchases = async (req, res, next) => {
  try {
    const result = await purchaseService.getPurchases(req.query);
    res.status(200).json({ success: true, data: result.data, pagination: result.pagination });
  } catch (err) {
    next(err);
  }
};

const getPurchaseById = async (req, res, next) => {
  try {
    const purchase = await purchaseService.getPurchaseById(req.params.id);
    res.status(200).json({ success: true, data: purchase });
  } catch (err) {
    next(err);
  }
};

const editPurchase = async (req, res, next) => {
  try {
    const purchase = await purchaseService.updatePurchase(req.params.id, req.body, req.user?._id);
    res.status(200).json({ success: true, data: purchase });
  } catch (err) {
    next(err);
  }
};

const removePurchase = async (req, res, next) => {
  try {
    const purchase = await purchaseService.cancelPurchase(req.params.id, req.user?._id);
    res.status(200).json({ success: true, data: purchase });
  } catch (err) {
    next(err);
  }
};

const getVendorSummary = async (req, res, next) => {
  try {
    const summary = await purchaseService.getVendorPurchaseSummary(req.params.vendorId);
    res.status(200).json({ success: true, data: summary });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  addPurchase,
  getPurchases,
  getPurchaseById,
  editPurchase,
  removePurchase,
  getVendorSummary,
};