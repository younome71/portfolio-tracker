const { listStocks } = require('../services/stockUniverseService');
const { sendError, sendSuccess } = require('../utils/apiResponse');
const logger = require('../utils/logger');

exports.searchStocks = async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    const limit = q ? Number(req.query.limit) || 25 : 0;
    const stocks = await listStocks({ q, limit: q ? limit : 0 });
    return sendSuccess(res, { stocks, count: stocks.length });
  } catch (err) {
    logger.error(`Stock search failed: ${err.message}`);
    return sendError(res, 500, 'STOCK_SEARCH_FAILED', 'Failed to search stocks');
  }
};
