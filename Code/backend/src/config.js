const path = require('path');

const BACKEND_ROOT = path.resolve(__dirname, '..');

function positiveInt(value, fallback, name) {
  if (value === undefined || value === '') return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new Error(`${name} must be a positive integer.`);
  return n;
}

function loadConfig(env = process.env) {
  return Object.freeze({
    port: positiveInt(env.PORT, 4000, 'PORT'),
    portfolioCsvPath: path.resolve(BACKEND_ROOT, env.PORTFOLIO_CSV_PATH || './data/portfolios_reference.csv'),
    corsOrigins: (env.CORS_ORIGIN || 'http://localhost:5173').split(',').map((s) => s.trim()).filter(Boolean),
    maxTrades: positiveInt(env.MAX_TRADES, 100, 'MAX_TRADES'),
    logLevel: env.LOG_LEVEL || 'info',
  });
}

module.exports = { loadConfig };
