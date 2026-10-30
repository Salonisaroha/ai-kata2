import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ThemeToggle from '../src/components/ThemeToggle.jsx';

function mockOs(dark) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: dark,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}
const html = () => document.documentElement.getAttribute('data-theme');

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});
afterEach(() => {
  vi.restoreAllMocks();
  delete window.matchMedia;
});

describe('theme toggle', () => {
  test('defaultsToOsDark_andOffersLightSwitch', () => {
    mockOs(true);
    render(<ThemeToggle />);
    expect(html()).toBe('dark');
    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeInTheDocument();
  });

  test('defaultsToLight_whenNoMatchMediaSupport', () => {
    render(<ThemeToggle />);
    expect(html()).toBe('light');
    expect(screen.getByRole('button', { name: 'Switch to dark mode' })).toBeInTheDocument();
  });

  test('click_flipsTheme_andPersists', async () => {
    mockOs(false);
    const user = userEvent.setup();
    render(<ThemeToggle />);
    await user.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
    expect(html()).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
    await user.click(screen.getByRole('button', { name: 'Switch to light mode' }));
    expect(html()).toBe('light');
    expect(localStorage.getItem('theme')).toBe('light');
  });

  test('keyboard_enterTogglesTheme', async () => {
    mockOs(false);
    const user = userEvent.setup();
    render(<ThemeToggle />);
    await user.tab();
    await user.keyboard('{Enter}');
    expect(html()).toBe('dark');
  });

  test('savedChoice_overridesOs', () => {
    mockOs(true);
    localStorage.setItem('theme', 'light');
    render(<ThemeToggle />);
    expect(html()).toBe('light');
  });

  test('invalidSavedValue_isIgnored', () => {
    mockOs(true);
    localStorage.setItem('theme', 'purple');
    render(<ThemeToggle />);
    expect(html()).toBe('dark');
  });

  test('storageFailure_doesNotCrash_andStillToggles', async () => {
    mockOs(false);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    const user = userEvent.setup();
    render(<ThemeToggle />);
    await user.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
    expect(html()).toBe('dark');
  });
});
