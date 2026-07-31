# ARCHITECTURE — Crypto Portfolio (Deep Dive)

> Phase 2. Builds on PROJECT_OVERVIEW.md. Focus: flows, module contracts, decisions, tradeoffs.

## 1. Complete Application Flows

### A. Market data flow (read-only, no wallet needed)

```
User opens app
  → App.jsx useEffect → fetchCoins(100)          [vite-project/src/api.js]
  → axios GET api.coingecko.com/v3/coins/markets  (DIRECT from browser, not via server)
      • in-memory Map cache, 5-min TTL, key = JSON({url, params})
      • HTTP 429 → wait 2s → retry (3 attempts)
      • total failure → MOCK_COINS (10 hardcoded coins)
  → coins state passed as props to Home / TopCoins / Watchlist / CoinDetails
```

The server ALSO has a CoinGecko path (`GET /api/market/coins?limit=` → marketController → marketService → PriceCache in Mongo, 5-min TTL; plus `GET /api/market/coins/:coinId`, which is an **uncached** passthrough) — but the frontend currently fetches CoinGecko directly. The server market route exists for caching/rate-limit shielding; wiring frontend to it is an available improvement, not current behavior.

### B. Transaction flow (write, wallet needed)

```
TokenTransfer.jsx form (addressTo, amount, message)
  → TransactionContext.sendTransaction()
  → getEthereumContract(): BrowserProvider(window.ethereum) → getSigner() → Contract(address, ABI, signer)
  → contract.addToBlockchain(addressTo, parseEther(amount), message, "Transfer", [])
  → MetaMask popup → user signs → tx to Sepolia
        ── on-chain (Transactions.sol) ──
        fee = amount * feePercentage / 10000   (basis points; default 100 = 1%)
        _transfer(sender → receiver, amount - fee)
        _transfer(sender → owner,   fee)
        transactions.push(struct); emit TransactionAdded(...)
        ── server side (async, independent) ──
  → blockchainService listener catches TransactionAdded via Alchemy RPC
  → normalizeTx() → lowercase addresses, amount as string (BigInt-safe)
  → dbState.connected ? Transaction.findOneAndUpdate({txHash}, upsert)
                      : upsert into server/data/transactions.json
        ── read path ──
  Frontend getAllTransactions() reads history DIRECTLY from contract.getAllTransactions()
  Server GET /api/transactions/:address serves paginated Mongo/JSON history (sender OR recipient match)
```

Note the **dual read paths**: UI transaction list comes from the chain (TransactionContext.getAllTransactions), while the REST API serves indexed history. They can diverge if listener misses events; `syncHistoricalTransactions()` on server boot reconciles by calling `getAllTransactions()` on the contract and bulk-upserting.

### C. Watchlist flow (hybrid local/remote)

```
Star a coin (Watchlist.jsx / TopCoins.jsx)
  → ALWAYS: localStorage key `watchlist_<lowercase-address>` (or `watchlist_anonymous`)
  → if connected: POST /api/watchlist/:address/coins {coinId}
       → watchlistController → dbState ? Mongo Watchlist upsert : data/watchlist.json

On wallet connect → syncLocalWatchlistToDB():
  1. migrate mixed-case localStorage key → lowercase key
  2. merge watchlist_anonymous into user list, delete anon key
  3. diff vs GET /api/watchlist/:address → POST each missing coin
```

localStorage is source of truth offline; DB is durable cross-device copy. Sync is one-directional (local → DB) at connect time.

### D. Admin flow

```
connect → checkAdminStatus(account)
  → contract.owner() (Ownable) → isAdmin = (account == owner, case-insensitive)
  → contract.feePercentage() → display as percent (basis points / 100)
AdminPanel → updateFeePercentage(x%) → contract.setFeePercentage(x*100) → onlyOwner enforced ON-CHAIN
```

UI admin gating is cosmetic; the contract's `onlyOwner` modifier is the real enforcement.

## 2. Core Modules

### Frontend

| Module | Purpose | Talks to |
|---|---|---|
| `context/TransactionContext.jsx` | God-object provider: wallet lifecycle, contract calls (send/batch/allowance/admin), watchlist REST calls, localStorage persistence | MetaMask, contract, `/api/watchlist` |
| `api.js` | CoinGecko client with cache/retry/mock fallback | CoinGecko direct |
| `App.jsx` | Router, lazy routes, global coins fetch, theme shell, ErrorBoundary | api.js |
| `components/*` | Pure-ish views consuming context + coins props | context |
| `utils/constant.js` | Contract address (`VITE_CONTRACT_ADDRESS`) + ABI (`Transactions.json`) + `verifyContract()` boot check w/ exponential retry | MetaMask provider |

Communication pattern: **props down for market data (coins), context for everything wallet/chain/watchlist**. No Redux/Zustand — one context is enough at this size.

### Backend

