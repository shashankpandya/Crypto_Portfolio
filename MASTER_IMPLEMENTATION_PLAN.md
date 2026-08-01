# MASTER IMPLEMENTATION PLAN
## Crypto Portfolio — Production Readiness Roadmap

**Version:** 1.0
**Created:** 2026-07-31
**Status:** Draft — awaiting approval
**Branch at time of writing:** `feature/blockchain-market-services`

---

## Executive Summary

This plan transforms the Crypto Portfolio project from a functional prototype into a production-ready application. The current codebase demonstrates solid architecture with graceful degradation patterns, but has critical security, reliability, and maintainability gaps that must be addressed before production deployment.

**Timeline Estimate:** 8–12 weeks
**Risk Level:** Medium (authentication changes affect all layers)
**Approach:** Incremental migration, preserving existing functionality

**Guiding constraints for every phase below:**

1. Do not randomly refactor working code.
2. Preserve existing functionality — behavior parity is the acceptance bar.
3. Prefer incremental migration over rewriting.
4. Every structural change lands behind a strangler pattern: add the new module, move one caller, keep the old export as a re-export until the last caller is gone, then delete.

---

## Doc Status — Read This First

Four documents referenced during planning **do not exist on disk**:

- `CODEBASE_AUDIT.md` — missing
- `UI_UX_AUDIT.md` — missing
- `SECURITY_AUDIT.md` — missing
- `BACKEND_AUDIT.md` — missing

Present and current: `PROJECT_OVERVIEW.md`, `ARCHITECTURE.md`, `PROJECT_MEMORY.md`, `PROJECT_EXPLORER.html`.

**Consequence:** every finding in this plan was re-derived by reading source directly (~4.6k LOC across `server/`, `vite-project/`, `smart_contract/`, plus configs, manifests, env, and gitignore). Findings are grounded in code, not in the missing audits. If those audits are later recovered, reconcile them against Phase 1 rather than assuming agreement.

One documentation drift worth recording now: `PROJECT_MEMORY.md` states that contract secrets come from `smart_contract/.env`, but `smart_contract/hardhat.config.js` actually loads `path.resolve(__dirname, "../.env")` — the **root** `.env`. The config is the truth.

---

## Verified Baseline

Facts established by direct inspection. Everything in this plan is grounded here.

| Area | Reality on disk today |
|---|---|
| **Env** | Root `.env` contains only `PORT`, `NODE_ENV`, `API_TIMEOUT`, `CORS_ORIGIN`, `RATE_LIMIT_*`, `SLOW_DOWN_*`. **No** `VITE_CONTRACT_ADDRESS`, `VITE_COINGECKO_API_KEY`, `MONGO_URI`, or `ALCHEMY_URL`. → **Chain and DB features are OFF in the working baseline.** Only market pages actually run. |
| **Tests** | `smart_contract/test/Transactions.js` exists (127 lines) but uses **ethers v5** API (`ethers.utils.parseEther`, `contract.deployed()`), and `smart_contract/package.json` `test` = `echo "Error: no test specified" && exit 1`. → **stranded, never runs.** Server and frontend have zero tests. No `.github/`, no CI. |
| **Manifests** | `smart_contract/package.json` `dependencies` is polluted with hundreds of transitive packages (`ansi-styles`, `argparse`, `asn1`, `aes-js`, `abstract-leveldown`, `agent-base`, `ajv`…). Corrupted manifest. |
| **Unused deps** | `framer-motion` in `vite-project` — **zero imports**. `express-slow-down` in `server` — installed, never used. `gsap` is used in exactly two files (`Home.jsx`, `TopCoins.jsx`). |
| **ethers split** | frontend + server on **v6**; `smart_contract` hardhat tooling on **v5** (`@nomiclabs/hardhat-waffle`, deprecated). |
| **ABI copies** | **Three.** Hardhat artifact → `vite-project/src/utils/Transactions.json` → hand-written minimal ABI inside `server/src/services/blockchainService.js`. |
| **Design tokens** | Split three ways: `.premium-*` classes in `index.css`, raw hex literals inline in every component, near-empty `tailwind.config.js` (one `pulse` keyframe). No source of truth. |
| **Port** | `server/index.js` defaults `PORT=5000`; the vite proxy targets `3000`. `.env` must pin `PORT=3000`. |

---

# Phase 0 — Safety Preparation

**Objective:** Establish a safety net before making any changes. Create revertable checkpoints, document baseline behavior so "preserve existing functionality" becomes a testable claim rather than an aspiration, stand up test infrastructure, and freeze the interfaces later phases must not break.

## Tasks (in order)

### 0.1 Current Baseline Documentation

1. **Document current behavior**
   - Record all API endpoint responses (success + error cases) for **both** `dbState.connected === true` and `false`.
   - Capture the current transaction flow end to end: wallet → contract → event → indexer → DB → REST.
   - Screenshot all UI states (loading, error, empty, success) per route.
   - Document watchlist sync behavior (localStorage-always, one-way local→DB at connect).
   - Record current environment variable requirements and which features each gates.

2. **Establish test baselines**
   - Manual test checklist for critical flows, executable by hand before and after every phase.
   - API endpoint smoke tests (Postman/Bruno collection or `.http` file) so responses can be diffed later.
   - Contract interaction scenarios: single transfer, batch transfer, allowance approve, fee change.

3. **Dependency audit**
   ```bash
   npm audit --prefix server && npm audit --prefix vite-project && npm audit --prefix smart_contract
   ```
   - Document all vulnerable packages.
   - Note which are fixable without breaking changes.

**Files to document:**
- All `.env.example` files with current required vs optional vars
- Current package.json versions (root, server, vite-project, smart_contract)
- Current contract address + network (Sepolia)
- Current MongoDB schema state

**Deliverables:**
- `docs/BASELINE.md` — current behavior documentation
- `docs/MANUAL_TEST_CHECKLIST.md` — step-by-step test scenarios
- `docs/DEPENDENCY_AUDIT.md` — vulnerability report

---

### 0.2 Backup & Checkpoint Strategy

1. **Git workflow**
   - Create `production-prep` branch from current `main`.
   - Tag current state: `git tag v0.1.0-baseline`
   - Establish branch protection rules for `main`.

2. **Database backup**
   - Export current MongoDB collections (if prod data exists):
     ```bash
     mongodump --uri="$MONGO_URI" --out=backup/$(date +%Y%m%d)
     ```
   - Back up `server/data/*.json` files (`watchlist.json`, `transactions.json`).

3. **Contract safety**
   - Document current deployed contract address and network.
   - Export current contract state: `owner()`, `feePercentage()`, transaction count.
   - Note: the contract is immutable — any change requires a **new deployment** plus updating `VITE_CONTRACT_ADDRESS`, `CONTRACT_ADDRESS`, and all three ABI copies.

**Deliverables:** `docs/CONTRACT_STATE.md`, `backup/` directory.

---

### 0.3 Testing Setup

1. **Frontend** — add Vitest + `@testing-library/react` + `jsdom` to `vite-project`. One smoke test proving the harness runs.
2. **Server** — add Vitest (or Jest) + Supertest to `server`. One smoke test hitting `/health`.
3. **Contract** — repair the stranded suite:
   - Migrate `smart_contract/test/Transactions.js` from ethers v5 to v6 (`ethers.parseEther`, `await contract.waitForDeployment()`, `await contract.getAddress()`).
   - Replace the `exit 1` stub with `"test": "hardhat test"`.
   - Decide the tooling path: either migrate off the deprecated `@nomiclabs/hardhat-waffle` to `@nomicfoundation/hardhat-toolbox` (recommended — aligns the whole repo on ethers v6), or explicitly pin `smart_contract` to v5 and document the split as intentional.
