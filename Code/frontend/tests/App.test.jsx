import { describe, test, expect, vi } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App.jsx';
import { ApiError } from '../src/api/apiClient.js';

const REASON = {
  R5: 'Exceeds maximum position concentration — requires approval.',
  R4: 'Insufficient cash for this buy order.',
  OK: 'All compliance checks passed.',
};

function fakeApi(overrides = {}) {
  return {
    getPortfolios: vi.fn().mockResolvedValue(['POR001', 'POR002']),
    checkTrades: vi.fn().mockResolvedValue([{ decision: 'Approved', reason: REASON.OK }]),
    ...overrides,
  };
}

async function setup(api) {
  const user = userEvent.setup();
  render(<App api={api} />);
  await screen.findByRole('option', { name: 'POR001' });
  return user;
}

async function fillValid(user, { qty = '10', price = '300' } = {}) {
  await user.selectOptions(screen.getByLabelText('Portfolio'), 'POR001');
  await user.type(screen.getByLabelText('Security ID'), 'TCS');
  await user.type(screen.getByLabelText('Quantity'), qty);
  await user.type(screen.getByLabelText('Price'), price);
}
const submit = (user) => user.click(screen.getByRole('button', { name: 'Check trades' }));

describe('form validation', () => {
  test('emptySubmit_showsFieldErrors_andDoesNotCallApi', async () => {
    const api = fakeApi();
    const user = await setup(api);
    await submit(user);
    expect(api.checkTrades).not.toHaveBeenCalled();
    expect(screen.getByText('Select a portfolio.')).toBeInTheDocument();
    expect(screen.getByText('Enter a security ID.')).toBeInTheDocument();
    expect(screen.getAllByText('Enter a number greater than 0.')).toHaveLength(2);
    expect(screen.getByText(/Fix the highlighted fields/)).toBeInTheDocument();
  });

  test('invalidFields_areMarkedAriaInvalid_andDescribedByError', async () => {
    const user = await setup(fakeApi());
    await submit(user);
    const qty = screen.getByLabelText('Quantity');
    expect(qty).toHaveAttribute('aria-invalid', 'true');
    const errId = qty.getAttribute('aria-describedby');
    expect(document.getElementById(errId)).toHaveTextContent('Enter a number greater than 0.');
  });

  test.each([['0'], ['-3']])('quantity_%s_isBlockedClientSide', async (q) => {
    const api = fakeApi();
    const user = await setup(api);
    await fillValid(user, { qty: q });
    await submit(user);
    expect(api.checkTrades).not.toHaveBeenCalled();
    expect(screen.getByText('Enter a number greater than 0.')).toBeInTheDocument();
  });

  test('editingAFieldClearsItsError', async () => {
    const user = await setup(fakeApi());
    await submit(user);
    await user.type(screen.getByLabelText('Security ID'), 'A');
    expect(screen.queryByText('Enter a security ID.')).not.toBeInTheDocument();
  });

  test('validSubmit_sendsNumericPayload', async () => {
    const api = fakeApi();
    const user = await setup(api);
    await fillValid(user, { qty: '0.5', price: '100' });
    await submit(user);
    expect(api.checkTrades).toHaveBeenCalledWith([
      { portfolio_id: 'POR001', security_id: 'TCS', action: 'Buy', quantity: 0.5, price: 100, security_type: 'Equity' },
    ]);
  });
});

describe('rendering each decision', () => {
  test.each([
    ['Approved', REASON.OK],
    ['Rejected', REASON.R4],
    ['Needs Manual Sign-off', REASON.R5],
  ])('%s_isRenderedWithReason', async (decision, reason) => {
    const user = await setup(fakeApi({ checkTrades: vi.fn().mockResolvedValue([{ decision, reason }]) }));
    await fillValid(user);
    await submit(user);
    const table = await screen.findByRole('table');
    const row = within(table).getAllByRole('row')[1];
    expect(within(row).getByText(decision)).toBeInTheDocument();
    expect(within(row).getByText(reason)).toBeInTheDocument();
    expect(screen.getByText('1 trade checked.')).toBeInTheDocument();
  });

  test('multipleTrades_renderedInSubmittedOrder', async () => {
    const api = fakeApi({
      checkTrades: vi.fn().mockResolvedValue([
        { decision: 'Approved', reason: REASON.OK },
        { decision: 'Rejected', reason: REASON.R4 },
      ]),
    });
    const user = await setup(api);
    await fillValid(user);
    await user.click(screen.getByRole('button', { name: 'Add another trade' }));
    const sels = screen.getAllByLabelText('Portfolio');
    await user.selectOptions(sels[1], 'POR002');
    await user.type(screen.getAllByLabelText('Security ID')[1], 'NEWCO');
    await user.type(screen.getAllByLabelText('Quantity')[1], '201');
    await user.type(screen.getAllByLabelText('Price')[1], '100');
    await submit(user);
    const rows = within(await screen.findByRole('table')).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText('Approved')).toBeInTheDocument();
    expect(within(rows[0]).getByText('TCS')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Rejected')).toBeInTheDocument();
    expect(within(rows[1]).getByText('NEWCO')).toBeInTheDocument();
  });
});

