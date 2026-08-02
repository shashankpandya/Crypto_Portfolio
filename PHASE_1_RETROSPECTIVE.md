# PHASE_1_RETROSPECTIVE.md — Crypto Portfolio

> Written at Phase 1 gate (before tagging `v0.3.0-phase1`). Authoritative record of what changed, why, and what future developers must not break.

---

## Phase 1 Summary

**Scope:** Critical bug fixes. Zero behavioral regression tolerance.
**Duration:** 16 tasks across both server (`server/`) and frontend (`vite-project/`).
**Final test state:** 68 server · 18 vite · 8 contract tests passing. Build passes.
**Branch:** `feature/blockchain-market-services`

---

## Problems Fixed

### Data Integrity (Server)

| Task | Problem | Fix |
|------|---------|-----|
| P1-01 | PriceCache schema wrote `symbol` but marketService read `ticker` — 0 cache hits | Aligned field names |
| P1-02 | `/api/market/coins` sorted by non-existent `marketCap` field — wrong order | Fixed sort to `market_cap_rank` |
| P1-03 | Market response missing `id` field, returned raw Mongo `_id`/`__v` | Format helper strips internal fields, adds `id` |
| P1-04 | No unique index on `txHash+logIndex` — duplicate rows on restart | Added compound unique index, dedup migration |
| P1-05 | `normalizeTx` accessed positional struct fields (`tx[0]`, `tx[1]`) — broke when Solidity struct order changed | Switched to named field access |
| P1-06 | Batch transfers collapsed into one DB row (only first receiver stored) | Reindex script reconstructs individual rows from on-chain events; P1-04 dedup makes it idempotent |

### Address Casing (Server)

| Task | Problem | Fix |
|------|---------|-----|
| P1-07 | Wallet addresses stored/queried in mixed case — duplicate/missed records | All controllers normalize to `address.toLowerCase()` before any DB operation |

> **Do not break:** every schema field, localStorage key, and DB query must remain lowercase.

### Authentication (Server + Frontend)

| Task | Problem | Fix |
|------|---------|-----|
| P1-08 | Wallet login was "click a button, trust the client" — no cryptographic proof of ownership | SIWE (EIP-4361) nonce -> sign -> verify flow; JWT issued on valid signature |
| P1-09 | All API routes open to unauthenticated access | `requireAuth` middleware behind `AUTH_REQUIRED` env flag (default `false` — non-breaking) |
| P1-10 | Frontend had no SIWE flow — "connect" was just a MetaMask account request | nonce fetch -> sign -> verify -> JWT in `sessionStorage`; auto-injected for watchlist calls |

### Frontend Data Quality

| Task | Problem | Fix |
|------|---------|-----|
| P1-11 | `checkAllowance`/`approveAllowance` duplicated in `constant.js` and `TransactionContext.jsx` | Single canonical implementation in `constant.js`; context re-exports |
| P1-12 | Hardcoded `gasLimit: 500000`, `gasPrice: "20"` in every tx call | `getTxOptions()` helper: dynamic `estimateGas` + 10% buffer, provider fee data, user overrides |
| P1-13 | `TokenTransfer.jsx` showed `1 ETH = $2100` (static 2023 rate) and fake gas estimate | Replaced with real provider data (`feeData.gasPrice`, actual `estimateGas`); hidden when unavailable |
| P1-14 | `TopCoins.jsx` rendered `Math.sin(hash)` curves labeled as "7-day price trend" | Deleted `generateSparklinePath()`; renders real `sparkline_in_7d.price`; nothing shown when data absent |
| P1-15 | `checkTokenBalance()` returned native ETH balance, never the MTK (ERC-20) balance. MTK never displayed | Split into `getEthBalance()` (ETH) and `getTokenBalance()` (MTK via `contract.balanceOf()`); MTK card added to Home |

### Security (Server)

| Task | Problem | Fix |
|------|---------|-----|
| P1-15 (sec) | CORS `origin: '*'` — any origin could make credentialed requests | Allowlist from `CORS_ORIGIN` env var; localhost only when `NODE_ENV !== production` |
| P1-15 (sec) | 500 errors leaked full stack traces to clients | Generic message + `correlationId` in production; full stack logged server-side only |
| P1-15 (sec) | `app.set('trust proxy')` missing — rate limiter bucketed by proxy IP | `app.set('trust proxy', 1)` added |
| P1-15 (sec) | `/health` inside rate-limit middleware — uptime monitors could exhaust bucket | Moved `/health` before `app.use(limiter)` |

### Wallet State (Frontend)

| Task | Problem | Fix |
|------|---------|-----|
| P1-16 | `isConnectedToSite` had independent setter scattered across component tree | Constrained to 4 permitted call sites: `connectWallet`, `disconnectWallet`, `restoreSession`, `handleAccountsChanged` |
| P1-16 | `chainChanged` listener registered in `Home.jsx` — leaked on unmount, no cleanup | Moved to `TransactionContext` with proper `removeListener` cleanup |
| P1-16 | Empty `accountsChanged` array (MetaMask lock) not treated as disconnect | Full disconnect on `accounts.length === 0` |

---

## Architecture Changes

### Server

