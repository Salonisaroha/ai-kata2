# Architecture Diagram

Reflects the code as built in `Code/backend/src` and `Code/frontend/src`.

## 1. Component view

```mermaid
flowchart TB
    subgraph FE["Frontend (React + Vite, :5173)"]
        UI["App.jsx + TradeForm / ResultsPanel"]
        HOOK["useTradeChecker hook<br/>(client validation, state)"]
        API["apiClient.js<br/>(fetch, timeout, response check)"]
        UI --> HOOK --> API
    end

    API -- "HTTP JSON /api/* (Vite proxy to :4000)" --> HTTP

    subgraph BE["Backend (Node.js + Express, :4000)"]
        subgraph HTTP["http layer (thin transport)"]
            MW["app.js: nosniff, cors, requestLogger,<br/>requireJson (415), express.json with bodyLimit 100kb"]
            ROUTES["routes: tradesRoutes, portfoliosRoutes, healthRoutes"]
            EH["errorHandler + notFoundHandler<br/>(maps AppError to error shape)"]
            MW --> ROUTES
            ROUTES -. "thrown errors" .-> EH
        end

        subgraph SVC["services (orchestration)"]
            CS["ComplianceService<br/>checkTrades()"]
            TIV["TradeInputValidator<br/>(boundary 400 checks)"]
            CS --> TIV
        end

        subgraph RULES["rules"]
            RC["RuleChain<br/>first non-null Decision wins"]
            R1["R1 InvalidTradeDataRule"]
            R2["R2 RestrictedSecurityRule"]
            R3["R3 InsufficientHoldingsRule (Sell)"]
            R4["R4 InsufficientCashRule (Buy)"]
            R5["R5 ConcentrationRule (Buy)"]
            R6["R6 ApprovedRule (terminal)"]
            RC --> R1 --> R2 --> R3 --> R4 --> R5 --> R6
        end

        subgraph DOM["domain (immutable, no I/O)"]
            D["Trade, Portfolio, Holding, Decision,<br/>decisions.js constants"]
        end

        subgraph REPO["repositories"]
            IFACE["Repository contract (duck-typed)<br/>findById(id), listIds()"]
            CSVR["CsvPortfolioRepository<br/>load + validate once, in-memory Map"]
            CSVR -. "implements" .-> IFACE
        end

        ERR["errors.js<br/>AppError, ValidationError, NotFoundError"]
        ROOT["compositionRoot.js buildApp(config)<br/>(only place that uses 'new' on concretes)"]
        CFG["config.js (env)"]
        SRV["server.js"]
    end

    CSV[("portfolios_reference.csv")]

    ROUTES --> CS
    ROUTES --> IFACE
    CS --> RC
    CS --> IFACE
    CSVR --> CSV
    RULES --> DOM
    SVC --> DOM
    CSVR --> DOM
    TIV -. "throws" .-> ERR
    CS -. "throws NotFoundError" .-> ERR
    EH --> ERR

    SRV --> CFG
    SRV --> ROOT
    ROOT -. "wires" .-> CSVR
    ROOT -. "wires" .-> RC
    ROOT -. "wires" .-> CS
    ROOT -. "wires" .-> HTTP
```

## 2. Layers and dependency direction

```mermaid
flowchart LR
    T["http (transport)"] --> S["services"]
    S --> RU["rules"]
    S --> RP["repository contract"]
    RU --> DM["domain"]
    S --> DM
    CR["CsvPortfolioRepository"] --> DM
    CR -. "implements" .-> RP
    COMP["compositionRoot"] --> T
    COMP --> S
    COMP --> RU
    COMP --> CR
```

Arrows point from the dependent to the dependency. `domain` depends on nothing. Business logic (rules, service) never imports `http` or the CSV class.

## 3. Notes

- **Layers**: UI to api client (single module isolating HTTP) to Express http layer to `ComplianceService` to `RuleChain` (R1 to R6) to domain. `CsvPortfolioRepository` reads the CSV once at startup; a malformed file throws `DataConfigurationError` and `server.js` exits non-zero.
- **SRP**: http only parses and serializes; `TradeInputValidator` owns boundary validation; each rule owns one check; the repository owns parsing.
- **OCP / LSP**: every rule exposes `evaluate(trade, portfolio)` returning a `Decision` or `null`. `RuleChain` has no rule-specific logic. A new rule is a new class plus one line in `defaultRules.js`, which is the single place that defines order.
- **ISP**: consumers need only `findById` and `listIds`. `portfoliosRoutes`/`healthRoutes` use `listIds`, the service uses `findById`.
- **DIP**: `ComplianceService` receives `ruleChain`, `portfolioRepository` and `tradeInputValidator` by constructor injection; `createApp` receives the service and repository. Only `compositionRoot.js` knows the concrete classes, so tests can pass a fake repository.
- **Errors**: `src/errors.js` holds the HTTP-mapped classes shared by service and http layer. `errorHandler` converts `AppError` to `{ error: { code, message, trade_index?, field? } }`; body-parser failures map to 400/413/415; anything else becomes a generic 500 with details only in logs. `bodyLimit.js` is the single source of the 100kb limit (parser option and 413 message).
- **Removed**: there is no `PortfolioRepository.js` file. The repository contract is documented in the `CsvPortfolioRepository.js` header comment (JavaScript has no interfaces).
