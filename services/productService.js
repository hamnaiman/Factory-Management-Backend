const Product = require("../models/Product");

// ============================================================
// Get All Products
// ============================================================
const getProducts = async (query = {}) => {
  const filter = {
    isDeleted: false,
  };

  // Search
  if (query.keyword) {
    filter.$or = [
      {
        productName: {
          $regex: query.keyword,
          $options: "i",
        },
      },
      {
        productCode: {
          $regex: query.keyword,
          $options: "i",
        },
      },
      {
        category: {
          $regex: query.keyword,
          $options: "i",
        },
      },
    ];
  }

  // Category
  if (query.category) {
    filter.category = query.category;
  }

  // Status
  if (query.status && query.status !== "all") {
    filter.status = query.status;
  }

  // Default active products
  if (!query.status || query.status === "all") {
    filter.status = "active";
  }

  return await Product.find(filter).sort({
    createdAt: -1,
  });
};

// ============================================================
// Add Product
// ============================================================
const addProduct = async (productData, userId) => {
  const existingCode = await Product.findOne({
    productCode: productData.productCode,
  });

  if (existingCode) {
    throw new Error("Product Code already exists");
  }

  const product = await Product.create({
    productName: productData.productName,
    productCode: productData.productCode,
    category: productData.category,
    color: productData.color,
    unit: "Kg",
    minimumStock: Number(productData.minimumStock || 5),
    status: productData.status || "active",
    createdBy: userId,
  });

  return product;
};

// ============================================================
// Update Product
// ============================================================
const updateProduct = async (id, productData) => {
  if (productData.productCode) {
    const existingCode = await Product.findOne({
      productCode: productData.productCode,
      _id: { $ne: id },
    });

    if (existingCode) {
      throw new Error("Product Code already exists");
    }
  }

  const updateData = {
    productName: productData.productName,
    productCode: productData.productCode,
    category: productData.category,
    color: productData.color,
    unit: "Kg",
    minimumStock: Number(productData.minimumStock || 5),
  };

  if (productData.status) {
    updateData.status = productData.status;
  }

  const product = await Product.findOneAndUpdate(
    {
      _id: id,
      isDeleted: false,
    },
    updateData,
    {
      new: true,
      runValidators: true,
    }
  );

  if (!product) {
    throw new Error("Product not found");
  }

  return product;
};

// ============================================================
// Restore Product
// ============================================================
const restoreProduct = async (id) => {
  const product = await Product.findById(id);

  if (!product) {
    throw new Error("Product not found");
  }

  product.status = "active";
  product.isDeleted = false;
  product.deletedAt = null;

  await product.save();

  return product;
};

// ============================================================
// Soft Delete Product
// ============================================================
const deleteProduct = async (id) => {
  const product = await Product.findById(id);

  if (!product) {
    throw new Error("Product not found");
  }

  product.status = "inactive";
  product.isDeleted = true;
  product.deletedAt = new Date();

  await product.save();

  return product;
};

module.exports = {
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  restoreProduct,
};