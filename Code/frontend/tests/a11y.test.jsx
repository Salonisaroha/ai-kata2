import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App.jsx';

const api = () => ({
  getPortfolios: vi.fn().mockResolvedValue(['POR001']),
  checkTrades: vi.fn(),
});

async function setup() {
  const user = userEvent.setup();
  render(<App api={api()} />);
  await screen.findByRole('option', { name: 'POR001' });
  return user;
}

describe('focus and aria', () => {
  test('requiredInputs_haveAriaRequired', async () => {
    await setup();
    expect(screen.getByLabelText('Quantity')).toHaveAttribute('aria-required', 'true');
    expect(screen.getByLabelText('Portfolio')).toHaveAttribute('aria-required', 'true');
  });

  test('invalidSubmit_focusesFirstInvalidField', async () => {
    const user = await setup();
    await user.click(screen.getByRole('button', { name: 'Check trades' }));
    expect(screen.getByLabelText('Portfolio')).toHaveFocus();
  });

  test('removeRow_movesFocusToRemainingRowFirstField', async () => {
    const user = await setup();
    await user.click(screen.getByRole('button', { name: 'Add another trade' }));
    await user.click(screen.getByRole('button', { name: 'Remove trade 2' }));
    expect(screen.getAllByLabelText('Portfolio')).toHaveLength(1);
    expect(screen.getByLabelText('Portfolio')).toHaveFocus();
  });
});
