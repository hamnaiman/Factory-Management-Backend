const StockService = require("../services/stockService.js");

/**
 * Standard Response Helper
 */
const sendResponse = (res, statusCode, message, data) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
    });
};

/**
 * ============================================================
 * WRITE OPERATIONS
 * ============================================================
 */

// POST /api/stocks/purchase
const purchaseStock = async (req, res, next) => {
    try {
        const {
            productId,
            quantity,
            referenceType,
            referenceId,
            remarks,
        } = req.body;

        const result = await StockService.purchaseStock({
            productId,
            quantity,
            referenceType,
            referenceId,
            remarks,
            userId: req.user?._id,
        });

        return sendResponse(
            res,
            201,
            "Stock purchased successfully",
            result
        );
    } catch (error) {
        next(error);
    }
};

// POST /api/stocks/sale
const sellStock = async (req, res, next) => {
    try {
        const {
            productId,
            quantity,
            referenceType,
            referenceId,
            remarks,
        } = req.body;

        const result = await StockService.sellStock({
            productId,
            quantity,
            referenceType,
            referenceId,
            remarks,
            userId: req.user?._id,
        });

        return sendResponse(
            res,
            201,
            "Stock sold successfully",
            result
        );
    } catch (error) {
        next(error);
    }
};

// POST /api/stocks/consume
const consumeStock = async (req, res, next) => {
    try {
        const {
            productId,
            quantity,
            movementType,
            referenceType,
            referenceId,
            remarks,
        } = req.body;

        const result = await StockService.consumeStock({
            productId,
            quantity,
            movementType,
            referenceType,
            referenceId,
            remarks,
            userId: req.user?._id,
        });

        return sendResponse(
            res,
            201,
            "Stock consumed successfully",
            result
        );
    } catch (error) {
        next(error);
    }
};

// POST /api/stocks/production
const produceStock = async (req, res, next) => {
    try {
        const {
            rawMaterials,
            finishedProduct,
            referenceType,
            referenceId,
        } = req.body;

        const result = await StockService.produceStock({
            rawMaterials,
            finishedProduct,
            referenceType,
            referenceId,
            userId: req.user?._id,
        });

        return sendResponse(
            res,
            201,
            "Production recorded successfully",
            result
        );
    } catch (error) {
        next(error);
    }
};

// POST /api/stocks/adjust
const adjustStock = async (req, res, next) => {
    try {
        const {
            productId,
            quantity,
            adjustmentType,
            referenceId,
            remarks,
        } = req.body;

        const result = await StockService.adjustStock({
            productId,
            quantity,
            adjustmentType,
            referenceId,
            remarks,
            userId: req.user?._id,
        });

        return sendResponse(
            res,
            201,
            "Stock adjusted successfully",
            result
        );
    } catch (error) {
        next(error);
    }
};

// POST /api/stocks/movements/:movementId/reverse
const reverseMovement = async (req, res, next) => {
    try {
        const { movementId } = req.params;
        const { remarks } = req.body;

        const result = await StockService.reverseMovement({
            movementId,
            remarks,
            userId: req.user?._id,
        });

        return sendResponse(
            res,
            200,
            "Stock movement reversed successfully",
            result
        );
    } catch (error) {
        next(error);
    }
};

/**
 * ============================================================
 * READ OPERATIONS
 * ============================================================
 */

// GET /api/stocks/products/:productId
const getProductStock = async (req, res, next) => {
    try {
        const { productId } = req.params;

        const result = await StockService.getProductStock(productId);

        return sendResponse(
            res,
            200,
            "Product stock fetched successfully",
            result
        );
    } catch (error) {
        next(error);
    }
};

// GET /api/stocks/products/:productId/history
const getStockHistory = async (req, res, next) => {
    try {
        const { productId } = req.params;

        const {
            movementType,
            fromDate,
            toDate,
            page,
            limit,
        } = req.query;

        const result = await StockService.getStockHistory({
            productId,
            movementType,
            fromDate,
            toDate,
            page: page ? Number(page) : undefined,
            limit: limit ? Number(limit) : undefined,
        });

        return sendResponse(
            res,
            200,
            "Stock history fetched successfully",
            result
        );
    } catch (error) {
        next(error);
    }
};

// GET /api/stocks/products/:productId/summary
const getStockSummary = async (req, res, next) => {
    try {
        const { productId } = req.params;
        const { fromDate, toDate } = req.query;

        const result = await StockService.getStockSummary({
            productId,
            fromDate,
            toDate,
        });

        return sendResponse(
            res,
            200,
            "Stock summary fetched successfully",
            result
        );
    } catch (error) {
        next(error);
    }
};

// GET /api/stocks/low-stock
const getLowStockProducts = async (req, res, next) => {
    try {
        const { category } = req.query;

        const result = await StockService.getLowStockProducts({
            category,
        });

        return sendResponse(
            res,
            200,
            "Low stock products fetched successfully",
            result
        );
    } catch (error) {
        next(error);
    }
};

// GET /api/stocks/inventory
const getInventoryList = async (req, res, next) => {
    try {
        const { category } = req.query;

        const result = await StockService.getInventoryList({
            category,
        });

        return sendResponse(
            res,
            200,
            "Inventory list fetched successfully",
            result
        );
    } catch (error) {
        next(error);
    }
};

const StockController = {
    purchaseStock,
    sellStock,
    consumeStock,
    produceStock,
    adjustStock,
    reverseMovement,
    getProductStock,
    getStockHistory,
    getStockSummary,
    getLowStockProducts,
    getInventoryList,
};

module.exports = StockController;