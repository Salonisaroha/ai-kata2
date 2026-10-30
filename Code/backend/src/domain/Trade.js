const Decimal = require('decimal.js');

// Only finite JSON numbers convert; strings/booleans/null are never coerced (A13).
// String(n) gives the shortest round-trip text, so 0.1 stays exactly 0.1.
function toDecimalOrNull(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return new Decimal(String(value));
}

class Trade {
  /**
   * quantity/price are Decimal, or null when the raw value was not a finite number.
   * action is kept raw so R1 can classify it.
   */
  constructor({ portfolioId, securityId, securityType, action, quantity, price }) {
    this.portfolioId = portfolioId;
    this.securityId = securityId;
    this.securityType = securityType;
    this.action = action;
    this.quantity = quantity;
    this.price = price;
    Object.freeze(this);
  }

  static fromRaw(raw) {
    return new Trade({
      portfolioId: raw.portfolio_id,
      securityId: raw.security_id,
      securityType: raw.security_type,
      action: raw.action,
      quantity: toDecimalOrNull(raw.quantity),
      price: toDecimalOrNull(raw.price),
    });
  }

  get cost() {
    return this.quantity.times(this.price);
  }
}

module.exports = Trade;
