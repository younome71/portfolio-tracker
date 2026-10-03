const axios = require('axios');
const Stock = require('../models/Stock');
const logger = require('../utils/logger');

const NSE_EQUITY_CSV =
  'https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv';
const NSE_SME_CSV =
  'https://nsearchives.nseindia.com/content/equities/SME_EQUITY_L.csv';

const ALLOWED_SERIES = new Set(['EQ', 'BE', 'SM', 'ST']);
const JOB_TIMEOUT_MS = 2 * 60 * 1000;

let syncInFlight = null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Minimal CSV line parser that respects quoted fields.
 */
function parseCsvLine(line) {
  const cells = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

function parseEquityCsv(csvText) {
  const lines = String(csvText || '')
    .replace(/^\uFEFF/, '')
    .trim()
    .split(/\r?\n/);

  if (lines.length < 2) return [];

  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = parseCsvLine(line);
    const symbol = (cols[0] || '').trim().toUpperCase();
    const name = (cols[1] || '').trim();
    const series = (cols[2] || 'EQ').trim().toUpperCase();
    const listingDate = (cols[3] || '').trim();
    const isin = (cols[6] || '').trim().toUpperCase();

    if (!symbol || !name) continue;
    if (!ALLOWED_SERIES.has(series)) continue;

    rows.push({ symbol, name, series, listingDate, isin, exchange: 'NSE' });
  }

  return rows;
}

async function downloadCsv(url) {
  const response = await axios.get(url, {
    responseType: 'text',
    timeout: 45000,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/csv,*/*',
      Referer: 'https://www.nseindia.com/',
    },
    validateStatus: (status) => status >= 200 && status < 300,
  });
  return response.data;
}

async function fetchNseUniverse() {
  const [mainboard, sme] = await Promise.all([
    downloadCsv(NSE_EQUITY_CSV),
    downloadCsv(NSE_SME_CSV).catch((err) => {
      logger.warn(`SME equity list fetch failed (continuing): ${err.message}`);
      return '';
    }),
  ]);

  const bySymbol = new Map();
  for (const row of [...parseEquityCsv(mainboard), ...parseEquityCsv(sme)]) {
    bySymbol.set(row.symbol, row);
  }
  return [...bySymbol.values()];
}

async function runUniverseSync() {
  const startedAt = Date.now();
  const rows = await fetchNseUniverse();

  if (rows.length < 100) {
    throw new Error(
      `NSE universe sync aborted: unexpectedly small payload (${rows.length} rows)`
    );
  }

  const now = new Date();
  const ops = rows.map((row) => ({
    updateOne: {
      filter: { symbol: row.symbol },
      update: {
        $set: {
          name: row.name,
          series: row.series,
          exchange: row.exchange,
          isin: row.isin,
          listingDate: row.listingDate,
          active: true,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      upsert: true,
    },
  }));

  // Chunk bulkWrite to avoid oversized payloads
  const CHUNK = 500;
  let upserted = 0;
  let modified = 0;
  for (let i = 0; i < ops.length; i += CHUNK) {
    const result = await Stock.bulkWrite(ops.slice(i, i + CHUNK), {
      ordered: false,
    });
    upserted += result.upsertedCount || 0;
    modified += result.modifiedCount || 0;
  }

  const activeSymbols = rows.map((r) => r.symbol);
  const deactivate = await Stock.updateMany(
    { active: true, symbol: { $nin: activeSymbols } },
    { $set: { active: false, updatedAt: now } }
  );

  const totalActive = await Stock.countDocuments({ active: true });

  logger.info('Stock universe sync complete (NSE)', {
    fetched: rows.length,
    upserted,
    modified,
    deactivated: deactivate.modifiedCount || 0,
    totalActive,
    durationMs: Date.now() - startedAt,
  });

  return {
    fetched: rows.length,
    upserted,
    modified,
    deactivated: deactivate.modifiedCount || 0,
    totalActive,
  };
}

async function syncStockUniverse() {
  if (syncInFlight) {
    logger.info('Stock universe sync already in progress; reusing in-flight promise');
    return syncInFlight;
  }

  syncInFlight = Promise.race([
    runUniverseSync(),
    sleep(JOB_TIMEOUT_MS).then(() => {
      throw new Error(`Stock universe sync timed out after ${JOB_TIMEOUT_MS}ms`);
    }),
  ])
    .catch((err) => {
      logger.error(`Error in stock universe sync: ${err.message}`);
      throw err;
    })
    .finally(() => {
      syncInFlight = null;
    });

  return syncInFlight;
}

/**
 * Ensure the universe exists (boot). Syncs only when empty.
 */
async function ensureStockUniverse() {
  const count = await Stock.countDocuments({ active: true });
  if (count > 0) {
    logger.info(`Stock universe ready (${count} active symbols)`);
    return { skipped: true, totalActive: count };
  }

  logger.info('Stock universe empty; running initial NSE sync...');
  return syncStockUniverse();
}

async function listStocks({ q = '', limit = 0 } = {}) {
  const filter = { active: true };
  const query = String(q || '').trim();

  if (query) {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { symbol: { $regex: `^${escaped}`, $options: 'i' } },
      { name: { $regex: escaped, $options: 'i' } },
    ];
  }

  let cursor = Stock.find(filter)
    .select('symbol name series -_id')
    .sort({ symbol: 1 })
    .lean();

  const max = Number(limit);
  if (Number.isFinite(max) && max > 0) {
    cursor = cursor.limit(Math.min(max, 100));
  }

  const rows = await cursor;
  return rows.map((row) => ({
    id: row.symbol,
    name: row.name,
    group: row.series,
  }));
}

module.exports = {
  syncStockUniverse,
  ensureStockUniverse,
  listStocks,
  parseEquityCsv,
};
