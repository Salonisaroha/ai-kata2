import { useEffect, useRef } from 'react';
import TradeRow from './TradeRow.jsx';
import { PlusIcon } from './Icons.jsx';

export default function TradeForm({
  rows,
  rowErrors,
  portfolios,
  portfoliosState,
  flaggedIndex,
  invalidSubmitCount = 0,
  loading,
  onChange,
  onAdd,
  onRemove,
  onLoadSamples,
  onReset,
  onSubmit,
  onReloadPortfolios,
}) {
  const formRef = useRef(null);
  const addButtonRef = useRef(null);
  const pendingRemovalIndex = useRef(null);

  // Invalid submit: move focus to the first field flagged invalid.
  useEffect(() => {
    if (invalidSubmitCount > 0) formRef.current?.querySelector('[aria-invalid="true"]')?.focus();
  }, [invalidSubmitCount]);

  // After a removal, focus the first field of the row that took its place
  // (or the previous row when the last one was removed).
  useEffect(() => {
    const index = pendingRemovalIndex.current;
    if (index === null) return;
    pendingRemovalIndex.current = null;
    const rowEls = formRef.current?.querySelectorAll('fieldset.trade-row') ?? [];
    const target = rowEls[Math.min(index, rowEls.length - 1)]?.querySelector('select, input');
    (target ?? addButtonRef.current)?.focus();
  }, [rows.length]);

  const handleRemove = (key) => {
    pendingRemovalIndex.current = rows.findIndex((r) => r.key === key);
    onRemove(key);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form ref={formRef} className="card form-card" onSubmit={handleSubmit} noValidate aria-labelledby="form-heading">
      <div className="card-head">
        <h2 id="form-heading">Proposed trades</h2>
        <div className="head-actions">
          <button type="button" className="btn btn-ghost btn-small" onClick={onLoadSamples}>
            Load sample trades
          </button>
          <button type="button" className="btn btn-ghost btn-small" onClick={onReset}>
            Clear all
          </button>
        </div>
      </div>
      {portfoliosState.loading && <p role="status">Loading portfolios...</p>}
      {portfoliosState.error && (
        <div className="message message-error" role="alert">
          <p>Could not load portfolios: {portfoliosState.error}</p>
          <button type="button" className="btn btn-secondary" onClick={onReloadPortfolios}>
            Retry
          </button>
        </div>
      )}
      {rows.map((row, i) => (
        <TradeRow
          key={row.key}
          row={row}
          index={i}
          portfolios={portfolios}
          errors={rowErrors[row.key]}
          flagged={flaggedIndex === i}
          canRemove={rows.length > 1}
          onChange={onChange}
          onRemove={handleRemove}
        />
      ))}
      <div className="actions">
        <button ref={addButtonRef} type="button" className="btn btn-secondary" onClick={onAdd}>
          <PlusIcon /> Add another trade
        </button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading && <span className="spinner spinner-light" aria-hidden="true" />}
          {loading ? 'Checking...' : 'Check trades'}
        </button>
      </div>
    </form>
  );
}
