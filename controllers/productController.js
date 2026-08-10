const {
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  restoreProduct: restoreProductService,
} = require("../services/productService");

const ApiResponse = require("../utils/apiResponse");

// GET /api/products
const getAllProducts = async (req, res, next) => {
  try {
    const products = await getProducts(req.query);

    res.status(200).json(
      new ApiResponse(
        200,
        true,
        "Products fetched successfully",
        products
      )
    );
  } catch (error) {
    next(error);
  }
};

// POST /api/products
const createProduct = async (req, res, next) => {
  try {
    const product = await addProduct(
      req.body,
      req.user._id
    );

    res.status(201).json(
      new ApiResponse(
        201,
        true,
        "Product added successfully",
        product
      )
    );
  } catch (error) {
    next(error);
  }
};

// PUT /api/products/:id
const editProduct = async (req, res, next) => {
  try {
    const product = await updateProduct(
      req.params.id,
      req.body
    );

    res.status(200).json(
      new ApiResponse(
        200,
        true,
        "Product updated successfully",
        product
      )
    );
  } catch (error) {
    next(error);
  }
};

// DELETE /api/products/:id
const removeProduct = async (req, res, next) => {
  try {
    const product = await deleteProduct(req.params.id);

    res.status(200).json(
      new ApiResponse(
        200,
        true,
        "Product deactivated successfully",
        product
      )
    );
  } catch (error) {
    next(error);
  }
};

// PATCH /api/products/:id/restore
const restoreProduct = async (req, res, next) => {
  try {
    const product = await restoreProductService(req.params.id);

    res.status(200).json(
      new ApiResponse(
        200,
        true,
        "Product restored successfully",
        product
      )
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllProducts,
  createProduct,
  editProduct,
  removeProduct,
  restoreProduct,
};