# PROJECT_OVERVIEW — Crypto Portfolio

> Phase 1 mental model. See ARCHITECTURE.md for deep dive, PROJECT_MEMORY.md for quick-start memory.

## 1. Purpose & Core Problem

A **crypto portfolio dashboard + Web3 token dApp**. It solves two problems in one app:

1. **Market tracking** — live coin prices, charts, per-wallet watchlists (CoinGecko data).
2. **On-chain token transfers** — send a custom ERC-20 token ("MyToken"/MTK) with messages, categories, batch sends, allowance management, and an owner-only fee system — all via MetaMask.

The differentiator: transfers go through a **custom smart contract** that records rich metadata (message, category, tags) on-chain, and a backend indexes those events into MongoDB so history survives without re-querying the chain.

## 2. Overall Architecture

Three independent packages, orchestrated by a root `package.json` (concurrently):

```
┌─────────────────┐   MetaMask/ethers    ┌──────────────────────┐
│  vite-project/   │ ───────────────────▶ │  Sepolia testnet      │
│  React frontend  │                      │  Transactions.sol     │
│                  │                      │  (ERC20 + tx log)     │
│   /api proxy     │                      └─────────▲────────────┘
│        │         │                                │ Alchemy RPC
│        ▼         │                      ┌─────────┴────────────┐
│  CoinGecko API   │◀──── also direct ───│  server/ (Express)    │
└─────────────────┘                      │  - event listener     │
                                          │  - historical sync    │
                                          │  - CoinGecko cache    │
                                          │  - watchlist CRUD     │
                                          └───────┬──────────────┘
                                                  ▼
                                     MongoDB (or local JSON fallback)
```

**Key architectural theme: graceful degradation.** Every layer has a fallback:
- No MongoDB → server uses `server/data/*.json` files.
- No CoinGecko → frontend uses `MOCK_COINS` hardcoded data.
- No contract address / Alchemy → blockchain features disable, market features keep working.

## 3. Tech Stack & Why

| Layer | Tech | Why |
|---|---|---|
| Frontend | React 18 + Vite 5 | Fast dev builds; lazy-loaded routes for bundle size |
| Styling | Tailwind CSS 3 | "Coral & Cobalt" premium dark theme (`#FF385C` / `#2563EB` on `#050811`) |
| Charts | Chart.js + react-chartjs-2 | Coin price history in CoinDetails |
| Web3 (client) | ethers v6 + MetaMask (`window.ethereum`) | Wallet connect, signing, contract calls |
| Backend | Express 4 (CommonJS) | REST API, security middleware (helmet, rate-limit, CORS) |
| DB | MongoDB via Mongoose 9 | Cache + persistence; optional (JSON fallback) |
| Web3 (server) | ethers v6 + Alchemy RPC | Read-only: event listener + historical sync |
| Contract | Solidity 0.8.27, OpenZeppelin ERC20+Ownable, Hardhat | Standard token base + owner-controlled fees |

⚠️ Version mismatch to remember: **client/server use ethers v6; smart_contract Hardhat tooling uses ethers v5** (waffle-era plugins).

## 4. Folders & Responsibilities

```
/                      Root orchestrator (npm run dev = server + client concurrently)
├── server/            Express API (port 5000 default; .env.example says 3000)
│   ├── index.js       Entrypoint: dotenv → DB connect → blockchain sync → listen
│   ├── data/          JSON fallback storage (watchlist.json, transactions.json)
│   └── src/
│       ├── app.js         Express app: helmet, cors, rate-limit, routes, error handler
│       ├── config/db.js   Mongo connect w/ retries + dbState flag + DNS override
│       ├── routes/        market.js, transactions.js, watchlist.js
│       ├── controllers/   Route handlers; each checks dbState → Mongo or JSON file
│       ├── services/      marketService (CoinGecko+cache), blockchainService (events+sync)
│       └── models/        PriceCache, Transaction, Watchlist, User (Mongoose)
├── vite-project/      React SPA
│   └── src/
│       ├── App.jsx                 Routes + global coin fetch + theme shell
│       ├── api.js                  CoinGecko client: cache, 429 retry, MOCK_COINS fallback
│       ├── context/TransactionContext.jsx  ★ THE hub: wallet, contract, watchlist API
│       ├── components/             Home, TopCoins, Watchlist, CoinDetails,
│       │                           TokenTransfer, AllowanceManager, AdminPanel
│       └── utils/constant.js       Contract address (env) + ABI import + verifyContract
└── smart_contract/    Hardhat project
    ├── contracts/Transactions.sol  ERC20 "MyToken" + fee + on-chain tx log
    ├── scripts/deploy.js           Deploy script
    └── artifacts/                  Compiled ABI (copied to vite-project/src/utils/Transactions.json)
```

