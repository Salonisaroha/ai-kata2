# Test Execution Report

Date: 2026-10-25. Plan: `Project Artifacts/test-plan.md`.

## Results

| Suite | Runner | Files | Tests | Passed | Failed | Skipped |
|---|---|---|---|---|---|---|
| Backend (unit + API integration) | Jest 29 + supertest | 7 | 228 | 228 | 0 | 0 |
| Frontend (validation, apiClient, App) | Vitest 2 + RTL + jsdom | 3 | 51 | 51 | 0 | 0 |
| Total | | 10 | 279 | 279 | 0 | 0 |

Backend files: `tests/unit/{rules,decimalPrecision,tradeInputValidator,csvPortfolioRepository,ruleChain}.test.js`, `tests/api/{tradesCheck.api,portfoliosHealth.api}.test.js`, helpers in `tests/helpers/`.
Frontend files: `Code/frontend/tests/{validation.test.js,apiClient.test.js,App.test.jsx,setup.js}`, config `Code/frontend/vitest.config.js`.
All 19 worked examples E1-E19 pass through the real HTTP stack with the real CSV.

One test of mine initially failed (a wrong float assumption in a sanity check, `0.3*100 === 30` in JS). It was a test defect, fixed by using `0.07*100`; no application change was involved.

## Coverage (backend, `jest --coverage`)
Statements 96.78%, branches 84.1%, functions 92.77%, lines 96.83%. Rules, domain, services, routes, errorHandler: 100%. Uncovered: `config.js` env validation (invalid PORT / MAX_TRADES throw), `requestLogger.js` logger levels/branches, `errors.js` `PayloadTooLargeError` class (unused, 413 comes from the body parser), CSV repository line 58 (BOM/empty-cell branch). Frontend coverage not measured (needs an extra coverage package).

## Open defects
None. No test failed against the application, and no application source was modified.

## Observations (not defects)
- O1: `errors.js` `PayloadTooLargeError` is dead code (413 is produced by the `entity.too.large` branch in `errorHandler.js`). Cosmetic, for backend-developer.
- O2: Only two of the contract's 500-handling paths are verified, via a fake service that throws; no real code path produces a 500.
- O3: `package.json` in `Code/frontend` gained devDependencies (vitest, jsdom, @testing-library/*) and a `test` script; `Code/frontend` `npm install` also notes esbuild postinstall in `allow-scripts` (informational).
- O4: `npm audit` reports vulnerabilities after the frontend install (not triaged).

## Not covered
- Real browser behavior, CSS/contrast, screen-reader announcement (only structural a11y: labels, aria-invalid/describedby, live region, table caption/headers, skip link, keyboard Enter submit).
- Frontend line/branch coverage figures; `useTradeChecker` unmount-race branches.
- `server.js` startup/listen and fail-fast process exit on bad CSV (repository throw is tested, process exit is not).
- Load/performance; concurrency.
- Ambiguities for requirement-analyst: none new. Approved reason wording is assumed (A8); API tests assert it as documented in the contract.

## Regression run after fixes
Scope: backend changes for code-review m1-m5 and frontend changes for m6-m8. No application source was modified by QA.

New regression tests: `Code/backend/tests/api/errorMapping.regression.test.js` (12 tests; expected values from contract 2.4 and code-review m1/m2, not from the implementation).
- m1: POST to an unknown route (`/nope`, `/api/unknown`) with text/plain, form-urlencoded, JSON or no content type returns 404 `NOT_FOUND`; `POST /api/trades/check` with text/plain or no content type still returns 415 `UNSUPPORTED_MEDIA_TYPE`.
- m2: a JSON body with an unsupported `Content-Encoding: br` returns 415 `UNSUPPORTED_MEDIA_TYPE` with no stack leak (end to end). At the error-handler boundary with fake errors: exposed 400 gives 400 `BAD_REQUEST`, exposed 415 gives 415, and non-exposed 4xx or any 5xx gives generic 500 `INTERNAL_ERROR` with no internal detail in the body.

| Suite | Files | Tests | Passed | Failed | Skipped |
|---|---|---|---|---|---|
| Backend (Jest) | 8 | 240 | 240 | 0 | 0 |
| Frontend (Vitest) | 4 | 54 | 54 | 0 | 0 |
| Total | 12 | 294 | 294 | 0 | 0 |

Backend coverage: statements 97.11%, branches 85.62%, functions 93.9%, lines 97.19%. `errorHandler.js`, `app.js` lines, `bodyLimit.js`: 100%. Remaining gaps: `config.js` env validation (lines 7-9), `requestLogger.js` logger levels, CSV repository line 64. The dead `PayloadTooLargeError` is gone from coverage output (O1 resolved by the move to `src/errors.js`).

Frontend: the file count went from 3 to 4 and tests from 51 to 54 since the earlier run (new tests not written in this round by QA). I did not separately verify m6-m8 behaviors (focus to first invalid field, aria-required, focus after row removal, flagged marker) beyond the suite passing; no dedicated QA test was added for them, so they are not independently covered here.

Open defects: none. m1 and m2 verified fixed.
