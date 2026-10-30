// Regression tests for code-review findings m1 and m2 (expected values from the API contract 2.4 and the review).
const request = require('supertest');
const express = require('express');
const { realApp } = require('../helpers/app');
const { errorHandler } = require('../../src/http/errorHandler');

const app = realApp();
const silent = { error() {}, warn() {}, info() {}, debug() {} };

describe('m1: requireJson applies only to /api/trades', () => {
  test.each([
    ['text/plain', 'hello'],
    ['application/x-www-form-urlencoded', 'a=1'],
    ['application/json', '{}'],
  ])('POST_unknownRoute_%s_returns404NOT_FOUND', async (type, payload) => {
    const res = await request(app).post('/nope').set('Content-Type', type).send(payload);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  test('POST_unknownRouteNoContentType_returns404', async () => {
    const res = await request(app).post('/api/unknown');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  test('POST_tradesCheckTextPlain_still415', async () => {
    const res = await request(app).post('/api/trades/check').set('Content-Type', 'text/plain').send('x');
    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
  });

  test('POST_tradesCheckNoContentType_still415', async () => {
    const res = await request(app).post('/api/trades/check');
    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
  });
});

describe('m2: other body-parser 4xx errors map to their own 4xx, not 500', () => {
  test('unsupportedContentEncoding_returns415_UNSUPPORTED_MEDIA_TYPE_noLeak', async () => {
    const res = await request(app)
      .post('/api/trades/check')
      .set('Content-Type', 'application/json')
      .set('Content-Encoding', 'br')
      .send('{"trades":[]}');
    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
    expect(typeof res.body.error.message).toBe('string');
    expect(JSON.stringify(res.body)).not.toMatch(/stack|\.js:|node_modules/);
  });

  // Fake downstream errors at the error-handler boundary.
  const run = async (err) => {
    const a = express();
    a.get('/boom', (req, res, next) => next(err));
    a.use(errorHandler(silent));
    return request(a).get('/boom');
  };
  const httpErr = (status, expose) => Object.assign(new Error('internal detail'), { status, expose });

  test('exposed400_returns400_BAD_REQUEST', async () => {
    const res = await run(httpErr(400, true));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
    expect(JSON.stringify(res.body)).not.toMatch(/internal detail|stack/);
  });
  test('exposed415_returns415_UNSUPPORTED_MEDIA_TYPE', async () => {
    const res = await run(httpErr(415, true));
    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
  });
  test.each([[500, true], [503, true], [400, false]])('status%i_expose%s_isGeneric500', async (status, expose) => {
    const res = await run(httpErr(status, expose));
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(res.body)).not.toMatch(/internal detail|stack/);
  });
});
