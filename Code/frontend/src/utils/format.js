import { parsePositive } from './validation.js';
import { DECISIONS } from '../api/apiClient.js';

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

// Display-only preview (quantity x price); not a compliance calculation.
export function orderValuePreview(row) {
  const q = parsePositive(row.quantity);
  const p = parsePositive(row.price);
  if (q === null || p === null) return null;
  const v = q * p;
  return Number.isFinite(v) ? money.format(v) : null;
}

export function summarize(results) {
  const counts = { total: results.length, approved: 0, rejected: 0, manual: 0 };
  results.forEach((r) => {
    if (r.decision === DECISIONS.APPROVED) counts.approved += 1;
    else if (r.decision === DECISIONS.REJECTED) counts.rejected += 1;
    else if (r.decision === DECISIONS.MANUAL) counts.manual += 1;
  });
  return counts;
}
