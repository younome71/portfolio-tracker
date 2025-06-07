const { body, validationResult } = require('express-validator');

const validateUserRegistration = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
];

const validateUserLogin = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').exists().withMessage('Password is required')
];

const validatePortfolio = [
  body('name').notEmpty().withMessage('Portfolio name is required'),
  body('isFamilyPortfolio').isBoolean().withMessage('Must be a boolean value'),
  body('familyMemberId').if(body('isFamilyPortfolio').equals(true))
    .notEmpty().withMessage('Family member ID is required for family portfolio')
];

const validateAsset = [
  body('symbol').notEmpty().withMessage('Stock symbol is required'),
  body('quantity').isFloat({ gt: 0 }).withMessage('Quantity must be greater than 0'),
  body('averagePrice').isFloat({ gt: 0 }).withMessage('Average price must be greater than 0')
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

module.exports = {
  validateUserRegistration,
  validateUserLogin,
  validatePortfolio,
  validateAsset,
  handleValidationErrors
};
