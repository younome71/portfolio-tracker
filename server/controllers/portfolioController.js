const Portfolio = require('../models/Portfolio');
const User = require('../models/User');
const { fetchStockPrice, refreshPortfolioPrices } = require('../services/stockService');
const {
  toStoredSymbol,
  parseSymbol,
  isCommoditySymbol,
  toFixedIncomeSymbol,
} = require('../utils/symbols');
const {
  expectedMaturityValue,
  daysUntil,
  isFixedIncomeType,
  isMarketPricedType,
} = require('../utils/fixedIncome');
const { sendError, sendSuccess } = require('../utils/apiResponse');
const {
  computeNetInvested,
  computeFifoRealizedPnl,
  buildCashFlows,
  calculateXirr,
} = require('../utils/returns');
const logger = require('../utils/logger');

function resolveAssetType(asset) {
  if (asset?.assetType) return asset.assetType;
  if (isCommoditySymbol(asset?.symbol)) return 'COMMODITY';
  return 'EQUITY';
}

function resolvePurchaseDate(asset) {
  return asset?.purchaseDate || asset?.createdAt || null;
}

function parsePurchaseDateInput(value) {
  if (!value) return new Date();
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return new Date();
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  if (d.getTime() > endOfToday.getTime()) return new Date();
  return d;
}

function buildInitialPriceHistory(boughtAt, avgPrice, currentPrice, priceAvailable) {
  if (!priceAvailable) return [];
  const now = new Date();
  const history = [];
  const boughtMs = new Date(boughtAt).getTime();
  const sameDay =
    !Number.isNaN(boughtMs) &&
    new Date(boughtAt).toDateString() === now.toDateString();

  // Seed cost basis on the purchase date so charts / history aren't "today-only"
  if (!sameDay && Number.isFinite(avgPrice) && avgPrice > 0) {
    history.push({ date: new Date(boughtAt), price: avgPrice });
  }
  history.push({ date: now, price: currentPrice });
  return history;
}

function normalizeSellSymbol(symbol, assetType) {
  const raw = String(symbol || '')
    .toUpperCase()
    .trim();
  if (!raw) return '';
  if (assetType === 'COMMODITY' || isCommoditySymbol(raw)) {
    return raw.split('.')[0];
  }
  if (isFixedIncomeType(assetType)) {
    return raw;
  }
  return toStoredSymbol(raw);
}

