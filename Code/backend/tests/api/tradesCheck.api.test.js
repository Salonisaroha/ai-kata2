const request = require('supertest');
const { realApp } = require('../helpers/app');
const { rawTrade, APPROVED, R1, R2, R3, R4, R5 } = require('../helpers/builders');

const app = realApp();
const check = (trades) => request(app).post('/api/trades/check').send({ trades });
const t = (portfolio_id, action, security_id, quantity, price, extra = {}) =>
  rawTrade({ portfolio_id, action, security_id, quantity, price, ...extra });

// Worked examples E1-E19 (requirements analysis, worked examples), real CSV, expectations from the spec.
const EXAMPLES = [
  ['E1', t('POR001', 'Buy', 'TCS', 10, 300), APPROVED],
  ['E2', t('POR004', 'Buy', 'MSFT', 100, 400), APPROVED],
  ['E3', t('POR002', 'Buy', 'NEWCO', 100, 100), APPROVED],
  ['E4', t('POR002', 'Buy', 'NEWCO', 101, 100), R5],
  ['E5', t('POR004', 'Buy', 'AAPL', 190, 200), APPROVED],
  ['E6', t('POR004', 'Buy', 'AAPL', 191, 200), R5],
  ['E7', t('POR002', 'Buy', 'NEWCO', 200, 100), R5],
  ['E8', t('POR002', 'Buy', 'NEWCO', 201, 100), R4],
  ['E9', t('POR001', 'Sell', 'AAPL', 100, 145), APPROVED],
  ['E10', t('POR001', 'Sell', 'AAPL', 101, 145), R3],
  ['E11', t('POR002', 'Sell', 'NEWCO', 1, 100), R3],
  ['E12', t('POR003', 'Sell', 'INFY', 100, 1500), APPROVED],
  ['E13', t('POR005', 'Buy', 'PENNY1', 10, 1), R2],
  ['E14', t('POR001', 'Sell', 'XYZCORP', 1, 10), R2],
  ['E15', t('POR001', 'Buy', 'XYZCORP', 0, 10), R1],
  ['E16', t('POR001', 'Hold', 'AAPL', 10, 145), R1],
  ['E17', t('POR005', 'Buy', 'TCS', 100, 300), R4],
  ['E18', t('POR003', 'Buy', 'INFY', 1, 1500), R5],
  ['E19', t('POR002', 'Buy', 'NEWCO', 10, -5), R1],
];

describe('POST /api/trades/check worked examples', () => {
  test.each(EXAMPLES)('%s_returns200WithExpectedDecisionAndReason', async (_id, trade, expected) => {
    const res = await check([trade]);
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(1);
    expect(res.body.results[0]).toEqual({
      index: 0,
      portfolio_id: trade.portfolio_id,
      security_id: trade.security_id,
      ...expected,
    });
  });

  test('E7_exactCash_reasonIsNotCashReason', async () => {
    const res = await check([EXAMPLES[6][1]]);
    expect(res.body.results[0].reason).not.toBe(R4.reason);
  });
});

describe('batch semantics', () => {
  test('mixedBatch_returnsResultsInRequestOrder_contractExample', async () => {
    const trades = [
      t('POR002', 'Buy', 'NEWCO', 100, 100),
      t('POR002', 'Buy', 'NEWCO', 101, 100),
      t('POR002', 'Buy', 'NEWCO', 201, 100),
      t('POR002', 'Buy', 'NEWCO', 0, 100),
    ];
    const res = await check(trades);
    expect(res.status).toBe(200);
    expect(res.body.results.map((r) => [r.index, r.decision, r.reason])).toEqual([
      [0, APPROVED.decision, APPROVED.reason],
      [1, R5.decision, R5.reason],
      [2, R4.decision, R4.reason],
      [3, R1.decision, R1.reason],
    ]);
  });

  test('batchAcrossPortfolios_orderPreservedAndEchoed', async () => {
    const trades = EXAMPLES.map((e) => e[1]);
    const res = await check(trades);
    expect(res.body.results).toHaveLength(19);
    res.body.results.forEach((r, i) => {
      expect(r.index).toBe(i);
      expect(r.portfolio_id).toBe(trades[i].portfolio_id);
      expect(r.security_id).toBe(trades[i].security_id);
      expect({ decision: r.decision, reason: r.reason }).toEqual(EXAMPLES[i][2]);
    });
  });

  test('AC-BATCH-01_twoAffordableBuysAreIndependent', async () => {
    const trade = t('POR002', 'Buy', 'NEWCO', 150, 100);
    const res = await check([trade, trade]);
    expect(res.body.results.map((r) => r.reason)).not.toContain(R4.reason);
    expect(res.body.results.map((r) => r.decision)).toEqual([R5.decision, R5.decision]);
  });

  test('repeatedRequests_noStateCarriedOver', async () => {
    const trade = t('POR002', 'Buy', 'NEWCO', 200, 100);
    const a = await check([trade]);
    const b = await check([trade]);
    expect(a.body).toEqual(b.body);
  });

  test('AC-BND-03_securityTypeDoesNotChangeDecision', async () => {
    const res = await check(['Equity', 'Bond', 'ETF'].map((security_type) => t('POR004', 'Buy', 'MSFT', 100, 400, { security_type })));
    expect(res.body.results.map((r) => r.decision)).toEqual(['Approved', 'Approved', 'Approved']);
  });

  test('businessRejectionsAreHttp200NotErrors', async () => {
    const res = await check([EXAMPLES[7][1]]);
    expect(res.status).toBe(200);
    expect(res.body.error).toBeUndefined();
  });
});

