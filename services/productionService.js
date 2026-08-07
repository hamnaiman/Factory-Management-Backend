// server/services/productionService.js

const Production = require("../models/Production");
const Product = require("../models/Product");
const StockMovement = require("../models/StockMovement");
const StockService = require("./stockService");

class ProductionService {
  /**
   * Normalize raw material input into the exact shape stored on the
   * Production schema.
   */
  buildRawMaterialRecords(rawMaterials = []) {
    return rawMaterials.map((material) => ({
      product: material.product || material.productId,
      productName: material.productName || "Raw Material",
      stockType: material.stockType || "Local",
      quantityUsed: Number(material.quantityUsed ?? material.quantity ?? 0),
    }));
  }

  /**
   * Read-only pre-check (same pattern as SaleService.validateStockAvailability):
   * confirms every raw material has enough stock in the requested bucket
   * BEFORE we create a Production record or touch StockService. No stock
   * mutation happens here.
   */
  async validateRawMaterialAvailability(rawMaterials = []) {
    for (const material of rawMaterials) {
      const productId = material.product;

      const product = await Product.findOne({
        _id: productId,
        isDeleted: false,
      });

      if (!product) {
        throw new Error(`Raw material product not found: ${productId}`);
      }

      const bucket = material.stockType === "Imported" ? "importedStock" : "localStock";
      const available = product[bucket] || 0;

      if (available < material.quantityUsed) {
        throw new Error(
          `Insufficient ${material.stockType || "Local"} stock for raw material "${product.productName}". ` +
          `Available: ${available}, Requested: ${material.quantityUsed}`
        );
      }
    }
  }

  /**
   * Applies the actual stock effect for a production run via
   * StockService.produceStock() — raw materials go down, finished product
   * goes up, all inside StockService's own transaction. SaleService never
   * mutates Product directly and neither does this.
   */
  async applyStockForProduction({ rawMaterials, finishedProduct, referenceId, userId, remarks }) {
    return StockService.produceStock({
      rawMaterials: rawMaterials.map((material) => ({
        productId: material.product,
        quantity: material.quantityUsed,
        stockType: material.stockType,
        remarks,
      })),
      finishedProduct: {
        productId: finishedProduct.product,
        quantity: finishedProduct.producedQuantity,
        stockType: finishedProduct.stockType,
        remarks,
      },
      referenceType: "Production",
      referenceId,
      userId,
    });
  }

  /**
   * Find the active stock movements originally created for this production
   * run (both the raw-material deductions and the finished-product
   * receipt), so we can reverse them via StockService instead of guessing.
   */
  async getActiveMovementsForProduction(productionId) {
    return StockMovement.find({
      referenceId: productionId,
      status: "Active",
      isDeleted: false,
    });
  }

  async reverseMovementsById(movementIds = [], userId, remarks) {
    for (const movementId of movementIds) {
      try {
        await StockService.reverseMovement({ movementId, remarks, userId });
      } catch (reverseError) {
        console.error(`Failed to reverse stock movement ${movementId}:`, reverseError.message);
      }
    }
  }

  async createProduction(data) {
    const {
      productionDate,
      finishedProduct: finishedProductId,
      finishedProductName,
      color,
      stockType = "Local",
      producedQuantity,
      rawMaterials = [],
      notes,
      createdBy,
    } = data;

    if (!finishedProductId) {
      throw new Error("finishedProduct is required");
    }
    if (!producedQuantity || producedQuantity <= 0) {
      throw new Error("producedQuantity must be greater than 0");
    }
    if (!Array.isArray(rawMaterials) || rawMaterials.length === 0) {
      throw new Error("At least one raw material is required");
    }

    const processedRawMaterials = this.buildRawMaterialRecords(rawMaterials);

    // 1. Check raw material availability BEFORE creating anything
    await this.validateRawMaterialAvailability(processedRawMaterials);

    const productionNumber = data.productionNumber || `PROD-${Date.now().toString().slice(-6)}`;

    // 2. Create the Production record — this is the source of truth /
    //    history for this production run, same role Sale plays for sales.
    const production = await Production.create({
      productionNumber,
      productionDate: productionDate || new Date(),
      finishedProduct: finishedProductId,
      finishedProductName: finishedProductName || "Product",
      color,
      stockType,
      producedQuantity,
      rawMaterials: processedRawMaterials,
      notes,
      createdBy,
    });

    // 3. Apply stock changes via StockService.produceStock(). If it fails,
    //    roll back the Production record so history never shows a
    //    production run that didn't actually affect stock.
    try {
      await this.applyStockForProduction({
        rawMaterials: processedRawMaterials,
        finishedProduct: {
          product: finishedProductId,
          producedQuantity,
          stockType,
        },
        referenceId: production._id,
        userId: createdBy,
        remarks: `Production ${productionNumber}`,
      });
    } catch (error) {
      await Production.findByIdAndDelete(production._id);
      throw error;
    }

    return production;
  }

