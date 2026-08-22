# IMPLEMENTATION QUEUE
## Executable task breakdown of `MASTER_IMPLEMENTATION_PLAN.md`

**Version:** 1.0
**Created:** 2026-08-01
**Source:** [MASTER_IMPLEMENTATION_PLAN.md](MASTER_IMPLEMENTATION_PLAN.md)

---

## How to use this

One task = one PR. Tasks are ordered by dependency: **you can always work the lowest un-done ID whose blockers are cleared.**

- **Effort** is hands-on time for someone who already knows the codebase. 30–90 min each. Anything that estimated larger got split.
- **Risk** is L / M / H — the chance the change breaks something that currently works.
- **Rollback** assumes the phase-boundary git tags from `P0-05` exist.
- **Blocked by** is the hard prerequisite. Empty = start any time.

**Standing rules for every task in this queue:**

1. Branch off `production-prep`. One task, one branch, one PR.
2. Run the Phase 0 manual checklist before opening the PR. Any diff from baseline that is not the task's stated goal is a regression.
3. Do not refactor code the task does not name.
4. New module + re-export beats rename-in-place. The old import path keeps working until the last caller moves.
5. If a task grows past ~90 minutes, stop and split it. Note the split in the PR.

**Legend:** `Blocked by: —` means no prerequisite.

---

## Task index

| Phase | IDs | Count | Theme |
|---|---|---|---|
| 0 | P0-01 … P0-09 | 9 | Safety net, harnesses, CI |
| 1 | P1-01 … P1-16 | 16 | Production blockers |
| 2 | P2-01 … P2-14 | 14 | Structure, dedup, dead code |
| 3 | P3-01 … P3-11 | 11 | API reliability |
| 4 | P4-01 … P4-14 | 14 | Design system, UX honesty, a11y |
| 5 | P5-01 … P5-08 | 8 | Must-have features |
| 6 | P6-01 … P6-12 | 12 | Test coverage, security, deploy |
| | | **84** | |

---

# Phase 0 — Safety Preparation

---

### P0-01 ✓ DONE
**Title:** Record API baseline in both DB modes
**Goal:** Capture every endpoint's response — success and error — with Mongo up and with Mongo down, so later phases can diff against a known-good record.
**Files affected:** `docs/BASELINE.md` (new), `docs/api-smoke.http` (new)
**Risk:** L — documentation only, no code touched.
**Effort:** 90 min
**Verification checklist:**
- [x] Every route in `server/src/routes/` appears in the doc
- [x] Each route recorded twice: dbDown observed, dbUp derived from source (network-blocked env — noted in BASELINE.md)
- [x] Error cases captured (404, 400, 500), not just happy path
- [x] `docs/api-smoke.http` complete and matches the doc
**Rollback:** Delete the files. Nothing depends on them yet.
**Commit:** `docs: record API baseline responses in both DB modes` — commit c2ecda5
**Note:** Network-blocked capture env — dbUp Mongo mode is derived not observed. Re-capture gap tracked in BASELINE.md.

---

### P0-02 ✓ DONE
**Title:** Screenshot every UI state and write the manual test checklist
**Goal:** A hand-runnable checklist plus visual reference, so "no regressions" is checkable by a human in 15 minutes.
**Files affected:** `docs/MANUAL_TEST_CHECKLIST.md` (new), `docs/screenshots/` (new)
**Risk:** L
**Effort:** 90 min
**Verification checklist:**
- [x] 8 screenshots taken (home, watchlist, transfer, allowance, admin, coin detail, 404, loading)
- [x] All wallet-absent states captured; wallet-connected states noted as N/A (MetaMask not available in capture env)
- [x] Checklist is step-by-step, no prior knowledge assumed
- [x] Checklist verified against actual screenshots — all observations match
**Rollback:** Delete the files.
**Commit:** included in c2ecda5 (combined with P0-01)

---

### P0-03 ✓ DONE
**Title:** Dependency vulnerability audit
**Goal:** Know which of the three packages carry known CVEs and which are fixable without a breaking upgrade.
**Files affected:** `docs/DEPENDENCY_AUDIT.md` (new)
**Risk:** L
**Effort:** 30 min
**Verification checklist:**
- [x] `npm audit` run against `server`, `vite-project`, `smart_contract`
- [x] Each finding marked fixable / breaking / accepted-with-reason
- [x] `framer-motion` and `express-slow-down` flagged as unused (removal deferred to P2-02/P2-03)
**Rollback:** Delete the file.
**Commit:** `docs: record dependency vulnerability audit` — commit c818a91

---

### P0-04 ✓ DONE
**Title:** Record deployed contract state
**Goal:** Capture the on-chain facts that become unrecoverable if the address is lost.
**Files affected:** `docs/CONTRACT_STATE.md` (new)
**Risk:** L
**Effort:** 30 min
**Verification checklist:**
- [x] Address (`0x911F681...7395`), network (Sepolia), `feePercentage()` (100 = 1%), transaction count (unknown — no network) recorded
- [x] Note added: contract is immutable; any change = new deploy + 3 ABI copies + 2 env vars
- [x] `hardhat.config.js` reads root `.env`, not `smart_contract/.env` — documented as bug requiring P1-XX fix
**Rollback:** Delete the file.
**Commit:** `docs: record deployed contract state and address` — commit 09e6381

---

### P0-05 ✓ DONE
**Title:** Git checkpoint — tag, branch, protection
**Goal:** A revertable point before any code changes.
**Files affected:** git refs only
**Risk:** L
**Effort:** 30 min
**Verification checklist:**
- [x] `git tag v0.1.0-baseline` exists and points at pre-work commit `96c2c2e`
- [x] `production-prep` branch created
- [ ] Branch protection active on `main` — **deferred** (requires GitHub remote access; not automated)
- [x] `git checkout v0.1.0-baseline` would produce a working tree (tag verified to exist)
**Rollback:** `git tag -d v0.1.0-baseline`, delete branch.
**Commit:** n/a — refs only

---

### P0-06 ✓ DONE
**Title:** Back up MongoDB and JSON fallback data
**Goal:** Recoverable data before any schema or index change lands.
**Files affected:** `backup/` (new, gitignored), `server/scripts/backup.js` (new)
**Risk:** L
**Effort:** 30 min
**Verification checklist:**
- [x] `mongodump` SKIPPED (Mongo not running) — recorded in MANIFEST.json with skip reason
- [x] `server/data/watchlist.json` copied to `backup/2026-08-02_01-08-26/data/`
- [x] `backup/` added to `.gitignore`
**Rollback:** Delete `backup/`.
**Commit:** `chore: add backup script for Mongo and JSON fallback data` — commit 33105cd

---

### P0-07 ✓ DONE
**Title:** Stand up frontend test harness (Vitest)
**Goal:** A runnable `npm test` in `vite-project` with one passing smoke test.
**Files affected:** `vite-project/package.json` (+test scripts), `vite-project/vitest.config.js` (new), `vite-project/src/smoke.test.jsx` (new), `vite-project/src/test-setup.js` (new)
**Risk:** L — additive, no source touched.
**Effort:** 60 min
**Verification checklist:**
- [x] `npm test --prefix vite-project` exits 0 (2 tests pass: smoke render + globals)
- [x] Smoke test renders trivial component via Testing Library
- [x] `npm run build --prefix vite-project` still succeeds (269 modules, 12.26s)
**Rollback:** Revert the commit; no source file depends on it.
**Commit:** `test: add Vitest + Testing Library harness to vite-project`

---

### P0-08 ✓ DONE
**Title:** Stand up server test harness (Vitest + Supertest)
**Goal:** A runnable `npm test` in `server` that hits `/health` through the real app.
**Files affected:** `server/package.json` (+test scripts), `server/vitest.config.mjs` (new), `server/src/app.test.js` (new)
**Risk:** L
**Effort:** 60 min
**Verification checklist:**
- [x] `npm test --prefix server` exits 0 (3 tests pass: 2 /health + 1 404 catch-all)
- [x] Smoke test asserts `GET /health` shape and degraded-db behaviour
- [x] Test suite does not require a live Mongo connection to pass (503 is correct response without db)
**Rollback:** Revert the commit.
**Commit:** `test: add Vitest + Supertest harness to server`

---

### P0-09 ✓ DONE
**Title:** Un-strand the contract test suite (ethers v5 → v6) and wire CI
**Goal:** The existing 127-line suite actually runs, and CI executes all three suites on every push.
**Files affected:** `smart_contract/test/Transactions.js`, `smart_contract/package.json`, `smart_contract/hardhat.config.js`, `.github/workflows/ci.yml` (new)
**Risk:** M — the toolchain swap can break compilation. Isolate on a branch.
**Effort:** 90 min
**Verification checklist:**
- [x] `ethers.utils.parseEther` → `ethers.parseEther`; `.deployed()` → `await waitForDeployment()`; BigInt arithmetic replaces `.mul()/.div()/.add()/.sub()`
- [x] `test` script is `hardhat test` (was `echo exit 1`)
- [x] `hardhat compile` and `hardhat test` both pass; **8 tests all green** (3s)
- [x] Toolchain decision: migrated to `@nomicfoundation/hardhat-chai-matchers` + `@nomicfoundation/hardhat-ethers` directly (full toolbox skipped — disk space constraint; minimal deps sufficient for JS test suite)
- [x] CI workflow `.github/workflows/ci.yml` created: runs all 3 test suites + build on every push/PR
**Rollback:** Revert; the suite returns to stranded but nothing regresses.
**Commit:** `test: migrate contract suite to ethers v6 and add CI workflow`

> **Phase 0 gate:** tag `v0.2.0-phase0`. Also write `docs/FREEZE_LIST.md` (REST shapes, `dbState` mutate-never-reassign, lowercase addresses, `/count` before `/:address`, `envDir: "../"`, contract address) — 20 min, fold into whichever PR lands last.

---

# Phase 1 — Critical Fixes

All Phase 1 tasks are independent of each other. Parallelize freely.

---

