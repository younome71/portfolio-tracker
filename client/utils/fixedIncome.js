const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

export function yearsBetween(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  const years = (end.getTime() - start.getTime()) / MS_PER_YEAR;
  return years > 0 ? years : 0;
}

export function daysUntil(date, from = new Date()) {
  const target = new Date(date);
  if (Number.isNaN(target.getTime())) return null;
  const ms = target.getTime() - new Date(from).getTime();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

export function expectedMaturityValue(principal, interestRate, purchaseDate, maturityDate) {
  const p = Number(principal);
  const rate = Number(interestRate);
  if (!Number.isFinite(p) || p <= 0) return null;
  if (!Number.isFinite(rate) || rate < 0) return null;
  if (!maturityDate) return null;

  const years = yearsBetween(purchaseDate || new Date(), maturityDate);
  return p * (1 + (rate / 100) * years);
}

export function isFixedIncomeType(assetType) {
  return assetType === 'FD' || assetType === 'BOND';
}

export function isMarketPricedType(assetType) {
  return !assetType || assetType === 'EQUITY' || assetType === 'COMMODITY';
}
