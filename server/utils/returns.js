/**
 * Cash-flow-aware portfolio return math.
 *
 * Why this exists: comparing only the initial and final portfolio value is
 * misleading when money moves in/out. E.g. invest 10k, drop to 8k, deposit
 * 5k -> value 13k looks like +3k "profit" but is really a -2k loss.
 * These helpers compute net invested capital, FIFO realized P&L and XIRR
 * from the transaction ledger so deposits/withdrawals never look like
 * gains/losses.
 */

const MS_PER_YEAR = 365 * 24 * 60 * 60 * 1000;

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

/**
 * Net capital currently deployed: total buys minus total sells.
 */
function computeNetInvested(transactions) {
  return sortedTransactions(transactions).reduce((sum, t) => {
    const amount = Number(t.quantity) * Number(t.price);
    return t.type === 'SELL' ? sum - amount : sum + amount;
  }, 0);
}

/**
 * FIFO realized P&L: each SELL consumes the oldest open BUY lots of that
 * symbol first (matches Indian tax treatment for equities).
 * Returns { realizedPnl, bySymbol: { SYMBOL: pnl } }.
 */
function computeFifoRealizedPnl(transactions) {
  const openLots = {}; // symbol -> [{ quantity, price }]
  const bySymbol = {};
  let realizedPnl = 0;

  for (const t of sortedTransactions(transactions)) {
    const symbol = t.symbol;
    const qty = Number(t.quantity);
    const price = Number(t.price);

    if (!openLots[symbol]) openLots[symbol] = [];
    if (!bySymbol[symbol]) bySymbol[symbol] = 0;

    if (t.type === 'BUY') {
      openLots[symbol].push({ quantity: qty, price });
      continue;
    }

    // SELL: consume oldest lots first
    let remaining = qty;
    const lots = openLots[symbol];
    while (remaining > 1e-12 && lots.length > 0) {
      const lot = lots[0];
      const used = Math.min(remaining, lot.quantity);
      const pnl = used * (price - lot.price);
      realizedPnl += pnl;
      bySymbol[symbol] += pnl;
      lot.quantity -= used;
      remaining -= used;
      if (lot.quantity <= 1e-12) lots.shift();
    }
    // If the sell exceeds recorded buys (legacy data), treat the excess as
    // realized at zero cost basis impact rather than failing.
  }

  return { realizedPnl, bySymbol };
}

/**
 * Build XIRR cash flows: buys are outflows (negative), sells are inflows
 * (positive), and the current portfolio value is a terminal inflow "as if"
 * everything were sold today.
 */
function buildCashFlows(transactions, currentValue) {
  const flows = sortedTransactions(transactions).map((t) => ({
    date: new Date(t.date),
    amount:
      (t.type === 'SELL' ? 1 : -1) * Number(t.quantity) * Number(t.price),
  }));

  const value = Number(currentValue);
  if (Number.isFinite(value) && value > 0) {
    flows.push({ date: new Date(), amount: value });
  }
  return flows;
}

/**
 * XIRR: annualized money-weighted return. Newton-Raphson with a bisection
 * fallback. Returns a decimal (0.12 = 12%) or null when it cannot converge
 * (e.g. no sign change in flows).
 */
function calculateXirr(cashflows) {
  const flows = (cashflows || [])
    .filter((f) => f && f.date && Number.isFinite(f.amount) && f.amount !== 0)
    .map((f) => ({ date: new Date(f.date), amount: f.amount }))
    .sort((a, b) => a.date - b.date);

  if (flows.length < 2) return null;
  const hasPositive = flows.some((f) => f.amount > 0);
  const hasNegative = flows.some((f) => f.amount < 0);
  if (!hasPositive || !hasNegative) return null;

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

  // Newton-Raphson
  let rate = 0.1;
  for (let i = 0; i < 100; i++) {
    const value = npv(rate);
    const derivative = npvDerivative(rate);
    if (!Number.isFinite(value) || !Number.isFinite(derivative) || derivative === 0) {
      break;
    }
    const next = rate - value / derivative;
    if (!Number.isFinite(next) || next <= -1) break;
    if (Math.abs(next - rate) < 1e-10) return next;
    rate = next;
  }

  // Bisection fallback over a wide bracket
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

module.exports = {
  sortedTransactions,
  computeNetInvested,
  computeFifoRealizedPnl,
  buildCashFlows,
  calculateXirr,
};
