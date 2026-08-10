const mongoose = require("mongoose");

const Product = require("../models/Product.js");
const StockMovement = require("../models/StockMovement.js");

const Decimal = require("../utils/decimal.js");
const ErrorFactory = require("../utils/ErrorFactory.js");
const validateObjectId = require("../utils/validateObjectId.js");

const {
    calculateStockBalance,
    reverseStockMovement,
    generateStockSummary,
    isLowStock,
} = require("./stockCalculator.js");

const {
    STOCK_MOVEMENT_TYPES,
    STOCK_ADJUSTMENT_TYPES,
    STOCK_STATUS,
    STOCK_REFERENCE_MODULES,
} = require("../constants/stockConstants.js");


/**
 * ============================================================
 * Transaction Helpers
 * ============================================================
 */

const startMongoTransaction = async () => {
    const session = await mongoose.startSession();
    session.startTransaction();
    return session;
};

const commitTransaction = async (session) => {
    await session.commitTransaction();
    session.endSession();
};

const rollbackTransaction = async (session) => {
    await session.abortTransaction();
    session.endSession();
};

const executeInTransaction = async (operation) => {
    const session = await startMongoTransaction();

    try {
        const result = await operation(session);

        await commitTransaction(session);

        return result;
    } catch (error) {
        await rollbackTransaction(session);
        throw error;
    }
};


/**
 * ============================================================
 * Data Access Helpers
 * ============================================================
 */

const loadProduct = async (productId, session = null) => {
    validateObjectId(productId, "productId");

    const product = await Product.findOne({
        _id: productId,
        isDeleted: false,
    }).session(session);

    if (!product) {
        throw ErrorFactory.productNotFound({ productId });
    }

    return product;
};


const loadMovement = async (movementId, session = null) => {
    validateObjectId(movementId, "movementId");

    const movement = await StockMovement.findOne({
        _id: movementId,
        isDeleted: false,
    }).session(session);

    if (!movement) {
        throw ErrorFactory.stockMovementNotFound({ movementId });
    }

    return movement;
};


/**
 * Get stock balance immediately before a movement.
 */
const getBalanceBeforeMovement = async (
    productId,
    movement,
    session = null
) => {
    const previousMovement = await StockMovement.findOne({
        product: productId,
        _id: { $ne: movement._id },
        isDeleted: false,
        createdAt: { $lt: movement.createdAt },
    })
        .sort({ createdAt: -1 })
        .session(session);

    return previousMovement
        ? previousMovement.balanceAfterTransaction
        : 0;
};


/**
 * Create stock movement.
 */
const createMovement = async (movementData, session) => {
    const [movement] = await StockMovement.create(
        [movementData],
        { session }
    );

    return movement;
};


/**
 * ============================================================
 * Stock Balance Update
 * ============================================================
 *
 * There is now ONLY ONE stock balance:
 *
 * product.currentStock
 *
 * No Local / Imported distinction.
 */

const updateProductStockBalance = async (
    productId,
    newBalance,
    session
) => {
    const updatedProduct = await Product.findByIdAndUpdate(
        productId,
        {
            currentStock: newBalance,
        },
        {
            new: true,
            session,
        }
    );

    if (!updatedProduct) {
        throw ErrorFactory.productNotFound({ productId });
    }

    return updatedProduct;
};


/**
 * ============================================================
 * Movement Payload
 * ============================================================
 */

const buildMovementPayload = ({
    product,
    movementType,
    quantity,
    balanceAfterTransaction,
    referenceType,
    referenceId,
    remarks,
    userId,
}) => ({
    product: product._id,

    movementType,

    quantity,

    balanceAfterTransaction,

    referenceType:
        referenceType || STOCK_REFERENCE_MODULES.MANUAL,

    referenceId: referenceId || null,

    remarks,

    createdBy: userId,
});


/**
 * ============================================================
 * Apply Stock Movement
 * ============================================================
 */

const applyStockMovement = async (
    {
        product,
        movementType,
        quantity,
        referenceType,
        referenceId,
        remarks,
        userId,
        adjustmentType,
    },
    session
) => {

    const baseStock = Number(product.currentStock || 0);

    const balanceResult = calculateStockBalance({
        currentStock: baseStock,
        movementType,
        quantity,
        adjustmentType,
    });


    const movement = await createMovement(
        buildMovementPayload({
            product,
            movementType,
            quantity,
            balanceAfterTransaction:
                balanceResult.newBalance,
            referenceType,
            referenceId,
            remarks,
            userId,
        }),
        session
    );


    const updatedProduct =
        await updateProductStockBalance(
            product._id,
            balanceResult.newBalance,
            session
        );


    return {
        product: updatedProduct,
        movement,
        balanceResult,
    };
};


