/**
 * ============================================================
 * Stock Management Constants
 * ------------------------------------------------------------
 * Centralized constants used throughout the Inventory Module.
 *
 * This file should NEVER contain business logic.
 * It only exports reusable constants.
 *
 * Used By:
 * ✔ stockCalculator
 * ✔ stockService
 * ✔ stockTransaction
 * ✔ stockLedger
 * ✔ stockQueries
 * ✔ stockValidation
 * ✔ Controllers
 * ============================================================
 */

/* ============================================================
   Movement Types
============================================================ */

export const STOCK_MOVEMENT_TYPES = Object.freeze({
    PURCHASE: "Purchase",
    RECEIVE: "Receive",
    SALE: "Sale",
    PRODUCTION: "Production",
    ISSUE: "Issue",
    ADJUSTMENT: "Adjustment",
});

/* ============================================================
   Adjustment Types
============================================================ */

export const STOCK_ADJUSTMENT_TYPES = Object.freeze({
    INCREASE: "Increase",
    DECREASE: "Decrease",
});

/* ============================================================
   Stock Types
============================================================ */

export const STOCK_TYPES = Object.freeze({
    LOCAL: "Local",
    IMPORTED: "Imported",
});

/* ============================================================
   Movement Status
============================================================ */

export const STOCK_STATUS = Object.freeze({
    ACTIVE: "Active",
    CANCELLED: "Cancelled",
});

/* ============================================================
   Reference Modules
   ✅ FIXED: values must exactly match StockMovement schema's
   referenceType enum: ["Manual","Purchase","Production","Sale","Stock Adjustment"]
============================================================ */

export const STOCK_REFERENCE_MODULES = Object.freeze({
    MANUAL: "Manual",
    PURCHASE: "Purchase",
    SALES: "Sale",              // ✅ was "Sales" — schema enum has "Sale" (singular)
    PRODUCTION: "Production",
    STOCK_ADJUSTMENT: "Stock Adjustment",
    OPENING_STOCK: "Manual",    // ✅ was "Opening Stock" — not in schema enum at all, mapped to closest valid value
});

/* ============================================================
   Movement Categories
============================================================ */

export const INCREASE_MOVEMENTS = Object.freeze([
    STOCK_MOVEMENT_TYPES.PURCHASE,
    STOCK_MOVEMENT_TYPES.RECEIVE,
]);

export const DECREASE_MOVEMENTS = Object.freeze([
    STOCK_MOVEMENT_TYPES.SALE,
    STOCK_MOVEMENT_TYPES.PRODUCTION,
    STOCK_MOVEMENT_TYPES.ISSUE,
]);

/* ============================================================
   Decimal Precision
============================================================ */

export const STOCK_PRECISION = Object.freeze({
    QUANTITY: 3,
    PRICE: 2,
    AMOUNT: 2,
});

/* ============================================================
   Default Values
============================================================ */

export const STOCK_DEFAULTS = Object.freeze({
    OPENING_STOCK: 0,
    MINIMUM_STOCK: 0,
    CURRENT_STOCK: 0,
});

/* ============================================================
   Error Codes
============================================================ */

export const STOCK_ERROR_CODES = Object.freeze({
    PRODUCT_NOT_FOUND: "PRODUCT_NOT_FOUND",

    STOCK_NOT_FOUND: "STOCK_NOT_FOUND",

    INVALID_MOVEMENT: "INVALID_MOVEMENT",

    INVALID_ADJUSTMENT: "INVALID_ADJUSTMENT",

    INVALID_QUANTITY: "INVALID_QUANTITY",

    INSUFFICIENT_STOCK: "INSUFFICIENT_STOCK",

    MOVEMENT_CANCELLED: "MOVEMENT_CANCELLED",

    MOVEMENT_ALREADY_CANCELLED: "MOVEMENT_ALREADY_CANCELLED",
});

/* ============================================================
   Sort Orders
============================================================ */

export const STOCK_SORT = Object.freeze({
    NEWEST_FIRST: -1,
    OLDEST_FIRST: 1,
});

/* ============================================================
   Collection Names
============================================================ */

export const COLLECTIONS = Object.freeze({
    PRODUCT: "Product",
    STOCK_MOVEMENT: "StockMovement",
    USER: "User",
});