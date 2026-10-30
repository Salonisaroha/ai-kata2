const { portfolio, evaluate, APPROVED, R1, R2, R3, R4, R5 } = require('../helpers/builders');

// Every expected value below is computed by hand from trade_compliance_requirements.md (Steps 1-6).

describe('R1 invalid trade data (AC-R1-*)', () => {
  const p = portfolio({ cash: 1000, cap: 100, holdings: [['AAA', 10, 10]] });
  test.each([
    ['quantity zero', { quantity: 0 }],
    ['quantity negative', { quantity: -1 }],
    ['quantity null', { quantity: null }],
    ['quantity missing', { quantity: undefined }],
    ['quantity numeric string (A13)', { quantity: '10' }],
    ['quantity boolean', { quantity: true }],
    ['quantity NaN', { quantity: NaN }],
    ['quantity Infinity', { quantity: Infinity }],
    ['quantity -Infinity', { quantity: -Infinity }],
    ['quantity array', { quantity: [1] }],
    ['price zero', { price: 0 }],
    ['price negative', { price: -5 }],
    ['price null', { price: null }],
    ['price string', { price: '5' }],
    ['price NaN', { price: NaN }],
    ['price Infinity', { price: Infinity }],
    ['action Hold', { action: 'Hold' }],
    ['action lowercase buy (A3)', { action: 'buy' }],
    ['action uppercase SELL (A3)', { action: 'SELL' }],
    ['action padded', { action: ' Buy' }],
    ['action empty', { action: '' }],
    ['action null', { action: null }],
    ['action missing', { action: undefined }],
    ['action number', { action: 1 }],
  ])('R1_%s_rejectedInvalidData', (_n, o) => {
    expect(evaluate(p, { security_id: 'AAA', ...o })).toEqual(R1);
  });

  test.each([
    ['tiny positive quantity', { quantity: 0.0000001, price: 1 }],
    ['fractional quantity 0.5 (AC-R1-07)', { quantity: 0.5, price: 100 }],
  ])('R1_%s_doesNotFire', (_n, o) => {
    expect(evaluate(p, { security_id: 'AAA', ...o })).not.toEqual(R1);
  });
});

describe('R2 restricted (AC-R2-*)', () => {
  const p = portfolio({ cash: 1000, cap: 100, restricted: ['BAD', 'WORSE'], holdings: [['BAD', 5, 1]] });
  test.each([
    ['Buy first entry', { action: 'Buy', security_id: 'BAD' }],
    ['Buy second entry', { action: 'Buy', security_id: 'WORSE' }],
    ['Sell held restricted (A4)', { action: 'Sell', security_id: 'BAD' }],
    ['Sell unheld restricted wins over R3', { action: 'Sell', security_id: 'WORSE' }],
  ])('R2_%s_rejectedRestricted', (_n, o) => {
    expect(evaluate(p, o)).toEqual(R2);
  });

  test.each([['bad'], ['Bad'], [' BAD'], ['BAD ']])('R2_%j_notRestrictedExactMatchOnly (A3)', (id) => {
    expect(evaluate(p, { action: 'Buy', security_id: id, quantity: 1, price: 1 })).not.toEqual(R2);
  });

  test('R2_emptyRestrictedList_neverFires', () => {
    expect(evaluate(portfolio({ cash: 100, cap: 100 }), { security_id: 'ANY', quantity: 1, price: 1 })).not.toEqual(R2);
  });
});

describe('R3 sell holdings boundary', () => {
  const p = portfolio({ cash: 0, holdings: [['AAA', 100, 10]] });
  test.each([
    ['below (99 of 100)', 99, APPROVED],
    ['exactly at (100 of 100)', 100, APPROVED],
    ['above (101 of 100)', 101, R3],
  ])('R3_sell_%s', (_n, qty, expected) => {
    expect(evaluate(p, { action: 'Sell', security_id: 'AAA', quantity: qty, price: 10 })).toEqual(expected);
  });
  test('R3_sellUnheldSecurity_rejected', () => {
    expect(evaluate(p, { action: 'Sell', security_id: 'ZZZ', quantity: 1, price: 1 })).toEqual(R3);
  });
  test('R3_sellFromEmptyHoldings_rejected', () => {
    expect(evaluate(portfolio({ cash: 100 }), { action: 'Sell', security_id: 'ZZZ', quantity: 1, price: 1 })).toEqual(R3);
  });
  test('R3_fractionalBoundary_heldPointThreeSellPointThreePasses', () => {
    const r = evaluate(portfolio({ holdings: [['AAA', '0.3', 1]] }), { action: 'Sell', security_id: 'AAA', quantity: 0.3, price: 1 });
    expect(r).toEqual(APPROVED);
  });
  test('R3_neverAppliesToBuy', () => {
    expect(evaluate(portfolio({ cash: 100, cap: 100 }), { action: 'Buy', security_id: 'ZZZ', quantity: 1, price: 1 })).not.toEqual(R3);
  });
});

