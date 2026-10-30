import { describe, test, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App.jsx';
import { SAMPLE_TRADES } from '../src/utils/sampleTrades.js';
import { orderValuePreview, summarize } from '../src/utils/format.js';

const R = {
  Approved: 'All compliance checks passed.',
  Rejected: 'Insufficient cash for this buy order.',
  'Needs Manual Sign-off': 'Exceeds maximum position concentration — requires approval.',
};
const mixed = [
  { decision: 'Approved', reason: R.Approved },
  { decision: 'Rejected', reason: R.Rejected },
  { decision: 'Rejected', reason: R.Rejected },
  { decision: 'Needs Manual Sign-off', reason: R['Needs Manual Sign-off'] },
  { decision: 'Approved', reason: R.Approved },
  { decision: 'Approved', reason: R.Approved },
  { decision: 'Approved', reason: R.Approved },
];

function fakeApi(results = mixed) {
  return {
    getPortfolios: vi.fn().mockResolvedValue(['POR001', 'POR002']),
    checkTrades: vi.fn().mockResolvedValue(results),
  };
}
async function setup(api) {
  const user = userEvent.setup();
  render(<App api={api} />);
  await screen.findByRole('option', { name: 'POR001' });
  return user;
}

describe('pure helpers', () => {
  test('summarize_countsEachDecision', () => {
    expect(summarize(mixed)).toEqual({ total: 7, approved: 4, rejected: 2, manual: 1 });
    expect(summarize([])).toEqual({ total: 0, approved: 0, rejected: 0, manual: 0 });
  });
  test('orderValuePreview_isDisplayMathOnly', () => {
    expect(orderValuePreview({ quantity: '10', price: '300' })).toBe('$3,000.00');
    expect(orderValuePreview({ quantity: '', price: '300' })).toBeNull();
    expect(orderValuePreview({ quantity: '-1', price: '300' })).toBeNull();
  });
  test('sampleTrades_matchTheDemoSet', () => {
    expect(SAMPLE_TRADES).toHaveLength(7);
    expect(SAMPLE_TRADES[0]).toMatchObject({ portfolio_id: 'POR001', security_id: 'TCS', action: 'Buy', quantity: '10', price: '300', security_type: 'Equity' });
    expect(SAMPLE_TRADES[4]).toMatchObject({ portfolio_id: 'POR002', security_id: 'AAPL', action: 'Buy', quantity: '201', price: '100' });
  });
});

describe('sample loader and reset', () => {
  test('loadSampleTrades_fillsSevenRows_andSubmitsThem', async () => {
    const api = fakeApi();
    const user = await setup(api);
    await user.click(screen.getByRole('button', { name: 'Load sample trades' }));
    expect(screen.getAllByLabelText('Security ID')).toHaveLength(7);
    expect(screen.getAllByLabelText('Security ID')[3]).toHaveValue('XYZCORP');
    await user.click(screen.getByRole('button', { name: 'Check trades' }));
    expect(api.checkTrades).toHaveBeenCalledTimes(1);
    const sent = api.checkTrades.mock.calls[0][0];
    expect(sent).toHaveLength(7);
    expect(sent[1]).toEqual({ portfolio_id: 'POR001', security_id: 'AAPL', action: 'Sell', quantity: 100, price: 145, security_type: 'Equity' });
  });

  test('clearAll_resetsToOneEmptyRow_andClearsResults', async () => {
    const user = await setup(fakeApi());
    await user.click(screen.getByRole('button', { name: 'Load sample trades' }));
    await user.click(screen.getByRole('button', { name: 'Check trades' }));
    await screen.findByRole('table');
    await user.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(screen.getAllByLabelText('Security ID')).toHaveLength(1);
    expect(screen.getByLabelText('Security ID')).toHaveValue('');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText(/No results yet/)).toBeInTheDocument();
  });

  test('orderValuePreview_updatesWithQuantityAndPrice', async () => {
    const user = await setup(fakeApi());
    await user.type(screen.getByLabelText('Quantity'), '10');
    await user.type(screen.getByLabelText('Price'), '300');
    expect(screen.getByText('$3,000.00')).toBeInTheDocument();
  });
});

describe('summary tiles and filter chips', () => {
  async function withResults() {
    const user = await setup(fakeApi());
    await user.click(screen.getByRole('button', { name: 'Load sample trades' }));
    await user.click(screen.getByRole('button', { name: 'Check trades' }));
    await screen.findByRole('table');
    return user;
  }

  test('summaryTiles_showCountsComputedFromResults', async () => {
    await withResults();
    expect(screen.getByTestId('count-total')).toHaveTextContent('7');
    expect(screen.getByTestId('count-approved')).toHaveTextContent('4');
    expect(screen.getByTestId('count-rejected')).toHaveTextContent('2');
    expect(screen.getByTestId('count-manual')).toHaveTextContent('1');
  });

  test('filterChip_showsOnlyMatchingDecision_keepingOriginalNumbers', async () => {
    const user = await withResults();
    const chip = screen.getByRole('button', { name: /^Rejected/ });
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    await user.click(chip);
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByRole('rowheader')).toHaveTextContent('2');
    expect(within(rows[1]).getByRole('rowheader')).toHaveTextContent('3');
    await user.click(screen.getByRole('button', { name: /^All/ }));
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(8);
  });

  test('filterChip_withNoMatches_showsFriendlyMessage', async () => {
    const user = await setup(fakeApi([{ decision: 'Approved', reason: R.Approved }]));
    await user.click(screen.getByRole('button', { name: 'Load sample trades' }));
    await user.click(screen.getByRole('button', { name: 'Clear all' }));
    await user.type(screen.getByLabelText('Security ID'), 'A');
    await user.selectOptions(screen.getByLabelText('Portfolio'), 'POR001');
    await user.type(screen.getByLabelText('Quantity'), '1');
    await user.type(screen.getByLabelText('Price'), '1');
    await user.click(screen.getByRole('button', { name: 'Check trades' }));
    await screen.findByRole('table');
    await user.click(screen.getByRole('button', { name: /^Rejected/ }));
    expect(screen.getByText('No trades match this filter.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
