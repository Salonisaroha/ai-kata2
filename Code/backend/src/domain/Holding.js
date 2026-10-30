class Holding {
  /** @param {string} securityId @param {import('decimal.js')} quantity @param {import('decimal.js')} marketPrice */
  constructor(securityId, quantity, marketPrice) {
    this.securityId = securityId;
    this.quantity = quantity;
    this.marketPrice = marketPrice;
    Object.freeze(this);
  }

  get value() {
    return this.quantity.times(this.marketPrice);
  }
}

module.exports = Holding;
