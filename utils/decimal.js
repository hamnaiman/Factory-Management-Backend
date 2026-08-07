/**
 * ============================================================
 * Decimal Utility
 * ------------------------------------------------------------
 * Enterprise Decimal Helper
 *
 * Responsibilities
 * ----------------
 * • Prevent floating-point precision issues
 * • Financial-safe calculations
 * • Inventory quantity calculations
 * • Pure utility functions
 *
 * NOTE
 * ----
 * - No database access
 * - No business logic
 * - No side effects
 * - Fully reusable
 * ============================================================
 */

const { STOCK_PRECISION } = require("../constants/stockConstants.js");
const ErrorFactory = require("./ErrorFactory.js");

/**
 * Convert value to valid number.
 */
const toNumber = (value) => {

    const number = Number(value);

    if (Number.isNaN(number)) {
        throw ErrorFactory.validationError("Invalid numeric value.");
    }

    return number;

};

/**
 * Round number to specified precision.
 */
const round = (
    value,
    precision = STOCK_PRECISION.QUANTITY
) => {

    const number = toNumber(value);

    const factor = Math.pow(10, precision);

    return Math.round((number + Number.EPSILON) * factor) / factor;

};

/**
 * Safe Addition
 */
const add = (
    a,
    b,
    precision = STOCK_PRECISION.QUANTITY
) => {

    return round(
        toNumber(a) + toNumber(b),
        precision
    );

};

/**
 * Safe Subtraction
 */
const subtract = (
    a,
    b,
    precision = STOCK_PRECISION.QUANTITY
) => {

    return round(
        toNumber(a) - toNumber(b),
        precision
    );

};

/**
 * Safe Multiplication
 */
const multiply = (
    a,
    b,
    precision = STOCK_PRECISION.AMOUNT
) => {

    return round(
        toNumber(a) * toNumber(b),
        precision
    );

};

/**
 * Safe Division
 */
const divide = (
    a,
    b,
    precision = STOCK_PRECISION.AMOUNT
) => {

    const divisor = toNumber(b);

    if (divisor === 0) {
        throw ErrorFactory.validationError(
            "Division by zero is not allowed."
        );
    }

    return round(
        toNumber(a) / divisor,
        precision
    );

};

/**
 * Compare two decimal numbers.
 */
const compare = (a, b) => {

    const first = round(a);

    const second = round(b);

    if (first > second) return 1;

    if (first < second) return -1;

    return 0;

};

/**
 * Check equality.
 */
const equals = (a, b) => {

    return compare(a, b) === 0;

};

/**
 * Check greater than.
 */
const greaterThan = (a, b) => {

    return compare(a, b) === 1;

};

/**
 * Check greater than or equal.
 */
const greaterThanOrEqual = (a, b) => {

    return compare(a, b) >= 0;

};

/**
 * Check less than.
 */
const lessThan = (a, b) => {

    return compare(a, b) === -1;

};

/**
 * Check less than or equal.
 */
const lessThanOrEqual = (a, b) => {

    return compare(a, b) <= 0;

};

/**
 * Absolute value.
 */
const abs = (value) => {

    return round(Math.abs(toNumber(value)));

};

/**
 * Check if value is zero.
 */
const isZero = (value) => {

    return equals(value, 0);

};

/**
 * Clamp between min & max.
 */
const clamp = (
    value,
    min,
    max
) => {

    const number = round(value);

    return Math.min(
        Math.max(number, min),
        max
    );

};

/**
 * Freeze utility.
 */
const Decimal = Object.freeze({

    round,

    add,

    subtract,

    multiply,

    divide,

    compare,

    equals,

    greaterThan,

    greaterThanOrEqual,

    lessThan,

    lessThanOrEqual,

    abs,

    isZero,

    clamp,

});

module.exports = Decimal;