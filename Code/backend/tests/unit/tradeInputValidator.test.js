const TradeInputValidator = require('../../src/services/TradeInputValidator');
const { rawTrade } = require('../helpers/builders');

const v = new TradeInputValidator({ maxTrades: 3 });
const fails = (body) => {
  try {
    v.validate(body);
  } catch (e) {
    return e;
  }
  throw new Error('expected ValidationError');
};

describe('TradeInputValidator (A5, A6)', () => {
  test.each([
    ['null body', null],
    ['undefined body', undefined],
    ['no trades key', {}],
    ['trades not array', { trades: 'x' }],
    ['trades object', { trades: {} }],
    ['trades empty', { trades: [] }],
  ])('envelope_%s_400 on field trades', (_n, body) => {
    const e = fails(body);
    expect(e.status).toBe(400);
    expect(e.code).toBe('VALIDATION_ERROR');
    expect(e.field).toBe('trades');
  });

  test('tooManyTrades_TOO_MANY_TRADES', () => {
    const e = fails({ trades: [rawTrade(), rawTrade(), rawTrade(), rawTrade()] });
    expect(e.code).toBe('TOO_MANY_TRADES');
    expect(e.status).toBe(400);
  });
  test('exactlyMaxTrades_ok', () => {
    expect(v.validate({ trades: [rawTrade(), rawTrade(), rawTrade()] })).toHaveLength(3);
  });

  test.each([[null], ['str'], [5], [[]]])('tradeElement_%j_notObject_400 with index', (el) => {
    const e = fails({ trades: [rawTrade(), el] });
    expect(e.status).toBe(400);
    expect(e.tradeIndex).toBe(1);
  });

  test.each([
    ['portfolio_id', undefined], ['portfolio_id', null], ['portfolio_id', ''], ['portfolio_id', '   '], ['portfolio_id', 5],
    ['security_id', undefined], ['security_id', null], ['security_id', ''], ['security_id', ' '], ['security_id', {}],
    ['security_type', undefined], ['security_type', 'equity'], ['security_type', 'Stock'], ['security_type', ''], ['security_type', 'etf'],
  ])('field_%s=%j_400 names field and index', (field, value) => {
    const e = fails({ trades: [rawTrade(), rawTrade({ [field]: value })] });
    expect(e.status).toBe(400);
    expect(e.field).toBe(field);
    expect(e.tradeIndex).toBe(1);
  });

  test.each([['Equity'], ['Bond'], ['ETF']])('security_type_%s_accepted', (t) => {
    expect(v.validate({ trades: [rawTrade({ security_type: t })] })[0].securityType).toBe(t);
  });

  test('firstOffendingTradeReported', () => {
    const e = fails({ trades: [rawTrade({ security_id: '' }), rawTrade({ portfolio_id: '' })] });
    expect(e.tradeIndex).toBe(0);
  });

  test('actionQuantityPrice_notJudgedAtBoundary_leftForR1', () => {
    const [t] = v.validate({ trades: [rawTrade({ action: 'Hold', quantity: -1, price: 'x' })] });
    expect(t.price).toBeNull();
    expect(t.action).toBe('Hold');
  });

  test('securityId_notTrimmedOrCaseFolded (A3)', () => {
    expect(v.validate({ trades: [rawTrade({ security_id: ' xyz ' })] })[0].securityId).toBe(' xyz ');
  });
});
