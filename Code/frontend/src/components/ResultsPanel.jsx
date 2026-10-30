import { useState } from 'react';
import ResultsTable from './ResultsTable.jsx';
import SummaryTiles from './SummaryTiles.jsx';
import FilterChips from './FilterChips.jsx';
import { InboxIcon } from './Icons.jsx';
import { summarize } from '../utils/format.js';

function describeError(error) {
  if (error.kind === 'validation') return error.message;
  const where = Number.isInteger(error.tradeIndex) ? ` (trade ${error.tradeIndex + 1})` : '';
  return `${error.message}${where}`;
}

function Loading() {
  return (
    <div className="loading">
      <p><span className="spinner" aria-hidden="true" />Checking trades...</p>
      <div className="skeleton" aria-hidden="true">
        <span /><span /><span />
      </div>
    </div>
  );
}

function Results({ submitted, results }) {
  const [filter, setFilter] = useState('all');
  const counts = summarize(results);
  const visible = results
    .map((result, index) => ({ result, trade: submitted[index], index }))
    .filter((r) => filter === 'all' || r.result.decision === filter);
  return (
    <>
      <p>{results.length} trade{results.length === 1 ? '' : 's'} checked.</p>
      <SummaryTiles counts={counts} />
      <FilterChips value={filter} counts={counts} onChange={setFilter} />
      {visible.length ? (
        <ResultsTable items={visible} />
      ) : (
        <p className="empty">No trades match this filter.</p>
      )}
    </>
  );
}

// The live region is always mounted so announcements fire reliably.
export default function ResultsPanel({ status, error, submitted, results }) {
  let body;
  if (status === 'loading') {
    body = <Loading />;
  } else if (status === 'error' && error) {
    body = (
      <p className="message message-error">
        <strong>{error.kind === 'validation' ? 'Validation error: ' : 'Error: '}</strong>
        {describeError(error)}
      </p>
    );
  } else if (status === 'success') {
    body = <Results submitted={submitted} results={results} />;
  } else {
    body = (
      <div className="empty-state">
        <InboxIcon />
        <p className="empty">No results yet. Enter trades and choose "Check trades".</p>
      </div>
    );
  }

  return (
    <section className="card results-card" aria-labelledby="results-heading">
      <h2 id="results-heading">Results</h2>
      <div aria-live="polite" aria-busy={status === 'loading'}>{body}</div>
    </section>
  );
}
