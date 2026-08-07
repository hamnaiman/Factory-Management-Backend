/**
 * ============================================================
 * Stock Calculator
 * ------------------------------------------------------------
 * Enterprise Inventory Calculation Engine
 *
 * Responsibilities
 * ----------------
 * ✔ Stock Balance Calculation
 * ✔ Reverse Stock Movement
 * ✔ Stock Validation
 * ✔ Ledger Recalculation
 * ✔ Stock Summary
 * ✔ Movement Strategy Dispatching
 *
 * IMPORTANT
 * ----------
 * • Pure Business Logic
 * • No MongoDB
 * • No Models
 * • No Controllers
 * • No API Calls
 * • Fully Unit-Testable
 * • Dependency Free
 * ============================================================
 */

import Decimal from "../utils/decimal.js";
import ErrorFactory from "../utils/ErrorFactory.js";

import {
    STOCK_MOVEMENT_TYPES,
    STOCK_ADJUSTMENT_TYPES,
    INCREASE_MOVEMENTS,
    DECREASE_MOVEMENTS,
} from "../constants/stockConstants.js";

/**
 * ============================================================
 * JSDoc Types
 * ============================================================
 */

/**
 * @typedef {Object} StockMovement
 *
 * @property {number} currentStock
 * @property {string} movementType
 * @property {number} quantity
 * @property {string|null} adjustmentType
 */

/**
 * @typedef {Object} StockResult
 *
 * @property {number} previousStock
 * @property {number} quantity
 * @property {number} newBalance
 * @property {string} movementType
 * @property {boolean} isIncrease
 * @property {boolean} isDecrease
 * @property {number} difference
 */

/**
 * ============================================================
 * Validation Helpers
 * ============================================================
 */

/**
 * Validate Quantity
 */

const validateQuantity = (quantity) => {

    if (Decimal.lessThanOrEqual(quantity, 0)) {
        throw ErrorFactory.invalidQuantity();
    }

};

/**
 * Validate Movement Type
 */

const validateMovementType = (movementType) => {

    const allowed = [

        ...Object.values(STOCK_MOVEMENT_TYPES)

    ];

    if (!allowed.includes(movementType)) {

        throw ErrorFactory.invalidMovement({
            movementType
        });

    }

};

/**
 * Validate Adjustment Type
 */

const validateAdjustmentType = (adjustmentType) => {

    const allowed = Object.values(
        STOCK_ADJUSTMENT_TYPES
    );

    if (!allowed.includes(adjustmentType)) {

        throw ErrorFactory.invalidAdjustment({
            adjustmentType
        });

    }

};

/**
 * Validate Available Stock
 */

const validateAvailableStock = (
    currentStock,
    quantity
) => {

    if (
        Decimal.lessThan(
            currentStock,
            quantity
        )
    ) {

        throw ErrorFactory.insufficientStock({

            currentStock,

            requestedQuantity: quantity,

        });

    }

};

/**
 * ============================================================
 * Immutable Result Builder
 * ============================================================
 */

const buildResult = ({
    previousStock,
    quantity,
    newBalance,
    movementType,
}) => {

    return Object.freeze({

        previousStock,

        quantity,

        newBalance,

        movementType,

        difference: Decimal.subtract(
            newBalance,
            previousStock
        ),

        isIncrease:
            INCREASE_MOVEMENTS.includes(
                movementType
            ),

        isDecrease:
            DECREASE_MOVEMENTS.includes(
                movementType
            ),

    });

};

/**
 * ============================================================
 * Strategy Registry
 *
 * Every movement has its own strategy.
 * No switch-case.
 * No if-else chains.
 * ============================================================
 */

const MovementStrategies = Object.create(null);

/**
 * Register Strategy
 */

const registerStrategy = (
    movementType,
    strategy
) => {

    MovementStrategies[movementType] = strategy;

};

/**
 * Execute Strategy
 */

const executeStrategy = (payload) => {

    const strategy =
        MovementStrategies[
            payload.movementType
        ];

    if (!strategy) {

        throw ErrorFactory.invalidMovement({
            movementType:
                payload.movementType,
        });

    }

    return strategy(payload);

};

/**
 * ============================================================
 * Helpers
 * ============================================================
 */

export const isIncreaseMovement = (
    movementType
) => {

    return INCREASE_MOVEMENTS.includes(
        movementType
    );

};

