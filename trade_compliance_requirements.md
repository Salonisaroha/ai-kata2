# Portfolio Trade Order Compliance & Execution Checker

## Purpose
Once a portfolio rebalancing decision proposes trades, those trades can't just execute blindly — each one needs to pass basic compliance and execution-readiness checks first (enough cash/holdings, within position limits, not a restricted security). This application takes a list of proposed trades for a portfolio and determines, trade by trade, whether each one is approved, rejected, or needs manual sign-off — along with the reason.

## What the application should do
Accept a proposed trade, look up the relevant portfolio's reference data, validate the trade against the rules below in order, and output a decision with a reason.

---

**Inputs (per trade):** `portfolio_id`, `security_id`, `action` (Buy/Sell), `quantity`, `price`, `security_type` (Equity/Bond/ETF)

**Portfolio reference data (per `portfolio_id`):** `cash_balance`, `restricted_securities` (list), `max_position_pct`, `current_holdings` — a list of **(security_id, quantity, market_price)** triples. Each holding carries its own market price — this is needed to value the rest of the portfolio for the concentration check (Step 5).

**Output (per trade):** `decision` (Approved / Rejected / Needs Manual Sign-off), `reason`

---

### Step 1 — Validate
`quantity` and `price` must be positive numbers. `action` must be Buy or Sell. Fail any of these → **Rejected**, "Invalid trade data."

### Step 2 — Restricted security check
If `security_id` appears in the portfolio's `restricted_securities` list → **Rejected**, "Security is restricted for this portfolio."

### Step 3 — Sell check
If `action` is Sell, the portfolio must currently hold at least `quantity` of that security (from `current_holdings`). Holding exactly `quantity` is sufficient — only holding *less* fails. Insufficient → **Rejected**, "Insufficient holdings to sell."

### Step 4 — Buy affordability check
If `action` is Buy, `quantity × price` must not exceed `cash_balance`. Costing exactly `cash_balance` is affordable — only exceeding it fails. Exceeds → **Rejected**, "Insufficient cash for this buy order."

### Step 5 — Position concentration check (Buy only)
Compute, step by step:
1. `post_trade_cash = cash_balance − (quantity × price)`
2. `post_trade_quantity = existing quantity of this security (0 if not currently held) + quantity`
3. `post_trade_value_of_this_security = post_trade_quantity × price` — the trade's price stands in for this security's current market price.
4. `value_of_other_holdings = sum of (quantity × market_price) for every OTHER security in current_holdings` — unaffected by this trade, use each holding's own stored `market_price`.
5. `total_portfolio_value_after = post_trade_cash + post_trade_value_of_this_security + value_of_other_holdings`
6. `position_pct = post_trade_value_of_this_security / total_portfolio_value_after`

If `position_pct` **strictly exceeds** `max_position_pct` → **Needs Manual Sign-off**, "Exceeds maximum position concentration — requires approval." Landing exactly at the cap is not exceeding it — passes through.

### Step 6 — Otherwise
**Approved.**

---

**Important:**
- Steps run in order — a trade that fails Step 1 never reaches Step 5, even if it would also have tripped the concentration check.
- Step 5 only applies to Buy orders. A Sell never triggers a concentration review.
- "Exceeds" and "insufficient" are strict comparisons — a value exactly equal to a limit passes, it does not fail.
