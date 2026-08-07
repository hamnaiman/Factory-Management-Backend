/**
 * ============================================================
 * Stock Movement Director
 * ------------------------------------------------------------
 * Enterprise Director Pattern
 *
 * Purpose
 * -------
 * Creates standardized Stock Movement objects for common
 * inventory operations using StockMovementBuilder.
 *
 * Responsibilities
 * ----------------
 * ✔ Purchase Movements
 * ✔ Receive Movements
 * ✔ Sale Movements
 * ✔ Production Movements
 * ✔ Issue Movements
 * ✔ Stock Adjustments
 *
 * Used By
 * --------
 * ✔ stockService
 * ✔ purchaseService
 * ✔ salesService
 * ✔ productionService
 * ✔ stockReversal
 * ============================================================
 */

import StockMovementBuilder from "./StockMovementBuilder.js";

import {
    STOCK_MOVEMENT_TYPES,
    STOCK_ADJUSTMENT_TYPES,
    STOCK_REFERENCE_MODULES,
} from "../constants/stockConstants.js";

class StockMovementDirector {

    /**
     * ========================================================
     * Purchase
     * ========================================================
     */

    static createPurchase({
        productId,
        quantity,
        unitCost = 0,
        referenceId = null,
        remarks = "",
        createdBy = null,
    }) {

        return StockMovementBuilder
            .create()
            .forProduct(productId)
            .movementType(STOCK_MOVEMENT_TYPES.PURCHASE)
            .quantity(quantity)
            .unitCost(unitCost)
            .totalCost(quantity * unitCost)
            .referenceType(STOCK_REFERENCE_MODULES.PURCHASE)
            .referenceId(referenceId)
            .remarks(remarks)
            .createdBy(createdBy)
            .build();

    }

    /**
     * ========================================================
     * Receive
     * ========================================================
     */

    static createReceive({
        productId,
        quantity,
        referenceId = null,
        remarks = "",
        createdBy = null,
    }) {

        return StockMovementBuilder
            .create()
            .forProduct(productId)
            .movementType(STOCK_MOVEMENT_TYPES.RECEIVE)
            .quantity(quantity)
            .referenceType(STOCK_REFERENCE_MODULES.PURCHASE)
            .referenceId(referenceId)
            .remarks(remarks)
            .createdBy(createdBy)
            .build();

    }

    /**
     * ========================================================
     * Sale
     * ========================================================
     */

    static createSale({
        productId,
        quantity,
        referenceId = null,
        remarks = "",
        createdBy = null,
    }) {

        return StockMovementBuilder
            .create()
            .forProduct(productId)
            .movementType(STOCK_MOVEMENT_TYPES.SALE)
            .quantity(quantity)
            .referenceType(STOCK_REFERENCE_MODULES.SALES)
            .referenceId(referenceId)
            .remarks(remarks)
            .createdBy(createdBy)
            .build();

    }

    /**
     * ========================================================
     * Production
     * ========================================================
     */

    static createProduction({
        productId,
        quantity,
        referenceId = null,
        remarks = "",
        createdBy = null,
    }) {

        return StockMovementBuilder
            .create()
            .forProduct(productId)
            .movementType(STOCK_MOVEMENT_TYPES.PRODUCTION)
            .quantity(quantity)
            .referenceType(STOCK_REFERENCE_MODULES.PRODUCTION)
            .referenceId(referenceId)
            .remarks(remarks)
            .createdBy(createdBy)
            .build();

    }

    /**
     * ========================================================
     * Issue
     * ========================================================
     */

    static createIssue({
        productId,
        quantity,
        referenceId = null,
        remarks = "",
        createdBy = null,
    }) {

        return StockMovementBuilder
            .create()
            .forProduct(productId)
            .movementType(STOCK_MOVEMENT_TYPES.ISSUE)
            .quantity(quantity)
            .referenceType(STOCK_REFERENCE_MODULES.MANUAL)
            .referenceId(referenceId)
            .remarks(remarks)
            .createdBy(createdBy)
            .build();

    }

    /**
     * ========================================================
     * Stock Adjustment
     * ========================================================
     */

    static createAdjustment({
        productId,
        quantity,
        adjustmentType,
        referenceId = null,
        remarks = "",
        createdBy = null,
    }) {

        return StockMovementBuilder
            .create()
            .forProduct(productId)
            .movementType(STOCK_MOVEMENT_TYPES.ADJUSTMENT)
            .adjustmentType(adjustmentType)
            .quantity(quantity)
            .referenceType(
                STOCK_REFERENCE_MODULES.STOCK_ADJUSTMENT
            )
            .referenceId(referenceId)
            .remarks(remarks)
            .createdBy(createdBy)
            .build();

    }

    /**
     * ========================================================
     * Opening Stock
     * ========================================================
     */

    static createOpeningStock({
        productId,
        quantity,
        unitCost = 0,
        remarks = "Opening Stock",
        createdBy = null,
    }) {

        return StockMovementBuilder
            .create()
            .forProduct(productId)
            .movementType(STOCK_MOVEMENT_TYPES.PURCHASE)
            .quantity(quantity)
            .unitCost(unitCost)
            .totalCost(quantity * unitCost)
            .referenceType(
                STOCK_REFERENCE_MODULES.OPENING_STOCK
            )
            .remarks(remarks)
            .createdBy(createdBy)
            .build();

    }

}

Object.freeze(StockMovementDirector);

export default StockMovementDirector;