describe('R1 raw-JSON input classes via API (AC-R1-04/05)', () => {
  const base = { portfolio_id: 'POR001', security_id: 'TCS', action: 'Buy', quantity: 1, price: 1, security_type: 'Equity' };
  const cases = [
    ['quantity missing', { quantity: undefined }],
    ['quantity null', { quantity: null }],
    ['quantity string "10"', { quantity: '10' }],
    ['quantity true', { quantity: true }],
    ['quantity array', { quantity: [1] }],
    ['quantity object', { quantity: {} }],
    ['quantity 0', { quantity: 0 }],
    ['quantity -1', { quantity: -1 }],
    ['price missing', { price: undefined }],
    ['price null', { price: null }],
    ['price string', { price: '1' }],
    ['price 0', { price: 0 }],
    ['price -0.01', { price: -0.01 }],
    ['action buy', { action: 'buy' }],
    ['action SELL', { action: 'SELL' }],
    ['action " Buy"', { action: ' Buy' }],
    ['action empty', { action: '' }],
    ['action null', { action: null }],
    ['action missing', { action: undefined }],
    ['action 5', { action: 5 }],
  ];
  test.each(cases)('%s_rejectedInvalidTradeData', async (_n, o) => {
    const res = await check([{ ...base, ...o }]);
    expect(res.status).toBe(200);
    expect(res.body.results[0]).toMatchObject(R1);
  });

  test('securityIdCaseVariant_notRestricted_AC-R2-04', async () => {
    // xyzcorp Buy 1 @ 10 on POR001: affordable, small -> not R2 (A3)
    const res = await check([t('POR001', 'Buy', 'xyzcorp', 1, 10)]);
    expect(res.body.results[0].reason).not.toBe(R2.reason);
  });

  test.each([['BADCO'], ['XYZCORP']])('AC-R2-03_POR003_%s_restricted', async (sec) => {
    const res = await check([t('POR003', 'Buy', sec, 1, 1)]);
    expect(res.body.results[0]).toMatchObject(R2);
  });

  test('fractionalQuantity_notR1_AC-R1-07', async () => {
    const res = await check([t('POR002', 'Buy', 'NEWCO', 0.5, 100)]);
    expect(res.body.results[0].reason).not.toBe(R1.reason);
    expect(res.body.results[0]).toMatchObject(APPROVED); // 50/20000 = 0.25% <= 50%
  });
});

