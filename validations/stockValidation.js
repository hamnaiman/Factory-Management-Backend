import { body, param, validationResult } from "express-validator";

// Handle Validation Errors
export const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array(),
    });
  }

  next();
};

// Create Stock Movement Validation
export const createStockValidation = [
  body("product")
    .notEmpty()
    .withMessage("Product is required.")
    .isMongoId()
    .withMessage("Invalid Product ID."),

  body("stockType")
    .notEmpty()
    .withMessage("Stock Type is required.")
    .isIn(["Local", "Imported"])
    .withMessage("Stock Type must be Local or Imported."),

  body("movementType")
    .notEmpty()
    .withMessage("Movement Type is required.")
    .isIn([
      "Purchase",
      "Receive",
      "Issue",
      "Production",
      "Sale",
      "Adjustment",
    ])
    .withMessage("Invalid Movement Type."),

  body("quantity")
    .notEmpty()
    .withMessage("Quantity is required.")
    .isFloat({ gt: 0 })
    .withMessage("Quantity must be greater than zero."),

  body("referenceType")
    .optional()
    .isIn([
      "Manual",
      "Purchase",
      "Production",
      "Sale",
      "Stock Adjustment",
    ])
    .withMessage("Invalid Reference Type."),

  body("referenceId")
    .optional({ nullable: true })
    .isMongoId()
    .withMessage("Invalid Reference ID."),

  body("movementDate")
    .optional()
    .isISO8601()
    .withMessage("Invalid Movement Date."),

  body("remarks")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Remarks cannot exceed 500 characters."),

  validate,
];

// Update Stock Movement Validation
export const updateStockValidation = [
  param("id")
    .isMongoId()
    .withMessage("Invalid Stock Movement ID."),

  body("stockType")
    .optional()
    .isIn(["Local", "Imported"])
    .withMessage("Stock Type must be Local or Imported."),

  body("movementType")
    .optional()
    .isIn([
      "Purchase",
      "Receive",
      "Issue",
      "Production",
      "Sale",
      "Adjustment",
    ])
    .withMessage("Invalid Movement Type."),

  body("quantity")
    .optional()
    .isFloat({ gt: 0 })
    .withMessage("Quantity must be greater than zero."),

  body("referenceType")
    .optional()
    .isIn([
      "Manual",
      "Purchase",
      "Production",
      "Sale",
      "Stock Adjustment",
    ])
    .withMessage("Invalid Reference Type."),

  body("referenceId")
    .optional({ nullable: true })
    .isMongoId()
    .withMessage("Invalid Reference ID."),

  body("movementDate")
    .optional()
    .isISO8601()
    .withMessage("Invalid Movement Date."),

  body("remarks")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Remarks cannot exceed 500 characters."),

  validate,
];

// ID Validation
export const stockIdValidation = [
  param("id")
    .isMongoId()
    .withMessage("Invalid Stock Movement ID."),

  validate,
];