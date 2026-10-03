const Portfolio = require('../models/Portfolio');
const logger = require('../utils/logger');
const {
  toYahooSymbol,
  parseSymbol,
  toStoredSymbol,
  isCommoditySymbol,
} = require('../utils/symbols');
const { isMarketPricedType } = require('../utils/fixedIncome');

const stockCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const JOB_TIMEOUT_MS = 3 * 60 * 1000; // fail stuck jobs after 3 minutes

/** Yahoo futures tickers (USD per troy ounce). */
const COMMODITY_YAHOO = {
  GOLD: 'GC=F',
  SILVER: 'SI=F',
};

const USDINR_YAHOO = 'INR=X';
const TROY_OZ_TO_GRAMS = 31.1034768;

let updateInFlight = null;
let yahooFinancePromise = null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getYahooFinance() {
  if (!yahooFinancePromise) {
    yahooFinancePromise = import('yahoo-finance2').then((mod) => {
      const YahooFinance = mod.default;
      return new YahooFinance({ suppressNotices: ['yahooSurvey'] });
    });
  }
  return yahooFinancePromise;
}

function getISTParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
    hour12: false,
  }).formatToParts(date);

  const map = {};
  for (const part of parts) {
    if (part.type !== 'literal') map[part.type] = part.value;
  }

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
    weekday: map.weekday,
  };
}

function isIndianMarketOpen(date = new Date()) {
  const ist = getISTParts(date);
  const weekend = ist.weekday === 'Sat' || ist.weekday === 'Sun';
  if (weekend) return false;

  const minutes = ist.hour * 60 + ist.minute;
  const open = 9 * 60 + 15;
  const close = 15 * 60 + 30;
  return minutes >= open && minutes <= close;
}

function istDayKey(date = new Date()) {
  const ist = getISTParts(date);
  return `${ist.year}-${String(ist.month).padStart(2, '0')}-${String(ist.day).padStart(2, '0')}`;
}

/**
 * Prefer live LTP; fall back to previous close (critical when market is shut).
 */
function extractPrice(quote) {
  if (!quote || typeof quote !== 'object') return null;
  const candidates = [
    quote.regularMarketPrice,
    quote.regularMarketPreviousClose,
    quote.postMarketPrice,
    quote.preMarketPrice,
    quote.chartPreviousClose,
  ];
  for (const value of candidates) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

/**
 * Last usable daily close from Yahoo chart — used when quote() is empty
 * after hours or briefly unavailable for newly listed names.
 */
async function fetchLastCloseFromChart(symbol) {
  const nseSymbol = toNseStored(symbol) || String(symbol).toUpperCase();
  const yahooSymbol = toYahooSymbol(nseSymbol);
  if (!yahooSymbol) {
    throw new Error(`Invalid symbol: ${symbol}`);
  }

  const yf = await getYahooFinance();
  const period1 = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000);
  const chart = await yf.chart(yahooSymbol, { period1, interval: '1d' });

  const metaPrice = Number(chart?.meta?.regularMarketPrice);
  if (Number.isFinite(metaPrice) && metaPrice > 0) return metaPrice;

  const metaPrev = Number(
    chart?.meta?.chartPreviousClose ?? chart?.meta?.previousClose
  );
  if (Number.isFinite(metaPrev) && metaPrev > 0) return metaPrev;

  const quotes = [...(chart?.quotes || [])].reverse();
  for (const q of quotes) {
    const close = Number(q?.close ?? q?.adjclose);
    if (Number.isFinite(close) && close > 0) return close;
  }

  throw new Error(`No chart price data for ${symbol} (${yahooSymbol})`);
}

async function withRetries(fn, { retries = 2, delayMs = 250 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await sleep(delayMs * (attempt + 1));
    }
  }
  throw lastErr;
}

/**
 * Persist portfolio price mutations even when another request bumped __v
 * (add/sell/list refresh races were dropping after-hours LTP saves).
 */
async function savePortfolioWithRetry(portfolio, reapply) {
  let doc = portfolio;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await doc.save();
      return doc;
    } catch (err) {
      const isVersion =
        err?.name === 'VersionError' ||
        /No matching document found for id/i.test(String(err?.message || ''));
      if (!isVersion || attempt === 2) {
        throw err;
      }
      const fresh = await Portfolio.findById(doc._id);
      if (!fresh) throw err;
      if (typeof reapply === 'function') reapply(fresh);
      doc = fresh;
    }
  }
  return doc;
}

