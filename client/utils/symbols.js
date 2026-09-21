/**
 * Client-side symbol helpers.
 * Equity: TICKER.NSE | legacy .BSE
 * Commodity: GOLD | SILVER
 * Fixed income: slug from name
 */

const COMMODITY_SYMBOLS = new Set(['GOLD', 'SILVER']);

export function parseSymbol(symbol) {
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

export function getBaseSymbol(symbol) {
  return parseSymbol(symbol).ticker;
}

/** Always store equities as TICKER.NSE; commodities stay GOLD/SILVER. */
export function toStoredSymbol(tickerOrSymbol) {
  const raw = String(tickerOrSymbol || '')
    .toUpperCase()
    .trim();
  if (!raw) return '';
  if (COMMODITY_SYMBOLS.has(raw)) return raw;
  if (COMMODITY_SYMBOLS.has(raw.split('.')[0])) return raw.split('.')[0];
  const ticker = raw.includes('.') ? raw.split('.')[0] : raw;
  return `${ticker}.NSE`;
}

export function isCommoditySymbol(symbol) {
  const raw = String(symbol || '')
    .toUpperCase()
    .trim();
  return COMMODITY_SYMBOLS.has(raw) || COMMODITY_SYMBOLS.has(raw.split('.')[0]);
}

export function toFixedIncomeSymbol(name, assetType) {
  const base = String(name || '')
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  let slug = base || String(assetType || 'FD').toUpperCase();
  if (slug.length > 32) slug = slug.slice(0, 32).replace(/-+$/, '');
  return slug || 'FD';
}

export { COMMODITY_SYMBOLS };