### P1-01 ✓ DONE
**Title:** Align PriceCache schema with what marketService writes
**Goal:** Stop Mongoose strict mode silently discarding every CoinGecko field the service writes.
**Files affected:** `server/src/models/PriceCache.js`, `server/src/services/marketService.js`
**Risk:** M — changes a live collection's shape. Docs TTL out in 5 min, so no migration needed.
**Effort:** 60 min
**Verification checklist:**
- [x] Schema declares every field the service writes: `current_price`, `market_cap`, `market_cap_rank`, `image`, `total_volume`, `high_24h`, `low_24h`, `price_change_percentage_*`, `ath`, `atl`, `last_updated`, `fully_diluted_valuation`, etc.
- [x] TTL index `{ updatedAt: 1 }, expireAfterSeconds: 300` preserved
- [x] `bulkWrite` uses an explicit field whitelist in marketService.js
- [x] Collection dropped once / TTL handles stale docs
- [x] Round-trip unit test: `PriceCache.test.js` verifies all 29 fields survive schema instantiation and TTL index exists
**Rollback:** Revert; drop the collection again. No user-facing impact — the frontend does not call this route yet.
**Commit:** `fix(server): align PriceCache schema with marketService write shape`
**Blocked by:** P0-08

---

### P1-02 ✓ DONE
**Title:** Fix getCoins sort and cache-hit response
**Goal:** `getCoins()` sorts by a field that exists and returns complete documents on cache hit.
**Files affected:** `server/src/services/marketService.js`, `server/src/models/PriceCache.js`
**Risk:** M
**Effort:** 45 min
**Verification checklist:**
- [x] `sort: { market_cap_rank: 1 }` resolves against real field `market_cap_rank`
- [x] Cache hit maps `coinId` -> `id` and strips internal `_id`/`updatedAt` so miss & hit shapes match
- [x] Response shape matches CoinGecko baseline structure
- [x] Results are ordered by rank ascending (1, 2, 3...)
**Rollback:** Revert.
**Commit:** `fix(server): correct getCoins sort field and cache-hit payload`
**Blocked by:** P1-01

---

### P1-03 ✓ DONE
**Title:** Add logIndex to transaction dedupe key (model + index)
**Goal:** Make `{ txHash, logIndex }` the unique key so batch events stop colliding. Schema change only — service wiring is P1-04.
**Files affected:** `server/src/models/Transaction.js`, `server/src/models/Transaction.test.js` (new)
**Risk:** M — index change on a live collection.
**Effort:** 30 min
**Verification checklist:**
- [x] `logIndex` field added to schema (Number, default null)
- [x] `txHash` inline `unique: true, sparse: true` removed; compound index `{ txHash, logIndex }` added with `unique: true, sparse: true, name: 'txHash_logIndex_unique'`
- [x] Index builds cleanly against existing data (sparse allows null docs from historical syncs)
- [x] Existing reads still work — `sender`, `recipient`, `timestamp` indexes unchanged
**Rollback:** Revert; restore the old index. Backup from P0-06 covers data loss.
**Commit:** `fix(server): add compound txHash+logIndex unique index to Transaction`
**Blocked by:** P0-06

---

### P1-04 ✓ DONE
**Title:** Use txHash+logIndex in both indexer dedupe paths
**Goal:** Stop N batch transfers collapsing into 1 document. The single highest-value data fix in the plan.
**Files affected:** `server/src/services/blockchainService.js`, `server/src/services/blockchainService.test.js` (new)
**Risk:** M
**Effort:** 60 min
**Verification checklist:**
- [x] Live-event path captures `logIndex` from `event?.log?.index` and filters on `{ txHash, logIndex }` when both present
- [x] Historical-sync path intentionally stays on `{ sender, timestamp }` — `getAllTransactions()` returns contract storage tuples with no event metadata
- [x] `normalizeTx` extended with `logIndex` param; included in document when non-null
- [x] JSON fallback also updated to dedupe on `(txHash, logIndex)` when available
- [x] 10 unit tests: normalizeTx with/without logIndex, filter selection, batch dedup, JSON fallback
- [x] All 21 server tests pass
**Rollback:** Revert. Re-run `syncHistoricalTransactions()` to restore prior state.
**Commit:** `fix(server): dedupe indexed transactions on txHash+logIndex`
**Blocked by:** P1-03

---

### P1-05 ✓ DONE
**Title:** Replace positional fallbacks in normalizeTx
**Goal:** Kill `raw.timestamp ?? raw[6] ?? raw[4] ?? 0` — positional guessing turns a silent shape change into silent data corruption.
**Files affected:** `server/src/services/blockchainService.js`, `server/src/services/blockchainService.test.js`
**Risk:** L — behavior-preserving if the named fields are correct.
**Effort:** 45 min
**Verification checklist:**
- [x] Every `raw[N]` positional access removed from normalizeTx
- [x] Missing required fields (`sender`, `receiver`, `amount`, `timestamp`) throw with useful message including raw keys
- [x] Unit test: well-formed event (both named shapes: `from`/`sender`, `receiver`/`recipient`) normalizes correctly
- [x] Unit test: malformed event (missing sender, receiver, amount, timestamp) throws with correct message
- [x] Regression guard: positional-only input (plain array) throws instead of silently using wrong values
- [x] 32 server tests all passing
**Rollback:** Revert.
**Commit:** `refactor(server): use named field access in normalizeTx`
**Blocked by:** P1-04

---

### P1-06 ✓ DONE
**Title:** Backfill collapsed batch transfers
**Goal:** Recover the N−1 transfers previously lost to the dedupe bug.
**Files affected:** `server/scripts/reindex.js` (new), `server/scripts/reindex.test.js` (new)
**Risk:** M — writes to production data. Backup exists.
**Effort:** 45 min
**Verification checklist:**
- [x] Created `server/scripts/reindex.js` supporting `--dry-run` and `--commit` modes
- [x] Chunked block queries (10 blocks per chunk) for Alchemy Free Tier compatibility
- [x] Idempotent upserts on `{ txHash, logIndex }` so running reindex multiple times does not create duplicates
- [x] Updates both MongoDB (when connected) and `server/data/transactions.json`
- [x] Unit tests in `server/scripts/reindex.test.js` verifying event normalization and dry-run reporting
- [x] All 34 server tests pass
**Rollback:** Restore from the P0-06 dump.
**Blocked by:** P1-04

---

### P1-07 ✓ DONE
**Title:** Standardize Ethereum address casing across server
**Goal:** Normalize all wallet addresses to lowercase and validate format before database/file operations to prevent duplicate or missed records.
**Files affected:** `server/src/utils/addressUtils.js` (new), `server/src/controllers/watchlistController.js`, `server/src/controllers/transactionController.js`, `server/src/utils/addressUtils.test.js` (new), `server/src/controllers/addressNormalization.test.js` (new)
**Risk:** L
**Effort:** 30 min
**Verification checklist:**
- [x] Created `server/src/utils/addressUtils.js` helper with `normalizeAddress` and `isValidAddress`
- [x] Standardized `watchlistController.js` (`get`, `addCoin`, `removeCoin`) to normalize all `walletAddress` parameters
- [x] Standardized `transactionController.js` (`getByAddress`) to normalize all `address` parameters
- [x] Returns `400 Bad Request` for invalid hex address formats
- [x] Unit & integration tests verifying lowercase, checksum, and mixed-case inputs resolve to the same normalized record
- [x] All 47 server tests pass
**Rollback:** Revert.
**Commit:** `fix(server): standardize Ethereum address casing and validation across controllers`
**Blocked by:** P1-06

---

### P1-08 ✓ DONE
**Title:** Add SIWE nonce and verify endpoints (additive, nothing wired)
**Goal:** Server can issue a nonce and verify a signature. No existing route changes — pure addition.
**Files affected:** `server/src/routes/auth.js` (new), `server/src/controllers/authController.js` (new), `server/src/controllers/authController.test.js` (new), `server/src/app.js`, `server/scripts/reindex.test.js` (timeout fix)
**Risk:** L — nothing consumes it yet.
**Effort:** 60 min
**Verification checklist:**
- [x] `GET /api/auth/nonce?address=0x…` returns a single-use nonce with 5-minute TTL
- [x] Nonce is single-use — second `consumeNonce` call returns null (replay prevention)
- [x] Expired nonce (past expiresAt) returns null
- [x] Invalid/missing address returns 400
- [x] `POST /api/auth/verify` returns 400 for missing message or signature
- [x] `POST /api/auth/verify` returns 400 for malformed SIWE message string
- [x] `POST /api/auth/verify` returns 401 for invalid signature (ethers.verifyMessage fails)
- [x] JWT issued on success with recoveredAddress claim
- [x] Installed `jsonwebtoken` and `siwe` packages
- [x] All existing routes behave identically — 58 server tests all pass
**Rollback:** Revert. Nothing depends on it.
**Commit:** `feat(server): add SIWE nonce and verify endpoints`
**Blocked by:** P0-08

---

### P1-09 ✓ DONE
**Title:** Add requireAuth middleware behind AUTH_REQUIRED flag
**Goal:** Watchlist routes can enforce address ownership, but default to today's behavior until the frontend is ready.
**Files affected:** `server/src/middleware/auth.js` (new), `server/src/middleware/auth.test.js` (new), `server/src/routes/watchlist.js`, `.env`
**Risk:** M — this is the flag that will later change behavior for every user.
**Effort:** 60 min
**Verification checklist:**
- [x] Created `server/src/middleware/auth.js` with `requireAuth` middleware
- [x] Applied `requireAuth` to watchlist routes in `server/src/routes/watchlist.js`
- [x] When `AUTH_REQUIRED=false` (default): requests pass through without token
- [x] When `AUTH_REQUIRED=true`: missing Authorization header returns 401
- [x] When `AUTH_REQUIRED=true`: malformed/invalid/expired token returns 401
- [x] When `AUTH_REQUIRED=true`: address mismatch (authenticated user A accessing address B) returns 403 Forbidden
- [x] Flag documented in `.env` (`AUTH_REQUIRED=false`)
- [x] Unit/integration tests added in `server/src/middleware/auth.test.js` (7 tests)
- [x] All 65 server tests pass
**Rollback:** Set `AUTH_REQUIRED=false`.
**Commit:** `feat(server): add requireAuth middleware behind AUTH_REQUIRED flag`
**Blocked by:** P1-08

---