4. **CI** — add `.github/workflows/ci.yml` running lint + all three suites on push and PR. It may start almost empty; the point is that the pipeline exists before Phase 1 starts adding tests to it.

---

### 0.4 Freeze List

Write down the interfaces that must **not** change during Phases 1–4, so behavior preservation is checkable:

- REST response shapes for all `/api/market`, `/api/transactions`, `/api/watchlist` routes.
- `dbState` semantics: it is **mutated, never reassigned**. Reassigning breaks fallback detection everywhere.
- The lowercase-wallet-address convention across Mongo schemas, controllers, localStorage keys, and event normalization.
- Route order: `/api/transactions/count` must stay declared **before** `/:address`.
- `envDir: "../"` in `vite.config.js` — `VITE_*` vars live in the **root** `.env`.
- The deployed contract address and its ABI.

**Deliverable:** `docs/FREEZE_LIST.md`.

## Files Affected

- New: `docs/BASELINE.md`, `docs/MANUAL_TEST_CHECKLIST.md`, `docs/DEPENDENCY_AUDIT.md`, `docs/CONTRACT_STATE.md`, `docs/FREEZE_LIST.md`, `.github/workflows/ci.yml`, `backup/`
- Modified: `smart_contract/package.json` (test script), `smart_contract/test/Transactions.js` (v5→v6), `server/package.json` and `vite-project/package.json` (test deps + scripts)
- Git: tags and branches

## Dependencies

None. Phase 0 is the entry point.

## Expected Result

- A revertable checkpoint exists at every future phase boundary.
- Current behavior is documented precisely enough to diff against.
- Three test harnesses run green (even if nearly empty) and CI executes them.
- The freeze list makes "preserve existing functionality" objectively verifiable.

## Verification Checklist

- [ ] `git tag v0.1.0-baseline` exists
- [ ] `production-prep` branch created; branch protection active on `main`
- [ ] MongoDB backup script tested and working; `server/data/*.json` copied
- [ ] Contract state documented in `docs/CONTRACT_STATE.md` (address, owner, fee, tx count, network)
- [ ] All env vars documented with current values (sanitized)
- [ ] `docs/BASELINE.md` covers every route in both DB-on and DB-off modes
- [ ] `docs/DEPENDENCY_AUDIT.md` lists all vulnerabilities with fixability marked
- [ ] `npm test` succeeds in `smart_contract` (suite actually executes, not `exit 1`)
- [ ] `npm test` succeeds in `server` and `vite-project`
- [ ] CI workflow runs green on a test PR
- [ ] `docs/FREEZE_LIST.md` reviewed and agreed

---

# Phase 1 — Critical Fixes

**Objective:** Eliminate every production blocker — silently wrong data, unauthenticated write access, and fabricated financial figures shown to users. Each item is independently shippable and independently revertable.

## Tasks (in order)

Ordered so data-correctness lands before the auth migration (highest risk), and cosmetic-but-dishonest data is removed early because it is cheap and high-impact.

---

### 1.1 — PriceCache schema does not match what the service writes

**Problem.** `server/src/models/PriceCache.js` defines exactly seven fields: `coinId, name, symbol, price, marketCap, volume24h, updatedAt` (plus a TTL index `{ updatedAt: 1 }, expireAfterSeconds: 300`). `server/src/services/marketService.js` writes a completely different shape: `current_price`, `market_cap`, `market_cap_rank`, `image`, `total_volume`, `high_24h`, `low_24h`, `price_change_percentage_*`, `ath`, `atl`, `last_updated`. Mongoose strict mode **silently discards** every field not in the schema. `getCoins()` then reads back with `sort: { market_cap_rank: 1 }` — a field that does not exist — and, when `cachedCoins.length >= limit`, returns hollow documents.

**Why it matters.** `GET /api/market/coins` returns structurally valid but semantically empty data on every cache hit. No error is thrown, so nothing surfaces the failure. This is currently latent only because the frontend fetches CoinGecko directly and never calls this route — and Phase 5 explicitly proposes wiring the frontend *to* this route, which would ship the bug straight to users.

**Files affected.**
- `server/src/models/PriceCache.js`
- `server/src/services/marketService.js`
- `server/src/controllers/marketController.js` (response shape assertions)

**Implementation approach.** Pick one canonical shape and make both sides agree. Recommended: extend the schema to match the CoinGecko field names the service already writes (fewer moving parts than rewriting the service), keeping the existing TTL index. Add an explicit field whitelist in the service's `bulkWrite` so the mapping is visible rather than implicit. Cached documents expire in 5 minutes, so no data migration is required — but drop the collection once to clear malformed docs. Keep the controller's outward response shape byte-identical to what `docs/BASELINE.md` recorded.

**Verification method.** Unit test: write a full CoinGecko coin object through `marketService`, read it back through `getCoins()`, assert **every** field survives round-trip. Integration test: two consecutive `GET /api/market/coins?limit=10` calls — the second (cache hit) must return the same payload as the first (cache miss). Assert `market_cap_rank` is present and the sort is actually ordered.

---

### 1.2 — Batch transfers collapse into a single database row

**Problem.** `server/src/services/blockchainService.js` dedupes indexed transactions on `{ txHash }` in the live-event path and on `{ sender, timestamp }` in the historical-sync path. A batch transfer emits **N** `TransactionAdded` events that all share **one** transaction hash and **one** `block.timestamp`. Both dedupe keys therefore treat N distinct transfers as the same record, and the upsert collapses them into one document.

**Why it matters.** Every batch transfer permanently loses N−1 transfers from history. Users see incomplete records of money they actually sent. It is unrecoverable after the fact without a full re-index, and it corrupts any downstream accounting.

**Files affected.**
- `server/src/services/blockchainService.js` (`normalizeTx`, both upsert paths)
- `server/src/models/Transaction.js` (index definition)

**Implementation approach.** Add `logIndex` to the normalized record and make the dedupe key `{ txHash, logIndex }` in **both** paths — that pair is globally unique per event on EVM chains. Replace the historical path's `{ sender, timestamp }` heuristic with the same key. Change the model's `txHash` unique+sparse index to a compound unique index on `{ txHash, logIndex }`. Also replace the fragile positional fallbacks in `normalizeTx` (`raw.timestamp ?? raw[6] ?? raw[4] ?? 0`) with named-field access — the positional guesses are how a silent shape change becomes a silent data change. Backfill: after deploying, re-run `syncHistoricalTransactions()` once so previously collapsed batches are recovered from chain.

**Verification method.** Integration test against a local hardhat node: submit a batch transfer to 3 recipients, run the indexer, assert exactly 3 documents exist with distinct `logIndex` values and identical `txHash`. Re-run the indexer on the same block and assert the count stays 3 (idempotency). Repeat via the historical-sync path.

---

### 1.3 — Watchlist API has no authentication (IDOR)

> **Highest-risk item in this phase.** It touches all three layers. It ships behind a feature flag with the legacy path intact until verified.

**Problem.** `GET`, `POST`, and `DELETE /api/watchlist/:walletAddress` all trust the wallet address in the URL. There is no authentication, no session, and no validation that the parameter is even a well-formed Ethereum address. Separately, `connectWallet()` in `TransactionContext.jsx` signs the static string `"Connect to Crypto Portfolio"` and stores the signature in `localStorage` — where it is never sent anywhere and never verified.

**Why it matters.** Anyone can read, overwrite, or delete any wallet's watchlist by guessing or observing an address — and addresses are public by definition. The signature that looks like authentication is decorative: static text means no nonce, no replay protection, and no proof of freshness. This is the single largest security gap in the project.

