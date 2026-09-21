/**
 * Shared symbol helpers.
 * Equity stored format: TICKER.NSE | TICKER.BSE (legacy BSE supported)
 * Commodity: GOLD | SILVER
 * Fixed income: slug derived from name (e.g. HDFC-FD)
 */

const COMMODITY_SYMBOLS = new Set(['GOLD', 'SILVER']);

function parseSymbol(symbol) {
  const raw = String(symbol || '')
    .toUpperCase()
    .trim();
  if (!raw) {
    return { ticker: '', exchange: 'NSE', stored: '', yahoo: '' };
  }

  if (COMMODITY_SYMBOLS.has(raw)) {
    return {
      ticker: raw,
      exchange: 'COMMODITY',
      stored: raw,
      yahoo: '',
    };
  }

  // Fixed-income / non-equity symbols without exchange suffix
  if (!raw.includes('.')) {
    return {
      ticker: raw,
      exchange: 'OTHER',
      stored: raw,
      yahoo: '',
    };
  }

  const parts = raw.split('.');
  const ticker = parts[0];
  const suffix = parts[1] || 'NSE';

  let exchange = 'NSE';
  if (suffix === 'BSE' || suffix === 'BO') exchange = 'BSE';
  if (suffix === 'NSE' || suffix === 'NS') exchange = 'NSE';

  return {
    ticker,
    exchange,
    stored: `${ticker}.${exchange}`,
    yahoo: exchange === 'BSE' ? `${ticker}.BO` : `${ticker}.NS`,
  };
}

function toYahooSymbol(symbol) {
  return parseSymbol(symbol).yahoo;
}

function toStoredSymbol(tickerOrSymbol) {
  const raw = String(tickerOrSymbol || '')
    .toUpperCase()
    .trim();
  if (!raw) return '';
  if (COMMODITY_SYMBOLS.has(raw)) return raw;
  if (COMMODITY_SYMBOLS.has(raw.split('.')[0])) return raw.split('.')[0];
  const ticker = raw.includes('.') ? raw.split('.')[0] : raw;
  return `${ticker}.NSE`;
}

function getBaseSymbol(symbol) {
  return parseSymbol(symbol).ticker;
}

function getExchange(symbol) {
  return parseSymbol(symbol).exchange;
}

function isCommoditySymbol(symbol) {
  const raw = String(symbol || '')
    .toUpperCase()
    .trim();
  return COMMODITY_SYMBOLS.has(raw) || COMMODITY_SYMBOLS.has(raw.split('.')[0]);
}

/**
 * Build a short uppercase slug for FD/Bond from a display name.
 * e.g. "HDFC Bank FD" → "HDFC-BANK-FD" (max 32 chars)
 */
function toFixedIncomeSymbol(name, assetType) {
  const base = String(name || '')
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  let slug = base || String(assetType || 'FD').toUpperCase();
  if (slug.length > 32) slug = slug.slice(0, 32).replace(/-+$/, '');
  return slug || 'FD';
}

module.exports = {
  COMMODITY_SYMBOLS,
  parseSymbol,
  toYahooSymbol,
  toStoredSymbol,
  getBaseSymbol,
  getExchange,
  isCommoditySymbol,
  toFixedIncomeSymbol,
};
