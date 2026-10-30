const Decision = require('../domain/Decision');
const { DECISION, REASON, ACTION } = require('../domain/decisions');

/** R1 */
class InvalidTradeDataRule {
  evaluate(trade) {
    const validAction = trade.action === ACTION.BUY || trade.action === ACTION.SELL;
    const validQuantity = trade.quantity !== null && trade.quantity.gt(0);
    const validPrice = trade.price !== null && trade.price.gt(0);
    if (validAction && validQuantity && validPrice) return null;
    return new Decision(DECISION.REJECTED, REASON.INVALID_TRADE_DATA);
  }
}

module.exports = InvalidTradeDataRule;