**Files affected.**
- `server/src/controllers/watchlistController.js`
- `server/src/routes/watchlist.js`
- New: `server/src/middleware/auth.js`, `server/src/routes/auth.js`, `server/src/controllers/authController.js`
- `server/src/models/User.js` (exists, currently unused — this is what it was placed for)
- `vite-project/src/context/TransactionContext.jsx` (`connectWallet`, watchlist REST calls)

**Implementation approach.** SIWE (Sign-In With Ethereum), staged:

1. **Server, additive only.** Add `GET /api/auth/nonce` (issues a single-use nonce bound to an address, short TTL) and `POST /api/auth/verify` (recovers the signer from the SIWE message, checks the nonce, issues a session token). Add `requireAuth` middleware that resolves the caller's address from the session. Nothing existing changes yet.
2. **Server, dual-mode.** Apply `requireAuth` to the watchlist routes behind a config flag (`AUTH_REQUIRED`). When off, behavior is byte-identical to today. When on, `:walletAddress` must match the authenticated address. Add address-format validation (`ethers.isAddress`) on **both** paths regardless of the flag — malformed input should never have been accepted.
3. **Frontend.** Replace the static-message sign with the SIWE nonce flow. Store the session token; attach it to watchlist requests. Keep the existing localStorage-first behavior so the app still works fully offline and unauthenticated for local watchlists.
4. **Flip the flag** only after the frontend is verified end to end. Remove the flag in a follow-up commit.

**Verification method.** Security test: authenticate as address A, then attempt `GET`/`POST`/`DELETE` against address B — all three must return 403. Request with no session — 401. Replay a consumed nonce — rejected. Submit a malformed address (`0xzzz`, empty, SQL-ish string) — 400 on every route. Regression: with `AUTH_REQUIRED=false`, the Phase 0 API smoke collection must produce responses identical to the recorded baseline.

---

### 1.4 — Two divergent copies of the allowance helpers

**Problem.** `checkAllowance` and `approveAllowance` exist in two places with **incompatible unit contracts**. The `TransactionContext.jsx` copy takes a human amount and calls `ethers.parseUnits(amount, 18)` internally. The `utils/constant.js` copy passes its argument straight to `contract.approve()` with no parsing. `AllowanceManager.jsx` imports the `constant.js` pair and pre-parses with `ethers.parseEther(amount)`.

**Why it matters.** The two functions have the same name, the same signature, and opposite expectations. Changing which one is imported — a one-line edit that looks harmless in review — produces a **1e18× error** in an on-chain approval. That is an effectively unbounded token approval granted by accident. It is the most dangerous line of code in the repository.

**Files affected.**
- `vite-project/src/utils/constant.js`
- `vite-project/src/context/TransactionContext.jsx`
- `vite-project/src/components/AllowanceManager.jsx`

**Implementation approach.** Keep exactly one implementation, in `utils/constant.js`, and make the unit contract impossible to misread: rename the parameter to `amountWei`, accept only `bigint`, and throw on `number`/`string` input rather than coercing. Delete the `TransactionContext` copy; if any caller remains mid-migration, re-export from `constant.js` so the import path keeps working. Update `AllowanceManager.jsx` to keep doing its own `parseEther` (it already produces wei — that side is correct). Add a JSDoc block stating the unit explicitly at the definition site.

**Verification method.** Unit test asserting `approveAllowance` throws on a non-`bigint` argument. Unit test asserting a 1.5-token approval results in exactly `1500000000000000000` reaching `contract.approve`. Grep the tree to confirm exactly one definition of each function name remains. Manual: approve 1 MTK via the UI, read the allowance back on-chain, confirm it reads 1 and not 1e18.

---

### 1.5 — Fabricated financial figures displayed as real

**Problem.** `vite-project/src/components/TokenTransfer.jsx` renders a USD conversion computed as `(parseFloat(formData.amount) * 0.5).toFixed(2)` — a hardcoded exchange rate of 0.5 — and a gas estimate hardcoded as the string `~45,000 Gwei (approx. $0.12)`. Separately, `TopCoins.jsx` `generateSparklinePath()` draws each coin's "trend" line from `Math.sin()` seeded by a hash of the coin's id, nudged up or down by the sign of the 24h change. The same component also derives rank positionally (`coins.findIndex(c => c.id === coin.id) + 1`) instead of using the real `market_cap_rank`.

**Why it matters.** These are invented numbers presented in the same visual register as real market data, on a screen where users decide how much money to send. The sparkline is worse than decoration: it looks like price history and encodes none. This is a trust and (in a financial product) potential compliance problem, and it is independent of every technical concern in this plan.

**Files affected.**
- `vite-project/src/components/TokenTransfer.jsx`
- `vite-project/src/components/TopCoins.jsx`

**Implementation approach.** For the USD figure: either fetch a real MTK price and show it, or remove the line. Do not show a placeholder rate. For gas: replace the static string with a real `provider.estimateGas()` + `getFeeData()` quote, rendered with an explicit "estimate" label, and hide the row entirely when the estimate is unavailable rather than falling back to a made-up number. For sparklines: request real `sparkline_in_7d` data from CoinGecko (the markets endpoint supports `sparkline=true`) and render that; if unavailable, render nothing. Delete `generateSparklinePath` — do not leave it as a fallback. Use `coin.market_cap_rank` for rank.

**Verification method.** Grep for numeric literals in JSX inside both files; every remaining number must trace to live data or be a static label. Visual: with the network offline, the gas row and sparkline are absent, not fabricated. Unit test asserting `TokenTransfer` renders no USD figure when no price is available. Assert the displayed rank equals `market_cap_rank` for a coin list that is deliberately out of order.

---

### 1.6 — Server security middleware hardening

**Problem.** Four issues in `server/src/app.js`: (a) `cors({ origin: process.env.CORS_ORIGIN || '*' })` defaults to wildcard; (b) the error handler returns `err.message` to the client in production — only `stack` is gated behind `isDev`; (c) the global rate limiter (100 requests / 15 min) covers `/health`, so monitoring can lock the app out of itself; (d) there is no `app.set('trust proxy')`, so behind any reverse proxy every client shares one IP bucket. There is also a dead no-op middleware, `app.use('/api', (req, res, next) => next())`.

**Why it matters.** Wildcard CORS lets any origin call the API with the user's context. Leaked `err.message` exposes internal paths, driver errors, and query fragments to attackers. The shared rate-limit bucket means one noisy client denies service to everyone the moment the app sits behind a load balancer — and the unmetered-by-design `/health` path being *inside* the limiter means an uptime monitor can trigger exactly that.

**Files affected.**
- `server/src/app.js`
- `.env` / `.env.production` (documented allowlist)

**Implementation approach.** Replace the wildcard with an explicit comma-separated allowlist parsed from `CORS_ORIGIN`, failing closed in production and permitting `localhost` only when `NODE_ENV !== 'production'`. In the error handler, return a generic message plus a correlation id in production, logging the real error server-side; keep full detail in development. Mount `/health` before the limiter, or skip it via the limiter's `skip` option. Set `app.set('trust proxy', 1)` and confirm `express-rate-limit` reads the correct client IP. Delete the no-op middleware.

**Verification method.** `curl` with `Origin: https://evil.example` → no `Access-Control-Allow-Origin` in the response. Force a 500 with `NODE_ENV=production` → response body contains no internal detail, and the server log contains the full error under the same correlation id. Hammer `/health` 200 times → all 200s. Send `X-Forwarded-For` from two distinct addresses → separate rate-limit buckets.

---

