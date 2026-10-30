import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'theme';
const QUERY = '(prefers-color-scheme: dark)';

const isTheme = (v) => v === 'light' || v === 'dark';

function readSaved() {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return isTheme(v) ? v : null;
  } catch {
    return null;
  }
}

function saveChoice(theme) {
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* storage unavailable (private mode, blocked): the choice just lasts for this session */
  }
}

const osQuery = () => (typeof window.matchMedia === 'function' ? window.matchMedia(QUERY) : null);

/** Light/dark theme: saved choice wins, otherwise follows the OS. Mirrors the result to <html data-theme>. */
export function useTheme() {
  const [choice, setChoice] = useState(readSaved);
  const [osDark, setOsDark] = useState(() => osQuery()?.matches ?? false);

  useEffect(() => {
    const mq = osQuery();
    if (!mq?.addEventListener) return undefined;
    const onChange = (e) => setOsDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const theme = choice ?? (osDark ? 'dark' : 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggle = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setChoice(next);
    saveChoice(next);
  }, [theme]);

  return { theme, toggle };
}
