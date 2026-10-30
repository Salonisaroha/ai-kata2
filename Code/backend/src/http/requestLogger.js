const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

function createLogger(level = 'info') {
  const threshold = LEVELS[level] ?? LEVELS.info;
  const log = (lvl, msg, fields) => {
    if (LEVELS[lvl] > threshold) return;
    const line = JSON.stringify({ time: new Date().toISOString(), level: lvl, msg, ...fields });
    (lvl === 'error' ? console.error : console.log)(line);
  };
  return {
    error: (m, f) => log('error', m, f),
    warn: (m, f) => log('warn', m, f),
    info: (m, f) => log('info', m, f),
    debug: (m, f) => log('debug', m, f),
  };
}

/** Logs one line per request: method, path, status, duration, trade count. Never bodies. */
function requestLogger(logger) {
  return (req, res, next) => {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      const tradeCount = Array.isArray(req.body && req.body.trades) ? req.body.trades.length : undefined;
      logger.info('request', {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration_ms: Number((process.hrtime.bigint() - start) / 1000n) / 1000,
        trade_count: tradeCount,
      });
    });
    next();
  };
}

module.exports = { requestLogger, createLogger };