## 5. Files You Must Remember

| File | Why it matters |
|---|---|
| `vite-project/src/context/TransactionContext.jsx` | **Single most important file.** All wallet state, contract calls, admin checks, watchlist DB sync. ~540 lines. |
| `smart_contract/contracts/Transactions.sol` | The contract. ERC20 + `addToBlockchain(Batch)` + fee (basis points, owner-only, max 10%) + `TransactionAdded` event. |
| `server/src/services/blockchainService.js` | Event listener + historical sync; hardcoded minimal ABI (must match contract!). |
| `server/src/services/marketService.js` | CoinGecko fetch + 5-min MongoDB PriceCache. |
| `vite-project/src/api.js` | Frontend CoinGecko client + MOCK_COINS fallback. Frontend calls CoinGecko *directly*, not via server. |
| `vite-project/src/utils/constant.js` | Reads `VITE_CONTRACT_ADDRESS`; exports ABI from `Transactions.json`. |
| `server/src/config/db.js` | dbState flag consumed everywhere for fallback logic; forces Google DNS (campus Wi-Fi fix). |
| `vite-project/vite.config.js` | Dev proxy for `/api` → server. |

## 6. Main User/Data Flows

**Market browse:** App.jsx mounts → `fetchCoins(100)` → CoinGecko direct (5-min in-memory cache; MOCK_COINS on failure) → coins prop into Home/TopCoins/Watchlist/CoinDetails.

**Wallet connect:** Navbar → `connectWallet()` in TransactionContext → MetaMask `eth_requestAccounts` → sign message "Connect to Crypto Portfolio" → account + signature to localStorage → `checkAdminStatus()` (account == contract.owner()?) → `syncLocalWatchlistToDB()` (merges anonymous/local watchlists to server).

**Token transfer:** TokenTransfer form → `sendTransaction()` → contract `addToBlockchain(receiver, amount, message, "Transfer", [])` via MetaMask → contract deducts fee to owner, transfers MTK, pushes struct, emits `TransactionAdded` → server's listener catches event → upserts into Mongo (or transactions.json).

**Watchlist:** Star coin → localStorage always; if wallet connected also POST `/api/watchlist/:address/coins` → Mongo Watchlist doc (or watchlist.json). Keys lowercased wallet addresses.

**Admin:** If connected account == contract owner → AdminPanel route lets you `setFeePercentage` (basis points).

## 7. External Services & Integrations

| Service | Used by | Purpose | Key |
|---|---|---|---|
| **CoinGecko API** | frontend `api.js` AND server `marketService.js` | Coin prices/markets/history | `VITE_COINGECKO_API_KEY` / `COINGECKO_API_KEY` (optional, demo tier) |
| **Alchemy RPC (Sepolia)** | server `blockchainService.js`, hardhat deploy | Chain reads, event subscription, deploy | `ALCHEMY_URL` |
| **MetaMask** | frontend | Wallet, signing, tx submission | — |
| **MongoDB** | server | PriceCache, Transactions, Watchlists | `MONGO_URI` (optional!) |
| **Etherscan API** | TransactionContext (`fetchContractABI`, barely used) | ABI fetch | `VITE_ETHERSCAN_API_KEY` |
| **Netlify** | root `netlify.toml` | Frontend hosting | — |

**Env vars checklist:** server: `PORT`, `MONGO_URI`, `ALCHEMY_URL`, `CONTRACT_ADDRESS`, `COINGECKO_API_KEY`. Frontend: `VITE_CONTRACT_ADDRESS`, `VITE_COINGECKO_API_KEY`, `VITE_ETHERSCAN_API_KEY`. Contract: `ALCHEMY_URL`, `DEPLOYER_PRIVATE_KEY`.
