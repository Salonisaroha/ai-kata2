const Decimal = require('decimal.js');
const Portfolio = require('../../src/domain/Portfolio');
const Holding = require('../../src/domain/Holding');
const Trade = require('../../src/domain/Trade');
const RuleChain = require('../../src/rules/RuleChain');
const defaultRules = require('../../src/rules/defaultRules');

/** Hand-built portfolio. holdings: [[securityId, qty, price], ...]; numbers as strings or numbers. */
function portfolio({ cash = '0', restricted = [], cap = '50', holdings = [] } = {}) {
  return new Portfolio({
    portfolioId: 'TEST',
    cashBalance: new Decimal(String(cash)),
    restrictedSecurities: restricted,
    maxPositionPct: new Decimal(String(cap)),
    holdings: holdings.map(([id, q, p]) => new Holding(id, new Decimal(String(q)), new Decimal(String(p)))),
  });
}

/** Raw (snake_case, JSON-shaped) trade with sensible defaults; override any field. */
function rawTrade(overrides = {}) {
  return {
    portfolio_id: 'POR001',
    security_id: 'TCS',
    action: 'Buy',
    quantity: 1,
    price: 1,
    security_type: 'Equity',
    ...overrides,
  };
}

function domainTrade(overrides = {}) {
  return Trade.fromRaw(rawTrade(overrides));
}

const chain = new RuleChain(defaultRules());
function evaluate(p, overrides) {
  return chain.evaluate(domainTrade(overrides), p);
}

// Expected outcomes, written out from the spec (not imported from src).
const APPROVED = { decision: 'Approved', reason: 'All compliance checks passed.' };
const R1 = { decision: 'Rejected', reason: 'Invalid trade data.' };
const R2 = { decision: 'Rejected', reason: 'Security is restricted for this portfolio.' };
const R3 = { decision: 'Rejected', reason: 'Insufficient holdings to sell.' };
const R4 = { decision: 'Rejected', reason: 'Insufficient cash for this buy order.' };
const R5 = {
  decision: 'Needs Manual Sign-off',
  reason: 'Exceeds maximum position concentration — requires approval.',
};

module.exports = { portfolio, rawTrade, domainTrade, evaluate, APPROVED, R1, R2, R3, R4, R5 };