function computePortfolioMetrics(portfolio) {
  let totalValue = 0;
  let totalCost = 0;
  const assets = [];

  for (const asset of portfolio.assets) {
    const quantity = Number(asset.quantity) || 0;
    const currentPrice = Number(asset.currentPrice);
    const averagePrice = Number(asset.averagePrice) || 0;
    const priceAvailable = Number.isFinite(currentPrice) && currentPrice > 0;
    const assetType = resolveAssetType(asset);

    const assetValue = priceAvailable ? quantity * currentPrice : 0;
    const assetCost = quantity * averagePrice;
    const assetProfit = assetValue - assetCost;
    const profitPercentage =
      assetCost > 0 ? (assetProfit / assetCost) * 100 : 0;

    let assetDayChange = null;
    if (
      isMarketPricedType(assetType) &&
      priceAvailable &&
      Array.isArray(asset.priceHistory) &&
      asset.priceHistory.length >= 2
    ) {
      const sorted = [...asset.priceHistory].sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      );
      const previousPrice = sorted[sorted.length - 2]?.price;
      if (previousPrice > 0) {
        assetDayChange = ((currentPrice - previousPrice) / previousPrice) * 100;
      }
    }

    totalValue += assetValue;
    totalCost += assetCost;

    const principal = assetCost;
    const boughtAt = resolvePurchaseDate(asset);
    const maturityValue =
      isFixedIncomeType(assetType) && asset.maturityDate
        ? expectedMaturityValue(
            principal,
            asset.interestRate,
            boughtAt,
            asset.maturityDate
          )
        : null;

    assets.push({
      assetType,
      name: asset.name || '',
      symbol: asset.symbol,
      quantity,
      currentPrice: priceAvailable ? currentPrice : null,
      averagePrice,
      value: assetValue,
      profit: assetProfit,
      profitPercentage,
      dayChange: assetDayChange,
      priceAvailable,
      maturityDate: asset.maturityDate || null,
      interestRate:
        asset.interestRate != null && Number.isFinite(Number(asset.interestRate))
          ? Number(asset.interestRate)
          : null,
      expectedMaturityValue: maturityValue,
      daysToMaturity: asset.maturityDate ? daysUntil(asset.maturityDate) : null,
      purchaseDate: boughtAt,
      lastUpdated:
        Array.isArray(asset.priceHistory) && asset.priceHistory.length > 0
          ? asset.priceHistory[asset.priceHistory.length - 1].date
          : asset.updatedAt || null,
      priceHistory: asset.priceHistory || [],
      createdAt: asset.createdAt || null,
      _id: asset._id.toString(),
    });
  }

  let dayChange = 0;
  let dayChangeWeight = 0;
  for (const asset of assets) {
    if (asset.dayChange === null || totalValue <= 0) continue;
    const weight = asset.value / totalValue;
    dayChange += asset.dayChange * weight;
    dayChangeWeight += weight;
  }

  const totalProfit = totalValue - totalCost;
  const totalProfitPercentage =
    totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

  const transactions = Array.isArray(portfolio.transactions)
    ? portfolio.transactions
    : [];
  const hasLedger = transactions.length > 0;
  const netInvested = hasLedger
    ? computeNetInvested(transactions)
    : totalCost;
  const { realizedPnl: realizedProfit } = computeFifoRealizedPnl(transactions);
  const unrealizedProfit = totalProfit;
  const overallProfit = totalValue - netInvested;
  const overallProfitPercentage =
    netInvested > 0 ? (overallProfit / netInvested) * 100 : 0;
  const xirr = hasLedger
    ? calculateXirr(buildCashFlows(transactions, totalValue))
    : null;

  return {
    portfolio: portfolio.name,
    name: portfolio.name,
    description: portfolio.description || '',
    isFamilyPortfolio: portfolio.isFamilyPortfolio,
    familyMember: portfolio.familyMember,
    totalValue,
    totalCost,
    totalProfit,
    totalProfitPercentage,
    netInvested,
    realizedProfit,
    unrealizedProfit,
    overallProfit,
    overallProfitPercentage,
    xirr,
    dayChange: dayChangeWeight > 0 ? dayChange : 0,
    _id: portfolio._id.toString(),
    assets,
    transactions,
  };
}

function trimPriceHistory(portfolios) {
  return (portfolios || []).map((portfolio) => ({
    ...portfolio,
    assets: (portfolio.assets || []).map((asset) => ({
      ...asset,
      priceHistory: Array.isArray(asset.priceHistory)
        ? asset.priceHistory.slice(-2)
        : [],
    })),
  }));
}

exports.getPortfolios = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).lean();
    if (!user) {
      return sendError(res, 404, 'USER_NOT_FOUND', 'User not found');
    }

    const ownDocs = await Portfolio.find({
      owner: userId,
      isFamilyPortfolio: false,
    });

    await Promise.all(ownDocs.map((doc) => refreshPortfolioPrices(doc)));

    let familyDocs = [];
    if (user.role === 'parent') {
      familyDocs = await Portfolio.find({
        owner: userId,
        isFamilyPortfolio: true,
      }).populate('familyMember', 'name email');
      await Promise.all(familyDocs.map((doc) => refreshPortfolioPrices(doc)));
    } else if (user.role === 'child') {
      familyDocs = await Portfolio.find({
        familyMember: userId,
        isFamilyPortfolio: true,
      }).populate('owner', 'name email');
      await Promise.all(familyDocs.map((doc) => refreshPortfolioPrices(doc)));
    }

    return sendSuccess(res, {
      ownPortfolios: trimPriceHistory(ownDocs.map((d) => d.toObject())),
      familyPortfolios: trimPriceHistory(familyDocs.map((d) => d.toObject())),
    });
  } catch (err) {
    logger.error(err.message, { requestId: res.locals.requestId });
    return sendError(res, 500, 'INTERNAL_ERROR', 'Server Error');
  }
};