### 1.7 — `checkTokenBalance` returns ETH, not MTK

**Problem.** `checkTokenBalance(address)` in `TransactionContext.jsx` calls `provider.getBalance(address)` — the native ETH balance — and formats it with `formatEther`. The function's name and its call sites imply a token balance. There is no MTK balance shown anywhere in the application.

**Why it matters.** The app is built around a custom ERC-20 and never displays how much of that token the user holds. Worse, the misnamed function invites a future caller to treat an ETH figure as an MTK figure. Users cannot tell whether a transfer will succeed before they attempt it.

**Files affected.**
- `vite-project/src/context/TransactionContext.jsx`
- `vite-project/src/components/Homepage/Home.jsx` (call site and label)

**Implementation approach.** Split into two clearly named functions: keep `getEthBalance()` for the native balance (the Home "Ether Balance" card is correct today and must keep working), and add `getTokenBalance()` calling `contract.balanceOf(address)` formatted with the token's `decimals()`. Surface the MTK balance on Home alongside the ETH card. Do not rename in place — add the new function, move the call site, then remove the old name once nothing references it.

**Verification method.** Unit test with a mocked contract asserting `getTokenBalance` calls `balanceOf` and not `getBalance`. Manual: on an account holding MTK but ~0 ETH, the two cards show different values and the MTK card is non-zero.

---

### 1.8 — Dual wallet state and missing `accountsChanged` listener

**Problem.** Wallet connection has two sources of truth. `checkIfWalletIsConnect()` sets `currentAccount` but leaves `isConnectedToSite` false; only `connectWallet()` and the localStorage restore path set both. Separately, there is no `window.ethereum.on('accountsChanged')` listener anywhere in the app — `chainChanged` is handled, but only inside `Home.jsx`.

**Why it matters.** The two flags drift, so the UI can hold an account while believing it is disconnected — which is exactly the state that hides the entire navigation (see 4.3). And when a user switches accounts in MetaMask, the app keeps operating on the previous address: it will display the old balance and, critically, sign transactions from an account the user is no longer looking at.

**Files affected.**
- `vite-project/src/context/TransactionContext.jsx`
- `vite-project/src/components/Homepage/Home.jsx` (move the `chainChanged` listener up)

**Implementation approach.** Derive `isConnectedToSite` from `currentAccount` rather than storing it separately (`const isConnectedToSite = Boolean(currentAccount)`), keeping the same exported name so no consumer changes. Register `accountsChanged` and `chainChanged` listeners once in the provider, with cleanup on unmount; on `accountsChanged`, update `currentAccount`, re-run `checkAdminStatus`, re-run the watchlist sync, and clear any account-scoped cached state. Treat an empty accounts array as a disconnect.

**Verification method.** Manual: connect, then switch accounts in MetaMask — the header address, admin gating, and watchlist all update without a page reload. Switch to a disconnected state — the app returns to the connect prompt. Unit test asserting the listeners are registered on mount and removed on unmount. Grep confirms `isConnectedToSite` has no independent setter.

## Files Affected (Phase 1 summary)

**Server:** `src/app.js`, `src/models/PriceCache.js`, `src/models/Transaction.js`, `src/services/marketService.js`, `src/services/blockchainService.js`, `src/controllers/watchlistController.js`, `src/controllers/marketController.js`, `src/routes/watchlist.js`, `src/models/User.js`; new `src/middleware/auth.js`, `src/routes/auth.js`, `src/controllers/authController.js`

**Frontend:** `src/context/TransactionContext.jsx`, `src/utils/constant.js`, `src/components/AllowanceManager.jsx`, `src/components/TokenTransfer.jsx`, `src/components/TopCoins.jsx`, `src/components/Homepage/Home.jsx`

**Config:** `.env`, `.env.production`

## Dependencies

- Phase 0 complete — the test harnesses and recorded baseline are what make "no behavior change" verifiable.
- 1.3 depends on 0.3 (needs a working server test harness for the IDOR regression tests).
- No item in Phase 1 depends on any other item in Phase 1; they can be parallelized and shipped independently.

## Expected Result

- `/api/market/coins` returns complete, correctly sorted data on both cache miss and cache hit.
- Batch transfers are indexed as N distinct records and re-indexing is idempotent.
- Watchlist writes require proof of address ownership; cross-address access returns 403.
- Exactly one allowance helper exists, with a unit contract that fails loudly on misuse.
- No fabricated number appears anywhere in the UI.
- CORS is an allowlist, errors are redacted in production, `/health` is unmetered, and rate limiting works behind a proxy.
- MTK balance is visible; ETH and MTK are unambiguously distinct in code and UI.
- Wallet state has one source of truth and responds to account switching.

## Verification Checklist

- [ ] PriceCache round-trip test passes; cache-hit and cache-miss responses are identical
- [ ] Batch of 3 transfers indexes as exactly 3 rows; re-index is idempotent
- [ ] Historical-sync path produces the same rows as the live-event path
- [ ] Cross-address watchlist access returns 403; unauthenticated returns 401
- [ ] Nonce replay is rejected; malformed addresses return 400 on all watchlist routes
- [ ] With `AUTH_REQUIRED=false`, all baseline API responses are unchanged
- [ ] Exactly one `approveAllowance` / `checkAllowance` definition in the tree
- [ ] `approveAllowance` throws on non-`bigint` input
- [ ] No hardcoded rate, gas figure, or synthetic sparkline remains in the UI
- [ ] Displayed coin rank equals `market_cap_rank`
- [ ] Disallowed `Origin` receives no CORS header; production 500 leaks no internals
- [ ] `/health` survives 200 rapid requests; `X-Forwarded-For` produces distinct buckets
- [ ] MTK balance renders and differs from ETH balance on a test account
- [ ] Account switch in MetaMask updates the app with no reload
- [ ] Full Phase 0 manual checklist re-run: no regressions

---

# Phase 2 — Code Architecture Improvement

**Objective:** Reduce coupling and eliminate duplication so Phases 3–5 are cheap to execute — without changing a single observable behavior. Every move is a strangler migration: add the new module, move one caller at a time, keep the old export as a re-export until the last caller is gone, then delete.

## Current → Proposed Structure

### Frontend

```
CURRENT                                      PROPOSED
vite-project/src/                            vite-project/src/
├── index.js            ← dead (CRA-era)     ├── main.jsx
├── main.jsx                                 ├── App.jsx
├── serviceWorker.js    ← dead, unregistered ├── api/
├── App.jsx                                  │   ├── coingecko.js      (was api.js)
├── api.js                                   │   └── client.js         (shared axios + /api base)
├── context/                                 ├── context/
│   └── TransactionContext.jsx  ★ 540 LOC    │   ├── WalletContext.jsx      (account, chain, listeners)
│       wallet + contract + admin            │   ├── ContractContext.jsx    (transfer, batch, allowance, admin)
│       + watchlist REST + localStorage      │   └── WatchlistContext.jsx   (local + remote sync)
├── components/         ← flat, 10 files     ├── hooks/
│   ├── index.js        ← dead barrel        │   ├── useWallet.js
│   ├── Homepage/                            │   ├── useContract.js
│   │   ├── Home.jsx                         │   └── useWatchlist.js
│   │   └── Navbar.jsx                       ├── services/
│   ├── TopCoins.jsx                         │   ├── contractService.js  (single ABI + address source)
│   ├── CoinDetails.jsx                      │   └── walletService.js    (provider/signer plumbing)
│   ├── Watchlist.jsx                        ├── features/
│   ├── TokenTransfer.jsx                    │   ├── market/    (TopCoins, CoinDetails, Watchlist)
│   ├── AllowanceManager.jsx                 │   ├── transfer/  (TokenTransfer, AllowanceManager)
│   ├── AdminPanel.jsx                       │   ├── admin/     (AdminPanel)
│   └── ErrorBoundary.jsx                    │   └── home/      (Home, Navbar)
└── utils/                                   ├── components/
    ├── constant.js  ← address + ABI +       │   ├── ui/        (Button, Card, Input, Skeleton,
    │                   verify + dup helpers │   │                EmptyState, Toast — Phase 4)
    └── Transactions.json  ← ABI copy #2     │   └── ErrorBoundary.jsx
                                             └── config/
                                                 ├── contract.js         (address + verifyContract)
                                                 └── Transactions.json   (ABI copy — still #2 of 3)
```

