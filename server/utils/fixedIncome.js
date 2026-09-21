/**
 * Simple-interest maturity helpers for FD / Bond holdings.
 * maturityValue = principal * (1 + rate/100 * years)
 */

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

function yearsBetween(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  const years = (end.getTime() - start.getTime()) / MS_PER_YEAR;
  return years > 0 ? years : 0;
}

function daysUntil(date, from = new Date()) {
  const target = new Date(date);
  if (Number.isNaN(target.getTime())) return null;
  const ms = target.getTime() - new Date(from).getTime();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

/**
 * @param {number} principal - invested amount (quantity * averagePrice for FD qty=1)
 * @param {number} interestRate - annual %
 * @param {Date|string} purchaseDate
 * @param {Date|string} maturityDate
 */
function expectedMaturityValue(principal, interestRate, purchaseDate, maturityDate) {
  const p = Number(principal);
  const rate = Number(interestRate);
  if (!Number.isFinite(p) || p <= 0) return null;
  if (!Number.isFinite(rate) || rate < 0) return null;
  if (!maturityDate) return null;

  const years = yearsBetween(purchaseDate || new Date(), maturityDate);
  return p * (1 + (rate / 100) * years);
}

function isFixedIncomeType(assetType) {
  return assetType === 'FD' || assetType === 'BOND';
}

function isMarketPricedType(assetType) {
  return !assetType || assetType === 'EQUITY' || assetType === 'COMMODITY';
}

module.exports = {
  yearsBetween,
  daysUntil,
  expectedMaturityValue,
  isFixedIncomeType,
  isMarketPricedType,
};
