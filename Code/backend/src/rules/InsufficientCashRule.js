const Decision = require('../domain/Decision');
const { DECISION, REASON, ACTION } = require('../domain/decisions');

/** R4: Buy only. Cost == cash passes. */
class InsufficientCashRule {
  evaluate(trade, portfolio) {
    if (trade.action !== ACTION.BUY) return null;
    return trade.cost.gt(portfolio.cashBalance)
      ? new Decision(DECISION.REJECTED, REASON.INSUFFICIENT_CASH)
      : null;
  }
}

module.exports = InsufficientCashRule;
