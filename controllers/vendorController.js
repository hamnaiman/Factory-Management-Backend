// server/controllers/vendorController.js

const vendorService = require("../services/vendorService");

const addVendor = async (req, res, next) => {
  try {
    const vendor = await vendorService.createVendor(req.body);
    res.status(201).json({ success: true, data: vendor });
  } catch (err) {
    next(err);
  }
};

const getVendors = async (req, res, next) => {
  try {
    const vendors = await vendorService.getVendors(req.query);
    res.status(200).json({ success: true, data: vendors });
  } catch (err) {
    next(err);
  }
};

const getVendorById = async (req, res, next) => {
  try {
    const vendor = await vendorService.getVendorById(req.params.id);
    res.status(200).json({ success: true, data: vendor });
  } catch (err) {
    next(err);
  }
};

const editVendor = async (req, res, next) => {
  try {
    const vendor = await vendorService.updateVendor(req.params.id, req.body);
    res.status(200).json({ success: true, data: vendor });
  } catch (err) {
    next(err);
  }
};

const removeVendor = async (req, res, next) => {
  try {
    const vendor = await vendorService.deactivateVendor(req.params.id);
    res.status(200).json({ success: true, data: vendor });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  addVendor,
  getVendors,
  getVendorById,
  editVendor,
  removeVendor,
};