- **PriceCache contract:** `id`, `name`, `symbol`, `current_price`, `market_cap_rank`, `price_change_percentage_24h`, `sparkline_in_7d`, `image`, `market_cap`. Do not rename these — frontend depends on them.
- **Transaction deduplication:** compound unique index `{txHash, logIndex}` is the dedup key. Reindex script uses it idempotently.
- **SIWE auth chain:** `User` model stores `address` (lowercase) + `nonce` (cleared after use) + `nonceExpiresAt` + `lastActive`. JWT payload: `{ address, iat, exp }`. 24h expiry.
- **`requireAuth` middleware:** only active when `AUTH_REQUIRED=true`. Reads `Authorization: Bearer <JWT>`, verifies, compares `req.params.address` against token.
- **CORS:** `CORS_ORIGIN` env var required for production. Comma-separated origins.
- **Express trust proxy:** set to `1` — assumes exactly one reverse proxy.

### Frontend

- **Balance reads split:** `getEthBalance(address)` -> ETH; `getTokenBalance(address)` -> MTK. `checkTokenBalance` is deleted.
- **Gas handling:** `getTxOptions(contract, methodName, args, customOptions)` is the single path for all tx options.
- **Allowance:** canonical in `utils/constant.js`. Do not duplicate.
- **Sparklines:** real `sparkline_in_7d.price` array from CoinGecko (`sparkline=true` param). `generateSparklinePath` is deleted.
- **Wallet listeners:** `accountsChanged` and `chainChanged` registered once in `TransactionContext` with cleanup.

---

## Security Notes

1. **JWT in `sessionStorage`** — cleared on tab close. Not `localStorage` — deliberate XSS mitigation.
2. **Nonce single-use** — cleared from `User` model after verification. Do not cache or reuse.
3. **Auth is opt-in** — `AUTH_REQUIRED=false` default preserves existing deployments.
4. **CORS in production** — without `CORS_ORIGIN` set, ALL cross-origin requests blocked.
5. **Error redaction** — `correlationId` in production response, full stack in server log only.

---

## Database Changes

| Change | Why |
|--------|-----|
| `PriceCache.ticker` -> `symbol` | Field mismatch caused 0 cache hits |
| Transaction `{txHash, logIndex}` unique index | Prevents duplicates on reindex |
| `User` model added | SIWE nonce management (new `users` collection) |
| Address normalization in all controllers | Mixed-case caused missed queries |

### Migration Notes

- **P1-04:** Dedup migration ran at index creation time using `txHash+logIndex`.
- **P1-06:** Reindex script (`server/scripts/reindex.js`) fetches `TransactionAdded` events from Alchemy. Run with `--dry-run` first. **Requires Alchemy RPC network access.**
- **P1-07:** Forward-looking normalization. Existing mixed-case records remain; run one-time lowercase migration if historical data access needed.

---

## Remaining Risks

| Risk | Severity | Mitigation |
|------|----------|-----------|
| `CORS_ORIGIN` not set in production | HIGH | Blocks all frontend requests. Set before deploy. |
| `AUTH_REQUIRED=false` default | MEDIUM | Watchlist endpoints unauthenticated. Flip when ready. |
| ABI duplicated in 3 places | MEDIUM | Contract change requires updating all 3 locations |
| `getAllTransactions()` unbounded | MEDIUM | Will OOM on mainnet. Needs pagination. |
| `vi.mock("ethers")` inside test function | LOW | Vitest warns about hoisting. Move to top level. |
| React Router v6 future flags | LOW | Two deprecation warnings. Fix before v7 upgrade. |
| Chunk size > 500kB | LOW | Phase 2 cleanup will reduce this. |

---

## Things Future Developers and AI Sessions Must NOT Break

1. **`checkTokenBalance` is deleted.** Do not restore it. Use `getEthBalance()` for ETH and `getTokenBalance()` for MTK.

2. **All wallet addresses must be lowercase everywhere** — schema fields, localStorage keys (`watchlist_0x...`, `auth_address`), DB queries, controllers. Mixed-case address = missed DB records.

3. **`transactionsAddress` and ABI must be synchronized** across 3 locations on every contract change:
   - `smart_contract/` artifact (auto-generated)
   - `vite-project/src/utils/Transactions.json` (copy manually)
   - `server/src/services/blockchainService.js` hand-written ABI (update manually)

4. **`getTxOptions()` is the only path for gas.** Do not hardcode `gasLimit` or `gasPrice`.

5. **`isConnectedToSite` has exactly 4 permitted setters.** Any new setter outside `connectWallet`, `disconnectWallet`, `restoreSession`, `handleAccountsChanged` is a bug.

6. **`accountsChanged` and `chainChanged` are registered in `TransactionContext` only.** Do not register in components — they will leak and double-fire.

7. **`sparkline_in_7d` requires `sparkline=true` in the CoinGecko market request.** Remove that param and all sparklines go blank. This is correct behavior.

8. **`CORS_ORIGIN` must be comma-separated full origins** (e.g. `https://app.example.com`). Wildcards not supported.

9. **`dbState` singleton** — never reassign the object, only mutate `.connected`. Health endpoint and DB guard read this reference.

10. **Route order:** `/count` must appear before `/:address` in `server/src/routes/transactions.js`.

11. **Port 3000, not 5000.** Set `PORT=3000` in `server/.env` — Vite proxy expects 3000.

12. **`sessionStorage` for JWT, not `localStorage`.** Deliberate security decision.

---

## Phase 2 Preview

Phase 2 targets **zero observable behavior change**:
- Delete dead frontend files: `index.js`, `serviceWorker.js`, `components/index.js` (P2-01)
- Remove unused deps: `framer-motion` (P2-02), `express-slow-down` (P2-03)
- Relocate inline config and remaining constants (P2-04+)

None should change API behavior, wallet flows, or test outcomes.

---

*Generated at Phase 1 gate — all 16 tasks complete, all tests passing.*
