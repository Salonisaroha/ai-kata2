const express = require('express');

module.exports = function portfoliosRoutes({ portfolioRepository }) {
  const router = express.Router();
  router.get('/', (req, res) => {
    res.json({ portfolios: portfolioRepository.listIds().map((portfolio_id) => ({ portfolio_id })) });
  });
  return router;
};
