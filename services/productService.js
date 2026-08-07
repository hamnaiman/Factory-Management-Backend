const Product = require("../models/Product");

// Get All Products (Search + Filters)
const getProducts = async (query = {}) => {
  const filter = {};

  // Search by Product Name or Product Code
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
    ];
  }

  // Filters
  if (query.category) {
    filter.category = query.category;
  }

  if (query.productType) {
    filter.productType = query.productType;
  }

  if (query.stockType) {
    filter.stockType = query.stockType;
  }

  if (query.status) {
    filter.status = query.status;
  }

  filter.status = "active";

return await Product.find(filter).sort({
  createdAt: -1,
});
};

// Add Product
// Add Product
const addProduct = async (productData, userId) => {
  // Check Duplicate Product Code
  const existingCode = await Product.findOne({
    productCode: productData.productCode,
  });

  if (existingCode) {
    throw new Error("Product Code already exists");
  }

  const product = await Product.create({
    ...productData,
    createdBy: userId,
  });

  return product;
};

// Update Product
const updateProduct = async (id, productData) => {
  // Duplicate Product Code Check
  if (productData.productCode) {
    const existingCode = await Product.findOne({
      productCode: productData.productCode,
      _id: { $ne: id },
    });

    if (existingCode) {
      throw new Error("Product Code already exists");
    }
  }

  const product = await Product.findOneAndUpdate(
  {
    _id: id,
    status: "active",
  },
  productData,
  {
    new: true,
    runValidators: true,
  }
);

if (!product) {
  throw new Error("Active product not found");
}

  return product;
};
//retore Product
const restoreProduct = async (id) => {
  const product = await Product.findById(id);

  if (!product) {
    throw new Error("Product not found");
  }

  product.status = "active";

  await product.save();

  return product;
};


// Soft Delete Product
const deleteProduct = async (id) => {
  console.log("Service Called");

  const product = await Product.findById(id);

  console.log("Product:", product);

  if (!product) {
    throw new Error("Product not found");
  }

  product.status = "inactive";

  console.log("Saving Product");

  await product.save();

  console.log("Saved");

  return product;
};
module.exports = {
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  restoreProduct,
};