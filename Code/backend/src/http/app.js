const express = require('express');
const cors = require('cors');
const tradesRoutes = require('./routes/tradesRoutes');
const portfoliosRoutes = require('./routes/portfoliosRoutes');
const healthRoutes = require('./routes/healthRoutes');
const { requestLogger, createLogger } = require('./requestLogger');
const { errorHandler, notFoundHandler } = require('./errorHandler');
const { BODY_LIMIT } = require('./bodyLimit');

function requireJson(req, res, next) {
  if (req.method === 'POST' && !req.is('application/json')) {
    return res.status(415).json({
      error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Content-Type must be application/json.' },
    });
  }
  return next();
}

/** @param {{complianceService, portfolioRepository, config: {corsOrigins: string[], logLevel?: string}, logger?}} deps */
function createApp({ complianceService, portfolioRepository, config, logger }) {
  const log = logger || createLogger(config.logLevel);
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  });
  app.use(cors({ origin: config.corsOrigins, methods: ['GET', 'POST', 'OPTIONS'], allowedHeaders: ['Content-Type'] }));
  app.use(requestLogger(log));

  app.use('/api/trades', requireJson, express.json({ limit: BODY_LIMIT }), tradesRoutes({ complianceService }));
  app.use('/api/portfolios', portfoliosRoutes({ portfolioRepository }));
  app.use('/api/health', healthRoutes({ portfolioRepository }));

  app.use(notFoundHandler);
  app.use(errorHandler(log));
  return app;
}

module.exports = { createApp };
