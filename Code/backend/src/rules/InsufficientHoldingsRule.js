const Decision = require('../domain/Decision');
const { DECISION, REASON, ACTION } = require('../domain/decisions');

/** R3: Sell only. Holding == quantity passes. */
class InsufficientHoldingsRule {
  evaluate(trade, portfolio) {
    if (trade.action !== ACTION.SELL) return null;
    const held = portfolio.heldQuantity(trade.securityId);
    if (held === null || held.lt(trade.quantity)) {
      return new Decision(DECISION.REJECTED, REASON.INSUFFICIENT_HOLDINGS);
    }
    return null;
  }
}

module.exports = InsufficientHoldingsRule;