exports.createPortfolio = async (req, res) => {
  try {
    const { name, isFamilyPortfolio, familyMemberId } = req.body;
    const userId = req.user.id;

    if (isFamilyPortfolio) {
      if (!familyMemberId) {
        return sendError(
          res,
          400,
          'VALIDATION_ERROR',
          'Family member ID is required for family portfolio'
        );
      }

      const user = await User.findById(userId);
      if (!user || user.role !== 'parent') {
        return sendError(res, 403, 'FORBIDDEN', 'Only parents can create family portfolios');
      }

      const isMember = user.familyMembers.some(
        (id) => id.toString() === familyMemberId.toString()
      );
      if (!isMember) {
        return sendError(
          res,
          400,
          'INVALID_FAMILY_MEMBER',
          'Family member is not linked to your account'
        );
      }
    }

    const portfolio = new Portfolio({
      owner: userId,
      name,
      isFamilyPortfolio: Boolean(isFamilyPortfolio),
      familyMember: isFamilyPortfolio ? familyMemberId : null,
    });

    await portfolio.save();
    return sendSuccess(res, portfolio, 201);
  } catch (err) {
    logger.error(err.message, { requestId: res.locals.requestId });
    return sendError(res, 500, 'INTERNAL_ERROR', 'Server Error');
  }
};

exports.updatePortfolio = async (req, res) => {
  try {
    const { portfolioId } = req.params;
    const userId = req.user.id;
    const { name, isFamilyPortfolio, familyMemberId } = req.body;

    const portfolio = await Portfolio.findOne({ _id: portfolioId, owner: userId });
    if (!portfolio) {
      return sendError(res, 404, 'PORTFOLIO_NOT_FOUND', 'Portfolio not found');
    }

    if (typeof name === 'string' && name.trim()) {
      portfolio.name = name.trim();
    }

    if (typeof isFamilyPortfolio === 'boolean') {
      if (isFamilyPortfolio) {
        if (!familyMemberId) {
          return sendError(
            res,
            400,
            'VALIDATION_ERROR',
            'Family member ID is required for family portfolio'
          );
        }

        const user = await User.findById(userId);
        if (!user || user.role !== 'parent') {
          return sendError(res, 403, 'FORBIDDEN', 'Only parents can manage family portfolios');
        }

        const isMember = user.familyMembers.some(
          (id) => id.toString() === familyMemberId.toString()
        );
        if (!isMember) {
          return sendError(
            res,
            400,
            'INVALID_FAMILY_MEMBER',
            'Family member is not linked to your account'
          );
        }

        portfolio.isFamilyPortfolio = true;
        portfolio.familyMember = familyMemberId;
      } else {
        portfolio.isFamilyPortfolio = false;
        portfolio.familyMember = null;
      }
    }

    await portfolio.save();
    return sendSuccess(res, portfolio);
  } catch (err) {
    logger.error(err.message, { requestId: res.locals.requestId });
    return sendError(res, 500, 'INTERNAL_ERROR', 'Server Error');
  }
};

