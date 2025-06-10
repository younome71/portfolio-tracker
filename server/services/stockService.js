const axios = require("axios");
const Portfolio = require("../models/Portfolio");
const cheerio = require("cheerio");

const API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
const BASE_URL = "https://www.alphavantage.co/query";

const stockCache = {};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function getISTDate() {
  const now = new Date();
  // IST is UTC + 5:30 → 5 * 60 + 30 = 330 minutes
  const offsetInMinutes = 330;
  const istTime = new Date(
    now.getTime() + offsetInMinutes * 60000 - now.getTimezoneOffset() * 60000
  );
  return istTime;
}

async function updateStockPrices() {
  try {
    const portfolios = await Portfolio.find({ "assets.0": { $exists: true } });

    const now = getISTDate();
    const marketStart = new Date(now);
    marketStart.setHours(9, 15, 0, 0);
    marketStart.setMilliseconds(0);

    if (now < marketStart) {
      console.log("Skipping price update: Before 09:15 AM IST");
      return;
    }

    for (const portfolio of portfolios) {
      for (const asset of portfolio.assets) {
        try {
          const currentPrice = await fetchStockPrice(asset.symbol);

          if (asset.currentPrice !== currentPrice) {
            asset.currentPrice = currentPrice;

            const startOfDay = new Date(now);
            startOfDay.setHours(9, 15, 0, 0);
            startOfDay.setMilliseconds(0);

            const existingEntry = asset.priceHistory.find((entry) => {
              const entryDate = getISTDateFromUTC(entry.date);
              return (
                entryDate >= startOfDay &&
                entryDate.toDateString() === now.toDateString()
              );
            });

            if (existingEntry) {
              existingEntry.price = currentPrice;
              existingEntry.date = now;
            } else {
              asset.priceHistory.push({
                date: now,
                price: currentPrice,
              });
            }
          }
        } catch (err) {
          console.error(
            `Error updating price for ${asset.symbol} in portfolio ${portfolio._id}:`,
            err.message
          );
          await sleep(2000);
        }
      }

      await portfolio.save();
    }

    console.log(
      `Updated stock prices for ${
        portfolios.length
      } portfolios at ${now.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      })}`
    );
  } catch (err) {
    console.error("Error in stock price update job:", err);
    throw err;
  }
}

function getISTDateFromUTC(utcDate) {
  const date = new Date(utcDate);
  const offsetInMinutes = 330;
  return new Date(date.getTime() + offsetInMinutes * 60000);
}

module.exports = {
  fetchLTP,
  fetchStockPrice,
  updateStockPrices,
};
