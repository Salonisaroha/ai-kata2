class Portfolio {
  /**
   * @param {object} p
   * @param {string} p.portfolioId
   * @param {import('decimal.js')} p.cashBalance
   * @param {string[]} p.restrictedSecurities
   * @param {import('decimal.js')} p.maxPositionPct whole-number percent (25 means 25%)
   * @param {import('./Holding')[]} p.holdings
   */
  constructor({ portfolioId, cashBalance, restrictedSecurities, maxPositionPct, holdings }) {
    this.portfolioId = portfolioId;
    this.cashBalance = cashBalance;
    this.restrictedSecurities = Object.freeze([...restrictedSecurities]);
    this.maxPositionPct = maxPositionPct;
    this.holdings = Object.freeze([...holdings]);
    Object.freeze(this);
  }

  isRestricted(securityId) {
    return this.restrictedSecurities.includes(securityId);
  }

  /** @returns {import('decimal.js') | null} null when the security is not held */
  heldQuantity(securityId) {
    const h = this.holdings.find((x) => x.securityId === securityId);
    return h ? h.quantity : null;
  }
}

module.exports = Portfolio;
