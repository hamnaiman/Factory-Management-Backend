/**
 * ============================================================
 * Stock Movement Builder
 * ------------------------------------------------------------
 * Enterprise Builder Pattern
 *
 * Purpose
 * -------
 * Creates standardized Stock Movement objects.
 *
 * Benefits
 * --------
 * ✔ Prevents incomplete objects
 * ✔ Standardized movement structure
 * ✔ Centralized validation
 * ✔ Easy future extension
 * ✔ Reusable across all services
 *
 * Used By
 * --------
 * ✔ stockService
 * ✔ stockLedger
 * ✔ stockTransaction
 * ✔ stockReversal
 * ============================================================
 */

import ErrorFactory from "./ErrorFactory.js";
import {
    STOCK_MOVEMENT_TYPES,
    STOCK_ADJUSTMENT_TYPES,
    STOCK_REFERENCE_MODULES,
    STOCK_STATUS,
    STOCK_TYPES,
} from "../constants/stockConstants.js";

class StockMovementBuilder {

    constructor() {

        this.movement = {
            productId: null,

            movementType: null,

            quantity: 0,

            stockType: STOCK_TYPES.LOCAL,

            adjustmentType: null,

            previousBalance: 0,

            newBalance: 0,

            unitCost: 0,

            totalCost: 0,

            referenceType: STOCK_REFERENCE_MODULES.MANUAL,

            referenceId: null,

            remarks: "",

            movementDate: new Date(),

            createdBy: null,

            status: STOCK_STATUS.ACTIVE,
        };

    }

    /**
     * ========================================================
     * Static Builder
     * ========================================================
     */

    static create() {

        return new StockMovementBuilder();

    }

    /**
     * ========================================================
     * Builder Methods
     * ========================================================
     */

    forProduct(productId) {

        this.movement.productId = productId;

        return this;

    }

    movementType(type) {

        this.movement.movementType = type;

        return this;

    }

    quantity(quantity) {

        this.movement.quantity = Number(quantity);

        return this;

    }

    stockType(type) {

        this.movement.stockType = type;

        return this;

    }

    adjustmentType(type) {

        this.movement.adjustmentType = type;

        return this;

    }

    previousBalance(balance) {

        this.movement.previousBalance = Number(balance);

        return this;

    }

    newBalance(balance) {

        this.movement.newBalance = Number(balance);

        return this;

    }

    unitCost(cost) {

        this.movement.unitCost = Number(cost);

        return this;

    }

    totalCost(cost) {

        this.movement.totalCost = Number(cost);

        return this;

    }

    referenceType(type) {

        this.movement.referenceType = type;

        return this;

    }

    referenceId(id) {

        this.movement.referenceId = id;

        return this;

    }

    remarks(text) {

        this.movement.remarks = text?.trim() || "";

        return this;

    }

    movementDate(date) {

        this.movement.movementDate = date;

        return this;

    }

    createdBy(userId) {

        this.movement.createdBy = userId;

        return this;

    }

    status(status) {

        this.movement.status = status;

        return this;

    }

    /**
     * ========================================================
     * Validation
     * ========================================================
     */

    validate() {

        if (!this.movement.productId) {

            throw ErrorFactory.validationError(
                "Product is required."
            );

        }

        if (
            !Object.values(STOCK_MOVEMENT_TYPES).includes(
                this.movement.movementType
            )
        ) {

            throw ErrorFactory.invalidMovement();

        }

        if (this.movement.quantity <= 0) {

            throw ErrorFactory.invalidQuantity();

        }

        if (
            this.movement.movementType ===
                STOCK_MOVEMENT_TYPES.ADJUSTMENT &&
            !Object.values(STOCK_ADJUSTMENT_TYPES).includes(
                this.movement.adjustmentType
            )
        ) {

            throw ErrorFactory.invalidAdjustment();

        }

        return true;

    }

    /**
     * ========================================================
     * Build
     * ========================================================
     */

    build() {

        this.validate();

        return Object.freeze({
            ...this.movement,
        });

    }

}

export default StockMovementBuilder;