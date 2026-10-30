const Decision = require('../domain/Decision');
const { DECISION, REASON } = require('../domain/decisions');

/** R2: applies to Buy and Sell (A4). */
class RestrictedSecurityRule {
  evaluate(trade, portfolio) {
    return portfolio.isRestricted(trade.securityId)
      ? new Decision(DECISION.REJECTED, REASON.RESTRICTED)
      : null;
  }
}

module.exports = RestrictedSecurityRule;