describe('R4 buy cash boundary', () => {
  const p = portfolio({ cash: 1000, cap: 100 });
  test.each([
    ['below (cost 999)', 999, false],
    ['exactly at (cost 1000)', 1000, false],
    ['above (cost 1001)', 1001, true],
  ])('R4_buy_%s', (_n, qty, rejected) => {
    const r = evaluate(p, { action: 'Buy', security_id: 'N', quantity: qty, price: 1 });
    if (rejected) expect(r).toEqual(R4);
    else expect(r.reason).not.toBe(R4.reason);
  });
  test('R4_neverAppliesToSell_evenIfCostExceedsCash', () => {
    const r = evaluate(portfolio({ cash: 1, holdings: [['A', 100, 1500]] }), { action: 'Sell', security_id: 'A', quantity: 100, price: 1500 });
    expect(r).toEqual(APPROVED);
  });
  test('R4_buyUsingAllCash_notRejectedForCash_E7', () => {
    const r = evaluate(portfolio({ cash: 20000, cap: 50 }), { action: 'Buy', security_id: 'NEWCO', quantity: 200, price: 100 });
    expect(r).toEqual(R5); // 100% > 50%
  });
});

describe('R5 concentration (Step 5 arithmetic)', () => {
  test('R5_atCap_passes_E3', () => {
    // cash 20000 cap 50: V=10000, T=10000+10000=20000 -> 50% exactly
    expect(evaluate(portfolio({ cash: 20000, cap: 50 }), { security_id: 'NEWCO', quantity: 100, price: 100 })).toEqual(APPROVED);
  });
  test('R5_justOverCap_signOff_E4', () => {
    expect(evaluate(portfolio({ cash: 20000, cap: 50 }), { security_id: 'NEWCO', quantity: 101, price: 100 })).toEqual(R5);
  });
  test('R5_belowCap_approved (99 units: V=9900,T=20000,49.5%)', () => {
    expect(evaluate(portfolio({ cash: 20000, cap: 50 }), { security_id: 'NEWCO', quantity: 99, price: 100 })).toEqual(APPROVED);
  });
  const por004 = () => portfolio({ cash: 100000, cap: 40, holdings: [['AAPL', 50, 150], ['GOOGL', 5, 2000]] });
  test('R5_heldSecurity_tradePriceReplacesMarketPrice_atCap_E5', () => {
    // 240 x 200 = 48000; other 10000; T = 62000+48000+10000 = 120000; 40% exactly
    expect(evaluate(por004(), { security_id: 'AAPL', quantity: 190, price: 200 })).toEqual(APPROVED);
  });
  test('R5_heldSecurity_oneOverCap_E6', () => {
    expect(evaluate(por004(), { security_id: 'AAPL', quantity: 191, price: 200 })).toEqual(R5);
  });
  test('R5_newSecurityWithMultipleOtherHoldings_E2', () => {
    expect(evaluate(por004(), { security_id: 'MSFT', quantity: 100, price: 400 })).toEqual(APPROVED);
  });
  test('R5_otherHoldingsExcludeTradedSecurity_E1', () => {
    const p = portfolio({ cash: 50000, cap: 25, holdings: [['AAPL', 100, 145], ['TCS', 50, 300]] });
    expect(evaluate(p, { security_id: 'TCS', quantity: 10, price: 300 })).toEqual(APPROVED); // 22.64%
  });
  test('R5_lowCapExistingHolding_E18', () => {
    const p = portfolio({ cash: 75000, cap: 15, holdings: [['INFY', 200, 1500], ['RELIANCE', 30, 2400], ['TCS', 10, 300]] });
    expect(evaluate(p, { security_id: 'INFY', quantity: 1, price: 1500 })).toEqual(R5);
  });
  test('R5_neverAppliesToSell_E12', () => {
    const p = portfolio({ cash: 75000, cap: 15, holdings: [['INFY', 200, 1500], ['RELIANCE', 30, 2400], ['TCS', 10, 300]] });
    expect(evaluate(p, { action: 'Sell', security_id: 'INFY', quantity: 100, price: 1500 })).toEqual(APPROVED);
  });
  test('R5_capOf100_buyWithinCashAlwaysPasses', () => {
    expect(evaluate(portfolio({ cash: 100, cap: 100 }), { security_id: 'N', quantity: 100, price: 1 })).toEqual(APPROVED);
  });
});

describe('Precedence (AC-ORD-*)', () => {
  test('ORD_invalidBeatsRestricted_E15', () => {
    expect(evaluate(portfolio({ cash: 100, restricted: ['X'] }), { security_id: 'X', quantity: 0 })).toEqual(R1);
  });
  test('ORD_invalidActionBeatsRestricted', () => {
    expect(evaluate(portfolio({ restricted: ['X'] }), { security_id: 'X', action: 'Hold' })).toEqual(R1);
  });
  test('ORD_invalidBeatsConcentration', () => {
    expect(evaluate(portfolio({ cash: 100, cap: 1 }), { security_id: 'X', quantity: 1, price: -1 })).toEqual(R1);
  });
  test('ORD_restrictedBeatsInsufficientHoldings_E14', () => {
    expect(evaluate(portfolio({ restricted: ['X'] }), { action: 'Sell', security_id: 'X', quantity: 1, price: 10 })).toEqual(R2);
  });
  test('ORD_restrictedBeatsInsufficientCash', () => {
    expect(evaluate(portfolio({ cash: 0, restricted: ['X'] }), { action: 'Buy', security_id: 'X', quantity: 5, price: 5 })).toEqual(R2);
  });
  test('ORD_cashBeatsConcentration_E17', () => {
    const p = portfolio({ cash: 5000, cap: 30, holdings: [['AAPL', 10, 150], ['TCS', 5, 300]] });
    expect(evaluate(p, { security_id: 'TCS', quantity: 100, price: 300 })).toEqual(R4);
  });
});
