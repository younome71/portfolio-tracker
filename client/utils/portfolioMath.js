/**
 * Shared portfolio math helpers — keep UI and API calculations consistent.
 */

export function calculateTotalValue(portfolio) {
  if (!portfolio?.assets?.length) return 0;
  return portfolio.assets.reduce((total, asset) => {
    const price = Number(asset.currentPrice);
    const qty = Number(asset.quantity) || 0;
    if (!Number.isFinite(price) || price <= 0) return total;
    return total + qty * price;
  }, 0);
}

export function calculateTotalInvested(portfolio) {
  if (!portfolio?.assets?.length) return 0;
  return portfolio.assets.reduce((total, asset) => {
    return total + (Number(asset.quantity) || 0) * (Number(asset.averagePrice) || 0);
  }, 0);
}

export function calculateDayChange(portfolio) {
  if (!portfolio?.assets?.length) return 0;

  const totalValue = calculateTotalValue(portfolio);
  if (totalValue <= 0) return 0;

  let weightedChange = 0;

  portfolio.assets.forEach((asset) => {
    const history = asset.priceHistory;
    if (!Array.isArray(history) || history.length < 2) return;

    const sorted = [...history].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
    const yesterdayPrice = sorted[sorted.length - 2]?.price;
    const currentPrice = Number(asset.currentPrice);

    if (!yesterdayPrice || yesterdayPrice <= 0 || !Number.isFinite(currentPrice) || currentPrice <= 0) {
      return;
    }

    const assetChange = ((currentPrice - yesterdayPrice) / yesterdayPrice) * 100;
    const assetWeight = (asset.quantity * currentPrice) / totalValue;
    weightedChange += assetChange * assetWeight;
  });

  return weightedChange;
}

/**
 * Cash-flow-aware metrics. Comparing only initial vs final portfolio value is
 * misleading when money moves in/out (a deposit looks like a gain, a
 * withdrawal like a loss). These helpers use the transaction ledger so
 * deposits/withdrawals are never mistaken for performance.
 */

const MS_PER_YEAR = 365 * 24 * 60 * 60 * 1000;

export function getTransactions(portfolio) {
  return Array.isArray(portfolio?.transactions) ? portfolio.transactions : [];
}

