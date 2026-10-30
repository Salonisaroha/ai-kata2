const Trade = require('../domain/Trade');
const { SECURITY_TYPES } = require('../domain/decisions');
const { ValidationError } = require('../errors');

const isNonBlankString = (v) => typeof v === 'string' && v.trim() !== '';

/** Boundary validation. Does not judge action/quantity/price (that is R1). */
class TradeInputValidator {
  constructor({ maxTrades }) {
    this.maxTrades = maxTrades;
  }

  /** @returns {Trade[]} or throws ValidationError for the first offending trade */
  validate(body) {
    const trades = body && typeof body === 'object' ? body.trades : undefined;
    if (!Array.isArray(trades) || trades.length === 0) {
      throw new ValidationError('trades must be a non-empty array.', { field: 'trades' });
    }
    if (trades.length > this.maxTrades) {
      throw new ValidationError(
        `trades must contain at most ${this.maxTrades} items.`,
        { field: 'trades' },
        'TOO_MANY_TRADES',
      );
    }
    return trades.map((raw, i) => {
      const fail = (field, msg) => new ValidationError(`trades[${i}].${field} ${msg}`, { tradeIndex: i, field });
      if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
        throw new ValidationError(`trades[${i}] must be an object.`, { tradeIndex: i });
      }
      if (!isNonBlankString(raw.portfolio_id)) throw fail('portfolio_id', 'must be a non-blank string.');
      if (!isNonBlankString(raw.security_id)) throw fail('security_id', 'must be a non-blank string.');
      if (!SECURITY_TYPES.includes(raw.security_type)) {
        throw fail('security_type', `must be one of ${SECURITY_TYPES.join(', ')}.`);
      }
      return Trade.fromRaw(raw);
    });
  }
}

module.exports = TradeInputValidator;
