const express = require('express');

module.exports = function tradesRoutes({ complianceService }) {
  const router = express.Router();
  router.post('/check', (req, res) => {
    res.json({ results: complianceService.checkTrades(req.body) });
  });
  return router;
};
