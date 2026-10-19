export const COMPARTMENTS = ['chicken','beef','mutton','mince'];
export const HIGH_TEMP_C = 4;
export function finiteNumber(x, min, max) {
  if (typeof x !== 'number' || !Number.isFinite(x) || x < min || x > max) return null;
  return x;
}
export function round2(n) { return Math.round(n * 100) / 100; }
export function reorderQty(capacity, stock) { return round2(Math.max(0, Number(capacity) - Number(stock))); }
