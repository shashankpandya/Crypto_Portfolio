# IMPLEMENTATION_PROGRESS.md — Implementation Log

## Phase 0 — Baseline & Safety Net
- [x] P0-01: Capture raw baseline response from `/api/market/coins` (`docs/BASELINE.raw.json`)
- [x] P0-02: Add regression tests for baseline response format
- [x] P0-03: Add schema validator for coin response objects
- [x] P0-04: Fix CORS origin wildcard fallback in production
- [x] P0-05: Enforce request payload size limit on Express middleware
- [x] P0-06: Sanitize log output to prevent token/key leaks
- [x] P0-07: Standardize error response structure across all controllers

## Phase 1 — Core Architecture & Authentication
- [x] P1-01: Align PriceCache schema with marketService write shape
- [x] P1-02: Fix getCoins sort and cache-hit response
- [x] P1-03: Add logIndex to transaction dedupe key (model + index)
- [x] P1-04: Wire txHash+logIndex in blockchainService dedupe paths
- [x] P1-05: Replace positional fallbacks in normalizeTx
- [x] P1-06: Backfill collapsed batch transfers (`scripts/reindex.js`)
- [x] P1-07: Standardize Ethereum address casing across server controllers
- [x] P1-08: Add SIWE nonce and verify endpoints (`server/src/routes/auth.js`, `authController.js`)
- [x] P1-09: Add requireAuth middleware behind AUTH_REQUIRED flag (`server/src/middleware/auth.js`)
- [x] P1-10: Wire frontend to SIWE and enable authenticated wallet flow (`vite-project/src/context/TransactionContext.jsx`)
- [x] P1-11: Unify duplicated allowance helpers (`vite-project/src/utils/constant.js`, `TransactionContext.jsx`)
- [x] P1-12: Standardize gas price and limit defaults (`vite-project/src/context/TransactionContext.jsx`)
- [x] P1-13: Remove hardcoded USD rate and fake gas estimate (`vite-project/src/components/TokenTransfer.jsx`)
