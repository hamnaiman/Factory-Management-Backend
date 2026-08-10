// server/services/vendorService.js

const Vendor = require("../models/Vendor");
const ApiError = require("../utils/apiError");

/**
 * Create a new vendor.
 */
const createVendor = async (data) => {
  if (!data.name || !data.name.trim()) {
    throw new ApiError(400, "Vendor name is required.");
  }

  return await Vendor.create({
    name: data.name.trim(),
    phone: data.phone,
    email: data.email,
    address: data.address,
    companyName: data.companyName,
    notes: data.notes,
  });
};

/**
 * List vendors. By default only active vendors are returned; pass
 * includeInactive=true to see everything (e.g. for an admin "all vendors" view).
 */
const getVendors = async ({ search, includeInactive = false } = {}) => {
  const filter = {};

  if (!includeInactive) {
    filter.isActive = true;
  }

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { companyName: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
    ];
  }

  return await Vendor.find(filter).sort({ name: 1 });
};

const getVendorById = async (id) => {
  const vendor = await Vendor.findById(id);

  if (!vendor) {
    throw new ApiError(404, "Vendor not found.");
  }

  return vendor;
};

const updateVendor = async (id, data) => {
  if (data.name !== undefined && !data.name.trim()) {
    throw new ApiError(400, "Vendor name cannot be empty.");
  }

  const vendor = await Vendor.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });

  if (!vendor) {
    throw new ApiError(404, "Vendor not found.");
  }

  return vendor;
};

/**
 * Soft-delete: vendors are referenced by Purchase records (vendorId), so
 * hard-deleting would orphan purchase history. Deactivating keeps history
 * intact while removing the vendor from active "select vendor" dropdowns.
 */
const deactivateVendor = async (id) => {
  const vendor = await Vendor.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true }
  );

  if (!vendor) {
    throw new ApiError(404, "Vendor not found.");
  }

  return vendor;
};

module.exports = {
  createVendor,
  getVendors,
  getVendorById,
  updateVendor,
  deactivateVendor,
};