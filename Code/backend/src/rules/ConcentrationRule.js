const Decimal = require('decimal.js');
const Decision = require('../domain/Decision');
const { DECISION, REASON, ACTION } = require('../domain/decisions');

/**
 * R5: Buy only. max_position_pct is a whole-number percent (A1), so the check is
 * cross-multiplied to avoid division: fires iff postTradeValue * 100 > maxPositionPct * totalAfter.
 * Equal to the cap passes.
 */
class ConcentrationRule {
  evaluate(trade, portfolio) {
    if (trade.action !== ACTION.BUY) return null;

    const postTradeCash = portfolio.cashBalance.minus(trade.cost);
    const existing = portfolio.heldQuantity(trade.securityId) || new Decimal(0);
    const postTradeQuantity = existing.plus(trade.quantity);
    // Trade price stands in for the market price of the traded security (A10).
    const postTradeValue = postTradeQuantity.times(trade.price);
    const otherHoldingsValue = portfolio.holdings
      .filter((h) => h.securityId !== trade.securityId)
      .reduce((sum, h) => sum.plus(h.value), new Decimal(0));
    const totalAfter = postTradeCash.plus(postTradeValue).plus(otherHoldingsValue);

    return postTradeValue.times(100).gt(portfolio.maxPositionPct.times(totalAfter))
      ? new Decision(DECISION.NEEDS_SIGN_OFF, REASON.CONCENTRATION)
      : null;
  }
}

module.exports = ConcentrationRule;
