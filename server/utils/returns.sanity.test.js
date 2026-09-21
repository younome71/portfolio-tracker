// Sanity checks for cash-flow-aware return math (run: node returns.sanity.test.js)
const {
  computeNetInvested,
  computeFifoRealizedPnl,
  buildCashFlows,
  calculateXirr,
} = require('./returns');

const approx = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;
let failures = 0;
function check(name, cond) {
  console.log(`${cond ? 'PASS' : 'FAIL'} - ${name}`);
  if (!cond) failures += 1;
}

// Scenario 1: invest 10k, drops to 8k, deposit 5k more -> value 13k
// Naive view: +3k "profit". Reality: -2k loss.
{
  const txns = [
    { type: 'BUY', symbol: 'A.NS', quantity: 10, price: 1000, date: '2026-01-01' },
    { type: 'BUY', symbol: 'A.NS', quantity: 10, price: 500, date: '2026-06-01' },
  ];
  const currentValue = 13000; // 20 units @ 650
  const netInvested = computeNetInvested(txns);
  const overall = currentValue - netInvested;
  check('S1 net invested = 15000', approx(netInvested, 15000));
  check('S1 overall P&L = -2000 (a loss, not +3000)', approx(overall, -2000));
  check('S1 realized = 0', approx(computeFifoRealizedPnl(txns).realizedPnl, 0));
}

// Scenario 2: invest 10k, rises to 12k, book 4k profit -> value 8k
// Naive view: -2k "loss". Reality: +2k profit.
{
  const txns = [
    { type: 'BUY', symbol: 'A.NS', quantity: 10, price: 1000, date: '2026-01-01' },
    { type: 'SELL', symbol: 'A.NS', quantity: 10 / 3, price: 1200, date: '2026-06-01' },
  ];
  const currentValue = 8000; // 6.667 units @ 1200
  const netInvested = computeNetInvested(txns);
  const overall = currentValue - netInvested;
  const { realizedPnl } = computeFifoRealizedPnl(txns);
  check('S2 net invested = 6000', approx(netInvested, 6000));
  check('S2 overall P&L = +2000 (a profit, not -2000)', approx(overall, 2000, 1e-4));
  check('S2 realized = 666.67', approx(realizedPnl, (10 / 3) * 200, 1e-4));
  check(
    'S2 realized + unrealized = overall',
    approx(realizedPnl + (currentValue - (10 - 10 / 3) * 1000), overall, 1e-4)
  );
}

// FIFO ordering: oldest lot consumed first
{
  const txns = [
    { type: 'BUY', symbol: 'A.NS', quantity: 5, price: 100, date: '2026-01-01' },
    { type: 'BUY', symbol: 'A.NS', quantity: 5, price: 200, date: '2026-02-01' },
    { type: 'SELL', symbol: 'A.NS', quantity: 6, price: 300, date: '2026-03-01' },
  ];
  // 5 from lot1: 5*(300-100)=1000; 1 from lot2: 1*(300-200)=100 -> 1100
  check('FIFO realized = 1100', approx(computeFifoRealizedPnl(txns).realizedPnl, 1100));
}

// XIRR: 10k in, 11k out exactly 1 year later -> ~10%
{
  const flows = [
    { date: new Date('2025-01-01'), amount: -10000 },
    { date: new Date('2026-01-01'), amount: 11000 },
  ];
  const xirr = calculateXirr(flows);
  check('XIRR ~10% for 1y 10k->11k', xirr !== null && approx(xirr, 0.1, 1e-4));
}

// XIRR via buildCashFlows: buy 10k, worth 12k after ~2 years -> ~9.54%
{
  const txns = [
    { type: 'BUY', symbol: 'A.NS', quantity: 10, price: 1000, date: '2024-09-20' },
  ];
  const xirr = calculateXirr(buildCashFlows(txns, 12000));
  check(
    'XIRR positive and plausible for 10k->12k over 2y',
    xirr !== null && xirr > 0.09 && xirr < 0.10
  );
}

// XIRR null when no inflow
{
  const txns = [
    { type: 'BUY', symbol: 'A.NS', quantity: 1, price: 100, date: '2026-01-01' },
  ];
  check('XIRR null with only outflows and zero value', calculateXirr(buildCashFlows(txns, 0)) === null);
}

console.log(failures === 0 ? '\nAll checks passed' : `\n${failures} check(s) FAILED`);
process.exit(failures === 0 ? 0 : 1);