function sortedTransactions(transactions) {
  return (transactions || [])
    .filter(
      (t) =>
        t &&
        (t.type === 'BUY' || t.type === 'SELL') &&
        Number(t.quantity) > 0 &&
        Number(t.price) >= 0
    )
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

/** Net capital currently deployed: total buys minus total sells. */
export function calculateNetInvested(portfolio) {
  const txns = getTransactions(portfolio);
  if (!txns.length) return calculateTotalInvested(portfolio); // legacy fallback
  return sortedTransactions(txns).reduce((sum, t) => {
    const amount = Number(t.quantity) * Number(t.price);
    return t.type === 'SELL' ? sum - amount : sum + amount;
  }, 0);
}

/** FIFO realized (booked) P&L from the transaction ledger. */
export function calculateRealizedPnl(portfolio) {
  const openLots = {};
  let realized = 0;

  for (const t of sortedTransactions(getTransactions(portfolio))) {
    const symbol = t.symbol;
    const qty = Number(t.quantity);
    const price = Number(t.price);
    if (!openLots[symbol]) openLots[symbol] = [];

    if (t.type === 'BUY') {
      openLots[symbol].push({ quantity: qty, price });
      continue;
    }

    let remaining = qty;
    const lots = openLots[symbol];
    while (remaining > 1e-12 && lots.length > 0) {
      const lot = lots[0];
      const used = Math.min(remaining, lot.quantity);
      realized += used * (price - lot.price);
      lot.quantity -= used;
      remaining -= used;
      if (lot.quantity <= 1e-12) lots.shift();
    }
  }
  return realized;
}

/**
 * Overall P&L that is immune to deposits/withdrawals:
 * current value minus net capital put in.
 */
export function calculateOverallPnl(portfolio) {
  return calculateTotalValue(portfolio) - calculateNetInvested(portfolio);
}

/**
 * XIRR: annualized money-weighted return (decimal, 0.12 = 12%) or null.
 * Buys are outflows, sells inflows, current value is the terminal inflow.
 */
export function calculateXirr(portfolio) {
  const txns = sortedTransactions(getTransactions(portfolio));
  if (!txns.length) return null;

  const flows = txns.map((t) => ({
    date: new Date(t.date),
    amount: (t.type === 'SELL' ? 1 : -1) * Number(t.quantity) * Number(t.price),
  }));

  const currentValue = calculateTotalValue(portfolio);
  if (currentValue > 0) flows.push({ date: new Date(), amount: currentValue });
  if (flows.length < 2) return null;
  if (!flows.some((f) => f.amount > 0) || !flows.some((f) => f.amount < 0)) {
    return null;
  }

  const t0 = flows[0].date.getTime();
  const npv = (rate) =>
    flows.reduce(
      (sum, f) =>
        sum + f.amount / Math.pow(1 + rate, (f.date.getTime() - t0) / MS_PER_YEAR),
      0
    );
  const npvDerivative = (rate) =>
    flows.reduce((sum, f) => {
      const years = (f.date.getTime() - t0) / MS_PER_YEAR;
      return sum - (years * f.amount) / Math.pow(1 + rate, years + 1);
    }, 0);

  let rate = 0.1;
  for (let i = 0; i < 100; i++) {
    const value = npv(rate);
    const derivative = npvDerivative(rate);
    if (!Number.isFinite(value) || !Number.isFinite(derivative) || derivative === 0) break;
    const next = rate - value / derivative;
    if (!Number.isFinite(next) || next <= -1) break;
    if (Math.abs(next - rate) < 1e-10) return next;
    rate = next;
  }

  let low = -0.9999;
  let high = 10;
  let fLow = npv(low);
  const fHigh = npv(high);
  if (!Number.isFinite(fLow) || !Number.isFinite(fHigh) || fLow * fHigh > 0) {
    return null;
  }
  for (let i = 0; i < 200; i++) {
    const mid = (low + high) / 2;
    const fMid = npv(mid);
    if (Math.abs(fMid) < 1e-10) return mid;
    if (fLow * fMid < 0) {
      high = mid;
    } else {
      low = mid;
      fLow = fMid;
    }
  }
  return (low + high) / 2;
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

export function groupAssetsBySymbol(assets = []) {
  const grouped = {};

  for (const asset of assets) {
    if (!asset?.symbol) continue;
    const baseSymbol = asset.symbol.split('.')[0];
    const price = Number(asset.currentPrice);
    const qty = Number(asset.quantity) || 0;
    const value = Number.isFinite(price) && price > 0 ? qty * price : 0;

    if (!grouped[baseSymbol]) {
      grouped[baseSymbol] = { symbol: baseSymbol, value };
    } else {
      grouped[baseSymbol].value += value;
    }
  }

  return Object.values(grouped).sort((a, b) => b.value - a.value);
}

/**
 * High-contrast allocation colors — distinct hues so stacked bars / donuts
 * stay readable (still grounded in teal + complementary accents, not neon rainbow).
 */
export const ALLOC_PALETTE = [
  '#0f766e', // teal
  '#c2410c', // burnt orange
  '#1d4ed8', // blue
  '#ca8a04', // gold
  '#0e7490', // cyan
  '#be123c', // rose
  '#3f6212', // olive
  '#4338ca', // indigo
  '#b45309', // amber
  '#15803d', // green
  '#0369a1', // sky
  '#9f1239', // crimson
];

/** Prefer this for ranked slices (largest → index 0). */
export function allocColorByIndex(index) {
  return ALLOC_PALETTE[Math.abs(Number(index) || 0) % ALLOC_PALETTE.length];
}

/** Deterministic color from a string (stable across renders). */
export function colorFromString(str) {
  let hash = 5381;
  const input = String(str || '');
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return ALLOC_PALETTE[Math.abs(hash) % ALLOC_PALETTE.length];
}

export function isPriceAvailable(asset) {
  if (typeof asset?.priceAvailable === 'boolean') return asset.priceAvailable;
  const price = Number(asset?.currentPrice);
  return Number.isFinite(price) && price > 0;
}

export function formatLastUpdated(dateLike) {
  if (!dateLike) return null;
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return null;
  const hours = Math.round((Date.now() - d.getTime()) / 3600000);
  if (hours < 1) return 'updated less than 1h ago';
  if (hours < 48) return `updated ${hours}h ago`;
  return `updated ${d.toLocaleDateString('en-IN')}`;
}