/**
 * ============================================================
 * WRITE OPERATIONS
 * ============================================================
 */


/**
 * Purchase Stock
 */
const purchaseStock = async ({
    productId,
    quantity,
    referenceType,
    referenceId,
    remarks,
    userId,
}) => {

    return executeInTransaction(async (session) => {

        const product =
            await loadProduct(productId, session);


        const {
            product: updatedProduct,
            movement,
        } = await applyStockMovement(
            {
                product,

                movementType:
                    STOCK_MOVEMENT_TYPES.PURCHASE,

                quantity,

                referenceType:
                    referenceType ||
                    STOCK_REFERENCE_MODULES.PURCHASE,

                referenceId,

                remarks,

                userId,
            },
            session
        );


        return {
            product: updatedProduct,
            movement,
        };
    });
};


/**
 * Sell Stock
 */
const sellStock = async ({
    productId,
    quantity,
    referenceType,
    referenceId,
    remarks,
    userId,
}) => {

    return executeInTransaction(async (session) => {

        const product =
            await loadProduct(productId, session);


        const {
            product: updatedProduct,
            movement,
        } = await applyStockMovement(
            {
                product,

                movementType:
                    STOCK_MOVEMENT_TYPES.SALE,

                quantity,

                referenceType:
                    referenceType ||
                    STOCK_REFERENCE_MODULES.SALES,

                referenceId,

                remarks,

                userId,
            },
            session
        );


        return {
            product: updatedProduct,
            movement,
        };
    });
};


/**
 * Consume / Issue Stock
 */
const consumeStock = async ({
    productId,
    quantity,
    movementType =
        STOCK_MOVEMENT_TYPES.ISSUE,
    referenceType,
    referenceId,
    remarks,
    userId,
}) => {

    const allowedTypes = [
        STOCK_MOVEMENT_TYPES.ISSUE,
        STOCK_MOVEMENT_TYPES.PRODUCTION,
    ];


    if (!allowedTypes.includes(movementType)) {
        throw ErrorFactory.invalidMovement({
            movementType,
        });
    }


    return executeInTransaction(async (session) => {

        const product =
            await loadProduct(productId, session);


        const {
            product: updatedProduct,
            movement,
        } = await applyStockMovement(
            {
                product,

                movementType,

                quantity,

                referenceType:
                    referenceType ||
                    STOCK_REFERENCE_MODULES.PRODUCTION,

                referenceId,

                remarks,

                userId,
            },
            session
        );


        return {
            product: updatedProduct,
            movement,
        };
    });
};


/**
 * ============================================================
 * PRODUCTION
 * ============================================================
 *
 * Raw materials:
 *   Stock decreases
 *
 * Finished product:
 *   Stock increases
 *
 * No stockType anywhere.
 */

const produceStock = async ({
    rawMaterials = [],
    finishedProduct,
    referenceType,
    referenceId,
    userId,
}) => {

    if (
        !Array.isArray(rawMaterials) ||
        rawMaterials.length === 0
    ) {
        throw ErrorFactory.invalidMovement({
            movementType:
                STOCK_MOVEMENT_TYPES.PRODUCTION,
        });
    }


    if (
        !finishedProduct ||
        !finishedProduct.productId
    ) {
        throw ErrorFactory.validationError(
            "finishedProduct.productId is required."
        );
    }


    return executeInTransaction(async (session) => {

        const movements = [];
        const consumedMaterials = [];


        /**
         * Consume Raw Materials
         */
        for (const material of rawMaterials) {

            const materialProduct =
                await loadProduct(
                    material.productId,
                    session
                );


            const {
                product: updatedMaterial,
                movement,
            } = await applyStockMovement(
                {
                    product: materialProduct,

                    movementType:
                        STOCK_MOVEMENT_TYPES.PRODUCTION,

                    quantity: material.quantity,

                    referenceType:
                        referenceType ||
                        STOCK_REFERENCE_MODULES.PRODUCTION,

                    referenceId,

                    remarks:
                        material.remarks,

                    userId,
                },
                session
            );


            consumedMaterials.push(
                updatedMaterial
            );

            movements.push(movement);
        }


        /**
         * Add Finished Product
         */
        const finishedProductDoc =
            await loadProduct(
                finishedProduct.productId,
                session
            );


        const {
            product: updatedFinishedProduct,
            movement: finishedMovement,
        } = await applyStockMovement(
            {
                product: finishedProductDoc,

                movementType:
                    STOCK_MOVEMENT_TYPES.RECEIVE,

                quantity:
                    finishedProduct.quantity,

                referenceType:
                    referenceType ||
                    STOCK_REFERENCE_MODULES.PRODUCTION,

                referenceId,

                remarks:
                    finishedProduct.remarks,

                userId,
            },
            session
        );


        movements.push(finishedMovement);


        return {
            finishedProduct:
                updatedFinishedProduct,

            consumedMaterials,

            movements,
        };
    });
};


