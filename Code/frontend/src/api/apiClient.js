// Single module isolating all HTTP details. Paths are relative (Vite proxies /api in dev).

export const DECISIONS = Object.freeze({
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  MANUAL: 'Needs Manual Sign-off',
});

export class ApiError extends Error {
  constructor(message, { kind, status, code, tradeIndex, field } = {}) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind; // 'network' | 'timeout' | 'api' | 'invalid-response'
    this.status = status;
    this.code = code;
    this.tradeIndex = tradeIndex;
    this.field = field;
  }
}

const isObject = (v) => typeof v === 'object' && v !== null;
const validDecisions = new Set(Object.values(DECISIONS));
const unexpected = () =>
  new ApiError('The server returned an unexpected response.', { kind: 'invalid-response' });

function validateResults(body, expectedLength) {
  const ok =
    isObject(body) &&
    Array.isArray(body.results) &&
    body.results.length === expectedLength &&
    body.results.every(
      (r) => isObject(r) && validDecisions.has(r.decision) && typeof r.reason === 'string',
    );
  if (!ok) throw unexpected();
  return body.results;
}

export function createApiClient({ baseUrl = '', fetchImpl, timeoutMs = 10000 } = {}) {
  const doFetch = fetchImpl || ((...args) => fetch(...args));

  async function request(path, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response;
    try {
      response = await doFetch(`${baseUrl}${path}`, {
        ...options,
        headers: { Accept: 'application/json', ...(options.headers || {}) },
        signal: controller.signal,
      });
    } catch (err) {
      if (err && err.name === 'AbortError') {
        throw new ApiError('The request timed out. Please try again.', { kind: 'timeout' });
      }
      throw new ApiError('Cannot reach the server. Check your connection and try again.', {
        kind: 'network',
      });
    } finally {
      clearTimeout(timer);
    }

    let body = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }

    if (!response.ok) {
      const e = isObject(body) && isObject(body.error) ? body.error : {};
      throw new ApiError(e.message || `Request failed (HTTP ${response.status}).`, {
        kind: 'api',
        status: response.status,
        code: e.code,
        tradeIndex: Number.isInteger(e.trade_index) ? e.trade_index : undefined,
        field: e.field,
      });
    }
    return body;
  }

  return {
    async getPortfolios() {
      const body = await request('/api/portfolios');
      if (!isObject(body) || !Array.isArray(body.portfolios)) throw unexpected();
      return body.portfolios.map((p) => p.portfolio_id);
    },

    async checkTrades(trades) {
      const body = await request('/api/trades/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trades }),
      });
      return validateResults(body, trades.length);
    },
  };
}

export const apiClient = createApiClient();