export const isDecreaseMovement = (
    movementType
) => {

    return DECREASE_MOVEMENTS.includes(
        movementType
    );

};

/**
 * ============================================================
 * Strategy Factories
 * ------------------------------------------------------------
 * Generic strategy creators to eliminate duplicated logic.
 * ============================================================
 */

/**
 * Creates an Increase Strategy
 * (Purchase, Receive, Return etc.)
 */
const createIncreaseStrategy = (movementType) => {

    return ({
        currentStock,
        quantity,
    }) => {

        validateQuantity(quantity);

        const newBalance = Decimal.add(
            currentStock,
            quantity
        );

        return buildResult({
            previousStock: currentStock,
            quantity,
            newBalance,
            movementType,
        });

    };

};

/**
 * Creates a Decrease Strategy
 * (Sale, Production, Issue etc.)
 */
const createDecreaseStrategy = (movementType) => {

    return ({
        currentStock,
        quantity,
    }) => {

        validateQuantity(quantity);

        validateAvailableStock(
            currentStock,
            quantity
        );

        const newBalance = Decimal.subtract(
            currentStock,
            quantity
        );

        return buildResult({
            previousStock: currentStock,
            quantity,
            newBalance,
            movementType,
        });

    };

};

/**
 * ============================================================
 * Register Increase Strategies
 * ============================================================
 */

registerStrategy(
    STOCK_MOVEMENT_TYPES.PURCHASE,
    createIncreaseStrategy(
        STOCK_MOVEMENT_TYPES.PURCHASE
    )
);

registerStrategy(
    STOCK_MOVEMENT_TYPES.RECEIVE,
    createIncreaseStrategy(
        STOCK_MOVEMENT_TYPES.RECEIVE
    )
);

/**
 * ============================================================
 * Register Decrease Strategies
 * ============================================================
 */

registerStrategy(
    STOCK_MOVEMENT_TYPES.SALE,
    createDecreaseStrategy(
        STOCK_MOVEMENT_TYPES.SALE
    )
);

registerStrategy(
    STOCK_MOVEMENT_TYPES.PRODUCTION,
    createDecreaseStrategy(
        STOCK_MOVEMENT_TYPES.PRODUCTION
    )
);

registerStrategy(
    STOCK_MOVEMENT_TYPES.ISSUE,
    createDecreaseStrategy(
        STOCK_MOVEMENT_TYPES.ISSUE
    )
);

/**
 * ============================================================
 * Adjustment Strategy
 * ============================================================
 */

registerStrategy(
    STOCK_MOVEMENT_TYPES.ADJUSTMENT,
    ({
        currentStock,
        quantity,
        adjustmentType,
    }) => {

        validateQuantity(quantity);

        validateAdjustmentType(
            adjustmentType
        );

        const strategies = {

            [STOCK_ADJUSTMENT_TYPES.INCREASE]: () =>
                Decimal.add(
                    currentStock,
                    quantity
                ),

            [STOCK_ADJUSTMENT_TYPES.DECREASE]: () => {

                validateAvailableStock(
                    currentStock,
                    quantity
                );

                return Decimal.subtract(
                    currentStock,
                    quantity
                );

            },

        };

        const strategy =
            strategies[adjustmentType];

        if (!strategy) {

            throw ErrorFactory.invalidAdjustment({
                adjustmentType,
            });

        }

        const newBalance = strategy();

        return buildResult({

            previousStock: currentStock,

            quantity,

            newBalance,

            movementType:
                STOCK_MOVEMENT_TYPES.ADJUSTMENT,

        });

    }
);

/**
 * ============================================================
 * Reverse Strategy Factory
 * ------------------------------------------------------------
 * Generates reverse strategies automatically.
 * ============================================================
 */