### Server

```
CURRENT                                      PROPOSED
server/                                      server/
├── index.js                                 ├── index.js
├── data/*.json                              ├── data/*.json
└── src/                                     └── src/
    ├── app.js                                   ├── app.js
    ├── config/db.js  ← dbState singleton        ├── config/db.js
    ├── routes/                                  ├── routes/
    ├── controllers/  ← EVERY handler            ├── controllers/   (thin: parse → repo → respond)
    │   hand-rolls the dbState branch            ├── repositories/  ← NEW: the dbState branch
    │   + its own readFileSync/writeFileSync     │   ├── watchlistRepo.js    lives here, ONCE
    ├── services/                                │   └── transactionRepo.js
    └── models/                                  ├── lib/
                                                 │   └── jsonStore.js  ← NEW: atomic write-temp-
                                                 │                        then-rename, replaces the
                                                 │                        duplicated fs calls
                                                 ├── services/
                                                 └── models/
```

## Tasks (in order)

1. **Delete provably dead code.** `vite-project/src/index.js` (duplicate CRA entrypoint alongside `main.jsx`), `vite-project/src/serviceWorker.js` (references `/static/js/bundle.js`, never registered), `components/index.js` (barrel bypassed by `App.jsx`), and the unused helpers `fetchContractABI` / `logContractMethods` / `logContractDetails`. Grep for each name first; delete only on zero references.
2. **Prune unused dependencies.** Remove `framer-motion` from `vite-project` (zero imports) and `express-slow-down` from `server` (installed, never used). Verify build and boot after each removal.
3. **Rebuild `smart_contract/package.json`.** Its `dependencies` block is polluted with hundreds of transitive packages. Regenerate it from actual imports: hardhat, the toolbox/waffle plugin, chai, ethers, dotenv. Delete `node_modules` and the lockfile, reinstall, confirm `hardhat compile` and `hardhat test` still pass.
4. **Trim unused context surface.** `TransactionContext` exports `spender`, `amount`, `handleApprove`, `loading`, `errorMessage`, `successMessage` that no consumer reads, and `formData` carries unused `gasLimit` / `gasPrice`. Grep-verify zero consumers, then remove.
5. **Extract the server repository layer.** Create `repositories/watchlistRepo.js` and `repositories/transactionRepo.js`. Move the `dbState.connected ? mongo : json` branch into them so it is written **once**. Migrate one controller at a time; each migration must produce byte-identical responses against the Phase 0 baseline before the next begins.
6. **Add `lib/jsonStore.js`.** Atomic file persistence (write to a temp file, then `rename`) with an in-process write queue, replacing the duplicated non-atomic `readFileSync` / `writeFileSync` pairs. Repositories are its only callers.
7. **Extract `services/contractService.js` on the frontend.** One place that owns address + ABI + provider/signer construction. Point `TransactionContext` at it before splitting the context.
8. **Split `TransactionContext` into three providers.** In order: `WalletContext` first (smallest, and Phase 1.8 already consolidated its state), then `WatchlistContext`, then `ContractContext` last (largest). After each split, `TransactionContext` remains as a thin composition that re-exports the same value shape — so **no consumer changes at all** during this step. Migrate consumers to the specific contexts afterward, one file per commit.
9. **Consolidate the triplicated watchlist localStorage logic.** `CoinDetails.jsx` inlines its own third copy of the read/modify/write pattern (`watchlist_${account.toLowerCase()}` / `watchlist_anonymous`) rather than using the context. Move it into `WatchlistContext` / `useWatchlist` and have all three call sites use the hook.
10. **Reorganize components into `features/`.** Pure file moves plus import updates. No content edits in the same commit as a move — that keeps `git log --follow` readable and makes review trivial.

## Files Affected

Deletions: `vite-project/src/index.js`, `vite-project/src/serviceWorker.js`, `vite-project/src/components/index.js`
New: `server/src/repositories/*`, `server/src/lib/jsonStore.js`, `vite-project/src/services/*`, `vite-project/src/hooks/*`, `vite-project/src/context/{Wallet,Contract,Watchlist}Context.jsx`, `vite-project/src/features/*`
Modified: `vite-project/src/context/TransactionContext.jsx`, `vite-project/src/utils/constant.js`, `vite-project/src/components/CoinDetails.jsx`, all `server/src/controllers/*`, all component import paths, three `package.json` files

## Dependencies

- **Phase 1 must be complete.** In particular 1.4 (single allowance helper) and 1.8 (single wallet-state source) — splitting a context that still has duplicated helpers and drifting flags would bake the bugs into three files instead of one.
- Phase 0's baseline recordings are the diff target for every step.

## Expected Result

- No dead files, no unused dependencies, no duplicated fallback logic.
- The `dbState` branch exists in exactly one layer instead of once per controller.
- JSON fallback writes are atomic and cannot lose concurrent updates.
- `TransactionContext` is three focused providers instead of one 540-line god object.
- Watchlist persistence logic exists once, not three times.
- Components are grouped by feature, with a shared primitives folder ready for Phase 4.
- **Zero observable behavior change.** Every API response and every screen is identical.

## Verification Checklist

- [ ] `npm run build` succeeds in `vite-project`; bundle size unchanged or smaller
- [ ] `npm run lint` clean across all packages
- [ ] All Phase 0 + Phase 1 tests still pass
- [ ] API smoke collection diffs clean against the recorded baseline, in both DB-on and DB-off modes
- [ ] `hardhat compile` and `hardhat test` pass after the manifest rebuild
- [ ] Grep confirms zero references to every deleted file and symbol
- [ ] Concurrent-write test on `jsonStore` (100 parallel writes) loses no records
- [ ] `dbState.connected` is read in exactly one layer — grep proves it
- [ ] Watchlist localStorage keys are written from exactly one module
- [ ] Manual test checklist re-run: no regressions

---

# Phase 3 — Backend Stabilization

**Objective:** Make the API predictable under failure. Validation at every boundary, one error path, structured logs, an event indexer that survives disconnects, and a health endpoint that reports the truth.

## Tasks (in order)

