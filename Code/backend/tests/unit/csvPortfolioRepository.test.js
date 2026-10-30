const fs = require('fs');
const os = require('os');
const path = require('path');
const CsvPortfolioRepository = require('../../src/repositories/CsvPortfolioRepository');
const { REFERENCE_CSV } = require('../helpers/app');

const { DataConfigurationError } = CsvPortfolioRepository;
const HEADER = 'portfolio_id,cash_balance,restricted_securities,max_position_pct,current_holdings';
let dir;
let n = 0;
beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'csvtest-'));
});
afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

function load(content) {
  const f = path.join(dir, `t${n++}.csv`);
  fs.writeFileSync(f, content);
  return new CsvPortfolioRepository(f);
}
const row = (...cols) => `${HEADER}\n${cols.join(',')}\n`;

describe('reference CSV (AC-DATA-01)', () => {
  const repo = new CsvPortfolioRepository(REFERENCE_CSV);
  test('listsFivePortfoliosInCsvOrder', () => {
    expect(repo.listIds()).toEqual(['POR001', 'POR002', 'POR003', 'POR004', 'POR005']);
  });
  test('POR001_loadedExactly', () => {
    const p = repo.findById('POR001');
    expect(p.cashBalance.toString()).toBe('50000');
    expect(p.restrictedSecurities).toEqual(['XYZCORP']);
    expect(p.maxPositionPct.toString()).toBe('25'); // whole-number percent kept (A1)
    expect(p.holdings.map((h) => [h.securityId, h.quantity.toString(), h.marketPrice.toString()])).toEqual([
      ['AAPL', '100', '145'],
      ['TCS', '50', '300'],
    ]);
  });
  test('POR002_emptyRestrictedAndHoldings', () => {
    const p = repo.findById('POR002');
    expect(p.restrictedSecurities).toEqual([]);
    expect(p.holdings).toEqual([]);
  });
  test('POR003_multipleRestrictedAndHoldings', () => {
    const p = repo.findById('POR003');
    expect(p.restrictedSecurities).toEqual(['XYZCORP', 'BADCO']);
    expect(p.holdings).toHaveLength(3);
  });
  test('unknownIdUndefined_caseSensitive', () => {
    expect(repo.findById('POR999')).toBeUndefined();
    expect(repo.findById('por001')).toBeUndefined();
  });
});

describe('CSV parsing details', () => {
  test('whitespaceInRestrictedListTrimmed', () => {
    const p = load(row('P1', '100', '" A ; B ;"', '10', '""')).findById('P1');
    expect(p.restrictedSecurities).toEqual(['A', 'B']);
  });
  test('whitespaceAroundHoldingPartsTrimmed', () => {
    const p = load(row('P1', '100', '', '10', '" AAA : 5 : 2.5 ; BBB:1:1"')).findById('P1');
    expect(p.holdings.map((h) => h.securityId)).toEqual(['AAA', 'BBB']);
    expect(p.holdings[0].quantity.toString()).toBe('5');
    expect(p.holdings[0].marketPrice.toString()).toBe('2.5');
  });
  test('fractionalCashAndCapKeptExact', () => {
    const p = load(row('P1', '0.3', '', '12.5', '""')).findById('P1');
    expect(p.cashBalance.toString()).toBe('0.3');
    expect(p.maxPositionPct.toString()).toBe('12.5');
  });
  test('capExactly100_accepted', () => {
    expect(load(row('P1', '1', '', '100', '""')).findById('P1').maxPositionPct.toString()).toBe('100');
  });
  test('zeroCash_accepted', () => {
    expect(load(row('P1', '0', '', '10', '""')).findById('P1').cashBalance.toString()).toBe('0');
  });
  test('bomAndBlankLinesTolerated', () => {
    const repo = load(`﻿${HEADER}\n\nP1,1,,10,""\n\n`);
    expect(repo.listIds()).toEqual(['P1']);
  });
});

describe('CSV fail-fast validation (AC-DATA-02, A11)', () => {
  test.each([
    ['missing file', () => new CsvPortfolioRepository(path.join(os.tmpdir(), 'does-not-exist-xyz.csv')), /Cannot read/],
    ['no rows', () => load(`${HEADER}\n`), /no rows/],
    ['missing column', () => load('portfolio_id,cash_balance\nP1,1\n'), /missing column/],
    ['duplicate portfolio_id', () => load(`${HEADER}\nP1,1,,10,""\nP1,1,,10,""\n`), /duplicate portfolio_id/],
    ['empty portfolio_id', () => load(row('', '1', '', '10', '""')), /portfolio_id is empty/],
    ['cap zero', () => load(row('P1', '1', '', '0', '""')), /\(0, 100\]/],
    ['cap above 100', () => load(row('P1', '1', '', '100.5', '""')), /\(0, 100\]/],
    ['cap negative', () => load(row('P1', '1', '', '-5', '""')), /max_position_pct/],
    ['cap non-numeric', () => load(row('P1', '1', '', 'abc', '""')), /max_position_pct/],
    ['cap blank', () => load(row('P1', '1', '', '', '""')), /max_position_pct/],
    ['negative cash', () => load(row('P1', '-1', '', '10', '""')), /cash_balance/],
    ['non-numeric cash', () => load(row('P1', 'abc', '', '10', '""')), /cash_balance/],
    ['thousands separator cash', () => load(row('P1', '"1,000"', '', '10', '""')), /cash_balance/],
    ['holding with 2 parts', () => load(row('P1', '1', '', '10', '"AAA:5"')), /malformed holding/],
    ['holding with 4 parts', () => load(row('P1', '1', '', '10', '"AAA:5:1:2"')), /malformed holding/],
    ['holding blank id', () => load(row('P1', '1', '', '10', '":5:1"')), /malformed holding/],
    ['holding non-numeric qty', () => load(row('P1', '1', '', '10', '"AAA:x:1"')), /quantity/],
    ['holding negative price', () => load(row('P1', '1', '', '10', '"AAA:5:-1"')), /price/],
    ['duplicate holding security', () => load(row('P1', '1', '', '10', '"AAA:5:1;AAA:2:1"')), /duplicate holding/],
    ['trailing semicolon holdings', () => load(row('P1', '1', '', '10', '"AAA:5:1;"')), /malformed holding/],
  ])('%s_throwsDataConfigurationError', (_n, fn, re) => {
    expect(fn).toThrow(DataConfigurationError);
    expect(fn).toThrow(re);
  });
});
