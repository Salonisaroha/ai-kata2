// Demo trades for the "Load sample trades" button (display/convenience only).
const t = (portfolio_id, security_id, action, quantity, price) => ({
  portfolio_id,
  security_id,
  action,
  quantity: String(quantity),
  price: String(price),
  security_type: 'Equity',
});

export const SAMPLE_TRADES = [
  t('POR001', 'TCS', 'Buy', 10, 300),
  t('POR001', 'AAPL', 'Sell', 100, 145),
  t('POR001', 'AAPL', 'Sell', 101, 145),
  t('POR001', 'XYZCORP', 'Buy', 10, 100),
  t('POR002', 'AAPL', 'Buy', 201, 100),
  t('POR002', 'AAPL', 'Buy', 150, 100),
  t('POR002', 'AAPL', 'Buy', 100, 100),
];