1. **Input validation at every route boundary.** Add Zod (or celebrate) schemas for params, query, and body on all `/api/market`, `/api/transactions`, `/api/watchlist`, and `/api/auth` routes. Ethereum addresses validated with `ethers.isAddress`; pagination bounded with explicit maximums. Reject with 400 and a field-level error shape — never let malformed input reach a controller.
2. **One error path.** Introduce an `AppError` class and an `asyncHandler` wrapper so controllers stop try/catching individually. Map known failure classes (validation, not-found, unauthorized, upstream-unavailable) to stable status codes. The Phase 1.6 redaction rule applies here — the client sees a generic message plus a correlation id in production.
3. **Structured logging.** Replace `console.log` with pino. Attach a request id to every log line and return it in error responses. Log at boundaries: request in/out, DB state transitions, RPC connect/disconnect, indexer progress. Never log signatures or session tokens.
4. **Single `dbState` read point.** The Phase 2 repository layer becomes the only place `dbState.connected` is consulted. Add a lint rule or CI grep to keep it that way. Log every transition between Mongo mode and JSON mode at `warn` — silent degradation is how an outage stays invisible.
5. **Per-route rate limits.** Replace the single global limiter with per-route policies: strict on `/api/auth/*` (brute-force surface), moderate on writes, generous on reads, none on `/health`. Keep `trust proxy` from 1.6.
6. **Response compression and payload limits.** Add `compression`. Keep the existing 10kb JSON body limit and document why it is that size.
7. **Indexer resilience.** In `blockchainService.js`: add reconnect with exponential backoff and jitter on RPC disconnect; persist a block cursor so a restart resumes from the last indexed block instead of re-scanning from genesis; add a periodic reconciliation sweep for gaps. Make the lazy `_init()` failure path explicit rather than silently non-fatal — the server may keep serving, but the health endpoint must report degraded. Complete the `normalizeTx` cleanup started in 1.2 by removing every remaining positional fallback.
8. **Honest health endpoint.** `/health` reports DB connectivity, RPC connectivity, last indexed block, and lag versus chain head — not a bare 200. Add `/health/ready` versus `/health/live` for orchestrators.
9. **Graceful shutdown.** On `SIGTERM`: stop accepting connections, drain in-flight requests, close the RPC listener, close the Mongo connection, then exit. Currently the process dies mid-request.

## Files Affected

`server/src/app.js`, `server/index.js`, all `server/src/controllers/*`, all `server/src/routes/*`, `server/src/services/blockchainService.js`, `server/src/services/marketService.js`, `server/src/config/db.js`, `server/src/repositories/*`; new `server/src/middleware/{validate,errorHandler,requestId}.js`, `server/src/lib/logger.js`, `server/src/routes/health.js`

## Dependencies

- Phase 2's repository layer must exist (tasks 4 and 7 build directly on it).
- Phase 1.6 (trust proxy, error redaction) is the foundation tasks 2 and 5 extend.

## Expected Result

- Malformed input never reaches business logic; every rejection is a structured 400.
- Every error takes one path, with consistent status codes and a correlation id.
- Logs are queryable and carry request context.
- The indexer survives RPC disconnects and resumes from its cursor after restart.
- Health reflects actual dependency state, so degradation is visible to monitoring.
- Shutdown drains cleanly.

## Verification Checklist

- [ ] Every route rejects malformed params/query/body with a structured 400
- [ ] Fuzz pass over all endpoints produces no unhandled 500s
- [ ] Every error response carries a correlation id that appears in the server log
- [ ] `console.log` count in `server/src` is zero
- [ ] `dbState.connected` read sites: exactly one layer (CI grep enforces)
- [ ] Kill the RPC connection mid-run → indexer reconnects with backoff; no data loss
- [ ] Restart the server → indexer resumes from the persisted cursor, does not re-scan
- [ ] Stop Mongo → app keeps serving via JSON, `/health` reports degraded, transition is logged
- [ ] `/health` reports DB, RPC, last block, and lag accurately in all four combinations
- [ ] `SIGTERM` during an in-flight request → request completes, then clean exit
- [ ] Per-route limits verified: `/api/auth` strict, `/health` unmetered
- [ ] Full API smoke suite passes in both DB-on and DB-off modes

---

# Phase 4 — Frontend Premium Upgrade

**Objective:** One design system with a single source of truth, honest loading/error/empty states, navigation that works without a wallet, and an accessible interface — migrated component by component, never in one sweep.

## Tasks (in order)

1. **Establish a token source of truth.** Design values currently live in three places: `.premium-*` classes in `index.css`, raw hex literals inline in every component (`#0b0f19`, `#060912`, `#FF385C`, `#2563EB`, `#71717a`, `#10B981`, `#EF4444`, `#F43F5E`, `#050811`), and a near-empty `tailwind.config.js`. Promote the palette, spacing, radii, and motion into `tailwind.config.js` `theme.extend` as **named** tokens (`coral`, `cobalt`, `surface`, `surface-raised`, `muted`, `positive`, `negative`). Leave the `.premium-*` classes working throughout — they are removed only after the last consumer migrates.
2. **Build `components/ui/` primitives.** `Button`, `Card`, `Input`, `Select`, `Skeleton`, `EmptyState`, `Toast`, `Badge` — each consuming the named tokens. Adopt them one component at a time; a component is "migrated" when it contains zero hex literals.
3. **Make navigation wallet-independent.** `Navbar.jsx` renders all nav links inside `{isConnectedToSite && …}`, which makes the market pages — explicitly designed to work with no wallet, no server, and no DB — unreachable until MetaMask connects. The same gate applies to the mobile menu. Render navigation unconditionally; gate only the genuinely wallet-dependent routes (`/transfer`, `/allowance`, `/admin`), and show those entries disabled with a "connect wallet" affordance rather than hiding them. Also fix `key={index}` → `key={item.path}`.
4. **Non-blocking initial load.** `App.jsx` blocks the entire application on the initial `fetchCoins(100)`. Render the shell immediately and stream in market data with skeletons. A CoinGecko outage should degrade one panel, not the app.
5. **Honest loading / error / empty states.** Start with `Watchlist.jsx`, where `const coin = coins.find(...); if (!coin) return null;` silently deletes any watched coin outside the top-100 fetch — the user sees their entry vanish with no explanation. Fetch missing coins by id, or render a clearly labeled partial-data row. Then add rollback to the optimistic add/remove, which currently leaves the UI lying when the API call fails. Apply the same three-state treatment (`loading` / `error` / `empty`) to every data-driven view.
6. **Restyle off-system surfaces.** `ErrorBoundary.jsx` uses `bg-gray-800`, `border-red-500`, `text-red-400`, `rounded-2xl` — none of which are Coral & Cobalt. `App.jsx`'s catch-all route renders a bare `<div>Page not found</div>`. Bring both onto the design system, and give the boundary a working retry.
7. **Accessibility pass.** Visible focus rings on every interactive element; `aria-label` on icon-only buttons; full keyboard navigation including the mobile menu; a contrast audit on the muted palette (`#71717a` on `#050811` is the one to check first — it is used for body copy); correct heading hierarchy; form-error association on `TokenTransfer` and `AllowanceManager`.
8. **Motion discipline.** Honor `prefers-reduced-motion` across the GSAP timelines in `Home.jsx` / `TopCoins.jsx` and the `animate-*` utilities. `TopCoins` currently re-runs a `.coin-row` stagger on every keystroke in the search field — debounce or drop it. Standardize durations and easing as tokens instead of per-component literals.
9. **Small correctness fixes.** `CoinDetails.jsx` uses `JSON.stringify(range)` as a `<select>` value and re-parses it on change — replace with a stable `days` key. Audit remaining `key={index}` usage. Move `CoinDetails`' hardcoded chart colors (`borderColor: "#2563EB"`, ticks `#71717a`) onto the tokens.
10. **Responsive audit.** Verify every route at 375 / 768 / 1280 / 1920. The `TopCoins` table hides Market Cap below `md` — confirm that is intentional and that nothing else silently truncates.

## Files Affected

`vite-project/tailwind.config.js`, `vite-project/src/index.css`, `vite-project/src/App.css`, `vite-project/src/App.jsx`; new `vite-project/src/components/ui/*`; `features/home/Navbar.jsx`, `features/home/Home.jsx`, `features/market/{TopCoins,CoinDetails,Watchlist}.jsx`, `features/transfer/{TokenTransfer,AllowanceManager}.jsx`, `features/admin/AdminPanel.jsx`, `components/ErrorBoundary.jsx`

