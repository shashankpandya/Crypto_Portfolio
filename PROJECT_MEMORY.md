# PROJECT_MEMORY.md — Crypto Portfolio

> Quick-load context for future Claude sessions & future me. Deep dives: PROJECT_OVERVIEW.md, ARCHITECTURE.md.

## 📊 Interactive Project Explorer

**[PROJECT_EXPLORER.html](./PROJECT_EXPLORER.html)** — open in a browser. Self-contained, no build step, no deps.

Start here when returning after a break. Eight linked sections:

| # | Section | Use it when |
|---|---|---|
| 01 | Project Brain | Re-establishing the mental model; stack + maturity at a glance |
| 02 | Architecture Map | Clickable layers (User → Frontend → State → Services → Backend → Persistence → Chain → External) with purpose/files/deps per node |
| 03 | Codebase Navigator | "Which file do I open?" — tree of meaningful files w/ key functions + when to modify |
| 04 | Feature Knowledge Cards | Per-feature journey, data flow, **implementation reality vs intent**, limits |
| 05 | Flow Diagrams | Lifecycle, auth, write path, API comms, fee math, degradation |
| 06 | Developer Memory | Forgotten details, past decisions, do-not-break list, debugging paths |
| 07 | Tech Debt Radar | Critical / Medium / Low, filterable, each with a fix |
| 08 | Modification Guide | "If I want to change X, touch these files in this order" |

Doc roles: **EXPLORER** = navigate & decide · **MEMORY** (this file) = fast context load · **ARCHITECTURE** = flows & tradeoffs · **OVERVIEW** = first-principles intro.

## What This Is

Crypto portfolio dashboard + Web3 dApp. Two halves:
- **Market**: CoinGecko prices/charts/watchlists (works with no wallet, no server, no DB).
- **Chain**: custom ERC20 "MyToken" (MTK) on Sepolia — transfers with message/category metadata, batch sends, allowances, owner-set fee (basis points, max 10%). Via MetaMask + ethers v6.

Three packages: `server/` (Express+Mongo), `vite-project/` (React 18+Vite+Tailwind), `smart_contract/` (Hardhat+Solidity 0.8.27).

## Architecture in 5 Lines

1. Frontend fetches CoinGecko **directly** (api.js: 5-min cache, 429 retry, MOCK_COINS fallback).
2. Frontend talks to contract **directly** via MetaMask (TransactionContext.jsx = the hub file).
3. Server independently listens for `TransactionAdded` events (Alchemy RPC) → indexes into Mongo → serves paginated history at `/api/transactions/:address`.
4. Watchlist: localStorage always + REST sync to Mongo when wallet connected (one-way local→DB at connect).
5. **Everything degrades gracefully**: no Mongo → `server/data/*.json`; no CoinGecko → mocks; no contract env → chain features disable. `dbState.connected` singleton (config/db.js) drives all fallback branches.

## Commands

```bash
npm run dev           # root: server (nodemon) + client (vite) concurrently
npm run install:all   # install root + server + vite-project + smart_contract
npm run build         # vite build
# smart_contract/: npx hardhat compile | npx hardhat run scripts/deploy.js --network sepolia
```

## Environment

- **Root `.env`** (vite envDir="../"!): `VITE_CONTRACT_ADDRESS`, `VITE_COINGECKO_API_KEY`, `VITE_ETHERSCAN_API_KEY`
- **server/.env**: `PORT` (⚠️ code defaults 5000, vite proxy expects **3000** — keep PORT=3000), `MONGO_URI`, `ALCHEMY_URL` (must start https/wss), `CONTRACT_ADDRESS`, `COINGECKO_API_KEY`
- **smart_contract/.env**: `ALCHEMY_URL`, `DEPLOYER_PRIVATE_KEY`
- All optional except for the feature they enable. App boots with none.

## Key Files

