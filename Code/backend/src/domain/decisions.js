const DECISION = Object.freeze({
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  NEEDS_SIGN_OFF: 'Needs Manual Sign-off',
});

const REASON = Object.freeze({
  INVALID_TRADE_DATA: 'Invalid trade data.',
  RESTRICTED: 'Security is restricted for this portfolio.',
  INSUFFICIENT_HOLDINGS: 'Insufficient holdings to sell.',
  INSUFFICIENT_CASH: 'Insufficient cash for this buy order.',
  CONCENTRATION: 'Exceeds maximum position concentration — requires approval.',
  APPROVED: 'All compliance checks passed.',
});

const ACTION = Object.freeze({ BUY: 'Buy', SELL: 'Sell' });
const SECURITY_TYPES = Object.freeze(['Equity', 'Bond', 'ETF']);

module.exports = { DECISION, REASON, ACTION, SECURITY_TYPES };
