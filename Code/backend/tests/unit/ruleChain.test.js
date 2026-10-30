const RuleChain = require('../../src/rules/RuleChain');
const defaultRules = require('../../src/rules/defaultRules');
const ComplianceService = require('../../src/services/ComplianceService');
const TradeInputValidator = require('../../src/services/TradeInputValidator');
const CsvPortfolioRepository = require('../../src/repositories/CsvPortfolioRepository');
const { REFERENCE_CSV } = require('../helpers/app');
const { rawTrade } = require('../helpers/builders');

describe('RuleChain / defaultRules', () => {
  test('orderIsR1toR6', () => {
    expect(defaultRules().map((r) => r.constructor.name)).toEqual([
      'InvalidTradeDataRule',
      'RestrictedSecurityRule',
      'InsufficientHoldingsRule',
      'InsufficientCashRule',
      'ConcentrationRule',
      'ApprovedRule',
    ]);
  });
  test('firstNonNullWins_laterRulesNotCalled', () => {
    const later = jest.fn();
    const chain = new RuleChain([{ evaluate: () => null }, { evaluate: () => 'first' }, { evaluate: later }]);
    expect(chain.evaluate({}, {})).toBe('first');
    expect(later).not.toHaveBeenCalled();
  });
  test('noTerminalRule_throws', () => {
    expect(() => new RuleChain([{ evaluate: () => null }]).evaluate({}, {})).toThrow(/no decision/);
  });
});

describe('ComplianceService with real CSV', () => {
  const svc = new ComplianceService({
    ruleChain: new RuleChain(defaultRules()),
    portfolioRepository: new CsvPortfolioRepository(REFERENCE_CSV),
    tradeInputValidator: new TradeInputValidator({ maxTrades: 100 }),
  });

  test('batchIndependent_AC-BATCH-01 (A2)', () => {
    const t = rawTrade({ portfolio_id: 'POR002', security_id: 'NEWCO', quantity: 150, price: 100 });
    const res = svc.checkTrades({ trades: [t, t] });
    // 15000/20000 = 75% > 50% -> sign-off for BOTH; neither rejected for cash
    expect(res.map((r) => r.decision)).toEqual(['Needs Manual Sign-off', 'Needs Manual Sign-off']);
  });
  test('unknownPortfolio_throws404WithIndex', () => {
    expect.assertions(3);
    try {
      svc.checkTrades({ trades: [rawTrade(), rawTrade({ portfolio_id: 'POR999' })] });
    } catch (e) {
      expect(e.status).toBe(404);
      expect(e.tradeIndex).toBe(1);
      expect(e.field).toBe('portfolio_id');
    }
  });
  test('stateNotMutatedBetweenCalls', () => {
    const t = rawTrade({ portfolio_id: 'POR002', security_id: 'NEWCO', quantity: 100, price: 100 });
    expect(svc.checkTrades({ trades: [t] })).toEqual(svc.checkTrades({ trades: [t] }));
  });
});
