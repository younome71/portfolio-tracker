const axios = require("axios");
const Portfolio = require("../models/Portfolio");
const cheerio = require("cheerio");

const API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
const BASE_URL = "https://www.alphavantage.co/query";

const stockCache = {};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


async function fetchLTP(symbol) {
  const url = `https://www.screener.in/company/${symbol.toLowerCase()}/`;

  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    const $ = cheerio.load(response.data);

    // 🧪 Try printing all such blocks
    const priceBlocks = $("div.flex.flex-align-center");

    let ltp = null;
    priceBlocks.each((i, elem) => {
      const text = $(elem).text().trim();
      if (text.includes("₹")) {
        const raw = $(elem).find("span").first().text().trim();
        const cleaned = raw.replace(/₹|,/g, "");
        const parsed = parseFloat(cleaned);
        if (!isNaN(parsed)) {
          ltp = parsed;
          return false; // break loop
        }
      }
    });

    return ltp;
  } catch (error) {
    console.error(`Error fetching LTP for ${symbol}:`, error.message);
    return null;
  }
}

async function fetchStockPrice(symbol) {
  const now = Date.now();
  const cacheEntry = stockCache[symbol];

  // Check if cached and not expired (1 hour = 3600000 ms)
  if (cacheEntry && now - cacheEntry.timestamp < 3600000) {
    return cacheEntry.price;
  }

  // Else fetch fresh price
  const baseSymbol = symbol.split(".")[0];
  const ltp = await fetchLTP(baseSymbol);

  if (ltp === null) throw new Error(`No price data for ${symbol}`);

  // Save in cache
  stockCache[symbol] = {
    price: ltp,
    timestamp: now,
  };

  console.log(stockCache);

  return ltp;
}

async function updateStockPrices() {
  try {
    // Get all portfolios with assets
    const portfolios = await Portfolio.find({ "assets.0": { $exists: true } });

    for (const portfolio of portfolios) {
      for (const asset of portfolio.assets) {
        try {
          const currentPrice = await fetchStockPrice(asset.symbol);

          // Update current price and add to history if changed
          if (asset.currentPrice !== currentPrice) {
            asset.currentPrice = currentPrice;
            asset.priceHistory.push({
              date: new Date(),
              price: currentPrice,
            });
          }
        } catch (err) {
          console.error(
            `Error updating price for ${asset.symbol} in portfolio ${portfolio._id}:`,
            err.message
          );
          await sleep(1000); // Sleep to avoid hitting API limits
        }
      }

      await portfolio.save();
    }

    console.log(`Updated stock prices for ${portfolios.length} portfolios`);
  } catch (err) {
    console.error("Error in stock price update job:", err);
    throw err;
  }
}

module.exports = {
  fetchLTP,
  fetchStockPrice,
  updateStockPrices,
};
