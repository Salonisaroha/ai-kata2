import { useCallback, useEffect, useRef, useState } from 'react';
import { toPayload, validateRow } from '../utils/validation.js';
import { SAMPLE_TRADES } from '../utils/sampleTrades.js';

let nextId = 1;
const newRow = (values = {}) => ({
  key: nextId++,
  portfolio_id: '',
  security_id: '',
  action: 'Buy',
  quantity: '',
  price: '',
  security_type: 'Equity',
  ...values,
});

export function useTradeChecker(api) {
  const [portfolios, setPortfolios] = useState([]);
  const [portfoliosState, setPortfoliosState] = useState({ loading: true, error: null });
  const [rows, setRows] = useState(() => [newRow()]);
  const [rowErrors, setRowErrors] = useState({});
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [submitted, setSubmitted] = useState([]);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [invalidSubmitCount, setInvalidSubmitCount] = useState(0);
  const mounted = useRef(true);

  const loadPortfolios = useCallback(async () => {
    setPortfoliosState({ loading: true, error: null });
    try {
      const ids = await api.getPortfolios();
      if (!mounted.current) return;
      setPortfolios(ids);
      setPortfoliosState({ loading: false, error: null });
    } catch (err) {
      if (mounted.current) setPortfoliosState({ loading: false, error: err.message });
    }
  }, [api]);

  useEffect(() => {
    mounted.current = true;
    loadPortfolios();
    return () => {
      mounted.current = false;
    };
  }, [loadPortfolios]);

  const updateRow = useCallback((key, field, value) => {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
    setRowErrors((errs) => {
      if (!errs[key] || !errs[key][field]) return errs;
      const { [field]: _removed, ...rest } = errs[key];
      return { ...errs, [key]: rest };
    });
  }, []);

  const addRow = useCallback(() => setRows((rs) => [...rs, newRow()]), []);
  const removeRow = useCallback(
    (key) => setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.key !== key) : rs)),
    [],
  );

  const clearOutcome = useCallback(() => {
    setRowErrors({});
    setResults([]);
    setSubmitted([]);
    setError(null);
    setStatus('idle');
  }, []);

  const loadSamples = useCallback(() => {
    setRows(SAMPLE_TRADES.map((t) => newRow(t)));
    clearOutcome();
  }, [clearOutcome]);

  const resetAll = useCallback(() => {
    setRows([newRow()]);
    clearOutcome();
  }, [clearOutcome]);

  const submit = useCallback(async () => {
    const errs = {};
    rows.forEach((r) => {
      const e = validateRow(r);
      if (Object.keys(e).length) errs[r.key] = e;
    });
    setRowErrors(errs);
    if (Object.keys(errs).length) {
      setInvalidSubmitCount((n) => n + 1);
      setResults([]);
      setStatus('error');
      setError({ kind: 'validation', message: 'Fix the highlighted fields and submit again.' });
      return;
    }
    const payload = rows.map(toPayload);
    setStatus('loading');
    setError(null);
    try {
      const res = await api.checkTrades(payload);
      if (!mounted.current) return;
      setSubmitted(payload);
      setResults(res);
      setStatus('success');
    } catch (err) {
      if (!mounted.current) return;
      setResults([]);
      setError({
        kind: err.kind || 'unknown',
        message: err.message,
        tradeIndex: err.tradeIndex,
        field: err.field,
        code: err.code,
      });
      setStatus('error');
    }
  }, [api, rows]);

  return {
    portfolios,
    portfoliosState,
    reloadPortfolios: loadPortfolios,
    rows,
    rowErrors,
    status,
    submitted,
    results,
    error,
    invalidSubmitCount,
    updateRow,
    addRow,
    removeRow,
    loadSamples,
    resetAll,
    submit,
  };
}