## Dependencies

- Phase 2's `features/` + `components/ui/` structure.
- Phase 1.5 (fabricated figures removed) — do not restyle a component that is still displaying invented numbers.
- Phase 1.8 (single wallet-state source) — task 3 depends on `isConnectedToSite` being trustworthy.

## Expected Result

- One token source; zero hex literals in components.
- Market browsing works with no wallet connected, as designed.
- The app shell renders instantly; data streams in.
- No view silently drops data or lies about optimistic success.
- Error and 404 surfaces match the product.
- Keyboard and screen-reader usable; motion respects user preference.

## Verification Checklist

- [ ] Grep: zero hex color literals in `features/` and `components/`
- [ ] All nav links reachable with MetaMask absent; wallet routes clearly gated, not hidden
- [ ] Mobile menu reachable without a wallet
- [ ] App shell paints before market data resolves; CoinGecko blocked → one panel degrades, app works
- [ ] Watchlist a coin outside the top 100 → it renders (or explains itself); it never silently disappears
- [ ] Force a watchlist API failure → optimistic UI rolls back and surfaces an error
- [ ] Every data view has distinct loading, error, and empty states
- [ ] `ErrorBoundary` and 404 match the design system; boundary retry works
- [ ] Full keyboard traversal of every route including the mobile menu
- [ ] axe (or Lighthouse a11y) reports no critical violations; contrast passes AA on body text
- [ ] `prefers-reduced-motion: reduce` disables GSAP timelines and decorative animation
- [ ] All four breakpoints verified per route with no truncation or overflow
- [ ] Visual diff against Phase 0 screenshots: intentional changes only

---

# Phase 5 — Feature Enhancement

**Objective:** Close the gap between what the app claims to be — a portfolio tracker and token dApp — and what it currently does. Strictly prioritized; nothing here starts until Phases 1–4 are green.

## Tasks (in order)

Grouped by priority tier. Work the tiers in order — every Must have ships before any Should have starts.

### Must have

Gaps that make the product incomplete as described.

1. **MTK balance and portfolio valuation.** Building on Phase 1.7, show the user's token holdings and a total portfolio value. Today the app never displays how much MTK the user owns — on a portfolio product built around a custom token.
2. **Transaction history from the API, paginated.** The UI currently reads history from the contract's unbounded `getAllTransactions()`, which returns the entire global array and will eventually revert on gas. The server already indexes transactions and serves `GET /api/transactions/:address` with pagination — wire the UI to it, with the chain read as an explicit fallback. This also closes the documented divergence between the two read paths.
3. **Transaction lifecycle notifications.** Toasts for submitted / pending / confirmed / failed, using the Phase 4 `Toast` primitive. Users currently get no feedback between signing and completion.
4. **Route market data through the server.** Point `api.js` at `GET /api/market/coins` instead of calling CoinGecko directly from the browser. This removes `VITE_COINGECKO_API_KEY` from the shipped bundle and moves rate-limit exposure from per-user to per-server, where the existing `PriceCache` shields it. **Blocked on Phase 1.1** — routing traffic to that endpoint before the schema is fixed would ship hollow data to every user.
5. **Watchlist entries beyond the top 100.** Fetch watched coins by id rather than filtering a top-100 list, completing the Phase 4.5 fix at the data layer.

### Should have

Clear value, not required for a correct v1.

- Transaction status tracking with block-confirmation counts.
- CSV export of transaction history.
- Search, filter, and sort across history (by date, counterparty, amount, category, tag) — the contract already stores `category` and `tags`, and nothing surfaces them.
- Price alerts on watchlist entries.
- Multi-network support (mainnet in addition to Sepolia), with the active network surfaced in the UI.
- ENS name resolution for addresses in transfer and history views.
- Address book / saved recipients.

### Future

Larger bets requiring redeployment, new infrastructure, or a new surface.

- **Contract v2:** `indexed` parameters on `TransactionAdded` (currently zero, so the server cannot filter at the RPC layer and must scan everything); a length cap on `addToBlockchainBatch` (currently unbounded — a gas bomb); a paginated replacement for `getAllTransactions()`; `Pausable` for incident response; an event on `setFeePercentage` so fee changes are auditable off-chain; and an upgrade path (proxy) so v3 does not require another address migration. Redeployment means a new address plus all three ABI copies plus both env vars — plan it once and do all of it together.
- Replace the bespoke event listener with The Graph or a managed indexer.
- Portfolio profit/loss with cost-basis tracking.
- Multi-wallet support (WalletConnect, Coinbase Wallet) beyond `window.ethereum`.
- Mobile application.

## Files Affected

`vite-project/src/api/coingecko.js`, `features/home/Home.jsx`, `features/market/Watchlist.jsx`, `features/transfer/TokenTransfer.jsx`, `context/ContractContext.jsx`, `components/ui/Toast.jsx`; `server/src/controllers/{market,transactions}Controller.js`, `server/src/repositories/transactionRepo.js`; `smart_contract/contracts/Transactions.sol` (Future only)

## Dependencies

- Phases 1–4 complete.
- Must-have #4 is hard-blocked on Phase 1.1.
- Must-have #2 depends on Phase 1.2 (otherwise the paginated history it surfaces is missing batch rows).
- Everything under Future depends on a contract redeployment plan and a fresh security review.

## Expected Result

- The app displays token holdings and portfolio value.
- History is paginated, server-backed, and complete — including batch transfers.
- Every transaction gives continuous feedback.
- No API key ships in the browser bundle.
- Watchlists hold any coin, not just the top 100.

## Verification Checklist

- [ ] MTK balance and portfolio value render correctly for a funded test account
- [ ] History paginates from the API; batch transfers appear as N distinct rows
- [ ] Chain fallback engages when the API is unreachable, and says so
- [ ] Toasts fire for submitted / pending / confirmed / failed
- [ ] Grep the production bundle: no CoinGecko API key present
- [ ] Market data flows through `/api/market/coins` and is correct on cache hit
- [ ] A coin ranked outside the top 100 can be watched and renders fully
- [ ] All Phase 1–4 tests still pass

---

# Phase 6 — Testing & Production Readiness

**Objective:** Prove correctness, prove security, prove performance, and prove the deployment can be rolled back. Nothing ships to production until the gate at the end of this phase is fully green.

## Tasks (in order)

### 6.1 Unit testing

- **Frontend (Vitest + Testing Library):** each context provider in isolation; each hook; the `ui/` primitives; the unit-contract guard on `approveAllowance` (throws on non-`bigint`); wallet state derivation and listener cleanup.
- **Server (Vitest/Jest + Supertest):** every controller against **both** repository modes — Mongo path and JSON path — since the fallback is a first-class code path and has never been tested; validation schemas; `jsonStore` atomicity under concurrent writes; the error handler's production redaction.
- **Contract (hardhat + chai, on ethers v6):** fee math at basis points including rounding at the boundaries; the 1000 (10%) cap on `setFeePercentage`; `onlyOwner` enforcement; single and batch transfer paths; event emission shape. The existing 127-line suite is the starting point once Phase 0.3 has migrated it off v5.
- Target: ≥70% line coverage on `server/src` and `vite-project/src/context`, 100% on contract logic.

### 6.2 Integration testing

