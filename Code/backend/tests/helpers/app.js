const path = require('path');
const { buildApp } = require('../../src/compositionRoot');
const { loadConfig } = require('../../src/config');

const REFERENCE_CSV = path.resolve(__dirname, '../../data/portfolios_reference.csv');
const silentLogger = { error() {}, warn() {}, info() {}, debug() {} };

/** Real composition root + real reference CSV. */
function realApp(env = {}) {
  const config = loadConfig({ PORTFOLIO_CSV_PATH: REFERENCE_CSV, LOG_LEVEL: 'error', ...env });
  const { app } = buildApp(config);
  return app;
}

module.exports = { realApp, silentLogger, REFERENCE_CSV };
