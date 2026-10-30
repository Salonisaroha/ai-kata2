// Convenience validation only; the backend is authoritative.
export const ACTIONS = ['Buy', 'Sell'];
export const SECURITY_TYPES = ['Equity', 'Bond', 'ETF'];

export function parsePositive(text) {
  const trimmed = String(text).trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function validateRow(row) {
  const errors = {};
  if (!row.portfolio_id) errors.portfolio_id = 'Select a portfolio.';
  if (!row.security_id.trim()) errors.security_id = 'Enter a security ID.';
  if (!ACTIONS.includes(row.action)) errors.action = 'Select Buy or Sell.';
  if (!SECURITY_TYPES.includes(row.security_type)) errors.security_type = 'Select a security type.';
  if (parsePositive(row.quantity) === null) errors.quantity = 'Enter a number greater than 0.';
  if (parsePositive(row.price) === null) errors.price = 'Enter a number greater than 0.';
  return errors;
}

export function toPayload(row) {
  return {
    portfolio_id: row.portfolio_id,
    security_id: row.security_id,
    action: row.action,
    quantity: parsePositive(row.quantity),
    price: parsePositive(row.price),
    security_type: row.security_type,
  };
}
