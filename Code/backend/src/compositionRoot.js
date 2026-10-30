const CsvPortfolioRepository = require('./repositories/CsvPortfolioRepository');
const RuleChain = require('./rules/RuleChain');
const defaultRules = require('./rules/defaultRules');
const TradeInputValidator = require('./services/TradeInputValidator');
const ComplianceService = require('./services/ComplianceService');
const { createApp } = require('./http/app');
const { createLogger } = require('./http/requestLogger');

/** The only place where concrete classes are wired together. */
function buildApp(config) {
  const logger = createLogger(config.logLevel);
  const portfolioRepository = new CsvPortfolioRepository(config.portfolioCsvPath);
  const ruleChain = new RuleChain(defaultRules());
  const tradeInputValidator = new TradeInputValidator({ maxTrades: config.maxTrades });
  const complianceService = new ComplianceService({ ruleChain, portfolioRepository, tradeInputValidator });
  return { app: createApp({ complianceService, portfolioRepository, config, logger }), logger };
}

module.exports = { buildApp };
