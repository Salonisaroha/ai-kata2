import TradeForm from './components/TradeForm.jsx';
import ResultsPanel from './components/ResultsPanel.jsx';
import ThemeToggle from './components/ThemeToggle.jsx';
import { ShieldIcon } from './components/Icons.jsx';
import { useTradeChecker } from './hooks/useTradeChecker.js';

export default function App({ api }) {
  const t = useTradeChecker(api);
  const flaggedIndex = t.status === 'error' ? t.error?.tradeIndex : undefined;

  return (
    <>
      <a className="skip-link" href="#main">Skip to main content</a>
      <header className="app-header">
        <div className="app-header-inner">
          <span className="brand-mark"><ShieldIcon width={26} height={26} /></span>
          <div>
            <h1>Trade Compliance Checker</h1>
            <p className="subtitle">Pre-trade checks for restricted securities, holdings, cash and concentration</p>
          </div>
          <ThemeToggle />
        </div>
      </header>
      <main id="main" className="layout">
        <TradeForm
          rows={t.rows}
          rowErrors={t.rowErrors}
          portfolios={t.portfolios}
          portfoliosState={t.portfoliosState}
          flaggedIndex={flaggedIndex}
          invalidSubmitCount={t.invalidSubmitCount}
          loading={t.status === 'loading'}
          onChange={t.updateRow}
          onAdd={t.addRow}
          onRemove={t.removeRow}
          onLoadSamples={t.loadSamples}
          onReset={t.resetAll}
          onSubmit={t.submit}
          onReloadPortfolios={t.reloadPortfolios}
        />
        <ResultsPanel status={t.status} error={t.error} submitted={t.submitted} results={t.results} />
      </main>
    </>
  );
}
