import { describe, test, expect, vi } from 'vitest';
import { createApiClient, ApiError } from '../src/api/apiClient.js';

const json = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const trade = { portfolio_id: 'POR001' };
const okResult = { index: 0, decision: 'Approved', reason: 'x' };

describe('apiClient (fake fetch at the network boundary)', () => {
  test('getPortfolios_mapsToIds', async () => {
    const api = createApiClient({ fetchImpl: vi.fn().mockResolvedValue(json(200, { portfolios: [{ portfolio_id: 'A' }, { portfolio_id: 'B' }] })) });
    expect(await api.getPortfolios()).toEqual(['A', 'B']);
  });

  test('checkTrades_postsJsonEnvelope_andReturnsResults', async () => {
    const f = vi.fn().mockResolvedValue(json(200, { results: [okResult] }));
    const res = await createApiClient({ fetchImpl: f }).checkTrades([trade]);
    expect(res).toEqual([okResult]);
    const [url, opts] = f.mock.calls[0];
    expect(url).toBe('/api/trades/check');
    expect(opts.method).toBe('POST');
    expect(opts.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(opts.body)).toEqual({ trades: [trade] });
  });

  test('errorBody_becomesApiErrorWithContractFields', async () => {
    const f = vi.fn().mockResolvedValue(json(404, { error: { code: 'PORTFOLIO_NOT_FOUND', message: 'nope', trade_index: 2, field: 'portfolio_id' } }));
    await expect(createApiClient({ fetchImpl: f }).checkTrades([trade])).rejects.toMatchObject({
      kind: 'api', status: 404, code: 'PORTFOLIO_NOT_FOUND', message: 'nope', tradeIndex: 2, field: 'portfolio_id',
    });
  });

  test('non-JSONErrorBody_fallsBackToGenericMessage', async () => {
    const f = vi.fn().mockResolvedValue({ ok: false, status: 502, json: async () => { throw new Error('html'); } });
    await expect(createApiClient({ fetchImpl: f }).checkTrades([trade])).rejects.toMatchObject({ kind: 'api', message: 'Request failed (HTTP 502).' });
  });

  test('networkFailure_kindNetwork', async () => {
    const f = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(createApiClient({ fetchImpl: f }).checkTrades([trade])).rejects.toMatchObject({ kind: 'network' });
  });

  test('abort_kindTimeout', async () => {
    const f = vi.fn().mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' }));
    await expect(createApiClient({ fetchImpl: f }).checkTrades([trade])).rejects.toMatchObject({ kind: 'timeout' });
  });

  test.each([
    ['wrong length', { results: [] }],
    ['unknown decision', { results: [{ decision: 'Maybe', reason: 'x' }] }],
    ['missing reason', { results: [{ decision: 'Approved' }] }],
    ['no results key', {}],
  ])('malformedSuccessBody_%s_isInvalidResponse', async (_n, body) => {
    const f = vi.fn().mockResolvedValue(json(200, body));
    const p = createApiClient({ fetchImpl: f }).checkTrades([trade]);
    await expect(p).rejects.toBeInstanceOf(ApiError);
    await expect(p).rejects.toMatchObject({ kind: 'invalid-response' });
  });
});
