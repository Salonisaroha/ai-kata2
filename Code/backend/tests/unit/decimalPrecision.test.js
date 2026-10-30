const { portfolio, evaluate, APPROVED, R5 } = require('../helpers/builders');
const Trade = require('../../src/domain/Trade');

// AC-R5-08 / A9: binary-float arithmetic would flip these exact-boundary cases.
describe('decimal precision', () => {
  test('sanity: JS floats really do misbehave on these inputs', () => {
    expect(0.1 * 3).not.toBe(0.3);
    expect(0.07 * 100).not.toBe(7);
  });

  test('R5_exactCap7pct_floatWouldFlip_passes', () => {
    // cash 1, buy 0.07 @ 1 -> V 0.07, T 1, exactly 7% (float: 0.07*100 = 7.000000000000001 > 7)
    expect(evaluate(portfolio({ cash: 1, cap: 7 }), { security_id: 'N', quantity: 0.07, price: 1 })).toEqual(APPROVED);
  });

  test('R4_costExactlyEqualsCash_0.1x3_vs_0.3_notRejectedForCash', () => {
    const r = evaluate(portfolio({ cash: '0.3', cap: 100 }), { security_id: 'N', quantity: 0.1, price: 3 });
    expect(r).toEqual(APPROVED); // cap 100 so concentration cannot fire
  });

  test('R5_exactCapWithFractions_passes', () => {
    // cash 0.6, buy 0.3 @ 1 -> post cash 0.3, V 0.3, T 0.6, exactly 50%
    expect(evaluate(portfolio({ cash: '0.6', cap: 50 }), { security_id: 'N', quantity: 0.3, price: 1 })).toEqual(APPROVED);
  });

  test('R5_justOverCapWithFractions_signOff', () => {
    expect(evaluate(portfolio({ cash: '0.6', cap: 50 }), { security_id: 'N', quantity: 0.31, price: 1 })).toEqual(R5);
  });

  test('R5_fractionalPriceHolding_atCap', () => {
    // cash 0.7, held X 3 @ 0.1 (0.3), buy N 0.1 @ 3 (cost 0.3): post cash 0.4, V 0.3, other 0.3, T 1.0 -> 30% exactly
    const p = portfolio({ cash: '0.7', cap: 30, holdings: [['X', 3, '0.1']] });
    expect(evaluate(p, { security_id: 'N', quantity: 0.1, price: 3 })).toEqual(APPROVED);
  });

  test('Trade_numbersConvertedFromShortestText_0.1_staysExact', () => {
    const t = Trade.fromRaw({ quantity: 0.1, price: 3 });
    expect(t.cost.toString()).toBe('0.3');
  });

  test('Trade_nonNumbersBecomeNull', () => {
    for (const v of ['1', true, null, undefined, NaN, Infinity, [], {}]) {
      expect(Trade.fromRaw({ quantity: v, price: 1 }).quantity).toBeNull();
    }
  });
});