/**
 * ============================================================
 * STOCK ADJUSTMENT
 * ============================================================
 */

const adjustStock = async ({
    productId,
    quantity,
    adjustmentType,
    referenceId,
    remarks,
    userId,
}) => {

    if (
        !Object.values(STOCK_ADJUSTMENT_TYPES)
            .includes(adjustmentType)
    ) {
        throw ErrorFactory.invalidAdjustment({
            adjustmentType,
        });
    }


    return executeInTransaction(async (session) => {

        const product =
            await loadProduct(productId, session);


        const {
            product: updatedProduct,
            movement,
        } = await applyStockMovement(
            {
                product,

                movementType:
                    STOCK_MOVEMENT_TYPES.ADJUSTMENT,

                quantity,

                referenceType:
                    STOCK_REFERENCE_MODULES.STOCK_ADJUSTMENT,

                referenceId,

                remarks,

                userId,

                adjustmentType,
            },
            session
        );


        return {
            product: updatedProduct,
            movement,
        };
    });
};


/**
 * ============================================================
 * REVERSE MOVEMENT
 * ============================================================
 */

const reverseMovement = async ({
    movementId,
    remarks,
    userId,
}) => {

    return executeInTransaction(async (session) => {

        const movement =
            await loadMovement(
                movementId,
                session
            );


        if (
            movement.status ===
            STOCK_STATUS.CANCELLED
        ) {
            throw ErrorFactory.movementAlreadyCancelled({
                movementId,
            });
        }


        const product =
            await loadProduct(
                movement.product,
                session
            );


        let adjustmentType = null;


        if (
            movement.movementType ===
            STOCK_MOVEMENT_TYPES.ADJUSTMENT
        ) {

            const balanceBefore =
                await getBalanceBeforeMovement(
                    movement.product,
                    movement,
                    session
                );


            adjustmentType =
                Decimal.lessThan(
                    balanceBefore,
                    movement.balanceAfterTransaction
                )
                    ? STOCK_ADJUSTMENT_TYPES.INCREASE
                    : STOCK_ADJUSTMENT_TYPES.DECREASE;
        }


        /**
         * Current single stock balance.
         */
        const currentStock =
            Number(product.currentStock || 0);


        const reversedBalance =
            reverseStockMovement({
                currentStock,

                movementType:
                    movement.movementType,

                quantity:
                    movement.quantity,

                adjustmentType,
            });


        /**
         * Create reversal movement.
         */
        const reversalMovement =
            await createMovement(
                buildMovementPayload({
                    product,

                    movementType:
                        movement.movementType,

                    quantity:
                        movement.quantity,

                    balanceAfterTransaction:
                        reversedBalance.newBalance,

                    referenceType:
                        STOCK_REFERENCE_MODULES.MANUAL,

                    referenceId:
                        movement._id,

                    remarks:
                        remarks ||
                        `Reversal of movement ${movement._id}`,

                    userId,
                }),
                session
            );


        /**
         * Cancel original movement.
         */
        movement.status =
            STOCK_STATUS.CANCELLED;

        await movement.save({
            session,
        });


        /**
         * Update single stock balance.
         */
        const updatedProduct =
            await updateProductStockBalance(
                product._id,
                reversedBalance.newBalance,
                session
            );


        return {
            product: updatedProduct,

            originalMovement:
                movement,

            reversalMovement,
        };
    });
};


/**
 * ============================================================
 * READ OPERATIONS
 * ============================================================
 */


/**
 * Inventory response shape.
 */
const buildInventoryView = (product) => {

    const currentStock =
        Number(product.currentStock || 0);

    return {
        productId: product._id,

        productName:
            product.productName,

        productCode:
            product.productCode,

        category:
            product.category,

        unit:
            product.unit,

        currentStock,

        minimumStock:
            Number(product.minimumStock || 0),

        isLowStock: isLowStock({
            currentStock,

            minimumStock:
                Number(product.minimumStock || 0),
        }),
    };
};


/**
 * Get Product Stock
 */
const getProductStock = async (productId) => {

    const product =
        await loadProduct(productId);

    return buildInventoryView(product);
};


/**
 * Get Stock History
 */
