const SaleService = require("../services/saleService");
const ApiResponse = require("../utils/ApiResponse");

/**
 * ============================================================
 * CREATE SALE
 * POST /api/sales
 * ============================================================
 */
const createSale = async (req, res, next) => {
    try {
        const userId = req.user?._id || req.user?.id;

        const sale = await SaleService.createSale({
            ...req.body,
            createdBy: userId,
        });

        return res.status(201).json(
            new ApiResponse(
                201,
                true,
                "Sale created successfully.",
                sale
            )
        );
    } catch (error) {
        next(error);
    }
};

/**
 * ============================================================
 * GET ALL SALES
 * GET /api/sales
 * ============================================================
 */
const getSales = async (req, res, next) => {
    try {
        const sales = await SaleService.getSales(req.query);

        return res.status(200).json(
            new ApiResponse(
                200,
                true,
                "Sales fetched successfully.",
                sales
            )
        );
    } catch (error) {
        next(error);
    }
};

/**
 * ============================================================
 * GET SALE BY ID
 * GET /api/sales/:id
 * ============================================================
 */
const getSaleById = async (req, res, next) => {
    try {
        const sale = await SaleService.getSaleById(req.params.id);

        return res.status(200).json(
            new ApiResponse(
                200,
                true,
                "Sale fetched successfully.",
                sale
            )
        );
    } catch (error) {
        next(error);
    }
};

/**
 * ============================================================
 * UPDATE SALE
 * PUT /api/sales/:id
 * ============================================================
 */
const updateSale = async (req, res, next) => {
    try {
        const userId = req.user?._id || req.user?.id;

        const sale = await SaleService.updateSale(
            req.params.id,
            req.body,
            userId
        );

        return res.status(200).json(
            new ApiResponse(
                200,
                true,
                "Sale updated successfully.",
                sale
            )
        );
    } catch (error) {
        next(error);
    }
};

/**
 * ============================================================
 * CANCEL SALE
 * DELETE /api/sales/:id
 * ============================================================
 */
const cancelSale = async (req, res, next) => {
    try {
        const userId = req.user?._id || req.user?.id;

        const sale = await SaleService.cancelSale(
            req.params.id,
            userId
        );

        return res.status(200).json(
            new ApiResponse(
                200,
                true,
                "Sale cancelled successfully.",
                sale
            )
        );
    } catch (error) {
        next(error);
    }
};

/**
 * ============================================================
 * GET INVOICE
 * GET /api/sales/:id/invoice
 * ============================================================
 */
const getInvoice = async (req, res, next) => {
    try {
        const invoice = await SaleService.getInvoice(req.params.id);

        return res.status(200).json(
            new ApiResponse(
                200,
                true,
                "Invoice fetched successfully.",
                invoice
            )
        );
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createSale,
    getSales,
    getSaleById,
    updateSale,
    cancelSale,
    getInvoice,
};