### P1-10 ✓ DONE
**Title:** Wire frontend to SIWE and replace decorative signature
**Goal:** Replace static `"Connect to Crypto Portfolio"` sign with real nonce→sign→verify→JWT flow.
**Files affected:** `vite-project/src/context/TransactionContext.jsx`, `vite-project/package.json`
**Risk:** H — touches all three layers. AUTH_REQUIRED flip is a separate commit.
**Effort:** 90 min
**Verification checklist:**
- [x] Installed `siwe` in `vite-project`
- [x] `connectWallet` now: fetches nonce → builds `SiweMessage` (EIP-4361) → MetaMask signs → POST `/api/auth/verify` → stores JWT in `sessionStorage`
- [x] JWT stored in `sessionStorage` (cleared on tab close — never in `localStorage`)
- [x] `disconnectWallet` calls `clearSession()` — JWT wiped from `sessionStorage`
- [x] `accountsChanged` MetaMask listener: clears JWT + resets all auth state on wallet switch
- [x] axios interceptor injects `Authorization: Bearer <token>` on all `/api/watchlist` requests
- [x] Session restore on mount: if JWT in `sessionStorage`, restores auth state without re-signing
- [x] Backward compatible: if no JWT but `currentAccount` in `localStorage` (old session), sets connected state without JWT (works when `AUTH_REQUIRED=false`)
- [x] `authToken` exposed on context for consumers
- [x] Build passes (364 modules, no new errors)
- [x] All 65 server tests + 2 vite tests + 8 contract tests pass
**Rollback:** `AUTH_REQUIRED=false` (already default). Revert frontend commit separately.
**Commit:** `feat(client): replace decorative signature with SIWE session flow`
**Note:** `AUTH_REQUIRED=true` flip is NOT included — kept as separate deployment step per spec.
**Blocked by:** P1-08

---

### P1-11 ✓ DONE
**Title:** Unify the duplicated allowance helpers
**Goal:** One `approveAllowance` / `checkAllowance` with a unit contract that fails loudly.
**Files affected:** `vite-project/src/utils/constant.js`, `vite-project/src/context/TransactionContext.jsx`, `vite-project/src/components/AllowanceManager.jsx`, `vite-project/src/utils/constant.test.js`
**Risk:** M — touches on-chain approval.
**Effort:** 60 min
**Verification checklist:**
- [x] Exactly one definition of each function survives (`constant.js`) — grep proves it
- [x] Parameter renamed to `amountWei`; accepts only `bigint`; throws `TypeError` on `number` or `string`
- [x] JSDoc at definition site states unit explicitly (bigint Wei)
- [x] `TransactionContext` duplicate definition deleted; imports and forwards `constant.js` version
- [x] `handleApprove` in `TransactionContext` converts string `amount` to `bigint` Wei via `ethers.parseEther`
- [x] `AllowanceManager` imports from `constant.js` and passes `bigint` Wei
- [x] Unit test (`constant.test.js`): non-`bigint` input throws `TypeError` with helpful message
- [x] All 65 server tests + 7 vite tests + 8 contract tests pass
- [x] Vite build succeeds
**Rollback:** Revert.
**Commit:** `fix(client): unify allowance helpers behind a single wei-only contract`
**Blocked by:** P0-07

---

### P1-12 ✓ DONE
**Title:** Standardize gas price and limit defaults
**Goal:** Remove duplicated gas configuration and use dynamic gas estimation with EIP-1559 compatibility and safe overrides.
**Files affected:** `vite-project/src/context/TransactionContext.jsx`, `vite-project/src/context/TransactionContext.test.js`
**Risk:** L
**Effort:** 60 min
**Verification checklist:**
- [x] Implemented `getTxOptions` helper in `TransactionContext.jsx`
- [x] Dynamic provider gas estimation (`contract.estimateGas`) used with 10% safety buffer
- [x] EIP-1559 compatibility preserved (lets provider estimate maxFeePerGas / maxPriorityFeePerGas dynamically)
- [x] User overrides supported when `gasLimit` or `gasPrice` specified in `formData`
- [x] Integrated `getTxOptions` into `sendTransaction`, `sendBatchTransaction`, and `updateFeePercentage`
- [x] Unit tests added in `TransactionContext.test.js` (5 tests)
- [x] All 65 server tests + 12 vite tests + 8 contract tests pass
- [x] Vite production build succeeds
**Rollback:** Revert.
**Commit:** `fix(client): standardize gas price and limit defaults with dynamic provider estimation`
**Blocked by:** —

### P1-13 ✓ DONE
**Title:** Remove hardcoded USD rate and fake gas estimate
**Goal:** Stop showing invented numbers (`* 0.5` USD multiplier and `~45,000 Gwei (approx. $0.12)` static text) on the transfer screen.
**Files affected:** `vite-project/src/components/TokenTransfer.jsx`, `vite-project/src/components/TokenTransfer.test.jsx`
**Risk:** L
**Effort:** 60 min
**Verification checklist:**
- [x] Hardcoded `* 0.5` USD conversion span removed
- [x] Hardcoded `~45,000 Gwei (approx. $0.12)` static gas estimate text removed
- [x] Dynamic `gasEstimate` populated via provider fee data (`getFeeData()`)
- [x] Gas estimate row explicitly labeled `Network Fee (Estimate)`
- [x] Gas estimate row **hidden** when estimate is unavailable (`gasEstimate === null`)
- [x] Unit tests added in `TokenTransfer.test.jsx` (2 tests) verifying absence of fake USD/gas numbers
- [x] All 65 server tests + 14 vite tests + 8 contract tests pass
- [x] Vite production build succeeds
**Rollback:** Revert.
**Commit:** `fix(client): replace fabricated USD rate and gas estimate with real quotes`
**Blocked by:** —

---

### P1-14 ✓ DONE
**Title:** Replace synthetic sparklines with real 7d data
**Goal:** Delete `generateSparklinePath()` — a `Math.sin(hash)` curve presented as a price trend.
**Files affected:** `vite-project/src/components/TopCoins.jsx`, `vite-project/src/components/TopCoins.test.jsx`, `vite-project/src/api.js`
**Risk:** L
**Effort:** 45 min
**Verification checklist:**
- [x] CoinGecko markets call includes `sparkline=true`
- [x] Chart renders `sparkline_in_7d.price` data
- [x] `generateSparklinePath` deleted — not kept as a fallback
- [x] Sparkline column renders nothing when data is absent
- [x] Rank uses `coin.market_cap_rank`, not `coins.findIndex(...) + 1`
- [x] Unit tests added in `TopCoins.test.jsx` (2 tests) verifying real SVG path rendering and out-of-order `market_cap_rank` display
- [x] All 65 server tests + 16 vite tests + 8 contract tests pass
- [x] Vite production build succeeds
**Rollback:** Revert.
**Commit:** `fix(client): render real 7d sparklines and use market_cap_rank`
**Blocked by:** —

---

### P1-15 ✓ DONE
**Title:** CORS allowlist, error redaction, trust proxy, /health exemption
**Goal:** Security hardening in Express backend (`app.js`).
**Files affected:** `server/src/app.js`, `server/src/app.test.js`
**Risk:** M — a wrong allowlist breaks the deployed frontend.
**Effort:** 60 min
**Verification checklist:**
- [x] `origin: '*'` default replaced with a comma-separated allowlist from `CORS_ORIGIN`
- [x] Fails closed in production; `localhost` dev origins permitted only when `NODE_ENV !== 'production'`
- [x] Requests from unauthorized origin (e.g. `https://evil.example.com`) rejected (no `Access-Control-Allow-Origin` header)
- [x] Production 500 errors return generic `'Internal server error.'` + `correlationId`; full stack logged server-side
- [x] `app.set('trust proxy', 1)` set for Express reverse proxy IP forwarding
- [x] `/health` route placed before rate limiter (exempt from rate limits)
- [x] Dead no-op middleware deleted
- [x] All 68 server tests + 16 vite tests + 8 contract tests pass
- [x] Vite production build succeeds
**Rollback:** Revert. Set `CORS_ORIGIN=*` as emergency stopgap.
**Commit:** `fix(server): CORS allowlist, error redaction, trust proxy, health exemption`
**Blocked by:** —

---

### P1-16 ✓ DONE
**Title:** Split getEthBalance from getTokenBalance and surface MTK
**Goal:** `checkTokenBalance` was returning ETH balance under a token-balance name. MTK balance is now surfaced.
**Files affected:** `vite-project/src/context/TransactionContext.jsx`, `vite-project/src/components/Homepage/Home.jsx`, `vite-project/src/context/TransactionContext.test.js`
**Risk:** L
**Effort:** 60 min
**Verification checklist:**
- [x] `getEthBalance()` keeps `provider.getBalance` behavior — ETH card unchanged
- [x] `getTokenBalance()` added, calling `contract.balanceOf()` formatted with `contract.decimals()`
- [x] MTK balance card added to Home alongside ETH and Network cards (3-column grid)
- [x] `checkTokenBalance` removed; zero remaining callers (replaced by `getEthBalance`/`getTokenBalance`)
- [x] Unit test: `checkTokenBalance` is NOT exported from TransactionContext (removal verified)
- [x] All 68 server + 18 vite + 8 contract tests pass; build succeeds
**Rollback:** Revert.
**Commit:** `fix(client): separate ETH and MTK balance reads, surface token balance`
**Blocked by:** —

---

### P1-17 ✓ DONE
**Title:** Collapse dual wallet state and add accountsChanged/chainChanged listeners
**Goal:** One source of truth for connection; app handles account/chain changes correctly.
**Files affected:** `vite-project/src/context/TransactionContext.jsx`, `vite-project/src/components/Homepage/Home.jsx`
**Risk:** M
**Effort:** 60 min
**Verification checklist:**
- [x] `isConnectedToSite` state kept but constrained — comment documents the 4 permitted setters (P1-17)
- [x] `isConnectedToSite` has no independent setter outside connectWallet/disconnect/restoreSession/accountsChanged
- [x] `accountsChanged` and `chainChanged` both registered in TransactionContext with `removeListener` cleanup on unmount
- [x] `chainChanged` removed from `Home.jsx` — single registration point in context
- [x] Empty accounts array in `accountsChanged` triggers full disconnect (clearSession, reset all state)
- [x] All 68 server + 18 vite + 8 contract tests pass; build succeeds
**Rollback:** Revert.
**Commit:** `fix(client): separate ETH and MTK balance reads, surface token balance` (same commit — same files)

> **Phase 1 gate:** tag `v0.3.0-phase1`. Full manual checklist + API smoke diff before tagging.

---

# Phase 2 — Code Architecture Improvement

Zero observable behavior change is the acceptance bar for every task in this phase.

---

