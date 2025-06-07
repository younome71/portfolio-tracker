const express = require('express');
const router = express.Router();
const { auth } = require('../middlewares/auth');
const { validatePortfolio, validateAsset, handleValidationErrors } = require('../utils/validation');
const portfolioController = require('../controllers/portfolioController');

// @route   GET api/portfolio
// @desc    Get all portfolios
// @access  Private
router.get('/', auth, portfolioController.getPortfolios);

// @route   POST api/portfolio
// @desc    Create new portfolio
// @access  Private
router.post('/', auth, validatePortfolio, handleValidationErrors, portfolioController.createPortfolio);

// @route   POST api/portfolio/:portfolioId/assets
// @desc    Add asset to portfolio
// @access  Private
router.post('/:portfolioId/assets', auth, validateAsset, handleValidationErrors, portfolioController.addAsset);

// @route   DELETE api/portfolio/:portfolioId/assets/:assetId
// @desc    Remove asset from portfolio
// @access  Private
router.delete('/:portfolioId/assets/:assetId', auth, portfolioController.removeAsset);

// @route   GET api/portfolio/:portfolioId/performance
// @desc    Get portfolio performance
// @access  Private
router.get('/:portfolioId/performance', auth, portfolioController.getPortfolioPerformance);

module.exports = router;
