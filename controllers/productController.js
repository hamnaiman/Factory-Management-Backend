const {
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  restoreProduct: restoreProductService,
} = require("../services/productService");

const ApiResponse = require("../utils/apiResponse");

// Get All Products
const getAllProducts = async (req, res, next) => {
  try {
    const products = await getProducts();

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

// Add Product
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

// Update Product
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

// Delete Product
const removeProduct = async (req, res, next) => {
  console.log("DELETE REQUEST:", req.params.id);

  try {
    await deleteProduct(req.params.id);

    console.log("DELETE SUCCESS");

    res.status(200).json(
      new ApiResponse(
        200,
        true,
        "Product deleted successfully",
        null
      )
    );
  } catch (error) {
    console.error("DELETE ERROR:", error);
    next(error);
  }
};

// Search Products
const searchProducts = async (req, res, next) => {
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
//restore Product
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
  restoreProduct,
  removeProduct,
  searchProducts,
};