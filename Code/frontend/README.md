# Trade Compliance Checker - Frontend

React + Vite UI for submitting a batch of proposed trades and viewing the per-trade decision and reason.

## Run
1. Start the backend (`Code/backend`, port 4000).
2. `npm install`
3. `npm run dev` -> http://localhost:5173 (Vite proxies `/api` to `http://localhost:4000`)

Other scripts: `npm run build`, `npm run preview` (also proxies `/api`).

## Structure
- `src/api/apiClient.js` - the only module that does HTTP; validates responses, maps errors to `ApiError`, 10s timeout.
- `src/hooks/useTradeChecker.js` - all state (rows, validation, submit, results, errors).
- `src/components/` - presentational components. `App` takes the API client as a prop so it can be faked in tests.
- `src/utils/validation.js` - convenience client checks only; the backend is authoritative.

## Notes
- Decisions are shown by text, icon and color; styling branches on `decision`, never on `reason`. Reasons are shown verbatim.
- Business rejections are normal results. API errors show `error.message` and highlight the offending trade (`trade_index`).
- Client-side checks block empty or non-positive numbers, so R1 (`Invalid trade data.`) results are not reachable from the UI under normal use.