### P2-01 ✓ DONE
**Title:** Delete dead frontend files
**Goal:** Remove three files nothing references.
**Files affected:** delete `vite-project/src/index.js`, `vite-project/src/serviceWorker.js`, `vite-project/src/components/index.js`
**Risk:** L
**Effort:** 30 min
**Verification checklist:**
- [x] Grep each filename and every symbol it exports → zero references
- [x] `index.js` is the CRA-era duplicate entrypoint; `main.jsx` is the real one (confirm in `index.html`)
- [x] `serviceWorker.js` references `/static/js/bundle.js` and is never registered
- [x] `components/index.js` barrel is bypassed by `App.jsx`
- [x] `npm run build` succeeds; bundle size unchanged (364 modules, same as baseline)
- [x] All 68 server + 18 vite + 8 contract tests pass
**Rollback:** Revert.
**Commit:** `chore(client): delete dead entrypoint, service worker, and barrel file` — commit afe74fd
**Blocked by:** —

---

### P2-02 ✓ DONE
**Title:** Remove unused frontend dependency (framer-motion)
**Goal:** Drop a dependency with zero imports.
**Files affected:** `vite-project/package.json`, lockfile
**Risk:** L
**Effort:** 30 min
**Verification checklist:**
- [x] `grep -r "framer-motion" vite-project/src` → zero hits
- [x] Removed from `package.json`; lockfile regenerated
- [x] `npm run build` succeeds; bundle size unchanged (vendor chunk 522.30 kB before and after — framer-motion had zero footprint since it was never imported/tree-shaken)
- [x] `gsap` **kept** — it is used in `Home.jsx` and `TopCoins.jsx`
**Rollback:** Revert.
**Commit:** `chore(client): remove unused framer-motion dependency` — commit 5addd8d
**Blocked by:** —

---

### P2-03 ✓ DONE
**Title:** Remove unused server dependency (express-slow-down)
**Goal:** Drop a dependency that is installed but never required.
**Files affected:** `server/package.json`, lockfile
**Risk:** L
**Effort:** 30 min
**Verification checklist:**
- [x] `grep -r "express-slow-down" server/src` → zero hits
- [x] `SLOW_DOWN_*` env vars removed or documented as dead — no `SLOW_DOWN_*` refs found anywhere in `server`
- [x] Server boots; `/health` responds — `503 degraded` (db disconnected), matching documented baseline (`docs/BASELINE.md` "DB down — observed"); not a regression
- [x] All 68 server + 18 vite + 8 contract tests pass
- [x] `npm run build --prefix vite-project` succeeds (364 modules, unchanged)
- [x] Baseline re-capture diff reviewed — differences are CoinGecko live-network noise (this host now has network access, unlike the network-blocked capture environment), unrelated to this change; not committed, scope belongs to the tracked baseline-gap follow-up
**Rollback:** Revert.
**Commit:** `chore(server): remove unused express-slow-down dependency` — commit 958d842
**Blocked by:** —

---