const getStockHistory = async ({
    productId,
    movementType,
    fromDate,
    toDate,
    page = 1,
    limit = 20,
}) => {

    await loadProduct(productId);


    const query = {
        product: productId,

        isDeleted: false,
    };


    if (movementType) {
        query.movementType =
            movementType;
    }


    if (fromDate || toDate) {

        query.movementDate = {};

        if (fromDate) {
            query.movementDate.$gte =
                new Date(fromDate);
        }

        if (toDate) {
            query.movementDate.$lte =
                new Date(toDate);
        }
    }


    const skip =
        (page - 1) * limit;


    const [
        data,
        totalRecords,
    ] = await Promise.all([

        StockMovement.find(query)
            .sort({
                movementDate: -1,
                createdAt: -1,
            })
            .skip(skip)
            .limit(limit),

        StockMovement.countDocuments(query),
    ]);


    return {
        data,

        pagination: {
            page,

            limit,

            totalRecords,

            totalPages:
                Math.ceil(
                    totalRecords / limit
                ) || 1,
        },
    };
};


/**
 * Get Stock Summary
 */
const getStockSummary = async ({
    productId,
    fromDate,
    toDate,
}) => {

    await loadProduct(productId);


    const openingMovement =
        await StockMovement.findOne({
            product: productId,

            status:
                STOCK_STATUS.ACTIVE,

            isDeleted: false,

            ...(fromDate
                ? {
                    movementDate: {
                        $lt: new Date(fromDate),
                    },
                }
                : {}),
        })
            .sort({
                movementDate: -1,
                createdAt: -1,
            });


    const openingStock =
        openingMovement
            ? openingMovement.balanceAfterTransaction
            : 0;


    const rangeQuery = {

        product: productId,

        status:
            STOCK_STATUS.ACTIVE,

        isDeleted: false,
    };


    if (fromDate || toDate) {

        rangeQuery.movementDate = {};

        if (fromDate) {
            rangeQuery.movementDate.$gte =
                new Date(fromDate);
        }

        if (toDate) {
            rangeQuery.movementDate.$lte =
                new Date(toDate);
        }
    }


    const movements =
        await StockMovement.find(
            rangeQuery
        ).sort({
            movementDate: 1,
            createdAt: 1,
        });


    const totals = {

        purchased: 0,

        received: 0,

        sold: 0,

        production: 0,

        issued: 0,

        adjustmentIncrease: 0,

        adjustmentDecrease: 0,
    };


    let runningBalance =
        openingStock;


    for (const movement of movements) {

        switch (
            movement.movementType
        ) {

            case STOCK_MOVEMENT_TYPES.PURCHASE:

                totals.purchased =
                    Decimal.add(
                        totals.purchased,
                        movement.quantity
                    );

                break;


            case STOCK_MOVEMENT_TYPES.RECEIVE:

                totals.received =
                    Decimal.add(
                        totals.received,
                        movement.quantity
                    );

                break;


            case STOCK_MOVEMENT_TYPES.SALE:

                totals.sold =
                    Decimal.add(
                        totals.sold,
                        movement.quantity
                    );

                break;


            case STOCK_MOVEMENT_TYPES.PRODUCTION:

                totals.production =
                    Decimal.add(
                        totals.production,
                        movement.quantity
                    );

                break;


            case STOCK_MOVEMENT_TYPES.ISSUE:

                totals.issued =
                    Decimal.add(
                        totals.issued,
                        movement.quantity
                    );

                break;


            case STOCK_MOVEMENT_TYPES.ADJUSTMENT: {

                const isIncrease =
                    Decimal.lessThan(
                        runningBalance,
                        movement.balanceAfterTransaction
                    );


                if (isIncrease) {

                    totals.adjustmentIncrease =
                        Decimal.add(
                            totals.adjustmentIncrease,
                            movement.quantity
                        );

                } else {

                    totals.adjustmentDecrease =
                        Decimal.add(
                            totals.adjustmentDecrease,
                            movement.quantity
                        );
                }

                break;
            }


            default:
                break;
        }


        runningBalance =
            movement.balanceAfterTransaction;
    }


    return generateStockSummary({
        openingStock,

        ...totals,
    });
};


/**
 * ============================================================
 * LOW STOCK
 * ============================================================
 */

const getLowStockProducts = async ({
    category,
} = {}) => {

    const query = {

        isDeleted: false,

        status: "active",
    };


    if (category) {
        query.category =
            category;
    }


    const products =
        await Product.find(query);


    return products
        .map((product) =>
            buildInventoryView(product)
        )
        .filter(
            (item) => item.isLowStock
        );
};


/**
 * ============================================================
 * INVENTORY LIST
 * ============================================================
 */

const getInventoryList = async ({
    category,
} = {}) => {

    const query = {

        isDeleted: false,

        status: "active",
    };


    if (category) {
        query.category =
            category;
    }


    const products =
        await Product.find(query)
            .sort({
                productName: 1,
            });


    return products.map(
        (product) =>
            buildInventoryView(product)
    );
};


/**
 * ============================================================
 * EXPORT
 * ============================================================
 */

const StockService = {

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


module.exports = StockService;