/** Always price equities against NSE Yahoo symbol for this product. */
function toNseStored(symbol) {
  if (isCommoditySymbol(symbol)) {
    return String(symbol).toUpperCase().trim().split('.')[0];
  }
  const ticker = parseSymbol(symbol).ticker;
  return ticker ? toStoredSymbol(ticker) : '';
}

function resolveAssetType(asset) {
  if (asset?.assetType) return asset.assetType;
  if (isCommoditySymbol(asset?.symbol)) return 'COMMODITY';
  return 'EQUITY';
}

async function fetchUsdInrRate(yf) {
  const cacheKey = 'USDINR';
  const now = Date.now();
  const cached = stockCache.get(cacheKey);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.price;
  }

  const quote = await yf.quote(USDINR_YAHOO);
  const rate = extractPrice(quote);
  if (rate === null) {
    throw new Error('No USD/INR rate available');
  }

  stockCache.set(cacheKey, { price: rate, timestamp: now, yahooSymbol: USDINR_YAHOO });
  return rate;
}

/**
 * Convert USD/troy-oz commodity futures quote to INR per gram.
 */
async function fetchCommodityPriceInrPerGram(symbol) {
  const metal = String(symbol || '')
    .toUpperCase()
    .trim()
    .split('.')[0];
  const yahooFutures = COMMODITY_YAHOO[metal];
  if (!yahooFutures) {
    throw new Error(`Unsupported commodity: ${symbol}`);
  }

  const now = Date.now();
  const cacheEntry = stockCache.get(metal);
  if (cacheEntry && now - cacheEntry.timestamp < CACHE_TTL_MS) {
    return cacheEntry.price;
  }

  const yf = await getYahooFinance();
  const [metalQuote, usdInr] = await Promise.all([
    yf.quote(yahooFutures),
    fetchUsdInrRate(yf),
  ]);

  const usdPerOz = extractPrice(metalQuote);
  if (usdPerOz === null) {
    throw new Error(`No price data for ${metal} (${yahooFutures})`);
  }

  const inrPerGram = (usdPerOz * usdInr) / TROY_OZ_TO_GRAMS;
  if (!Number.isFinite(inrPerGram) || inrPerGram <= 0) {
    throw new Error(`Invalid INR/g price for ${metal}`);
  }

  stockCache.set(metal, {
    price: inrPerGram,
    timestamp: now,
    yahooSymbol: yahooFutures,
  });

  return inrPerGram;
}

async function fetchEquityPriceUncached(symbol) {
  const nseSymbol = toNseStored(symbol) || String(symbol).toUpperCase();
  const yahooSymbol = toYahooSymbol(nseSymbol);
  if (!yahooSymbol) {
    throw new Error(`Invalid symbol: ${symbol}`);
  }

  const yf = await getYahooFinance();

  try {
    const quote = await withRetries(() => yf.quote(yahooSymbol), {
      retries: 2,
      delayMs: 200,
    });
    const ltp = extractPrice(quote);
    if (ltp !== null) return { price: ltp, yahooSymbol };
  } catch (quoteErr) {
    logger.warn(
      `Quote failed for ${yahooSymbol}, trying chart close: ${quoteErr.message}`
    );
  }

  // After hours / thin quotes: last session close from chart
  const chartPrice = await fetchLastCloseFromChart(nseSymbol);
  return { price: chartPrice, yahooSymbol };
}

async function fetchStockPrice(symbol) {
  if (isCommoditySymbol(symbol)) {
    return fetchCommodityPriceInrPerGram(symbol);
  }

  const now = Date.now();
  const nseSymbol = toNseStored(symbol) || String(symbol).toUpperCase();
  const cacheEntry = stockCache.get(nseSymbol);

  if (cacheEntry && now - cacheEntry.timestamp < CACHE_TTL_MS) {
    return cacheEntry.price;
  }

  const { price: ltp, yahooSymbol } = await fetchEquityPriceUncached(nseSymbol);

  if (!Number.isFinite(ltp) || ltp <= 0) {
    throw new Error(`No price data for ${symbol} (${yahooSymbol})`);
  }

  stockCache.set(nseSymbol, {
    price: ltp,
    timestamp: now,
    yahooSymbol,
  });

  return ltp;
}

async function fetchLTP(symbol) {
  return fetchStockPrice(symbol);
}

/**
 * Batch-fetch. Keys in the returned Map are stored symbols (TICKER.NSE or GOLD/SILVER).
 */
