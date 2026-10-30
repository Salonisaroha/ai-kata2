const InvalidTradeDataRule = require('./InvalidTradeDataRule');
const RestrictedSecurityRule = require('./RestrictedSecurityRule');
const InsufficientHoldingsRule = require('./InsufficientHoldingsRule');
const InsufficientCashRule = require('./InsufficientCashRule');
const ConcentrationRule = require('./ConcentrationRule');
const ApprovedRule = require('./ApprovedRule');

/** The single place that defines rule order (Steps 1-6). */
function defaultRules() {
  return [
    new InvalidTradeDataRule(),
    new RestrictedSecurityRule(),
    new InsufficientHoldingsRule(),
    new InsufficientCashRule(),
    new ConcentrationRule(),
    new ApprovedRule(),
  ];
}

module.exports = defaultRules;
