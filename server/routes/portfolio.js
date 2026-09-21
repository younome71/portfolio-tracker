const express = require('express');
const router = express.Router();
const { auth } = require('../middlewares/auth');
const {
  validatePortfolio,
  validatePortfolioUpdate,
  validateAsset,
  validateSell,
  handleValidationErrors,
} = require('../utils/validation');
const portfolioController = require('../controllers/portfolioController');

router.get('/', auth, portfolioController.getPortfolios);

router.post(
  '/',
  auth,
  validatePortfolio,
  handleValidationErrors,
  portfolioController.createPortfolio
);

router.patch(
  '/:portfolioId',
  auth,
  validatePortfolioUpdate,
  handleValidationErrors,
  portfolioController.updatePortfolio
);

router.post(
  '/:portfolioId/assets',
  auth,
  validateAsset,
  handleValidationErrors,
  portfolioController.addAsset
);

router.post(
  '/:portfolioId/sell',
  auth,
  validateSell,
  handleValidationErrors,
  portfolioController.sellAsset
);

router.delete(
  '/:portfolioId/assets/:assetId',
  auth,
  portfolioController.removeAsset
);

router.get(
  '/:portfolioId/performance',
  auth,
  portfolioController.getPortfolioPerformance
);

module.exports = router;