describe('loading and error states', () => {
  test('loading_disablesSubmit_andShowsCheckingMessage', async () => {
    let resolve;
    const api = fakeApi({ checkTrades: vi.fn(() => new Promise((r) => { resolve = r; })) });
    const user = await setup(api);
    await fillValid(user);
    await submit(user);
    expect(await screen.findByRole('button', { name: 'Checking...' })).toBeDisabled();
    expect(screen.getByText('Checking trades...')).toBeInTheDocument();
    resolve([{ decision: 'Approved', reason: REASON.OK }]);
    await screen.findByRole('table');
  });

  test('apiError_showsMessageAndTradeNumber', async () => {
    const err = new ApiError('Portfolio "POR999" was not found.', { kind: 'api', status: 404, tradeIndex: 0, field: 'portfolio_id' });
    const user = await setup(fakeApi({ checkTrades: vi.fn().mockRejectedValue(err) }));
    await fillValid(user);
    await submit(user);
    expect(await screen.findByText(/Portfolio "POR999" was not found\. \(trade 1\)/)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  test('networkError_showsMessage', async () => {
    const err = new ApiError('Cannot reach the server. Check your connection and try again.', { kind: 'network' });
    const user = await setup(fakeApi({ checkTrades: vi.fn().mockRejectedValue(err) }));
    await fillValid(user);
    await submit(user);
    expect(await screen.findByText(/Cannot reach the server/)).toBeInTheDocument();
  });

  test('portfolioLoadFailure_showsAlertAndRetryRecovers', async () => {
    const getPortfolios = vi.fn()
      .mockRejectedValueOnce(new ApiError('Cannot reach the server.', { kind: 'network' }))
      .mockResolvedValueOnce(['POR001']);
    const user = userEvent.setup();
    render(<App api={fakeApi({ getPortfolios })} />);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Could not load portfolios: Cannot reach the server.');
    await user.click(within(alert).getByRole('button', { name: 'Retry' }));
    await screen.findByRole('option', { name: 'POR001' });
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });
});

describe('accessibility basics', () => {
  test('everyControlHasAnAccessibleLabel', async () => {
    await setup(fakeApi());
    for (const label of ['Portfolio', 'Security ID', 'Action', 'Quantity', 'Price', 'Security type']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
  });
  test('landmarksHeadingsAndSkipLink', async () => {
    await setup(fakeApi());
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute('href', '#main');
    expect(document.querySelector('[aria-live="polite"]')).toBeInTheDocument();
  });
  test('resultsTableHasCaptionAndColumnHeaders', async () => {
    const user = await setup(fakeApi());
    await fillValid(user);
    await submit(user);
    const table = await screen.findByRole('table', { name: /Compliance decision for each submitted trade/ });
    expect(within(table).getAllByRole('columnheader')).toHaveLength(8);
  });
  test('formCanBeSubmittedWithKeyboardEnter', async () => {
    const api = fakeApi();
    const user = await setup(api);
    await fillValid(user);
    await user.type(screen.getByLabelText('Price'), '{Enter}');
    await waitFor(() => expect(api.checkTrades).toHaveBeenCalledTimes(1));
  });
  test('decisionConveyedByTextNotColorOnly', async () => {
    const user = await setup(fakeApi({ checkTrades: vi.fn().mockResolvedValue([{ decision: 'Rejected', reason: REASON.R4 }]) }));
    await fillValid(user);
    await submit(user);
    // Scoped to the table: "Rejected" now also appears as a summary tile label and filter chip.
    expect(within(await screen.findByRole('table')).getByText('Rejected')).toBeVisible();
  });
});