exports.addAsset = async (req, res) => {
  try {
    const { portfolioId } = req.params;
    const {
      symbol,
      quantity,
      averagePrice,
      name,
      maturityDate,
      interestRate,
      purchaseDate,
    } = req.body;
    const assetType = req.body.assetType || 'EQUITY';
    const userId = req.user.id;
    const boughtAt = parsePurchaseDateInput(purchaseDate);

    const portfolio = await Portfolio.findOne({
      _id: portfolioId,
      owner: userId,
    }).select('_id');

    if (!portfolio) {
      return sendError(res, 404, 'PORTFOLIO_NOT_FOUND', 'Portfolio not found');
    }

    let storedSymbol = '';
    let displayName = typeof name === 'string' ? name.trim() : '';
    let qty = Number(quantity);
    let avgPrice = Number(averagePrice);
    let currentPrice = 0;
    let priceAvailable = false;
    let maturity = null;
    let rate = null;

    if (assetType === 'EQUITY') {
      storedSymbol = toStoredSymbol(symbol);
      if (!storedSymbol || !parseSymbol(storedSymbol).ticker) {
        return sendError(res, 400, 'VALIDATION_ERROR', 'Valid stock symbol is required');
      }
      try {
        currentPrice = await fetchStockPrice(storedSymbol);
        priceAvailable = Number.isFinite(currentPrice) && currentPrice > 0;
      } catch (priceErr) {
        logger.warn(`Price fetch failed for ${storedSymbol}: ${priceErr.message}`);
        currentPrice = 0;
        priceAvailable = false;
      }
    } else if (assetType === 'COMMODITY') {
      storedSymbol = String(symbol || '')
        .toUpperCase()
        .trim()
        .split('.')[0];
      if (!isCommoditySymbol(storedSymbol)) {
        return sendError(res, 400, 'VALIDATION_ERROR', 'Commodity must be GOLD or SILVER');
      }
      displayName = displayName || (storedSymbol === 'GOLD' ? 'Gold' : 'Silver');
      try {
        currentPrice = await fetchStockPrice(storedSymbol);
        priceAvailable = Number.isFinite(currentPrice) && currentPrice > 0;
      } catch (priceErr) {
        logger.warn(`Price fetch failed for ${storedSymbol}: ${priceErr.message}`);
        currentPrice = 0;
        priceAvailable = false;
      }
    } else if (isFixedIncomeType(assetType)) {
      if (!displayName) {
        return sendError(res, 400, 'VALIDATION_ERROR', 'Name is required for FD/Bond');
      }
      storedSymbol = symbol
        ? String(symbol).toUpperCase().trim().slice(0, 32)
        : toFixedIncomeSymbol(displayName, assetType);
      qty = 1;
      // Hold at cost: currentPrice = principal
      currentPrice = avgPrice;
      priceAvailable = true;
      maturity = new Date(maturityDate);
      rate = Number(interestRate);
      if (!Number.isFinite(rate) || rate < 0) {
        return sendError(res, 400, 'VALIDATION_ERROR', 'Valid interest rate is required');
      }
      if (maturity.getTime() <= boughtAt.getTime()) {
        return sendError(
          res,
          400,
          'VALIDATION_ERROR',
          'Maturity date must be after the purchase date'
        );
      }
    } else {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid asset type');
    }

    const newAsset = {
      assetType,
      symbol: storedSymbol,
      name: displayName,
      quantity: qty,
      averagePrice: avgPrice,
      currentPrice: priceAvailable ? currentPrice : 0,
      maturityDate: maturity,
      interestRate: rate,
      purchaseDate: boughtAt,
      priceHistory: buildInitialPriceHistory(
        boughtAt,
        avgPrice,
        priceAvailable ? currentPrice : 0,
        priceAvailable
      ),
    };

    const buyTransaction = {
      type: 'BUY',
      symbol: storedSymbol,
      quantity: qty,
      price: avgPrice,
      date: boughtAt,
    };

    const updated = await Portfolio.findOneAndUpdate(
      { _id: portfolioId, owner: userId },
      { $push: { assets: newAsset, transactions: buyTransaction } },
      { new: true }
    );

    return sendSuccess(res, updated);
  } catch (err) {
    logger.error(err.message, { requestId: res.locals.requestId });
    return sendError(res, 500, 'INTERNAL_ERROR', 'Server Error');
  }
};

