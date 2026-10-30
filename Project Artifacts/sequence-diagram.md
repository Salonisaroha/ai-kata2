# Sequence Diagrams

Reflects the code as built. Participants: `ComplianceService` (Service), `TradeInputValidator` (Validator), `CsvPortfolioRepository` (Repo, in-memory after startup), `RuleChain` (Chain) with rules R1 to R6.

## 1. Happy path: POST /api/trades/check with rule-chain short-circuit

Example: POR001 Sell AAPL 100 (E9). R1 to R3 evaluate, R3 passes (`held == quantity`), R4 and R5 return `null` because they apply to Buy only, and the terminal R6 fires. For a trade rejected at R2 (e.g. restricted security), the chain stops there and R3 to R6 are never called.

```mermaid
sequenceDiagram
    autonumber
    actor Client
    participant H as "Express http (app + tradesRoutes)"
    participant S as ComplianceService
    participant V as TradeInputValidator
    participant P as CsvPortfolioRepository
    participant C as RuleChain
    participant R as "Rules R1..R6"

    Client->>H: "POST /api/trades/check {trades:[...]}"
    H->>H: "requireJson, express.json (limit 100kb), logger"
    H->>S: "checkTrades(req.body)"
    S->>V: "validate(body)"
    V-->>S: "Trade[] (all shape-valid)"
    loop "each trade (portfolio resolution, before any rule)"
        S->>P: "findById(portfolioId)"
        P-->>S: Portfolio
    end
    loop "each trade (independent, same snapshot)"
        S->>C: "evaluate(trade, portfolio)"
        C->>R: "R1.evaluate -> null"
        C->>R: "R2.evaluate -> null"
        C->>R: "R3.evaluate -> null (held >= qty)"
        C->>R: "R4.evaluate -> null (Sell: not applicable)"
        C->>R: "R5.evaluate -> null (Sell: not applicable)"
        C->>R: "R6.evaluate -> Decision Approved"
        Note over C,R: "First non-null Decision short-circuits the loop"
        C-->>S: "{decision, reason}"
    end
    S-->>H: "results[] with index, portfolio_id, security_id, decision, reason"
    H-->>Client: "200 {results:[...]}"
```

## 2. Rejection and Needs Manual Sign-off (including Step 5)

Business outcomes are always HTTP 200. Two trades from POR002 (cash 20,000, cap 50%) are shown: a Rejected at R4 (E8) and a Needs Manual Sign-off at R5 (E4). Step 5 is reached only if R1 to R4 all return `null`.

```mermaid
sequenceDiagram
    autonumber
    participant S as ComplianceService
    participant C as RuleChain
    participant R1 as "R1 InvalidTradeData"
    participant R2 as "R2 RestrictedSecurity"
    participant R3 as "R3 InsufficientHoldings"
    participant R4 as "R4 InsufficientCash"
    participant R5 as "R5 Concentration"

    Note over S,R5: "Trade A: Buy NEWCO 201 @ 100 (cost 20,100 > cash 20,000)"
    S->>C: "evaluate(tradeA, POR002)"
    C->>R1: evaluate
    R1-->>C: null
    C->>R2: evaluate
    R2-->>C: null
    C->>R3: "evaluate (Buy: not applicable)"
    R3-->>C: null
    C->>R4: evaluate
    R4-->>C: "Rejected: Insufficient cash for this buy order."
    Note over C,R5: "Short-circuit. R5 and R6 never run (R4 wins over R5)"
    C-->>S: "Rejected + reason"

    Note over S,R5: "Trade B: Buy NEWCO 101 @ 100 (cost 10,100 <= cash)"
    S->>C: "evaluate(tradeB, POR002)"
    C->>R1: evaluate
    R1-->>C: null
    C->>R2: evaluate
    R2-->>C: null
    C->>R3: evaluate
    R3-->>C: null
    C->>R4: "evaluate (cost <= cash passes)"
    R4-->>C: null
    C->>R5: "evaluate (Step 5)"
    Note over R5: "post_trade_cash = 20,000 - 10,100 = 9,900<br/>post_trade_value = (0 + 101) x 100 = 10,100<br/>other holdings = 0<br/>total_after = 20,000<br/>fires iff value x 100 > cap x total_after<br/>1,010,000 > 1,000,000 -> fires"
    R5-->>C: "Needs Manual Sign-off: Exceeds maximum position concentration (requires approval)."
    Note over C: "R6 never runs. Equal to cap (E3) would return null and reach R6 Approved"
    C-->>S: "Needs Manual Sign-off + reason"
```