| File | Role |
|---|---|
| `vite-project/src/context/TransactionContext.jsx` | ★ Wallet, contract calls, admin, watchlist sync — change chain behavior HERE |
| `vite-project/src/api.js` | CoinGecko client + mocks |
| `vite-project/src/App.jsx` | Routes (lazy), global coins fetch |
| `vite-project/src/utils/constant.js` | Contract address + ABI export |
| `server/src/app.js` | Middleware + routes |
| `server/src/config/db.js` | Mongo retry connect + `dbState` flag + forces DNS 8.8.8.8 |
| `server/src/services/blockchainService.js` | Event listener + historical sync, **hand-written ABI** |
| `server/src/services/marketService.js` | CoinGecko → PriceCache (5-min TTL) |
| `smart_contract/contracts/Transactions.sol` | The contract |
| `vite-project/vite.config.js` | /api proxy → :3000, manual chunks, envDir root |

## Critical Gotchas (read before editing)

1. **ABI lives in 3 places** — contract artifact, `vite-project/src/utils/Transactions.json`, hand-written in `blockchainService.js`. Contract change ⇒ update all + redeploy + new address in both env vars.
2. **ethers v6** in frontend/server; **v5** in smart_contract hardhat tooling. Don't mix API styles.
3. **Port**: server code default 5000 vs proxy 3000. `.env` must say PORT=3000.
4. **Lowercase all wallet addresses** — schemas, controllers, localStorage keys all assume it.
5. `dbState` mutate, never reassign.
6. Route order: `/count` before `/:address` in transactions routes.
7. Global rate limit 100 req/15min/IP on server.
8. Fee deducted from send amount on-chain: receiver gets amount − fee, fee → owner.
9. `checkAllowance` / `approveAllowance` exist **twice** — `utils/constant.js` and `TransactionContext.jsx`. `AllowanceManager.jsx` imports the `constant.js` pair. Fix bugs in both or delete one.
10. Server market routes are `GET /api/market/coins?limit=` (cached via PriceCache) and `GET /api/market/coins/:coinId` (**uncached** passthrough). Neither is called by the frontend today.

## Auth Reality

**SIWE authentication implemented (P1-08, P1-09, P1-10).**
- Nonce endpoint (`GET /api/auth/nonce?address=0x...`) generates single-use 5-min TTL nonces.
- Verify endpoint (`POST /api/auth/verify`) recovers EIP-4361 signer, verifies nonce, upserts `User` model (`lastActive`), and returns 24h JWT.
- Frontend (`TransactionContext.jsx`) executes nonce → sign → verify → JWT stored in `sessionStorage`.
- `Authorization: Bearer <JWT>` header auto-injected by axios interceptor for watchlist endpoints.
- `requireAuth` middleware (`server/src/middleware/auth.js`) enforces JWT and address ownership matching behind `AUTH_REQUIRED` feature flag (default: `false`).
- Account changes (`accountsChanged`) and logout wipe `sessionStorage` session token.

## Common Debugging Areas

- **"unsupported protocol" on boot** → `ALCHEMY_URL` malformed/missing (validateAlchemyUrl catches it now, non-fatal).
- **`querySrv ECONNREFUSED` Mongo** → restrictive network DNS; db.js already forces 8.8.8.8.
- **API 404/refused in dev** → port mismatch (see gotcha 3).
- **Tx history missing on chain UI vs API** → listener missed events; restart server (boot runs `syncHistoricalTransactions`).
- **Contract calls silently skipped** → `VITE_CONTRACT_ADDRESS` unset/invalid; `verifyContract()` warns in console.
- **429 from CoinGecko** → api.js retries; add `VITE_COINGECKO_API_KEY` (demo tier).
- **Rate-limited own API** → global limiter, includes /health.

## Folder Map

```
server/src/{app,config,routes,controllers,services,models}  # each controller: Mongo path + JSON fallback path
server/data/          # watchlist.json, transactions.json fallback storage
vite-project/src/     # App, api, context (state hub), components (lazy views), utils (contract glue)
smart_contract/       # Hardhat; contracts/Transactions.sol; scripts/deploy.js
```

## For Future Developers

- Design theme: "Coral & Cobalt" dark — `#FF385C` / `#2563EB` on `#050811`, Tailwind + premium-* classes in App.css.
- Frontend market data intentionally bypasses server; server PriceCache route exists if you want to shield rate limits — wire `fetchCoins` to `/api/market/coins` to switch.
- Batch transfer loops `_processTransaction` per receiver — gas-heavy, fine for testnet.
- `getAllTransactions()` on contract is unbounded — will not scale mainnet.
- Branch convention: feature branches → `main` (current: `feature/blockchain-market-services`).