exports.sellAsset = async (req, res) => {
  try {
    const { portfolioId } = req.params;
    const { symbol, quantity, assetType: requestedType } = req.body;
    let { price } = req.body;
    const userId = req.user.id;

    const portfolio = await Portfolio.findOne({
      _id: portfolioId,
      owner: userId,
    });

    if (!portfolio) {
      return sendError(res, 404, 'PORTFOLIO_NOT_FOUND', 'Portfolio not found');
    }

    // Infer type from holdings when not provided
    let assetType = requestedType;
    if (!assetType) {
      const match = portfolio.assets.find(
        (a) =>
          String(a.symbol).toUpperCase() === String(symbol).toUpperCase() ||
          (isCommoditySymbol(a.symbol) &&
            String(a.symbol).toUpperCase().split('.')[0] ===
              String(symbol).toUpperCase().split('.')[0])
      );
      assetType = match ? resolveAssetType(match) : 'EQUITY';
    }

    const storedSymbol = normalizeSellSymbol(symbol, assetType);
    if (!storedSymbol) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Valid symbol is required');
    }

    const sellQuantity = Number(quantity);
    const lots = portfolio.assets.filter((a) => {
      const type = resolveAssetType(a);
      if (requestedType && type !== requestedType) return false;
      if (isCommoditySymbol(storedSymbol)) {
        return (
          type === 'COMMODITY' &&
          String(a.symbol).toUpperCase().split('.')[0] === storedSymbol
        );
      }
      if (isFixedIncomeType(assetType)) {
        return isFixedIncomeType(type) && a.symbol === storedSymbol;
      }
      return type === 'EQUITY' && a.symbol === storedSymbol;
    });

    const totalHeld = lots.reduce((sum, a) => sum + (Number(a.quantity) || 0), 0);

    if (totalHeld <= 0) {
      return sendError(res, 404, 'ASSET_NOT_FOUND', 'No holdings found for this symbol');
    }
    if (sellQuantity > totalHeld + 1e-9) {
      return sendError(
        res,
        400,
        'INSUFFICIENT_QUANTITY',
        `Cannot sell ${sellQuantity} units; only ${totalHeld} held`
      );
    }

    let sellPrice = Number(price);
    if (!Number.isFinite(sellPrice) || sellPrice <= 0) {
      if (isFixedIncomeType(assetType)) {
        return sendError(
          res,
          400,
          'PRICE_REQUIRED',
          'Redeem price is required for FD/Bond'
        );
      }
      try {
        sellPrice = await fetchStockPrice(storedSymbol);
      } catch (priceErr) {
        logger.warn(`Price fetch failed for ${storedSymbol}: ${priceErr.message}`);
        sellPrice = 0;
      }
    }
    if (!Number.isFinite(sellPrice) || sellPrice <= 0) {
      return sendError(
        res,
        400,
        'PRICE_UNAVAILABLE',
        'Sell price is required (live price unavailable)'
      );
    }

    const sortedLots = lots
      .slice()
      .sort(
        (a, b) =>
          new Date(resolvePurchaseDate(a)) - new Date(resolvePurchaseDate(b))
      );

    let remaining = sellQuantity;
    const removedIds = [];
    for (const lot of sortedLots) {
      if (remaining <= 1e-12) break;
      const lotQty = Number(lot.quantity) || 0;
      if (lotQty <= remaining + 1e-9) {
        remaining -= lotQty;
        removedIds.push(lot._id);
      } else {
        lot.quantity = lotQty - remaining;
        remaining = 0;
      }
    }

    portfolio.assets = portfolio.assets.filter(
      (a) => !removedIds.some((id) => id.equals(a._id))
    );
    portfolio.transactions.push({
      type: 'SELL',
      symbol: storedSymbol,
      quantity: sellQuantity,
      price: sellPrice,
      date: new Date(),
    });

    await portfolio.save();
    return sendSuccess(res, portfolio);
  } catch (err) {
    logger.error(err.message, { requestId: res.locals.requestId });
    return sendError(res, 500, 'INTERNAL_ERROR', 'Server Error');
  }
};

exports.removeAsset = async (req, res) => {
  try {
    const { portfolioId, assetId } = req.params;
    const userId = req.user.id;

    const portfolio = await Portfolio.findOne({ _id: portfolioId, owner: userId });
    if (!portfolio) {
      return sendError(res, 404, 'PORTFOLIO_NOT_FOUND', 'Portfolio not found');
    }

    const asset = portfolio.assets.id(assetId);
    if (!asset) {
      return sendError(res, 404, 'ASSET_NOT_FOUND', 'Asset not found');
    }

    portfolio.transactions.push({
      type: 'SELL',
      symbol: asset.symbol,
      quantity: asset.quantity,
      price: asset.averagePrice,
      date: new Date(),
    });
    asset.deleteOne();

    await portfolio.save();
    return sendSuccess(res, portfolio);
  } catch (err) {
    logger.error(err.message, { requestId: res.locals.requestId });
    return sendError(res, 500, 'INTERNAL_ERROR', 'Server Error');
  }
};

exports.getPortfolioPerformance = async (req, res) => {
  try {
    const { portfolioId } = req.params;
    const userId = req.user.id;

    const portfolio = await Portfolio.findOne({
      _id: portfolioId,
      $or: [{ owner: userId }, { familyMember: userId }],
    });

    if (!portfolio) {
      return sendError(res, 404, 'PORTFOLIO_NOT_FOUND', 'Portfolio not found');
    }

    await refreshPortfolioPrices(portfolio);

    return sendSuccess(res, computePortfolioMetrics(portfolio));
  } catch (err) {
    logger.error(err.message, { requestId: res.locals.requestId });
    return sendError(res, 500, 'INTERNAL_ERROR', 'Server Error');
  }
};