  async getProductions(query = {}) {
    const { search, product, stockType, fromDate, toDate, limit = 50, page = 1 } = query;

    const filter = {};

    if (search) {
      filter.productionNumber = { $regex: search, $options: "i" };
    }
    if (product) {
      filter.finishedProduct = product;
    }
    if (stockType) {
      filter.stockType = stockType;
    }
    if (fromDate || toDate) {
      filter.productionDate = {};
      if (fromDate) filter.productionDate.$gte = new Date(fromDate);
      if (toDate) filter.productionDate.$lte = new Date(toDate);
    }

    const productions = await Production.find(filter)
      .populate("finishedProduct", "productName productCode unit")
      .populate("rawMaterials.product", "productName productCode unit")
      .sort({ productionDate: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    return productions;
  }

  async getProductionById(id) {
    const production = await Production.findById(id)
      .populate("finishedProduct")
      .populate("rawMaterials.product");

    if (!production) {
      throw new Error("Production record not found");
    }

    return production;
  }

  async updateProduction(id, updateData, userId) {
    const existing = await Production.findById(id);
    if (!existing) {
      throw new Error("Production record not found to update");
    }

    const rawMaterials = updateData.rawMaterials
      ? this.buildRawMaterialRecords(updateData.rawMaterials)
      : existing.rawMaterials;

    const finishedProductId = updateData.finishedProduct || existing.finishedProduct;
    const producedQuantity = updateData.producedQuantity ?? existing.producedQuantity;
    const stockType = updateData.stockType || existing.stockType;

    // 1. Reverse the OLD stock effect first, so availability is checked
    //    against true, un-reserved stock (same approach as SaleService.updateSale).
    const previousMovements = await this.getActiveMovementsForProduction(id);
    await this.reverseMovementsById(
      previousMovements.map((m) => m._id),
      userId,
      `Reversal for production update (${existing.productionNumber})`
    );

    // 2. Validate NEW raw materials against restored stock.
    try {
      await this.validateRawMaterialAvailability(rawMaterials);
    } catch (validationError) {
      // Put the old stock effect back exactly as it was.
      await this.applyStockForProduction({
        rawMaterials: existing.rawMaterials,
        finishedProduct: {
          product: existing.finishedProduct,
          producedQuantity: existing.producedQuantity,
          stockType: existing.stockType,
        },
        referenceId: existing._id,
        userId,
        remarks: `Re-applied after failed update (${existing.productionNumber})`,
      });
      throw validationError;
    }

    // 3. Apply stock for the NEW raw materials / finished quantity.
    try {
      await this.applyStockForProduction({
        rawMaterials,
        finishedProduct: {
          product: finishedProductId,
          producedQuantity,
          stockType,
        },
        referenceId: existing._id,
        userId,
        remarks: `Production update (${existing.productionNumber})`,
      });
    } catch (stockError) {
      await this.applyStockForProduction({
        rawMaterials: existing.rawMaterials,
        finishedProduct: {
          product: existing.finishedProduct,
          producedQuantity: existing.producedQuantity,
          stockType: existing.stockType,
        },
        referenceId: existing._id,
        userId,
        remarks: `Re-applied after failed update (${existing.productionNumber})`,
      });
      throw stockError;
    }

    const updated = await Production.findByIdAndUpdate(
      id,
      {
        ...updateData,
        rawMaterials,
        finishedProduct: finishedProductId,
        producedQuantity,
        stockType,
        updatedBy: userId,
      },
      { new: true }
    );

    return updated;
  }

  async cancelProduction(id, userId) {
    const production = await Production.findById(id);
    if (!production) {
      throw new Error("Production record not found");
    }

    // Reverse every active movement (raw material deductions + finished
    // product receipt) tied to this production run via StockService.
    const movements = await this.getActiveMovementsForProduction(id);
    await this.reverseMovementsById(
      movements.map((m) => m._id),
      userId,
      `Production cancelled (${production.productionNumber})`
    );

    await Production.findByIdAndDelete(id);
    return production;
  }
}

module.exports = new ProductionService();