async function fetchPricesForSymbols(symbols) {
  const unique = [...new Set(symbols.map((s) => String(s || '').toUpperCase().trim()).filter(Boolean))];
  const equityKeys = [];
  const commodityKeys = [];

  for (const s of unique) {
    if (isCommoditySymbol(s)) {
      commodityKeys.push(s.split('.')[0]);
    } else if (s.includes('.') || parseSymbol(s).exchange === 'NSE' || parseSymbol(s).exchange === 'BSE') {
      const nse = toNseStored(s);
      if (nse && !isCommoditySymbol(nse)) equityKeys.push(nse);
    }
  }

  const results = new Map();

  // Commodities (INR/g)
  for (const metal of [...new Set(commodityKeys)]) {
    try {
      const price = await fetchCommodityPriceInrPerGram(metal);
      results.set(metal, price);
      await sleep(100);
    } catch (err) {
      logger.error(`Failed to fetch commodity ${metal}: ${err.message}`);
    }
  }

  const nseKeys = [...new Set(equityKeys)];
  if (nseKeys.length === 0) return results;

  const yf = await getYahooFinance();
  const yahooToNse = new Map();
  const yahooList = [];

  for (const nse of nseKeys) {
    const yahoo = toYahooSymbol(nse);
    if (!yahoo) continue;
    yahooToNse.set(yahoo, nse);
    yahooList.push(yahoo);
  }

  try {
    const quotes = await yf.quote(yahooList);
    const list = Array.isArray(quotes) ? quotes : [quotes];

    for (const quote of list) {
      if (!quote?.symbol) continue;
      const yahooSym = String(quote.symbol).toUpperCase();
      const nse = yahooToNse.get(yahooSym);
      const price = extractPrice(quote);
      if (nse && price !== null) {
        results.set(nse, price);
        stockCache.set(nse, {
          price,
          timestamp: Date.now(),
          yahooSymbol: yahooSym,
        });
      }
    }
  } catch (batchErr) {
    logger.warn(`Batch quote failed, falling back per symbol: ${batchErr.message}`);
  }

  for (const nse of nseKeys) {
    if (results.has(nse)) continue;
    try {
      const price = await fetchStockPrice(nse);
      results.set(nse, price);
      await sleep(150);
    } catch (err) {
      logger.error(`Failed to fetch ${nse}: ${err.message}`);
    }
  }

  return results;
}

function ensurePurchaseCostSeed(asset, now) {
  const avg = Number(asset.averagePrice);
  const boughtAt = asset.purchaseDate || asset.createdAt;
  if (!Number.isFinite(avg) || avg <= 0 || !boughtAt) return false;

  const boughtKey = istDayKey(new Date(boughtAt));
  const todayKey = istDayKey(now);
  if (boughtKey === todayKey) return false;

  if (!Array.isArray(asset.priceHistory)) {
    asset.priceHistory = [];
  }

  const hasBuyDay = asset.priceHistory.some(
    (entry) => istDayKey(new Date(entry.date)) === boughtKey
  );
  if (hasBuyDay) return false;

  asset.priceHistory.unshift({ date: new Date(boughtAt), price: avg });
  return true;
}

function applyPriceToAsset(asset, price, now, todayKey) {
  let changed = false;
  const assetType = resolveAssetType(asset);

  if (assetType === 'EQUITY') {
    const nseSymbol = toNseStored(asset.symbol);
    if (nseSymbol && asset.symbol !== nseSymbol) {
      asset.symbol = nseSymbol;
      changed = true;
    }
  }

  if (Number.isFinite(price) && price > 0 && asset.currentPrice !== price) {
    asset.currentPrice = price;
    changed = true;
  }

  if (!Number.isFinite(price) || price <= 0) return changed;

  if (ensurePurchaseCostSeed(asset, now)) {
    changed = true;
  }

  if (!Array.isArray(asset.priceHistory)) {
    asset.priceHistory = [];
  }

  const existingEntry = asset.priceHistory.find((entry) => {
    return istDayKey(new Date(entry.date)) === todayKey;
  });

  if (existingEntry) {
    if (existingEntry.price !== price) {
      existingEntry.price = price;
      existingEntry.date = now;
      changed = true;
    }
  } else {
    asset.priceHistory.push({ date: now, price });
    changed = true;
  }

  return changed;
}

