# FREEZE_LIST.md — Invariants That Must Not Break

**Phase 0 gate:** These constraints were verified against actual behaviour and must remain true in all future phases.

> If any fix in Phase 1+ would break one of these invariants, STOP and discuss the design change first.

---

## API Shape Contracts

| Endpoint | Invariant |
|----------|-----------|
| `GET /health` | Always responds (no rate-limit, no DB guard). Returns `{ success, status, db, uptime, timestamp }`. |
| `GET /api/transactions/count` | Route must appear **before** `GET /api/transactions/:address` in `routes/transactions.js`; otherwise `:address` swallows the literal `count`. |
| All API routes | Response shape must include `{ success: boolean, ... }` — never a bare string or array. |
| `GET /api/watchlist/:walletAddress` | Returns `{ success, data: [] }` when wallet has no watchlist. Never 404. |
| `POST /api/watchlist/:walletAddress/coins` | Idempotent — adding an existing coin does not duplicate it. |
| `DELETE /api/watchlist/:walletAddress/coins/:coinId` | Returns `{ success: true }` even if coin was not in the list. |

---

## State Singleton Constraint

```
dbState = { connected: false }          ← correct
dbState.connected = true                ← correct
dbState = { connected: true }           ← FORBIDDEN (reassignment breaks reference in app.locals)
```

`server/src/config/db.js` mutates `dbState.connected` in place. Any refactor that reassigns `dbState` breaks all callers that hold the original reference.

---

## Address Normalisation

All wallet addresses are stored and compared in **lowercase**. Applies to:
- MongoDB documents (`server/src/models/Watchlist.js`)
- JSON fallback file keys (`server/data/watchlist.json`)
- Frontend localStorage keys
- API route parameters

Never compare addresses case-sensitively. Always `.toLowerCase()` before store or lookup.

---

## Vite Environment Config

```js
// vite-project/vite.config.js
envDir: "../"   // reads root .env, not vite-project/.env
```

`VITE_*` variables must live in the **root** `.env` file, not `vite-project/.env`. Deleting `envDir` breaks contract address injection.

---

## Contract Deployment

| Item | Value |
|------|-------|
| **Contract address** | `0x911F681f9eB8fdfc4D9df9a881E81Ce0E83B7395` |
| **Network** | Sepolia (chain ID 11155111) |
| **ABI copies** | 3 — must all be updated together on redeploy |
| **Immutability** | Contract cannot be patched; bugs require new deploy + address update |

See `docs/CONTRACT_STATE.md` for full details.

---

## dotenv Load Chain

```
index.js → require('dotenv').config()   → reads root .env (PORT, CORS, rate limits)
index.js → require('dotenv').config({ path: 'server/.env' })   → reads MONGO_URI, PORT override
hardhat.config.js → require('dotenv').config({ path: '../.env' })  → reads root .env ONLY
```

**Bug (noted):** `hardhat.config.js` reads root `.env` but `ALCHEMY_URL`/`DEPLOYER_PRIVATE_KEY` live in `smart_contract/.env`. Hardhat cannot reach Sepolia as shipped. Tracked as Phase 1 fix.

---

## ERC20 / BigInt Precision

All token amounts are 18-decimal BigInt. Never coerce to `Number` — precision loss is silent and incorrect. Use `ethers.formatEther()` for display only.

---

## Fallback Data File

`server/data/watchlist.json` is the production fallback when Mongo is unavailable. Its structure is:

```json
{ "<lowercase-address>": ["<coinId>", ...] }
```

Never change this shape without updating `server/src/controllers/watchlistController.js` fallback read/write paths simultaneously.