const createReverseStrategy = (movementType) => {

    switch (movementType) {

        case STOCK_MOVEMENT_TYPES.PURCHASE:
        case STOCK_MOVEMENT_TYPES.RECEIVE:

            return createDecreaseStrategy(movementType);

        case STOCK_MOVEMENT_TYPES.SALE:
        case STOCK_MOVEMENT_TYPES.PRODUCTION:
        case STOCK_MOVEMENT_TYPES.ISSUE:

            return createIncreaseStrategy(movementType);

        case STOCK_MOVEMENT_TYPES.ADJUSTMENT:

            return ({
                currentStock,
                quantity,
                adjustmentType,
            }) => {

                validateQuantity(quantity);
                validateAdjustmentType(adjustmentType);

                let newBalance;

                if (
                    adjustmentType ===
                    STOCK_ADJUSTMENT_TYPES.INCREASE
                ) {

                    validateAvailableStock(
                        currentStock,
                        quantity
                    );

                    newBalance = Decimal.subtract(
                        currentStock,
                        quantity
                    );

                } else {

                    newBalance = Decimal.add(
                        currentStock,
                        quantity
                    );

                }

                return buildResult({

                    previousStock: currentStock,

                    quantity,

                    newBalance,

                    movementType:
                        STOCK_MOVEMENT_TYPES.ADJUSTMENT,

                });

            };

        default:

            throw ErrorFactory.invalidMovement({
                movementType,
            });

    }

};

/**
 * ============================================================
 * Calculate Stock Balance
 * ============================================================
 */

/**
 * Calculates stock after applying a movement.
 *
 * @param {StockMovement} payload
 *
 * @returns {StockResult}
 */

export const calculateStockBalance = (
    payload
) => {

    validateMovementType(
        payload.movementType
    );

    return executeStrategy(payload);

};

/**
 * ============================================================
 * Reverse Stock Movement
 * ============================================================
 */

/**
 * Reverses a previously applied movement.
 *
 * Example:
 *
 * Purchase +100
 * Reverse => -100
 *
 * Sale -50
 * Reverse => +50
 */

export const reverseStockMovement = (
    payload
) => {

    validateMovementType(
        payload.movementType
    );

    const reverseStrategy =
        createReverseStrategy(
            payload.movementType
        );

    return reverseStrategy(payload);

};

/**
 * ============================================================
 * Recalculate Stock
 * ------------------------------------------------------------
 * Rebuilds stock from the ledger.
 *
 * Only ACTIVE movements affect stock.
 * ============================================================
 */

export const recalculateStock = (ledger = []) => {

    let currentStock = 0;

    for (const movement of ledger) {

        if (
            movement.status &&
            movement.status.toLowerCase() === "cancelled"
        ) {
            continue;
        }

        const result = calculateStockBalance({

            currentStock,

            movementType: movement.movementType,

            quantity: movement.quantity,

            adjustmentType:
                movement.adjustmentType,

        });

        currentStock = result.newBalance;

    }

    return currentStock;

};

/**
 * ============================================================
 * Generate Stock Summary
 * ============================================================
 */

export const generateStockSummary = ({
    openingStock = 0,
    purchased = 0,
    received = 0,
    sold = 0,
    production = 0,
    issued = 0,
    adjustmentIncrease = 0,
    adjustmentDecrease = 0,
}) => {

    const totalIn = Decimal.add(

        Decimal.add(
            purchased,
            received
        ),

        adjustmentIncrease

    );

    const totalOut = Decimal.add(

        Decimal.add(
            sold,
            production
        ),

        Decimal.add(
            issued,
            adjustmentDecrease
        )

    );

    const closingStock = Decimal.add(
        openingStock,
        Decimal.subtract(
            totalIn,
            totalOut
        )
    );

    return Object.freeze({

        openingStock,

        purchased,

        received,

        sold,

        production,

        issued,

        adjustmentIncrease,

        adjustmentDecrease,

        totalIn,

        totalOut,

        closingStock,

    });

};

/**
 * ============================================================
 * Low Stock Checker
 * ============================================================
 */

export const isLowStock = ({
    currentStock,
    minimumStock,
}) => {

    return Decimal.lessThanOrEqual(
        currentStock,
        minimumStock
    );

};

/**
 * ============================================================
 * Public API
 * ============================================================
 */

const StockCalculator = Object.freeze({

    calculateStockBalance,

    reverseStockMovement,

    recalculateStock,

    generateStockSummary,

    isLowStock,

    isIncreaseMovement,

    isDecreaseMovement,

});

export default StockCalculator;

/**
 * ============================================================
 * Internal Exports
 * ============================================================
 */

export {
    registerStrategy,
    executeStrategy,
    buildResult,
    validateQuantity,
    validateMovementType,
    validateAdjustmentType,
    validateAvailableStock,
    MovementStrategies,
};