function applyPriceMapToPortfolio(portfolio, priceMap, now, todayKey) {
  let changed = false;
  for (const asset of portfolio.assets) {
    if (!isMarketPricedType(resolveAssetType(asset))) continue;
    const key = isCommoditySymbol(asset.symbol)
      ? String(asset.symbol).toUpperCase().split('.')[0]
      : toNseStored(asset.symbol);
    const price = priceMap.get(key);
    if (!Number.isFinite(price) || price <= 0) continue;
    if (applyPriceToAsset(asset, price, now, todayKey)) {
      changed = true;
    }
  }
  return changed;
}

function marketPricedSymbolsFromAssets(assets) {
  const symbols = [];
  for (const asset of assets || []) {
    if (!isMarketPricedType(resolveAssetType(asset))) continue;
    if (asset?.symbol) symbols.push(asset.symbol);
  }
  return symbols;
}

/**
 * Refresh a single portfolio document's market-priced asset prices from Yahoo.
 * Skips FD/BOND. Persists if anything changed.
 */
async function refreshPortfolioPrices(portfolio) {
  if (!portfolio?.assets?.length) return portfolio;

  const symbols = marketPricedSymbolsFromAssets(portfolio.assets);
  if (symbols.length === 0) return portfolio;

  const priceMap = await fetchPricesForSymbols(symbols);

  const now = new Date();
  const todayKey = istDayKey(now);
  const changed = applyPriceMapToPortfolio(portfolio, priceMap, now, todayKey);

  if (changed) {
    try {
      await savePortfolioWithRetry(portfolio, (fresh) => {
        applyPriceMapToPortfolio(fresh, priceMap, now, todayKey);
      });
    } catch (err) {
      logger.error(`Failed saving refreshed prices for ${portfolio._id}: ${err.message}`);
    }
  }

  return portfolio;
}

async function runUpdateJob() {
  const startedAt = Date.now();
  let symbolsUpdated = 0;
  let symbolsFailed = 0;

  const portfolios = await Portfolio.find({ 'assets.0': { $exists: true } });
  const allSymbols = [];

  for (const portfolio of portfolios) {
    for (const symbol of marketPricedSymbolsFromAssets(portfolio.assets)) {
      allSymbols.push(symbol);
    }
  }

  const priceMap = await fetchPricesForSymbols(allSymbols);
  symbolsUpdated = priceMap.size;

  const uniqueKeys = new Set(
    allSymbols.map((s) =>
      isCommoditySymbol(s) ? String(s).toUpperCase().split('.')[0] : toNseStored(s)
    ).filter(Boolean)
  );
  symbolsFailed = uniqueKeys.size - priceMap.size;

  const now = new Date();
  const todayKey = istDayKey(now);

  for (const portfolio of portfolios) {
    const changed = applyPriceMapToPortfolio(portfolio, priceMap, now, todayKey);

    if (changed) {
      try {
        await savePortfolioWithRetry(portfolio, (fresh) => {
          applyPriceMapToPortfolio(fresh, priceMap, now, todayKey);
        });
      } catch (saveErr) {
        logger.error(
          `Failed saving portfolio ${portfolio._id}: ${saveErr.message}`
        );
      }
    }
  }

  logger.info('Stock price update complete (yahoo-finance2)', {
    portfolios: portfolios.length,
    symbolsUpdated,
    symbolsFailed,
    marketOpen: isIndianMarketOpen(),
    durationMs: Date.now() - startedAt,
  });

  return { skipped: false, symbolsUpdated, symbolsFailed };
}

async function updateStockPrices({ force = false } = {}) {
  if (updateInFlight) {
    logger.info('Stock price update already in progress; reusing in-flight promise');
    return updateInFlight;
  }

  // Always sync last available Yahoo price (including weekends / after hours).
  updateInFlight = Promise.race([
    runUpdateJob(),
    sleep(JOB_TIMEOUT_MS).then(() => {
      throw new Error(`Stock price update timed out after ${JOB_TIMEOUT_MS}ms`);
    }),
  ])
    .catch((err) => {
      logger.error(`Error in stock price update job: ${err.message}`);
      throw err;
    })
    .finally(() => {
      updateInFlight = null;
    });

  return updateInFlight;
}

module.exports = {
  fetchLTP,
  fetchStockPrice,
  fetchPricesForSymbols,
  refreshPortfolioPrices,
  updateStockPrices,
  isIndianMarketOpen,
  toYahooSymbol,
  fetchCommodityPriceInrPerGram,
};
