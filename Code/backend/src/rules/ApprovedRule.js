const Decision = require('../domain/Decision');
const { DECISION, REASON } = require('../domain/decisions');

/** R6: terminal rule, always fires. */
class ApprovedRule {
  evaluate() {
    return new Decision(DECISION.APPROVED, REASON.APPROVED);
  }
}

module.exports = ApprovedRule;
