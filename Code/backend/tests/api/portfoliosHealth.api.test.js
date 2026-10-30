const request = require('supertest');
const { realApp, silentLogger } = require('../helpers/app');
const { createApp } = require('../../src/http/app');

const app = realApp();

describe('GET /api/portfolios', () => {
  test('returnsIdsInCsvOrder_onlyIds', async () => {
    const res = await request(app).get('/api/portfolios');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toEqual({
      portfolios: ['POR001', 'POR002', 'POR003', 'POR004', 'POR005'].map((portfolio_id) => ({ portfolio_id })),
    });
  });
});

describe('GET /api/health', () => {
  test('ok_with5PortfoliosLoaded', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', portfolios_loaded: 5 });
  });
});

describe('cross-cutting HTTP', () => {
  test('nosniffHeader_andNoXPoweredBy', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
  test('corsAllowsConfiguredOriginOnly', async () => {
    const ok = await request(app).get('/api/health').set('Origin', 'http://localhost:5173');
    expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    const bad = await request(app).get('/api/health').set('Origin', 'http://evil.example');
    expect(bad.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('500 handling (fake service at the true boundary)', () => {
  test('unexpectedFailure_genericInternalError_noLeak', async () => {
    const boom = { checkTrades: () => { throw new Error('secret /etc/path detail'); } };
    const repo = { listIds: () => [] };
    const a = createApp({ complianceService: boom, portfolioRepository: repo, config: { corsOrigins: [] }, logger: silentLogger });
    const res = await request(a).post('/api/trades/check').send({ trades: [] });
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error.' } });
  });
});
