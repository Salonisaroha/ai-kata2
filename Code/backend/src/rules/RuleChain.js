class RuleChain {
  /** @param {{evaluate: function}[]} rules ordered; first non-null Decision wins */
  constructor(rules) {
    this.rules = Object.freeze([...rules]);
  }

  evaluate(trade, portfolio) {
    for (const rule of this.rules) {
      const decision = rule.evaluate(trade, portfolio);
      if (decision) return decision;
    }
    throw new Error('Rule chain produced no decision; terminal rule missing.');
  }
}

module.exports = RuleChain;
