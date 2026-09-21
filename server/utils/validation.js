const { body, validationResult } = require('express-validator');
const { sendError } = require('./apiResponse');

const ASSET_TYPES = ['EQUITY', 'FD', 'BOND', 'COMMODITY'];
const COMMODITIES = ['GOLD', 'SILVER'];

const validateUserRegistration = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .isLength({ max: 128 }),
  body('role').optional().isIn(['parent', 'child']).withMessage('Role must be parent or child'),
];

const validateUserLogin = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').exists().withMessage('Password is required'),
];

const validatePortfolio = [
  body('name').trim().notEmpty().withMessage('Portfolio name is required').isLength({ max: 100 }),
  body('isFamilyPortfolio').optional().isBoolean().withMessage('Must be a boolean value'),
  body('familyMemberId')
    .if((_value, { req }) => req.body.isFamilyPortfolio === true || req.body.isFamilyPortfolio === 'true')
    .notEmpty()
    .withMessage('Family member ID is required for family portfolio'),
];

const validatePortfolioUpdate = [
  body('name').optional().trim().notEmpty().withMessage('Portfolio name cannot be empty').isLength({ max: 100 }),
  body('isFamilyPortfolio').optional().isBoolean().withMessage('Must be a boolean value'),
  body('familyMemberId').optional({ nullable: true }),
];

const validateAsset = [
  body('assetType')
    .optional()
    .isIn(ASSET_TYPES)
    .withMessage(`assetType must be one of: ${ASSET_TYPES.join(', ')}`),
  body('quantity').isFloat({ gt: 0 }).withMessage('Quantity must be greater than 0'),
  body('averagePrice').isFloat({ gt: 0 }).withMessage('Average price must be greater than 0'),

  // Equity: stock symbol required
  body('symbol')
    .if((_value, { req }) => {
      const t = req.body.assetType || 'EQUITY';
      return t === 'EQUITY';
    })
    .trim()
    .notEmpty()
    .withMessage('Stock symbol is required')
    .isLength({ max: 32 }),

  // Commodity: GOLD or SILVER
  body('symbol')
    .if((_value, { req }) => req.body.assetType === 'COMMODITY')
    .trim()
    .notEmpty()
    .withMessage('Commodity symbol is required')
    .customSanitizer((v) => String(v || '').toUpperCase().trim())
    .isIn(COMMODITIES)
    .withMessage('Commodity must be GOLD or SILVER'),

  // FD / Bond: name, maturity, rate required; symbol optional
  body('name')
    .if((_value, { req }) => {
      const t = req.body.assetType;
      return t === 'FD' || t === 'BOND';
    })
    .trim()
    .notEmpty()
    .withMessage('Name is required for FD/Bond')
    .isLength({ max: 100 }),
  body('maturityDate')
    .if((_value, { req }) => {
      const t = req.body.assetType;
      return t === 'FD' || t === 'BOND';
    })
    .notEmpty()
    .withMessage('Maturity date is required for FD/Bond')
    .isISO8601()
    .withMessage('Maturity date must be a valid date')
    .custom((value) => {
      const d = new Date(value);
      // Allow backdated FDs that mature in the past only if purchase is also past —
      // still require maturity strictly after "now" for new deposits.
      if (d.getTime() <= Date.now()) {
        throw new Error('Maturity date must be in the future');
      }
      return true;
    }),
  body('interestRate')
    .if((_value, { req }) => {
      const t = req.body.assetType;
      return t === 'FD' || t === 'BOND';
    })
    .isFloat({ min: 0 })
    .withMessage('Interest rate must be 0 or greater'),
  body('symbol')
    .if((_value, { req }) => {
      const t = req.body.assetType;
      return t === 'FD' || t === 'BOND';
    })
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 32 }),

  // Optional backdated purchase / deposit date (not in the future)
  body('purchaseDate')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601()
    .withMessage('Purchase date must be a valid date')
    .custom((value, { req }) => {
      const purchase = new Date(value);
      if (Number.isNaN(purchase.getTime())) {
        throw new Error('Purchase date must be a valid date');
      }
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);
      if (purchase.getTime() > endOfToday.getTime()) {
        throw new Error('Purchase date cannot be in the future');
      }
      const t = req.body.assetType;
      if ((t === 'FD' || t === 'BOND') && req.body.maturityDate) {
        const maturity = new Date(req.body.maturityDate);
        if (!Number.isNaN(maturity.getTime()) && purchase.getTime() >= maturity.getTime()) {
          throw new Error('Purchase date must be before maturity date');
        }
      }
      return true;
    }),
];

const validateSell = [
  body('symbol').trim().notEmpty().withMessage('Symbol is required').isLength({ max: 32 }),
  body('quantity').isFloat({ gt: 0 }).withMessage('Quantity must be greater than 0'),
  body('assetType')
    .optional()
    .isIn(ASSET_TYPES)
    .withMessage(`assetType must be one of: ${ASSET_TYPES.join(', ')}`),
  body('price')
    .optional({ nullable: true })
    .isFloat({ gt: 0 })
    .withMessage('Price must be greater than 0'),
];

const validateFamilyMember = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Validation failed', {
      errors: errors.array(),
    });
  }
  next();
};

module.exports = {
  validateUserRegistration,
  validateUserLogin,
  validatePortfolio,
  validatePortfolioUpdate,
  validateAsset,
  validateSell,
  validateFamilyMember,
  handleValidationErrors,
};
