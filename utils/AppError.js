/**
 * ============================================================
 * AppError
 * ------------------------------------------------------------
 * Enterprise Error Class
 *
 * Purpose:
 * Standardize business errors across the application.
 *
 * Used By:
 * ✔ Services
 * ✔ Controllers
 * ✔ Middleware
 * ✔ Validators
 * ✔ Transactions
 *
 * Benefits
 * --------
 * • Consistent API responses
 * • HTTP status codes
 * • Machine-readable error codes
 * • Operational vs Programming errors
 * • Production-ready logging
 * ============================================================
 */

class AppError extends Error {

    /**
     * @param {string} message
     * Human readable error message
     *
     * @param {number} statusCode
     * HTTP Status Code
     *
     * @param {string} errorCode
     * Internal Business Error Code
     *
     * @param {Object|null} details
     * Optional metadata
     */

    constructor(
        message,
        statusCode = 500,
        errorCode = "INTERNAL_SERVER_ERROR",
        details = null
    ) {

        super(message);

        this.name = this.constructor.name;

        this.statusCode = statusCode;

        this.errorCode = errorCode;

        this.details = details;

        /**
         * Operational errors
         *
         * true  -> expected business errors
         * false -> programming errors
         */
        this.isOperational = true;

        /**
         * Error Timestamp
         */

        this.timestamp = new Date().toISOString();

        /**
         * Remove constructor noise
         */

        Error.captureStackTrace(this, this.constructor);
    }

    /**
     * Convert Error into API Response
     */

    toJSON() {

        return {

            success: false,

            message: this.message,

            errorCode: this.errorCode,

            statusCode: this.statusCode,

            details: this.details,

            timestamp: this.timestamp,

        };

    }

}

module.exports = AppError;