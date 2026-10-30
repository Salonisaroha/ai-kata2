class Decision {
  constructor(decision, reason) {
    this.decision = decision;
    this.reason = reason;
    Object.freeze(this);
  }
}

module.exports = Decision;