| Module | Purpose | Talks to |
|---|---|---|
| `index.js` | Boot sequence: env → connectDB → historical sync → event listener → listen. All chain/DB steps non-fatal. | db.js, blockchainService |
| `app.js` | Middleware stack: helmet → cors → json(10kb) → rate-limit(100/15min) → routes → 404 → error handler | routes |
| `config/db.js` | 5-retry Mongo connect; exports mutable `dbState.connected` singleton; forces public DNS (8.8.8.8) to fix `querySrv ECONNREFUSED` on hotspot/campus networks | Mongo |
| `services/blockchainService.js` | Lazy `_init()` (validates ALCHEMY_URL protocol first), `contract.on('TransactionAdded')`, `syncHistoricalTransactions()` bulk upsert. Owns its own **hardcoded minimal ABI**. | Alchemy, Mongo/JSON |
| `services/marketService.js` | CoinGecko fetch + PriceCache upsert (bulkWrite, 5-min freshness) | CoinGecko, Mongo |
| `controllers/*` | Every handler branches on `req.app.locals.dbState.connected` → Mongo path or JSON-file path with identical response shapes | models / data/*.json |
| `models/*` | Transaction (sender/recipient indexed, amount as String, txHash unique+sparse), Watchlist, PriceCache, User (exists, unused by routes currently) | — |

Cross-module communication: `dbState` object exported from db.js, imported by services AND passed via `app.locals` to controllers. Single mutable flag = whole fallback system.

### Smart contract

`Transactions.sol` = ERC20("MyToken","MTK") + Ownable + tx metadata log.
- `feePercentage` in basis points, capped 1000 (10%), owner-only setter.
- `_processTransaction`: fee split, push struct, emit event. Shared by single + batch.
- Batch: loops `_processTransaction` per receiver — N events, N fee transfers (gas-heavy but simple).
- `getAllTransactions()` returns whole array — fine on testnet, unbounded growth is a known scalability limit.

## 3. Important Technical Decisions

| Decision | Why | Alternatives | Tradeoffs |
|---|---|---|---|
| **Everything optional / fallback-first** (no DB, no chain, no API key all OK) | Dev experience: app must boot on any network/laptop with zero setup | Hard-fail on missing deps | Fallback code doubles every controller; JSON files not concurrent-safe; silent degradation can mask real outages |
| **Frontend hits CoinGecko directly** | Simpler; no server needed for market pages; Netlify static deploy works alone | Proxy all through server PriceCache | Browser rate limits per-user; API key exposed in bundle (`VITE_COINGECKO_API_KEY` — demo tier, low risk) |
| **Server indexes chain events into Mongo** | Fast paginated history queries; survives RPC limits | Query chain per request; use The Graph | Listener can miss events (mitigated by boot-time historical sync); dedup via txHash or (sender,timestamp) |
| **Amount stored as String in Mongo** | wei values exceed JS Number precision | BigInt type, Decimal128 | Sorting/aggregating on amount needs conversion |
| **Fee as basis points on-chain** | Integer math, no floats in Solidity | Fixed fee, per-tier | Fee goes to owner — centralization by design (owner = admin) |
| **Custom ERC20 with embedded tx log** | Rich metadata (message/category/tags) atomically with transfer | Plain ERC20 + off-chain DB log | Storage cost per tx; `getAllTransactions` unbounded |
| **Hardcoded minimal ABI in blockchainService** | Server doesn't depend on hardhat artifacts | Import artifact JSON | ⚠️ Must manually keep in sync with contract changes |
| **DNS override to 8.8.8.8 in db.js** | Fix `querySrv ECONNREFUSED` on restrictive networks | Document workaround, env flag | Affects ALL DNS in the Node process; surprising side effect |
| **Manual chunk splitting in vite.config** (ethers/charts/gsap/vendor) | ethers is huge; keep initial bundle small w/ lazy routes | Default chunking | Config maintenance |
| **Signature on connect is decorative** | UX signal of consent | Server-verified SIWE session | No real auth — see AUTHENTICATION notes; watchlist API trusts the address in the URL |

## 4. Before You Change Code — Gotchas

1. **Port mismatch**: `server/index.js` defaults PORT 5000, `server/.env.example` says 3000, and **vite proxy targets 3000**. Actual `.env` presumably sets 3000. If API calls 404/ECONNREFUSED in dev, check this first.
2. **ABI in three places**: contract → `smart_contract/artifacts/.../Transactions.json` → copied to `vite-project/src/utils/Transactions.json` → minimal hand-written ABI in `server/src/services/blockchainService.js`. Change the contract ⇒ update all three + redeploy + update `VITE_CONTRACT_ADDRESS`/`CONTRACT_ADDRESS`.
3. **ethers v5 vs v6**: frontend + server use v6 API (`BrowserProvider`, `parseEther`, `JsonRpcProvider`). `smart_contract/` hardhat plugins use v5. Don't copy snippets across.
4. **`dbState` is a mutable singleton** — imported by reference in services, passed via app.locals to controllers. Reassigning (not mutating) it breaks fallback detection everywhere.
5. **Address normalization**: everything lowercases wallet addresses (Mongo schemas, controllers, localStorage keys, event normalization). New code must too, or lookups silently miss.
6. **Route order**: `/api/transactions/count` declared before `/:address` — keep static routes above param routes.
7. **Rate limiter is global** (100 req/15min/IP) — includes /health. Heavy frontend polling can lock itself out.
8. **`envDir: "../"` in vite.config** — Vite reads env from repo root, not vite-project/. `VITE_*` vars go in root `.env`.
9. **Contract fee applies to BOTH single and batch** transfers, deducted from send amount (receiver gets amount − fee).
10. **User model exists but unused** — no auth routes reference it. Placeholder for future session/auth work.
11. **Watchlist API has zero authentication** — anyone can POST/DELETE any address's watchlist. Signature from connect is never sent/verified server-side.