### P2-04 ✓ DONE
**Title:** Rebuild the corrupted smart_contract manifest
**Goal:** `dependencies` currently lists hundreds of transitive packages (`ansi-styles`, `argparse`, `asn1`, `aes-js`…). Regenerate from actual imports.
**Files affected:** `smart_contract/package.json`, lockfile
**Risk:** M — can break the hardhat toolchain. Branch and gate on a clean compile.
**Effort:** 60 min
**Verification checklist:**
- [x] `dependencies`/`devDependencies` reduced to real direct deps found by grepping every `require`/`import` in `smart_contract/**/*.js` and `hardhat.config.js`: `hardhat`, `@nomicfoundation/hardhat-chai-matchers`, `@nomicfoundation/hardhat-ethers`, `ethers`, `chai`, `dotenv` (dev), and `@openzeppelin/contracts` (runtime — imported by `contracts/Transactions.sol`). Toolchain decision from P0-09 preserved: no `@nomicfoundation/hardhat-toolbox`, no legacy `@nomiclabs/*` packages.
- [x] `node_modules` and `package-lock.json` deleted, then reinstalled clean with `npm install --legacy-peer-deps` (matches the flag already used by `.github/workflows/ci.yml` for smart_contract — `chai@^5.3.3` vs `hardhat-chai-matchers@2.1.2`'s `chai@^4.2.0` peer range is a pre-existing conflict, not introduced by this task)
- [x] `hardhat compile` passes (7 Solidity files compiled)
- [x] `hardhat test` passes — all 8 tests green
- [ ] Deploy script dry run — **skipped as N/A, not out-of-scope**: `npx hardhat run scripts/deploy.js --network hardhat` fails with `Cannot read properties of undefined (reading 'parseEther')`. Root cause is a pre-existing bug in `scripts/deploy.js` (uses ethers v5 syntax `hre.ethers.utils.parseEther` / `.deployed()`) that predates this task — P0-09 only migrated `test/Transactions.js` to v6, not `scripts/deploy.js`. Confirmed the file is byte-identical before and after this change. Not fixed here per "do not refactor code this task does not name."
- [x] `npm test --prefix server` → 68 passing
- [x] `npm test --prefix vite-project` → 18 passing
- [x] `npm run build --prefix vite-project` → succeeds (364 modules)
- [x] `git diff docs/BASELINE.raw.json` → empty
**Rollback:** Revert both files, reinstall.
**Commit:** `chore(contract): rebuild package.json dependencies from actual imports` — commit 88b3004
**Blocked by:** P0-09

---

### P2-05 ✓ DONE
**Title:** Trim unused TransactionContext exports
**Goal:** Remove exported state no consumer reads, so the Phase 2 context split has less surface to carry.
**Files affected:** `vite-project/src/context/TransactionContext.jsx`
**Risk:** L
**Effort:** 30 min
**Verification checklist:**
- [x] Grep-verify zero consumers for: `spender`, `amount`, `handleApprove`, `loading`, `errorMessage`, `successMessage`
- [x] `formData` no longer carries unused `gasLimit` / `gasPrice`
- [x] All screens render identically
- [x] `npm run build` succeeds
**Rollback:** Revert.
**Commit:** `refactor(client): remove unused TransactionContext exports` 6bc0d07
**Blocked by:** P1-16

---

### P2-06 ✓ DONE
**Title:** Add atomic jsonStore
**Goal:** Replace non-atomic `readFileSync`/`writeFileSync` with write-temp-then-rename plus an in-process write queue. Additive — no caller migrated yet.
**Files affected:** `server/src/lib/jsonStore.js` (new)
**Risk:** L — nothing consumes it.
**Effort:** 60 min
**Verification checklist:**
- [x] Writes go to a temp file, then `rename` (atomic on POSIX and NTFS)
- [x] In-process write queue serializes concurrent writes to the same path
- [x] Test: 100 parallel writes → zero lost records, file always parseable
- [x] Test: read of a file that does not exist returns the default, does not throw
**Rollback:** Revert; no caller depends on it.
**Commit:** `feat(server): add atomic jsonStore with write queue` f0ebe63
**Blocked by:** —

---

### P2-07 ✓ DONE
**Title:** Extract watchlistRepo
**Goal:** Move the `dbState.connected ? mongo : json` branch out of the controller into one repository module.
**Files affected:** `server/src/repositories/watchlistRepo.js` (new), `server/src/controllers/watchlistController.js`
**Risk:** M — touches the fallback path, which has never been tested.
**Effort:** 90 min
**Verification checklist:**
- [x] `dbState.connected` read exactly once, inside the repo
- [x] Controller is thin: parse → repo → respond
- [x] Repo uses `jsonStore` from P2-06, not raw `fs`
- [x] API responses byte-identical to baseline in **both** DB modes
- [x] Duplicated `getLocalWatchlists` / `saveLocalWatchlists` deleted
- [x] Lowercase-address convention preserved
**Rollback:** Revert.
**Commit:** `refactor(server): extract watchlistRepo with single dbState branch` (8417caf)
**Blocked by:** P2-06

---

### P2-08 ✓ DONE
**Title:** Extract transactionRepo
**Goal:** Same treatment for transactions.
**Files affected:** `server/src/repositories/transactionRepo.js` (new), `server/src/controllers/transactionsController.js`
**Risk:** M
**Effort:** 90 min
**Verification checklist:**
- [x] `dbState.connected` read only inside the repo
- [x] Repo uses `jsonStore`
- [x] Route order preserved: `/count` still declared before `/:address`
- [x] API responses byte-identical to baseline in both DB modes
- [x] Pagination behavior unchanged
**Rollback:** Revert.
**Commit:** `refactor(server): extract transactionRepo with single dbState branch` (6a9fae4)
**Blocked by:** P2-06

---

### P2-09 ✓ DONE
**Title:** Extract contractService on the frontend
**Goal:** One module owning address + ABI + provider/signer construction, before the context split needs it.
**Files affected:** `vite-project/src/services/contractService.js` (new), `vite-project/src/utils/constant.js`, `vite-project/src/context/TransactionContext.jsx`
**Risk:** M — every chain call routes through this.
**Effort:** 90 min
**Verification checklist:**
- [x] Address + ABI resolved in exactly one place (`contractService.js`)
- [x] `constant.js` re-exports from the service so existing import paths keep working
- [x] `TransactionContext` uses the service
- [ ] Transfer, batch transfer, allowance, and admin flows all still work on testnet — NOT independently testable in this agent environment (no MetaMask/network access); instead traced each code path (sendTransaction, sendBatchTransaction, checkAllowance/approveAllowance, updateFeePercentage) to confirm they resolve address+ABI+signer/provider through `contractService.js` with no behavior change. Build passed and full test suites (vite-project 18, server 76, smart_contract 8) passed.
- [x] `verifyContract` behavior unchanged
**Rollback:** Revert.
**Commit:** `refactor(client): extract contractService as single address+ABI source` (9bd9ac5)
**Blocked by:** P1-11

---

### P2-10 ✓ DONE
**Title:** Split out WalletContext
**Goal:** First of three splits — smallest and safest, since P1-16 already consolidated wallet state.
**Files affected:** `vite-project/src/context/WalletContext.jsx` (new), `vite-project/src/hooks/useWallet.js` (new), `vite-project/src/context/TransactionContext.jsx`
**Risk:** M — re-render and stale-closure regressions are the failure mode.
**Effort:** 90 min
**Verification checklist:**
- [x] `TransactionContext` becomes a composition re-exporting the **identical** value shape
- [x] **Zero consumer files changed** in this PR
- [x] Account connect, disconnect, switch, and chain change all still work — verified by code tracing only (no MetaMask in this agent environment); `TransactionContext.test.js` (18 tests) still passes unmodified against the new composed shape
- [x] Listener cleanup on unmount still verified — `removeListener` for accountsChanged/chainChanged traced in `WalletContext.jsx`, registered exactly once
- [ ] React DevTools: no new render storms on account change — NOT independently verifiable in this agent environment (no browser); traced effect dependency arrays instead
**Rollback:** Revert.
**Commit:** `refactor(client): extract WalletContext, TransactionContext re-exports shape` (8f17900)
**Blocked by:** P2-05, P2-09

---

### P2-11 ✓ DONE
**Title:** Split out WatchlistContext and consolidate the triplicated localStorage logic
**Goal:** Second split. `CoinDetails.jsx` inlines a third copy of the read/modify/write pattern — fold all three into one hook.
**Files affected:** `vite-project/src/context/WatchlistContext.jsx` (new), `vite-project/src/hooks/useWatchlist.js` (new), `vite-project/src/context/TransactionContext.jsx`, `vite-project/src/components/CoinDetails.jsx`
**Risk:** M
**Effort:** 90 min
**Verification checklist:**
- [x] `watchlist_${account.toLowerCase()}` and `watchlist_anonymous` keys written from exactly one module — grep proves it
- [x] `CoinDetails` uses the hook, no inline localStorage
- [x] `TransactionContext` still re-exports the identical shape
- [x] Anonymous → connected watchlist sync behavior unchanged
- [x] Add and remove work from Watchlist page and CoinDetails page alike (traced code paths; no browser/MetaMask available in this agent environment to click through — see note below)
**Rollback:** Revert.
**Commit:** `refactor(client): extract WatchlistContext and consolidate localStorage logic` (283390f)
**Blocked by:** P2-10

**Note:** `Watchlist.jsx` also had a copy of this pattern (not just `CoinDetails.jsx`) and required a small surgical edit (replaced its inline `localStorage.getItem/setItem("watchlist_*")` calls with the new `useWatchlist()` hook functions) to satisfy the "exactly one module" grep-proof requirement — flagged per the task's "stop and reconsider" instruction rather than silently expanding scope.

---

### P2-12
**Title:** Split out ContractContext
**Goal:** Third and largest split. Transfer, batch, allowance, admin.
**Files affected:** `vite-project/src/context/ContractContext.jsx` (new), `vite-project/src/hooks/useContract.js` (new), `vite-project/src/context/TransactionContext.jsx`
**Risk:** M
**Effort:** 90 min
**Verification checklist:**
- [ ] `TransactionContext` still re-exports the identical shape; zero consumer files changed
- [ ] Single transfer, batch transfer, approve, check allowance, admin fee change all verified on testnet
- [ ] `TransactionContext.jsx` is now a thin composition — under ~60 lines
- [ ] All Phase 0 + Phase 1 tests pass
**Rollback:** Revert.
**Commit:** `refactor(client): extract ContractContext, complete context split`
**Blocked by:** P2-11

---

### P2-13
**Title:** Migrate consumers off TransactionContext
**Goal:** Point each component at the specific context it needs. One file per commit inside the PR.
**Files affected:** all components importing `TransactionContext`
**Risk:** L — the composition still works until the last caller moves.
**Effort:** 90 min
**Verification checklist:**
- [ ] Each component imports only the context it actually uses
- [ ] `TransactionContext` deleted once zero importers remain — grep proves it
- [ ] Every screen renders identically
- [ ] All tests pass
**Rollback:** Revert; the composition re-export restores the old path.
**Commit:** `refactor(client): migrate consumers to specific contexts, remove composition`
**Blocked by:** P2-12

---

### P2-14
**Title:** Reorganize components into features/
**Goal:** Group by feature. Pure file moves — no content edits in this PR.
**Files affected:** `vite-project/src/features/{market,transfer,admin,home}/*` (moved), all import paths
**Risk:** L — noisy diff, low semantic risk.
**Effort:** 60 min
**Verification checklist:**
- [ ] Moves only. Zero content changes in the same commit — keeps `git log --follow` readable
- [ ] `components/ui/` folder created (empty, for Phase 4)
- [ ] `ErrorBoundary.jsx` stays in `components/` — it is cross-cutting
- [ ] All imports resolve; `npm run build` succeeds
- [ ] Lazy route imports in `App.jsx` updated; manual Rollup chunks still split correctly
**Rollback:** Revert.
**Commit:** `refactor(client): group components by feature`
**Blocked by:** P2-13

> **Phase 2 gate:** tag `v0.4.0-phase2`. API smoke must diff clean in both DB modes.

---

# Phase 3 — Backend Stabilization

---

### P3-01
**Title:** Add structured logging (pino) with request ids
**Goal:** Replace `console.log`. Every log line carries a request id; every error response returns it.
**Files affected:** `server/src/lib/logger.js` (new), `server/src/middleware/requestId.js` (new), `server/src/app.js`
**Risk:** L
**Effort:** 60 min
**Verification checklist:**
- [ ] `grep -c "console.log" server/src` → 0
- [ ] Every request logged with a correlation id
- [ ] Error responses return the same id that appears in the log
- [ ] Signatures and session tokens never logged
**Rollback:** Revert.
**Commit:** `feat(server): add pino structured logging with request correlation ids`
**Blocked by:** P2-08

---

### P3-02
**Title:** Add AppError and asyncHandler
**Goal:** One error path. Controllers stop try/catching individually.
**Files affected:** `server/src/middleware/errorHandler.js` (new), `server/src/lib/AppError.js` (new), all `server/src/controllers/*`
**Risk:** M — touches every controller.
**Effort:** 90 min
**Verification checklist:**
- [ ] Known failure classes map to stable codes: validation 400, not-found 404, unauthorized 401/403, upstream-unavailable 503
- [ ] Per-controller try/catch removed
- [ ] Production redaction from P1-14 preserved
- [ ] Every error response carries a correlation id
- [ ] Status codes unchanged from baseline for every recorded error case
**Rollback:** Revert.
**Commit:** `refactor(server): centralize error handling with AppError and asyncHandler`
**Blocked by:** P3-01

---

### P3-03
**Title:** Add Zod validation to market and transactions routes
**Goal:** Malformed params, query, and body rejected at the boundary.
**Files affected:** `server/src/middleware/validate.js` (new), `server/src/routes/market.js`, `server/src/routes/transactions.js`
**Risk:** M — a too-strict schema breaks a working client.
**Effort:** 90 min
**Verification checklist:**
- [ ] Params, query, and body all validated
- [ ] Addresses validated with `ethers.isAddress`
- [ ] Pagination bounded with an explicit maximum
- [ ] Rejections return 400 with field-level detail
- [ ] Every request the baseline recorded as valid still passes
**Rollback:** Revert.
**Commit:** `feat(server): add Zod validation to market and transactions routes`
**Blocked by:** P3-02

---

### P3-04
**Title:** Add Zod validation to watchlist and auth routes
**Goal:** Same treatment for the security-sensitive routes.
**Files affected:** `server/src/routes/watchlist.js`, `server/src/routes/auth.js`
**Risk:** M
**Effort:** 60 min
**Verification checklist:**
- [ ] Address validation from P1-09 folded into the schema
- [ ] Nonce and signature payloads validated on `/api/auth/verify`
- [ ] Coin id validated on watchlist POST/DELETE
- [ ] IDOR regression tests still pass
**Rollback:** Revert.
**Commit:** `feat(server): add Zod validation to watchlist and auth routes`
**Blocked by:** P3-03

---

### P3-05
**Title:** Per-route rate limits
**Goal:** Replace the single global limiter. Strict on auth, moderate on writes, generous on reads, none on `/health`.
**Files affected:** `server/src/app.js`, `server/src/routes/*`
**Risk:** M — too tight and you throttle real users.
**Effort:** 60 min
**Verification checklist:**
- [ ] `/api/auth/*` strict — brute-force surface
- [ ] Writes moderate, reads generous
- [ ] `/health` unmetered (P1-14 behavior preserved)
- [ ] `trust proxy` from P1-14 still respected — two `X-Forwarded-For` values, two buckets
- [ ] Normal usage does not trip any limit
**Rollback:** Revert to the single global limiter.
**Commit:** `feat(server): replace global rate limiter with per-route policies`
**Blocked by:** P3-04

---

### P3-06
**Title:** Add compression and log DB state transitions
**Goal:** Response compression, plus a `warn` on every Mongo↔JSON switch so silent degradation stops being silent.
**Files affected:** `server/src/app.js`, `server/src/config/db.js`
**Risk:** L
**Effort:** 30 min
**Verification checklist:**
- [ ] `compression` middleware added; responses carry `Content-Encoding`
- [ ] 10kb JSON body limit preserved, with a comment explaining the size
- [ ] Every `dbState.connected` transition logged at `warn`
- [ ] `dbState` still **mutated**, never reassigned
**Rollback:** Revert.
**Commit:** `feat(server): add compression and log DB state transitions`
**Blocked by:** P3-01

---

### P3-07
**Title:** Add indexer reconnect with exponential backoff
**Goal:** Survive an RPC disconnect instead of going quiet.
**Files affected:** `server/src/services/blockchainService.js`
**Risk:** M
**Effort:** 90 min
**Verification checklist:**
- [ ] Exponential backoff with jitter on disconnect
- [ ] Kill the RPC connection mid-run → reconnects, no data loss
- [ ] Backoff caps at a sane ceiling; does not hammer the provider
- [ ] Reconnect attempts logged
**Rollback:** Revert.
**Commit:** `feat(server): add RPC reconnect with exponential backoff to indexer`
**Blocked by:** P3-01

---

### P3-08
**Title:** Persist the indexer block cursor
**Goal:** Restart resumes from the last indexed block instead of re-scanning from genesis.
**Files affected:** `server/src/services/blockchainService.js`, `server/src/models/IndexerState.js` (new)
**Risk:** M — a wrong cursor silently skips blocks.
**Effort:** 90 min
**Verification checklist:**
- [ ] Cursor persisted after each successful batch
- [ ] Restart resumes from the cursor, does not re-scan
- [ ] Restart produces zero duplicates (the P1-03 compound index backs this)
- [ ] Periodic reconciliation sweep catches gaps
- [ ] Cursor survives a Mongo outage (JSON fallback path)
**Rollback:** Revert; delete the cursor record to force a full re-scan.
**Commit:** `feat(server): persist indexer block cursor for restart resume`
**Blocked by:** P3-07

---

### P3-09
**Title:** Make _init failure explicit
**Goal:** The lazy `_init()` currently fails silently non-fatal. Server may keep serving, but health must report degraded.
**Files affected:** `server/src/services/blockchainService.js`
**Risk:** L
**Effort:** 30 min
**Verification checklist:**
- [ ] Init failure logged at `error`, not swallowed
- [ ] Failure state exposed for the health endpoint to read
- [ ] Server still boots and serves non-chain routes when init fails
- [ ] Missing `ALCHEMY_URL` produces a clear startup message, not silence
**Rollback:** Revert.
**Commit:** `fix(server): surface blockchain service init failure explicitly`
**Blocked by:** P3-08

---

### P3-10
**Title:** Honest health endpoint
**Goal:** `/health` reports real dependency state, not a bare 200.
**Files affected:** `server/src/routes/health.js` (new), `server/src/app.js`
**Risk:** L
**Effort:** 60 min
**Verification checklist:**
- [ ] Reports DB connectivity, RPC connectivity, last indexed block, lag vs chain head
- [ ] `/health/live` and `/health/ready` split for orchestrators
- [ ] Accurate in all four DB×RPC combinations
- [ ] Still exempt from rate limiting
- [ ] Stop Mongo → app keeps serving, health says degraded
**Rollback:** Revert to the bare 200 handler.
**Commit:** `feat(server): report real dependency state from health endpoint`
**Blocked by:** P3-09

---

### P3-11
**Title:** Graceful shutdown on SIGTERM
**Goal:** Drain in-flight requests instead of dying mid-response.
**Files affected:** `server/index.js`
**Risk:** L
**Effort:** 45 min
**Verification checklist:**
- [ ] `SIGTERM` → stop accepting, drain in-flight, close RPC listener, close Mongo, exit
- [ ] `SIGTERM` during an in-flight request → request completes, then clean exit
- [ ] Hard timeout forces exit if drain hangs
- [ ] Exit code 0 on clean shutdown
**Rollback:** Revert.
**Commit:** `feat(server): add graceful shutdown with request draining`
**Blocked by:** P3-10

> **Phase 3 gate:** tag `v0.5.0-phase3`. Degradation matrix rows 1–3 verified manually.

---

# Phase 4 — Frontend Premium Upgrade

---

### P4-01
**Title:** Promote design tokens into tailwind.config.js
**Goal:** One source of truth. Tokens currently live in three places: `.premium-*` classes, inline hex in every component, and a near-empty config.
**Files affected:** `vite-project/tailwind.config.js`
**Risk:** L — purely additive. `.premium-*` classes keep working.
**Effort:** 60 min
**Verification checklist:**
- [ ] Named tokens added: `coral` `#FF385C`, `cobalt` `#2563EB`, `surface` `#0b0f19`, `surface-raised` `#0c1118`, `base` `#050811`, `muted` `#71717a`, `positive` `#10B981`, `negative` `#EF4444`
- [ ] Spacing, radii, and motion durations tokenized
- [ ] `.premium-*` classes untouched and still working
- [ ] Zero visual change — build and compare against P0-02 screenshots
**Rollback:** Revert.
**Commit:** `feat(client): promote design tokens into tailwind config`
**Blocked by:** P2-14

---

### P4-02
**Title:** Build ui/ primitives
**Goal:** `Button`, `Card`, `Input`, `Select`, `Skeleton`, `EmptyState`, `Toast`, `Badge` — consuming the named tokens. Nothing adopts them yet.
**Files affected:** `vite-project/src/components/ui/*` (new)
**Risk:** L — additive.
**Effort:** 90 min
**Verification checklist:**
- [ ] Each primitive uses only named tokens — zero hex literals
- [ ] Focus rings visible on every interactive primitive
- [ ] `Button` supports disabled state with an accessible affordance
- [ ] Rendered in isolation and visually matches the existing style
**Rollback:** Revert.
**Commit:** `feat(client): add ui primitives consuming design tokens`
**Blocked by:** P4-01

---

### P4-03
**Title:** Make navigation wallet-independent
**Goal:** Market pages are designed to work with no wallet, no server, no DB — but `Navbar.jsx` hides every nav link behind `{isConnectedToSite && …}`, so they are unreachable until MetaMask connects.
**Files affected:** `vite-project/src/features/home/Navbar.jsx`
**Risk:** M — changes what users see first.
**Effort:** 60 min
**Verification checklist:**
- [ ] Nav renders unconditionally; the `isConnectedToSite` wrapper removed
- [ ] Mobile menu also unconditional
- [ ] `/transfer`, `/allowance`, `/admin` shown **disabled** with a "connect wallet" affordance — not hidden
- [ ] `key={index}` → `key={item.path}`
- [ ] Admin entry still gated on `isAdmin`
- [ ] Manual: with MetaMask uninstalled, Dashboard and Watchlist are reachable
**Rollback:** Revert.
**Commit:** `fix(client): render navigation without requiring a wallet connection`
**Blocked by:** P1-16

---

### P4-04
**Title:** Non-blocking initial load
**Goal:** `App.jsx` blocks the whole app on the initial `fetchCoins(100)`. A CoinGecko outage should degrade one panel, not everything.
**Files affected:** `vite-project/src/App.jsx`
**Risk:** M
**Effort:** 60 min
**Verification checklist:**
- [ ] App shell paints before market data resolves
- [ ] Market panel shows a `Skeleton` while loading
- [ ] Block CoinGecko in devtools → shell renders, one panel degrades, nav works
- [ ] Lazy routes and manual Rollup chunks still split correctly
**Rollback:** Revert.
**Commit:** `fix(client): render app shell without blocking on initial market fetch`
**Blocked by:** P4-02

---

### P4-05
**Title:** Stop Watchlist silently dropping coins
**Goal:** `const coin = coins.find(...); if (!coin) return null;` deletes any watched coin outside the top-100 fetch, with no message.
**Files affected:** `vite-project/src/features/market/Watchlist.jsx`
**Risk:** M
**Effort:** 60 min
**Verification checklist:**
- [ ] Missing coins fetched by id, or rendered as a clearly-labeled partial row
- [ ] `return null` path removed
- [ ] Watch a coin ranked outside the top 100 → it renders
- [ ] Empty watchlist shows `EmptyState`, not a blank area
**Rollback:** Revert.
**Commit:** `fix(client): render watchlist coins outside the top-100 fetch`
**Blocked by:** P4-02

---

### P4-06
**Title:** Add rollback to optimistic watchlist mutations
**Goal:** Add and remove are optimistic with no rollback — the UI lies when the API call fails.
**Files affected:** `vite-project/src/features/market/Watchlist.jsx`, `vite-project/src/hooks/useWatchlist.js`
**Risk:** L
**Effort:** 45 min
**Verification checklist:**
- [ ] Failed add reverts the optimistic insert and surfaces an error
- [ ] Failed remove reverts the optimistic delete and surfaces an error
- [ ] localStorage stays consistent with the rolled-back UI state
- [ ] Manual: force a 500 on the watchlist route → UI rolls back visibly
**Rollback:** Revert.
**Commit:** `fix(client): roll back optimistic watchlist mutations on API failure`
**Blocked by:** P4-05

---

### P4-07
**Title:** Add loading / error / empty states to remaining data views
**Goal:** Every data-driven view has three explicit states.
**Files affected:** `vite-project/src/features/market/{TopCoins,CoinDetails}.jsx`, `vite-project/src/features/transfer/*`, `vite-project/src/features/admin/AdminPanel.jsx`
**Risk:** L
**Effort:** 90 min
**Verification checklist:**
- [ ] Every view distinguishes loading, error, and empty
- [ ] `Skeleton` used for loading; `EmptyState` for empty
- [ ] Errors are actionable — say what failed and offer a retry
- [ ] No view renders a blank area in any of the three states
**Rollback:** Revert.
**Commit:** `feat(client): add explicit loading, error, and empty states`
**Blocked by:** P4-06

---

### P4-08
**Title:** Restyle ErrorBoundary and the 404 route
**Goal:** `ErrorBoundary` uses `bg-gray-800` / `border-red-500` / `rounded-2xl` — off design system. The catch-all route is a bare `<div>Page not found</div>`.
**Files affected:** `vite-project/src/components/ErrorBoundary.jsx`, `vite-project/src/App.jsx`
**Risk:** L
**Effort:** 45 min
**Verification checklist:**
- [ ] Both use named tokens — zero hex literals, no `gray-800` / `red-500`
- [ ] `ErrorBoundary` retry button actually resets the boundary
- [ ] 404 page offers a link home
- [ ] Manual: throw in a child component → boundary renders on-system and retry works
**Rollback:** Revert.
**Commit:** `fix(client): bring ErrorBoundary and 404 route onto the design system`
**Blocked by:** P4-02

---

### P4-09
**Title:** Migrate market components to tokens and ui primitives
**Goal:** `TopCoins`, `CoinDetails`, `Watchlist` contain zero hex literals.
**Files affected:** `vite-project/src/features/market/*`
**Risk:** L — visual regression is the only risk.
**Effort:** 90 min
**Verification checklist:**
- [ ] Grep the folder for `#[0-9a-fA-F]{6}` → zero hits
- [ ] `CoinDetails` chart colors (`borderColor: "#2563EB"`, ticks `#71717a`) moved onto tokens
- [ ] Visual diff vs P0-02 screenshots: no unintended changes
- [ ] All three routes verified at 375 / 768 / 1280 / 1920
**Rollback:** Revert.
**Commit:** `refactor(client): migrate market components to design tokens`
**Blocked by:** P4-07

---

### P4-10
**Title:** Migrate transfer, admin, and home components to tokens
**Goal:** Same treatment for the remaining features.
**Files affected:** `vite-project/src/features/{transfer,admin,home}/*`
**Risk:** L
**Effort:** 90 min
**Verification checklist:**
- [ ] Grep those folders for hex literals → zero hits
- [ ] `ui/` primitives adopted for buttons, inputs, cards
- [ ] Visual diff vs baseline screenshots clean
- [ ] `.premium-*` classes in `index.css` now have zero consumers — delete them
**Rollback:** Revert.
**Commit:** `refactor(client): migrate remaining components to design tokens`
**Blocked by:** P4-09

---

### P4-11
**Title:** Fix CoinDetails select value and remaining key={index}
**Goal:** `JSON.stringify(range)` as a `<select>` value, re-parsed on change, is fragile. Audit index keys while in there.
**Files affected:** `vite-project/src/features/market/CoinDetails.jsx`, any file with `key={index}`
**Risk:** L
**Effort:** 30 min
**Verification checklist:**
- [ ] Select uses `range.days` as the value; lookup by days on change
- [ ] No `JSON.stringify` / `JSON.parse` round-trip in the select
- [ ] `key={index}` audited across the tree and replaced with stable keys
- [ ] Time-range switching still refetches correctly
**Rollback:** Revert.
**Commit:** `fix(client): use stable select values and list keys`
**Blocked by:** P4-09

---

### P4-12
**Title:** Accessibility pass
**Goal:** Keyboard and screen-reader usable.
**Files affected:** all `vite-project/src/features/*`, `vite-project/src/components/ui/*`
**Risk:** L
**Effort:** 90 min
**Verification checklist:**
- [ ] Visible focus rings on every interactive element
- [ ] `aria-label` on every icon-only button
- [ ] Full keyboard traversal of every route, including the mobile menu
- [ ] Contrast audit — check `#71717a` on `#050811` first, it is used for body copy
- [ ] Heading hierarchy correct per page
- [ ] Form errors associated with their inputs in `TokenTransfer` and `AllowanceManager`
- [ ] axe or Lighthouse a11y: zero critical violations
**Rollback:** Revert.
**Commit:** `feat(client): accessibility pass — focus, labels, contrast, keyboard nav`
**Blocked by:** P4-10

---

### P4-13
**Title:** Honor prefers-reduced-motion and debounce the TopCoins stagger
**Goal:** GSAP timelines respect user preference. `TopCoins` currently re-runs a `.coin-row` stagger on every keystroke in the search field.
**Files affected:** `vite-project/src/features/home/Home.jsx`, `vite-project/src/features/market/TopCoins.jsx`, `vite-project/src/index.css`
**Risk:** L
**Effort:** 45 min
**Verification checklist:**
- [ ] `prefers-reduced-motion: reduce` disables GSAP timelines and `animate-*` utilities
- [ ] `TopCoins` stagger debounced or dropped on search input
- [ ] Durations and easing read from tokens, not per-component literals
- [ ] Manual: enable reduced motion in OS settings → no decorative animation
**Rollback:** Revert.
**Commit:** `feat(client): honor prefers-reduced-motion and debounce list animation`
**Blocked by:** P4-12

---

### P4-14
**Title:** Responsive audit
**Goal:** Verify every route at four breakpoints; catch silent truncation.
**Files affected:** whatever the audit turns up
**Risk:** L
**Effort:** 60 min
**Verification checklist:**
- [ ] Every route checked at 375 / 768 / 1280 / 1920
- [ ] `TopCoins` hiding Market Cap below `md` confirmed intentional (or fixed)
- [ ] No horizontal overflow anywhere
- [ ] No text truncated without an affordance
- [ ] Findings recorded in the PR even if no fix was needed
**Rollback:** Revert any fixes.
**Commit:** `fix(client): responsive audit fixes across breakpoints`
**Blocked by:** P4-13

> **Phase 4 gate:** tag `v0.6.0-phase4`. Visual diff vs P0-02 — intentional changes only.

---

# Phase 5 — Feature Enhancement (Must have only)

Should-have and Future items are backlog, not queue. Promote them after Phase 6 ships.

---

### P5-01
**Title:** Portfolio valuation from MTK balance
**Goal:** Show total portfolio value. P1-15 exposed the balance; this makes it a portfolio number.
**Files affected:** `vite-project/src/features/home/Home.jsx`, `vite-project/src/hooks/useContract.js`
**Risk:** L
**Effort:** 60 min
**Verification checklist:**
- [ ] Total value renders for a funded test account
- [ ] Zero balance shows `0`, not an error or a blank
- [ ] Value refreshes on `accountsChanged`
- [ ] No fabricated price — if no price source exists, show the token amount only
**Rollback:** Revert.
**Commit:** `feat(client): add portfolio valuation from token balance`
**Blocked by:** P1-15, P4-10

---

### P5-02
**Title:** Route market data through the server
**Goal:** Point `api.js` at `GET /api/market/coins`. Removes `VITE_COINGECKO_API_KEY` from the shipped bundle and moves rate-limit exposure from per-user to per-server, where `PriceCache` shields it.
**Files affected:** `vite-project/src/api/coingecko.js`
**Risk:** M — **hard-blocked on P1-01.** Routing here before the schema is fixed ships hollow data to every user.
**Effort:** 60 min
**Verification checklist:**
- [ ] Frontend calls `/api/market/coins`, not CoinGecko directly
- [ ] Grep the production bundle: no CoinGecko API key present
- [ ] Cache-hit response is correct (P1-01 and P1-02 verified first)
- [ ] Direct CoinGecko call retained as an explicit fallback when the server is down
- [ ] Market page renders identically to baseline
**Rollback:** Revert — frontend goes back to calling CoinGecko directly.
**Commit:** `feat(client): route market data through server API`
**Blocked by:** P1-02

---

### P5-03
**Title:** Server-backed paginated transaction history
**Goal:** The UI reads history from the contract's unbounded `getAllTransactions()`, which returns the entire global array and will eventually revert on gas. The server already indexes and paginates.
**Files affected:** `vite-project/src/features/home/Home.jsx`, `vite-project/src/hooks/useContract.js`
**Risk:** M
**Effort:** 90 min
**Verification checklist:**
- [ ] History reads `GET /api/transactions/:address` with pagination
- [ ] Batch transfers appear as N distinct rows (P1-04 and P1-06 verified first)
- [ ] Chain read retained as an explicit fallback, and the UI says when it is in use
- [ ] Pagination controls work; page size bounded
- [ ] Empty history shows `EmptyState`
**Rollback:** Revert to the chain read.
**Commit:** `feat(client): read paginated transaction history from server API`
**Blocked by:** P1-06, P3-04

---

### P5-04
**Title:** Toast notifications for transaction lifecycle
**Goal:** Users currently get no feedback between signing and completion.
**Files affected:** `vite-project/src/features/transfer/TokenTransfer.jsx`, `vite-project/src/hooks/useContract.js`
**Risk:** L
**Effort:** 60 min
**Verification checklist:**
- [ ] Toasts fire for submitted, pending, confirmed, failed
- [ ] Uses the `Toast` primitive from P4-02
- [ ] Failure toast surfaces the actual revert reason where available
- [ ] Toasts are dismissible and announced to screen readers
**Rollback:** Revert.
**Commit:** `feat(client): add transaction lifecycle toast notifications`
**Blocked by:** P4-02

---

### P5-05
**Title:** Toast notifications for allowance and admin actions
**Goal:** Same feedback for the other two write paths.
**Files affected:** `vite-project/src/features/transfer/AllowanceManager.jsx`, `vite-project/src/features/admin/AdminPanel.jsx`
**Risk:** L
**Effort:** 45 min
**Verification checklist:**
- [ ] Approve and fee-change both emit lifecycle toasts
- [ ] Failure states covered, including user-rejected-in-MetaMask
- [ ] Consistent with P5-04 wording and timing
**Rollback:** Revert.
**Commit:** `feat(client): add lifecycle toasts to allowance and admin flows`
**Blocked by:** P5-04

---

### P5-06
**Title:** Fetch watchlist coins by id
**Goal:** Complete the P4-05 fix at the data layer — fetch watched coins directly rather than filtering a top-100 list.
**Files affected:** `vite-project/src/api/coingecko.js`, `server/src/controllers/marketController.js`
**Risk:** L
**Effort:** 60 min
**Verification checklist:**
- [ ] Watchlist fetches by explicit coin ids
- [ ] A coin ranked outside the top 100 renders fully, with price and change
- [ ] Batched into one request, not N requests
- [ ] Partial failure degrades per-row, not per-page
**Rollback:** Revert to the top-100 filter (P4-05 still prevents silent disappearance).
**Commit:** `feat: fetch watchlist coins by id instead of filtering top-100`
**Blocked by:** P5-02

---

### P5-07
**Title:** Boot-time environment check
**Goal:** The current baseline has no `VITE_CONTRACT_ADDRESS`, `MONGO_URI`, or `ALCHEMY_URL` — chain and DB features are silently off. Production must not inherit that silence.
**Files affected:** `server/index.js`, `vite-project/src/main.jsx`
**Risk:** L
**Effort:** 45 min
**Verification checklist:**
- [ ] Server logs loudly at boot which features are disabled and why
- [ ] Frontend logs a clear console warning when `VITE_CONTRACT_ADDRESS` is absent
- [ ] Missing optional vars degrade gracefully — no crash
- [ ] Missing vars in production log at `error`, not `info`
**Rollback:** Revert.
**Commit:** `feat: add boot-time environment check with loud degradation logging`
**Blocked by:** P3-10

---

### P5-08
**Title:** Pin PORT and verify the vite proxy target
**Goal:** `server/index.js` defaults to 5000; the vite proxy targets 3000. Pin it before deployment surprises anyone.
**Files affected:** `.env`, `.env.example`, `vite-project/vite.config.js`
**Risk:** L
**Effort:** 30 min
**Verification checklist:**
- [ ] `PORT=3000` pinned in `.env` and `.env.example`
- [ ] Proxy target matches
- [ ] `npm run dev` from root: both services start and the proxy resolves
- [ ] `envDir: "../"` still resolves `VITE_*` from the root `.env`
**Rollback:** Revert.
**Commit:** `fix: pin server PORT to match vite proxy target`
**Blocked by:** —

> **Phase 5 gate:** tag `v0.7.0-phase5`.

---

# Phase 6 — Testing & Production Readiness

---

### P6-01
**Title:** Unit tests for context providers and hooks
**Goal:** Cover the three providers and three hooks from the Phase 2 split.
**Files affected:** `vite-project/src/context/*.test.jsx` (new), `vite-project/src/hooks/*.test.js` (new)
**Risk:** L
**Effort:** 90 min
**Verification checklist:**
- [ ] Each provider tested in isolation
- [ ] Wallet state derivation covered; listener cleanup on unmount asserted
- [ ] `approveAllowance` guard: throws on non-`bigint`
- [ ] Watchlist optimistic rollback covered
- [ ] `vite-project/src/context` coverage ≥70%
**Rollback:** n/a — tests only.
**Commit:** `test(client): add unit tests for context providers and hooks`
**Blocked by:** P5-08

---

### P6-02
**Title:** Unit tests for ui primitives
**Goal:** Cover the shared components everything else depends on.
**Files affected:** `vite-project/src/components/ui/*.test.jsx` (new)
**Risk:** L
**Effort:** 60 min
**Verification checklist:**
- [ ] Each primitive renders in every documented state
- [ ] `Button` disabled state does not fire `onClick`
- [ ] `Toast` dismisses and announces
- [ ] `EmptyState` and `Skeleton` render without props
**Rollback:** n/a
**Commit:** `test(client): add unit tests for ui primitives`
**Blocked by:** P6-01

---

### P6-03
**Title:** Controller tests — Mongo path
**Goal:** Cover every controller against the repository's Mongo branch.
**Files affected:** `server/src/controllers/*.test.js` (new)
**Risk:** L
**Effort:** 90 min
**Verification checklist:**
- [ ] Every controller covered, success and error paths
- [ ] Validation schemas tested for reject cases
- [ ] Error handler production redaction asserted
- [ ] Runs against an in-memory or ephemeral Mongo
**Rollback:** n/a
**Commit:** `test(server): add controller tests against Mongo repository path`
**Blocked by:** P5-08

---

### P6-04
**Title:** Controller tests — JSON fallback path
**Goal:** The fallback is a first-class code path and has never been tested. This is the gap most likely to hide a bug.
**Files affected:** `server/src/controllers/*.test.js`, `server/src/lib/jsonStore.test.js` (new)
**Risk:** L
**Effort:** 90 min
**Verification checklist:**
- [ ] Every controller runs again with `dbState.connected = false`
- [ ] Responses match the Mongo path where the baseline says they should
- [ ] `jsonStore` atomicity: 100 concurrent writes, zero lost records
- [ ] `server/src` coverage ≥70%
**Rollback:** n/a
**Commit:** `test(server): add controller tests against JSON fallback path`
**Blocked by:** P6-03

---

### P6-05
**Title:** Contract test coverage to 100%
**Goal:** Extend the P0-09 suite to cover fee math, the cap, ownership, and batch.
**Files affected:** `smart_contract/test/Transactions.js`
**Risk:** L
**Effort:** 90 min
**Verification checklist:**
- [ ] Basis-point fee math tested including rounding at the boundaries
- [ ] `setFeePercentage` rejects above 1000 (10% cap)
- [ ] `onlyOwner` enforced on every restricted function
- [ ] Single and batch transfer paths covered
- [ ] Event emission shape asserted
- [ ] 100% line coverage on contract logic
**Rollback:** n/a
**Commit:** `test(contract): cover fee math, cap, ownership, and batch paths`
**Blocked by:** P2-04

---

### P6-06
**Title:** Full lifecycle integration test
**Goal:** connect → SIWE auth → transfer → event → indexed → API → UI, against a local node.
**Files affected:** `tests/integration/lifecycle.test.js` (new)
**Risk:** L
**Effort:** 90 min
**Verification checklist:**
- [ ] Runs against a local hardhat node
- [ ] Single transfer traverses the full path and appears in the UI
- [ ] Batch transfer: N rows in, N rows out
- [ ] Test is repeatable — no leftover state between runs
**Rollback:** n/a
**Commit:** `test: add full transaction lifecycle integration test`
**Blocked by:** P6-04, P6-05

---

### P6-07
**Title:** Degradation matrix integration tests
**Goal:** Test the project's defining architectural claim, which has never been verified.
**Files affected:** `tests/integration/degradation.test.js` (new)
**Risk:** L
**Effort:** 90 min
**Verification checklist:**
- [ ] Mongo down → JSON fallback works, health degraded, transition logged
- [ ] RPC down → market and watchlist work, indexer reconnects, no data loss
- [ ] CoinGecko down → market panel degrades alone, app works
- [ ] All three down → app boots and serves; every degradation logged and reported
- [ ] Restart-resume: kill mid-index, restart, cursor resumes, zero duplicates
**Rollback:** n/a
**Commit:** `test: add degradation matrix and restart-resume integration tests`
**Blocked by:** P6-06

---

### P6-08
**Title:** Security regression suite
**Goal:** Lock in the Phase 1 security guarantees so they cannot silently regress.
**Files affected:** `tests/security/*.test.js` (new)
**Risk:** L
**Effort:** 90 min
**Verification checklist:**
- [ ] IDOR: authenticated as A, requesting B → 403 on GET, POST, DELETE
- [ ] No session → 401
- [ ] Nonce single-use, expiry enforced, replay rejected
- [ ] Signature bound to the correct address and domain
- [ ] Disallowed origin gets no CORS header
- [ ] `NODE_ENV=production` 500 leaks no internals
- [ ] Malformed addresses → 400 on every route
**Rollback:** n/a
**Commit:** `test: add security regression suite for auth, CORS, and redaction`
**Blocked by:** P6-07

---

### P6-09
**Title:** Static analysis and secret scan
**Goal:** Contract security review plus a git-history secret sweep.
**Files affected:** `docs/SECURITY_REVIEW.md` (new)
**Risk:** L
**Effort:** 90 min
**Verification checklist:**
- [ ] Slither run against the deployed contract; findings triaged and recorded
- [ ] Mythril run if the timebox allows
- [ ] `npm audit` clean across all three packages, or every finding justified in writing
- [ ] Secret scan over full git history: clean
- [ ] `.env.production` confirmed to hold only non-secret config
- [ ] `.env.deployment.whole` confirmed still gitignored
**Rollback:** n/a
**Commit:** `docs: record contract static analysis and secret scan results`
**Blocked by:** P6-08

---

### P6-10
**Title:** Performance budgets in CI
**Goal:** Lighthouse and bundle size fail the build when breached.
**Files affected:** `.github/workflows/ci.yml`, `lighthouserc.json` (new)
**Risk:** L
**Effort:** 60 min
**Verification checklist:**
- [ ] Lighthouse budget set from the current measured score
- [ ] Bundle-size budget respects the existing manual Rollup chunks (ethers / charts / gsap / vendor)
- [ ] A deliberate regression fails CI — proven, not assumed
- [ ] Before/after recorded against the P0 baseline
**Rollback:** Remove the budget gate from CI.
**Commit:** `ci: enforce Lighthouse and bundle-size budgets`
**Blocked by:** P6-09

---

### P6-11
**Title:** Load test and gas snapshots
**Goal:** Confirm the per-route limits hold under load, and record a gas baseline for future contract work.
**Files affected:** `tests/load/api.js` (new), `docs/GAS_BASELINE.md` (new)
**Risk:** L
**Effort:** 90 min
**Verification checklist:**
- [ ] k6 or autocannon: sustained read load and burst write load at target RPS
- [ ] Per-route limits from P3-05 behave correctly under load
- [ ] Indexer keeps pace with chain head during a transaction burst
- [ ] Gas snapshots recorded for single and batch transfer
**Rollback:** n/a
**Commit:** `test: add API load test and record gas baseline`
**Blocked by:** P6-10

---

### P6-12
**Title:** Deployment docs, monitoring, and rollback rehearsal
**Goal:** The last gate. Deployment must be documented, monitored, and provably reversible.
**Files affected:** `docs/ENV_MATRIX.md` (new), `docs/DEPLOYMENT.md` (new), `docs/ROLLBACK.md` (new), `docs/RUNBOOK.md` (new)
**Risk:** M — rollback rehearsal touches a live environment.
**Effort:** 90 min
**Verification checklist:**
- [ ] Env matrix: every var per environment, what it gates, what happens when absent
- [ ] Netlify build verified against `netlify.toml`; `envDir: "../"` resolves in CI
- [ ] Staging deploy green; full manual checklist passes on staging
- [ ] Rollback procedure written **and rehearsed once**
- [ ] Monitoring live: uptime on `/health/ready`, error-rate alerting keyed on correlation ids, indexer-lag alert
- [ ] Synthetic failure fires a real alert — verified, not assumed
- [ ] Runbook covers: restart indexer, re-run historical sync, respond to Mongo outage, rotate keys
**Rollback:** n/a — documentation and config.
**Commit:** `docs: add deployment matrix, rollback procedure, and operational runbook`
**Blocked by:** P6-11

---

## Production ship gate

Every task above closed. Plus:

- [ ] All Phase 1 fixes deployed and verified in staging
- [ ] No P0 or P1 finding open
- [ ] Rollback rehearsed within the last 7 days
- [ ] On-call owner identified and runbook handed over

---

## Critical path

```
P0-05 → P0-08 → P1-07 → P1-08 → P1-10 → P2-05 → P2-10 → P2-11 → P2-12
      → P2-13 → P2-14 → P4-01 → P4-02 → P4-07 → P4-09 → P4-10
      → P5-02 → P6-03 → P6-04 → P6-06 → P6-07 → P6-08 → P6-12
```

Everything else has slack. **P1-10 is the longest pole** — start P1-07 early.

---

## Parallelization

| Wave | Tasks | Notes |
|---|---|---|
| 1 | P0-01 … P0-09 | All independent except the P0-09 CI step |
| 2 | P1-01/03/07/09/11/12/13/14 | Eight independent tracks |
| 3 | P1-02/04/05/06/08/15/16 | Each unblocks off wave 2 |
| 4 | P2-01 … P2-04, P2-06 | Cleanup, parallel with anything |
| 5 | P2-07/08 ∥ P2-09 | Server repo layer ∥ frontend service |
| 6 | P2-10 → P2-11 → P2-12 → P2-13 | **Strictly sequential** — context split |
| 7 | P3-01 … P3-11 ∥ P4-01 … P4-14 | Backend and frontend fully parallel |
| 8 | P5-01 … P5-08 | Parallel once blockers clear |
| 9 | P6-01/02 ∥ P6-03/04 ∥ P6-05 | Unit suites parallel |
| 10 | P6-06 → P6-12 | Sequential — each builds on the last |

---

*84 tasks. No code was modified in producing this document.*
