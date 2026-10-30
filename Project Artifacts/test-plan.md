# Test Plan - Trade Order Compliance & Execution Checker

## 1. Scope
In scope: business rules R1-R6 (Steps 1-6), precedence, Step 5 arithmetic, decimal precision (A9), CSV loading/validation (A11), boundary input validation (A5/A6), REST API (`POST /api/trades/check`, `GET /api/portfolios`, `GET /api/health`, error shapes 400/404/413/415/500), and the React UI (form validation, decision rendering, loading/error states, a11y basics).
Out of scope: real-browser/E2E, visual styling, performance/load, authentication (none by A12), CSV hot-reload (A12), the real network `fetch` in a browser.

## 2. Oracle and strategy
- Oracle: `trade_compliance_requirements.md`, `portfolios_reference.csv`, and the requirements analysis (R-IDs, AC-IDs, E1-E19, A1-A14) and API contract supplied during the workflow. All expected values are hand-computed from these and written as literals in the tests (reason strings are NOT imported from `src`).
- Backend (Jest 29 + supertest): unit tests on rules/validator/repository/service with hand-built portfolios; integration tests through the real composition root against the real CSV (`Code/backend/data/portfolios_reference.csv`, identical to the root file).
- Frontend (Vitest + React Testing Library + jsdom): `App` rendered with an injected fake `api` object (true external boundary); `apiClient` tested with an injected fake `fetchImpl`.
- Boundaries tested at below / exactly-at / above. Tests are table-driven, independent, no shared mutable state.

## 3. Test data
- Reference CSV POR001-POR005 (worked examples E1-E19).
- Builders: `tests/helpers/builders.js` (`portfolio()`, `rawTrade()`, `evaluate()`), `tests/helpers/app.js` (`realApp()`).
- Temp CSV files generated per test for parsing/fail-fast cases.
- Decimal-sensitive cases: `0.1 x 3 vs 0.3` cash; `0.07 x 100` vs cap 7 (float gives 7.000000000000001).

## 4. Entry / exit criteria
- Entry: backend and frontend implemented; `npm install` done.
- Exit: all tests pass, no open Critical/High defect, every R1-R6 and AC row maps to at least one test, E1-E19 all executed through the API.

## 5. How to run
- Backend: `cd Code/backend && npm test` (coverage: `npx jest --coverage`).
- Frontend: `cd Code/frontend && npm test` (`vitest run`).

## 6. Traceability matrix

| Rule / AC | Tests (file > describe/test) |
|---|---|
| R1, AC-R1-01..05 | `unit/rules.test.js` > R1 table (24 classes: zero, negative, null, missing, string, boolean, NaN, Infinity, array, bad action variants); `api/tradesCheck` > R1 raw-JSON classes (20), E15, E16, E19 |
| AC-R1-06, AC-ORD-01 | rules > ORD_invalidBeatsRestricted_E15; api E15 |
| AC-R1-07 | rules > R1 fractional 0.5; api > fractionalQuantity_notR1 |
| R2, AC-R2-01..05 | rules > R2 (Buy, Sell held, Sell unheld, exact-match variants, empty list); api E13, E14, POR003 BADCO/XYZCORP, xyzcorp case |
| R3, AC-R3-01..04, AC-ORD-02 | rules > R3 below/at/above, unheld, empty holdings, fractional 0.3; api E9-E12, E14 |
| R4, AC-R4-01..04, AC-ORD-03 | rules > R4 below/at/above, Sell skips R4, all cash; api E7, E8, E12, E17 |
| R5, AC-R5-01..08 | rules > R5 (E1-E6, E18, new vs held security, other holdings, Sell skip, cap 100); decimalPrecision (exact cap on floats); api E1-E7, E18 |
| R6, AC-R6-01..02 | api E1, E2, E9 |
| Precedence | rules > Precedence (6 cases); api E14, E15, E17 |
| AC-BATCH-01/02 | api > batch semantics (order, echo, independence, no state across requests); unit ruleChain > ComplianceService |
| AC-BND-01/02/03 | api > error responses (400 x ~25, 404 x 3, order 400-vs-404, TOO_MANY_TRADES, 413, 415 x3, INVALID_JSON, NOT_FOUND); unit tradeInputValidator; AC-BND-03 type-independence |
| AC-DATA-01/02, A1, A11 | unit csvPortfolioRepository (reference rows, parsing details, 20 fail-fast cases) |
| A9 / decimal | unit decimalPrecision |
| Contract: portfolios, health, headers, CORS, 500 | api/portfoliosHealth |
| Frontend | `tests/validation.test.js`, `tests/apiClient.test.js`, `tests/App.test.jsx` |

## 7. Assumption-labelled tests
A1 (percent units), A2 (batch independence), A3 (exact-match/case), A4 (Sell restricted), A5 (400/404 not decisions), A6 (security_type 400), A8 (approved wording only asserted in API tests as the contract's assumed text), A11 (CSV fail-fast), A12 (MAX_TRADES 100, 100kb), A13 (numeric strings not coerced).