describe('error responses', () => {
  const errShape = (res, status, code) => {
    expect(res.status).toBe(status);
    expect(res.body.error.code).toBe(code);
    expect(typeof res.body.error.message).toBe('string');
    expect(res.body.results).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toMatch(/stack|\.js:|node_modules/);
  };

  test('400_INVALID_JSON', async () => {
    const res = await request(app).post('/api/trades/check').set('Content-Type', 'application/json').send('{"trades": [');
    errShape(res, 400, 'INVALID_JSON');
  });
  test.each([['NaN'], ['{"trades":[{"quantity":Infinity}]}']])('400_INVALID_JSON_for_%s', async (body) => {
    const res = await request(app).post('/api/trades/check').set('Content-Type', 'application/json').send(body);
    errShape(res, 400, 'INVALID_JSON');
  });

  test.each([
    ['trades missing', {}],
    ['trades not array', { trades: 'x' }],
    ['trades empty', { trades: [] }],
    ['body is array', []],
  ])('400_VALIDATION_ERROR_%s', async (_n, body) => {
    const res = await request(app).post('/api/trades/check').send(body);
    errShape(res, 400, 'VALIDATION_ERROR');
    expect(res.body.error.field).toBe('trades');
  });

  test('400_tradeElementNotObject_hasIndex', async () => {
    const res = await check([rawTrade(), 'x']);
    errShape(res, 400, 'VALIDATION_ERROR');
    expect(res.body.error.trade_index).toBe(1);
  });

  test.each([
    ['portfolio_id', undefined], ['portfolio_id', ''], ['portfolio_id', '  '], ['portfolio_id', 7],
    ['security_id', undefined], ['security_id', ''], ['security_id', null],
    ['security_type', undefined], ['security_type', 'equity'], ['security_type', 'Crypto'],
  ])('400_%s=%j_namesFieldAndIndex', async (field, value) => {
    const res = await check([rawTrade(), rawTrade({ [field]: value })]);
    errShape(res, 400, 'VALIDATION_ERROR');
    expect(res.body.error.field).toBe(field);
    expect(res.body.error.trade_index).toBe(1);
  });

  test('400_boundaryErrorWinsOverR1_AC-A5', async () => {
    const res = await check([rawTrade({ security_type: 'Bogus', quantity: 0 })]);
    errShape(res, 400, 'VALIDATION_ERROR');
  });

  test('400_TOO_MANY_TRADES_over100', async () => {
    const res = await check(Array.from({ length: 101 }, () => t('POR004', 'Buy', 'MSFT', 1, 1)));
    errShape(res, 400, 'TOO_MANY_TRADES');
  });
  test('200_exactly100Trades', async () => {
    const res = await check(Array.from({ length: 100 }, () => t('POR004', 'Buy', 'MSFT', 1, 1)));
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(100);
  });

  test.each([['POR999'], ['por001'], ['POR001 ']])('404_unknownPortfolio_%j', async (id) => {
    const res = await check([rawTrade({ portfolio_id: id })]);
    errShape(res, 404, 'PORTFOLIO_NOT_FOUND');
    expect(res.body.error.trade_index).toBe(0);
    expect(res.body.error.field).toBe('portfolio_id');
    expect(res.body.error.message).toContain(id);
  });
  test('404_wholeRequestFails_noPartialResults', async () => {
    const res = await check([t('POR001', 'Buy', 'TCS', 1, 1), t('POR999', 'Buy', 'TCS', 1, 1)]);
    errShape(res, 404, 'PORTFOLIO_NOT_FOUND');
    expect(res.body.error.trade_index).toBe(1);
  });
  test('400_winsOver404_evenWhenUnknownPortfolioComesFirst', async () => {
    const res = await check([rawTrade({ portfolio_id: 'POR999' }), rawTrade({ security_id: '' })]);
    errShape(res, 400, 'VALIDATION_ERROR');
    expect(res.body.error.trade_index).toBe(1);
  });

  test('413_payloadOver100kb', async () => {
    const big = { trades: [rawTrade({ security_id: 'X'.repeat(110 * 1024) })] };
    const res = await request(app).post('/api/trades/check').send(big);
    errShape(res, 413, 'PAYLOAD_TOO_LARGE');
  });

  test('415_textPlain', async () => {
    const res = await request(app).post('/api/trades/check').set('Content-Type', 'text/plain').send('{"trades":[]}');
    errShape(res, 415, 'UNSUPPORTED_MEDIA_TYPE');
  });
  test('415_noContentType', async () => {
    const res = await request(app).post('/api/trades/check');
    errShape(res, 415, 'UNSUPPORTED_MEDIA_TYPE');
  });
  test('415_formUrlencoded', async () => {
    const res = await request(app).post('/api/trades/check').type('form').send({ a: 1 });
    errShape(res, 415, 'UNSUPPORTED_MEDIA_TYPE');
  });

  test('404_unknownRoute_NOT_FOUND', async () => {
    const res = await request(app).get('/api/nope');
    errShape(res, 404, 'NOT_FOUND');
  });
  test('GET_onCheckRoute_notAResult', async () => {
    const res = await request(app).get('/api/trades/check');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
