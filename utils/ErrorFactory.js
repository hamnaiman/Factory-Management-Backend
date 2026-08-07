/**
 * ============================================================
 * Error Factory
 * ------------------------------------------------------------
 * Centralized Business Errors
 *
 * Responsibilities
 * ----------------
 * • Create standardized AppError instances
 * • Avoid duplicate error messages
 * • Improve maintainability
 * • Keep services clean
 *
 * Used By
 * --------
 * ✔ Product Service
 * ✔ Stock Service
 * ✔ Purchase Service
 * ✔ Production Service
 * ✔ Sales Service
 * ✔ Controllers
 * ============================================================
 */

const AppError = require("./AppError.js");

const {
    STOCK_ERROR_CODES,
} = require("../constants/stockConstants.js");

const ErrorFactory = {

    /* ========================================================
       Product Errors
    ======================================================== */

    productNotFound(details = null) {

        return new AppError(
            "Product not found.",
            404,
            STOCK_ERROR_CODES.PRODUCT_NOT_FOUND,
            details
        );

    },

    productAlreadyExists(details = null) {

        return new AppError(
            "Product already exists.",
            409,
            "PRODUCT_ALREADY_EXISTS",
            details
        );

    },

    /* ========================================================
       Stock Errors
    ======================================================== */

    stockMovementNotFound(details = null) {

        return new AppError(
            "Stock movement not found.",
            404,
            STOCK_ERROR_CODES.STOCK_NOT_FOUND,
            details
        );

    },

    insufficientStock(details = null) {

        return new AppError(
            "Insufficient stock available.",
            400,
            STOCK_ERROR_CODES.INSUFFICIENT_STOCK,
            details
        );

    },

    invalidMovement(details = null) {

        return new AppError(
            "Invalid stock movement type.",
            400,
            STOCK_ERROR_CODES.INVALID_MOVEMENT,
            details
        );

    },

    invalidAdjustment(details = null) {

        return new AppError(
            "Invalid adjustment type.",
            400,
            STOCK_ERROR_CODES.INVALID_ADJUSTMENT,
            details
        );

    },

    invalidQuantity(details = null) {

        return new AppError(
            "Quantity must be greater than zero.",
            400,
            STOCK_ERROR_CODES.INVALID_QUANTITY,
            details
        );

    },

    movementAlreadyCancelled(details = null) {

        return new AppError(
            "Stock movement has already been cancelled.",
            409,
            STOCK_ERROR_CODES.MOVEMENT_ALREADY_CANCELLED,
            details
        );

    },

    movementCancelled(details = null) {

        return new AppError(
            "This stock movement has been cancelled.",
            400,
            STOCK_ERROR_CODES.MOVEMENT_CANCELLED,
            details
        );

    },

    /* ========================================================
       Validation Errors
    ======================================================== */

    validationError(message, details = null) {

        return new AppError(
            message,
            400,
            "VALIDATION_ERROR",
            details
        );

    },

    /* ========================================================
       Authorization
    ======================================================== */

    unauthorized(details = null) {

        return new AppError(
            "Unauthorized access.",
            401,
            "UNAUTHORIZED",
            details
        );

    },

    forbidden(details = null) {

        return new AppError(
            "Access denied.",
            403,
            "FORBIDDEN",
            details
        );

    },

    /* ========================================================
       Generic Errors
    ======================================================== */

    badRequest(message = "Bad request.", details = null) {

        return new AppError(
            message,
            400,
            "BAD_REQUEST",
            details
        );

    },

    conflict(message = "Conflict occurred.", details = null) {

        return new AppError(
            message,
            409,
            "CONFLICT",
            details
        );

    },

    internal(details = null) {

        return new AppError(
            "Internal server error.",
            500,
            "INTERNAL_SERVER_ERROR",
            details
        );

    }

};

Object.freeze(ErrorFactory);

module.exports = ErrorFactory;