- Full happy path against a local hardhat node: connect → SIWE auth → transfer → event emitted → indexed → served by API → rendered in UI.
- Batch transfer end to end: N rows in, N rows out.
- **Degradation matrix** — the project's defining architectural claim, currently untested:

  | Mongo | RPC | CoinGecko | Expected |
  |---|---|---|---|
  | up | up | up | full functionality |
  | down | up | up | JSON fallback, `/health` degraded, watchlist + history still work |
  | up | down | up | market + watchlist work, indexer reconnects, no data loss |
  | up | up | down | cached/mock data, market panel degrades alone |
  | down | down | down | app boots and serves; every degradation logged and reported |

- Restart-resume: kill the server mid-index, restart, confirm the cursor resumes and no duplicates appear.

### 6.3 Security testing

- `npm audit` clean (or every remaining finding documented with justification) across all three packages.
- IDOR regression suite proving the Phase 1.3 guards hold on all three watchlist routes.
- SIWE hardening: nonce single-use, expiry enforced, signature bound to the correct address and domain, replay rejected.
- Header and CORS verification: helmet defaults present, allowlist enforced, no wildcard in production.
- Error-redaction test under `NODE_ENV=production`.
- Static analysis on the contract (Slither, and Mythril if the timebox allows) — even though the contract is unchanged until Phase 5's Future work, the deployed version needs a documented review.
- Secret scan across git history; confirm `.env.production` still contains only non-secret config and that `.env.deployment.whole` remains gitignored.

### 6.4 Performance testing

- Lighthouse budget on the built SPA; record before/after against Phase 0.
- Bundle-size budget enforced in CI, respecting the existing manual Rollup chunks (ethers / charts / gsap / vendor). Regressions fail the build.
- k6 (or autocannon) load test on the API: sustained read load, burst write load; verify the per-route limits from Phase 3 behave under it.
- Gas snapshots for single and batch transfers, recorded as a baseline for any future contract change.
- Indexer throughput: confirm it keeps pace with chain head under a burst of transactions.

### 6.5 Deployment verification

- Environment matrix documenting every variable per environment (dev / staging / production), which feature it gates, and what happens when it is absent. **Critical:** the current baseline has no `VITE_CONTRACT_ADDRESS`, `MONGO_URI`, or `ALCHEMY_URL` — production must not inherit that silence. Add a boot-time check that logs loudly which features are disabled.
- Netlify build verification against `netlify.toml`; confirm `envDir: "../"` resolves correctly in CI.
- Confirm `PORT=3000` is pinned (code defaults to 5000; the vite proxy expects 3000).
- Staging deploy plus a full manual checklist run.
- Documented rollback procedure, rehearsed at least once.
- Monitoring and alerting: uptime on `/health/ready`, error-rate alerting keyed on correlation ids, indexer-lag alert.
- Operational runbook: how to restart the indexer, how to re-run historical sync, how to respond to a Mongo outage, how to rotate keys.

## Files Affected

New: `server/src/**/*.test.js`, `vite-project/src/**/*.test.jsx`, `tests/integration/*`, `tests/load/*`, `.github/workflows/ci.yml` (extended), `docs/RUNBOOK.md`, `docs/DEPLOYMENT.md`, `docs/ENV_MATRIX.md`, `docs/ROLLBACK.md`
Modified: `smart_contract/test/Transactions.js`, all three `package.json` test scripts

## Dependencies

- Phases 1–5 complete.
- Phase 0.3's harnesses and CI pipeline (this phase fills them, it does not create them).

## Expected Result

- Both DB modes, all degradation paths, and the full transaction lifecycle are covered by automated tests.
- Security guarantees are regression-protected, not just implemented once.
- Performance has budgets that fail CI when breached.
- Deployment is documented, monitored, and rehearsably reversible.

## Verification Checklist

- [ ] Coverage: ≥70% on `server/src` and `vite-project/src/context`; 100% on contract logic
- [ ] Contract suite passes on ethers v6 including fee math, 10% cap, `onlyOwner`, batch
- [ ] Every controller tested in **both** Mongo and JSON modes
- [ ] Full lifecycle integration test passes against a local node
- [ ] All five degradation-matrix rows verified
- [ ] Restart-resume produces no duplicates and no gaps
- [ ] `npm audit` clean or every finding justified in writing
- [ ] IDOR regression suite green; nonce replay rejected; production errors redacted
- [ ] Slither run recorded with findings triaged
- [ ] Secret scan over git history: clean
- [ ] Lighthouse and bundle budgets enforced in CI and passing
- [ ] Load test passes at target RPS with per-route limits behaving
- [ ] Gas snapshots recorded as baseline
- [ ] `docs/ENV_MATRIX.md` complete; boot-time check logs disabled features loudly
- [ ] Staging deploy green; full manual checklist passes on staging
- [ ] Rollback rehearsed successfully
- [ ] Monitoring and alerting live and verified with a synthetic failure
- [ ] `docs/RUNBOOK.md` reviewed

## Production Ship Gate

Every box above green. Plus:

- [ ] All Phase 1 critical fixes deployed and verified in staging
- [ ] No P0 or P1 finding open
- [ ] Rollback procedure rehearsed within the last 7 days
- [ ] On-call owner identified and runbook handed over

---

# Risk Register

Ordered highest to lowest.

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| 1 | **SIWE auth migration (1.3)** touches server, frontend, and session storage simultaneously; a mistake locks users out of their own watchlists | High | Ship behind an `AUTH_REQUIRED` flag; the legacy path stays byte-identical until the frontend is verified end to end; flag removed only after a clean staging run |
| 2 | **Contract redeployment** (Phase 5 Future) means a new address plus three ABI copies plus two env vars, with no migration path for on-chain history | High | Treat as a separate project with its own plan; do every ABI/env update in one atomic change; keep the old contract readable for historical data |
| 3 | **Context split (Phase 2.8)** risks subtle re-render and stale-closure regressions across every screen | Medium | Split one provider per commit; `TransactionContext` stays as a composition re-exporting the identical value shape, so consumers change zero lines during the split |
| 4 | **PriceCache schema change (1.1)** alters a live collection | Medium | Documents TTL out in 5 minutes; drop the collection once rather than migrating; the frontend does not consume this route until Phase 5 |
| 5 | **Batch dedupe key change (1.2)** requires an index change and a re-index | Medium | Compound index added before the code change; re-index is idempotent by construction and verified by test |
| 6 | **`smart_contract` manifest rebuild (2.3)** could break the hardhat toolchain | Low | Rebuild on a branch; gate on `hardhat compile` + `hardhat test` passing before merge |
| 7 | **Design token migration (4.1)** could cause visual drift | Low | `.premium-*` classes stay working throughout; visual diff against Phase 0 screenshots per component |

---

# Execution Order

| Phase | Gated on | Parallelizable within phase | Est. |
|---|---|---|---|
| **0** Safety Preparation | — | 0.1 / 0.2 / 0.3 fully parallel | 1 week |
| **1** Critical Fixes | Phase 0 | All eight items independent; 1.3 is the longest pole | 2–3 weeks |
| **2** Architecture | Phase 1 (esp. 1.4, 1.8) | Server repo layer ∥ frontend context split | 2 weeks |
| **3** Backend Stabilization | Phase 2 repo layer | Validation ∥ logging ∥ indexer resilience | 1–2 weeks |
| **4** Frontend Upgrade | Phase 2 structure, 1.5, 1.8 | Tokens first, then components in parallel | 2 weeks |
| **5** Feature Enhancement | Phases 1–4 (must-have #4 blocked on 1.1) | Must-haves parallel once their blockers clear | 2–3 weeks |
| **6** Testing & Readiness | Phases 1–5 | Unit ∥ security ∥ performance; deployment last | 1–2 weeks |

**Critical path:** 0 → 1.3 → 2 → 3 → 5.4 → 6. Everything else has slack against it.

---

*End of plan. No code was modified in producing this document.*
