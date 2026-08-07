/**
 * ============================================================
 * ObjectId Validator
 * ------------------------------------------------------------
 * Purpose
 * -------
 * Prevent raw Mongoose "CastError: Cast to ObjectId failed"
 * crashes by validating IDs BEFORE they ever reach a query.
 *
 * Why this file exists
 * ---------------------
 * If a client sends something like "prox-fdd" as a productId,
 * Mongoose throws its own low-level CastError as soon as the
 * query runs. That error bypasses ErrorFactory/AppError,
 * resulting in an ugly, unhandled 500-style response instead
 * of a clean 400 "Invalid ID" response.
 *
 * Usage
 * -----
 * validateObjectId(productId, "productId");
 * // throws AppError(400, VALIDATION_ERROR) if invalid
 * ============================================================
 */

const mongoose = require("mongoose");

const ErrorFactory = require("./ErrorFactory.js");

/**
 * Validates that the given value is a well-formed MongoDB ObjectId.
 *
 * @param {string} id - The value to validate.
 * @param {string} [fieldName="id"] - Field name used in the error message.
 * @throws {AppError} 400 VALIDATION_ERROR if the id is invalid.
 */
const validateObjectId = (id, fieldName = "id") => {
    if (!id) {
        throw ErrorFactory.validationError(
            `${fieldName} is required.`,
            { field: fieldName, value: id }
        );
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw ErrorFactory.validationError(
            `"${id}" is not a valid ${fieldName}. Please select a valid product/record from the list and try again.`,
            { field: fieldName, value: id }
        );
    }
};

module.exports = validateObjectId;