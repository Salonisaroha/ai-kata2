# Trade Compliance Backend

Node.js 20+ / Express 4 / CommonJS.

## Run

```
cd Code/backend
npm install
npm start          # http://localhost:4000
npm run dev        # nodemon
npm test           # Jest + supertest (suite owned by test-qa)
```

Configuration is by environment variables (see `.env.example`): `PORT`, `PORTFOLIO_CSV_PATH`, `CORS_ORIGIN`, `MAX_TRADES`, `LOG_LEVEL`. The server refuses to start (exit code 1) if the CSV is missing or invalid.

## Endpoints

- `POST /api/trades/check` with `{ "trades": [ ... ] }`
- `GET /api/portfolios`
- `GET /api/health`

Example:

```
curl -X POST http://localhost:4000/api/trades/check -H "Content-Type: application/json" \
  -d '{"trades":[{"portfolio_id":"POR002","security_id":"NEWCO","action":"Buy","quantity":101,"price":100,"security_type":"Equity"}]}'
```

## Structure

`src/domain` value objects and decision/reason constants; `src/rules` R1-R6 as classes, ordered in `rules/defaultRules.js` and run by `RuleChain`; `src/repositories` CSV repository (validated at load); `src/services` boundary validation and orchestration; `src/http` Express app (`createApp`) and error mapping; `src/compositionRoot.js` wires everything.

`max_position_pct` is a whole-number percent; R5 compares `postTradeValue * 100 > maxPositionPct * totalAfter` with `decimal.js`.