## 3. Error paths: 400 and 404

All boundary checks run for every trade before any portfolio lookup, so a 400 anywhere in the batch wins over a 404 on an earlier trade. No rule runs and no partial results are returned.

```mermaid
sequenceDiagram
    autonumber
    actor Client
    participant H as "Express http"
    participant S as ComplianceService
    participant V as TradeInputValidator
    participant P as CsvPortfolioRepository
    participant E as errorHandler

    rect rgb(255, 240, 240)
    Note over Client,E: "400: malformed request"
    Client->>H: "POST /api/trades/check (bad body)"
    alt "Content-Type is not JSON"
        H-->>Client: "415 UNSUPPORTED_MEDIA_TYPE"
    else "Body not parseable"
        H->>E: "entity.parse.failed"
        E-->>Client: "400 INVALID_JSON"
    else "Body over 100kb"
        H->>E: "entity.too.large"
        E-->>Client: "413 PAYLOAD_TOO_LARGE"
    else "Parsed OK"
        H->>S: "checkTrades(body)"
        S->>V: "validate(body)"
        V--xS: "throws ValidationError (VALIDATION_ERROR or TOO_MANY_TRADES, trade_index, field)"
        S--xH: propagates
        H->>E: ValidationError
        E-->>Client: "400 {error:{code, message, trade_index?, field?}}"
    end
    end

    rect rgb(240, 240, 255)
    Note over Client,E: "404: well-formed but unknown portfolio_id"
    Client->>H: "POST /api/trades/check (portfolio_id POR999)"
    H->>S: "checkTrades(body)"
    S->>V: "validate(body)"
    V-->>S: "Trade[] (shape OK)"
    S->>P: "findById('POR999')"
    P-->>S: undefined
    S--xH: "throws NotFoundError (PORTFOLIO_NOT_FOUND, trade_index, field portfolio_id)"
    H->>E: NotFoundError
    E-->>Client: "404 {error:{code:'PORTFOLIO_NOT_FOUND', message, trade_index, field}}"
    end

    Note over Client,E: "Unknown route -> notFoundHandler 404 NOT_FOUND. Unexpected error -> logged, 500 INTERNAL_ERROR with generic message"
```

## 4. UI: load portfolios and submit

The UI validates rows client-side first. The API client enforces a timeout, checks the response shape (decision values, result count) and converts failures to `ApiError`.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant UI as "App / TradeForm / ResultsPanel"
    participant K as useTradeChecker
    participant A as apiClient
    participant API as "Backend /api"

    Note over UI,API: "On mount"
    UI->>K: "mount -> loadPortfolios()"
    K->>A: getPortfolios()
    A->>API: "GET /api/portfolios"
    alt "200"
        API-->>A: "{portfolios:[{portfolio_id}...]}"
        A-->>K: "string[] of ids"
        K-->>UI: "dropdown populated"
    else "failure (network, timeout, HTTP error)"
        API--xA: error
        A--xK: ApiError
        K-->>UI: "portfoliosState.error, reload button"
    end

    Note over User,API: "Submit"
    User->>UI: "fill rows, click Check"
    UI->>K: submit()
    K->>K: "validateRow for each row"
    alt "client-side errors"
        K-->>UI: "rowErrors + 'Fix the highlighted fields'. No request sent"
    else "rows valid"
        K->>K: "status = loading, toPayload(rows)"
        K->>A: "checkTrades(payload)"
        A->>API: "POST /api/trades/check {trades}"
        alt "200 results"
            API-->>A: "{results:[...]}"
            A->>A: "validateResults (count and decision values)"
            A-->>K: results
            K-->>UI: "status success -> ResultsTable with DecisionBadge, reason as text"
        else "400 / 404 / 413 / 415 / 500"
            API-->>A: "{error:{code, message, trade_index?, field?}}"
            A--xK: "ApiError (message, status, tradeIndex, field)"
            K-->>UI: "status error -> message shown, flaggedIndex highlights row"
        else "network or timeout"
            A--xK: "ApiError kind network or timeout"
            K-->>UI: "status error -> friendly message"
        end
    end
```
