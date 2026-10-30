const { NotFoundError } = require('../errors');

class ComplianceService {
  /** @param {{ruleChain, portfolioRepository, tradeInputValidator}} deps */
  constructor({ ruleChain, portfolioRepository, tradeInputValidator }) {
    this.ruleChain = ruleChain;
    this.portfolioRepository = portfolioRepository;
    this.tradeInputValidator = tradeInputValidator;
  }

  /** All trades are shape-validated, then portfolios resolved, before any rule runs (A5). */
  checkTrades(body) {
    const trades = this.tradeInputValidator.validate(body);
    const portfolios = trades.map((trade, i) => {
      const portfolio = this.portfolioRepository.findById(trade.portfolioId);
      if (!portfolio) {
        throw new NotFoundError(`Portfolio "${trade.portfolioId}" was not found.`, {
          tradeIndex: i,
          field: 'portfolio_id',
        });
      }
      return portfolio;
    });
    return trades.map((trade, index) => {
      const { decision, reason } = this.ruleChain.evaluate(trade, portfolios[index]);
      return { index, portfolio_id: trade.portfolioId, security_id: trade.securityId, decision, reason };
    });
  }
}

module.exports = ComplianceService;
