const express = require('express');
const { searchStocks } = require('../controllers/stockController');

const router = express.Router();

// Public: equity autocomplete / full universe for the add-asset picker
router.get('/', searchStocks);

module.exports = router;
