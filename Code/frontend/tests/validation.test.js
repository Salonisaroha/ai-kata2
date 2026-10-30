import { describe, test, expect } from 'vitest';
import { parsePositive, validateRow, toPayload } from '../src/utils/validation.js';

const valid = {
  portfolio_id: 'POR001',
  security_id: 'TCS',
  action: 'Buy',
  quantity: '10',
  price: '300',
  security_type: 'Equity',
};

describe('parsePositive', () => {
  test.each([
    ['10', 10], ['0.5', 0.5], [' 7 ', 7], ['1e2', 100],
  ])('%j_parsesTo_%s', (input, out) => expect(parsePositive(input)).toBe(out));

  test.each([[''], ['  '], ['0'], ['-1'], ['abc'], ['NaN'], ['Infinity'], ['-Infinity']])(
    '%j_returnsNull',
    (input) => expect(parsePositive(input)).toBeNull(),
  );
});

describe('validateRow', () => {
  test('validRow_noErrors', () => expect(validateRow(valid)).toEqual({}));
  test.each([
    ['portfolio_id', ''],
    ['security_id', '   '],
    ['quantity', '0'],
    ['quantity', ''],
    ['price', '-5'],
    ['price', 'x'],
    ['action', 'Hold'],
    ['security_type', 'Crypto'],
  ])('%s=%j_hasError', (field, value) => {
    expect(Object.keys(validateRow({ ...valid, [field]: value }))).toEqual([field]);
  });
});

describe('toPayload', () => {
  test('sendsQuantityAndPriceAsNumbers', () => {
    expect(toPayload(valid)).toEqual({
      portfolio_id: 'POR001', security_id: 'TCS', action: 'Buy', quantity: 10, price: 300, security_type: 'Equity',
    });
  });
});
