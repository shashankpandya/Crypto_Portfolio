# Environment Variable Matrix (P6-12)

Derived by grepping every `process.env.*` / `import.meta.env.*` reference in `server/`, `vite-project/`, and `smart_contract/`. `server/index.js` now loads `server/.env` first, then the root `.env` fills in anything `server/.env` doesn't define (dotenv never overwrites an already-set var) — see "Env loading fix" below; this replaces the old "server/.env is never loaded" gotcha. `vite.config.js`'s `envDir: "../"` still only loads the root `.env` for `VITE_*` vars — `server/.env`'s contents are never visible to the frontend build.

| Var | Used by | Required? | Gates | Behavior when absent |
|---|---|---|---|---|
| `PORT` | server | No (default 5000) | HTTP listen port | Server listens on 5000; must be 3000 to match the Vite dev proxy target |
| `NODE_ENV` | server, vite-project | No | Error redaction (`development` = verbose), boot-env log severity, `import.meta.env.PROD` | Defaults to non-production behavior; production redaction/severity only activate when explicitly set |
| `MONGO_URI` | server | No | Mongo persistence (`dbState.connected`) | `connectDB()` returns false; every route falls back to `server/data/*.json`; `/health` reports `degraded` |
| `ALCHEMY_URL` | server | No | Blockchain indexer (event listener + historical sync) | `blockchainService._init()` fails explicitly (P3-09), logged at error; indexer disabled, all non-chain routes unaffected |
| `CONTRACT_ADDRESS` | server | No | Same as `ALCHEMY_URL` — indexer needs both | Indexer disabled (falls back to `VITE_CONTRACT_ADDRESS` if that's set instead) |
| `VITE_CONTRACT_ADDRESS` | server (indexer fallback), vite-project (frontend contract calls) | No | Frontend on-chain reads/writes; also usable as the indexer's contract address | Frontend chain features disabled; `contractService.isContractAddressValid()` returns false |
| `AUTH_REQUIRED` | server | No (default `false`) | Whether `requireAuth` middleware enforces a JWT on watchlist routes | `false`/absent → all requests pass through unauthenticated (current shipped default) |
| `JWT_SECRET` | server | **Yes, if `AUTH_REQUIRED=true`** | Signing/verifying session JWTs | `requireAuth` returns 500 on any protected request; `POST /api/auth/verify` returns 500 (`AppError.internal`) |
| `JWT_EXPIRES_IN` | server | No (default `24h`) | JWT expiry | Defaults to 24h sessions |
| `CORS_ORIGIN` | server | No | Allowed origins in production (comma-separated) | In production: allowlist is empty → **every** cross-origin request is rejected. In non-production: dev localhost origins are always allowed regardless |
| `COINGECKO_API_KEY` | server | No | CoinGecko demo-tier rate limit | Requests go out unauthenticated to CoinGecko's public rate limit (much lower) |
| `VITE_COINGECKO_API_KEY` | server (fallback), vite-project (direct-fetch fallback path) | No | Same as above, for the frontend's direct-CoinGecko fallback if the server route fails | Same degraded rate limit |
| `VITE_ETHERSCAN_API_KEY` | vite-project | No | `AdminPanel`'s `fetchContractABI` (Etherscan lookup) — dead-code path, not on the critical UI flow | That specific lookup fails; does not affect the rest of the app |
| `LOG_LEVEL` | server | No (default `info`, or `silent` under `NODE_ENV=test`) | Pino log verbosity | Defaults as above |
| `DEPLOYER_PRIVATE_KEY` | smart_contract (`hardhat.config.js`, deploy-time only) | Only for `npx hardhat run scripts/deploy.js --network sepolia` | Which account deploys the contract | `networks.sepolia.accounts` becomes `[]`; any deploy attempt to Sepolia fails immediately with no accounts configured |

## Files

- Root `.env` — loaded by `server/index.js` (second, after `server/.env`) and (for `VITE_*` vars) by `vite-project/vite.config.js`'s `envDir: "../"`. **Not committed** (gitignored).
- Root `.env.example` — committed template, tracked in git. No real secrets.
- Root `.env.production` — **tracked and committed**. Per `docs/SECURITY_REVIEW.md` §4, this session could not read its contents (project's own `.env*` read-deny rule) to confirm it holds only non-secret config — flagged there for manual confirmation, same flag applies here.
- `.env.deployment.whole` — gitignored, confirmed via `git check-ignore -v` (P6-09).
- `server/.env` — loaded first by `server/index.js` (its values win over the root `.env` for any key both files define). Still gitignored, so it never reaches a hosting platform on its own.

## Env loading fix (this session)

`server/index.js` previously loaded only the root `.env`, so `MONGO_URI`, `ALCHEMY_URL`, `CONTRACT_ADDRESS`, and `COINGECKO_API_KEY` (all only ever defined in `server/.env`) were never actually read — the server always ran with no DB, no indexer, and no CoinGecko key, regardless of local or deployed environment. Fixed by loading both files. This was a real functional bug, not just a docs gap — verified live (real Mongo connection, 100 real coins, real SIWE auth + watchlist round-trip).

Separately, `VITE_CONTRACT_ADDRESS` was not set in **any** env file — added to the root `.env` locally.

## Production deployment checklist

**Neither `.env` nor `server/.env` is committed to git** (both gitignored) — so nothing added or fixed in either file today reaches a deployed environment automatically. Whatever platform hosts this app (Netlify/Vercel/Render/etc.) needs each of the following set directly in its own environment-variable dashboard, independent of this repo:

Backend host needs: `MONGO_URI`, `ALCHEMY_URL`, `CONTRACT_ADDRESS`, `COINGECKO_API_KEY`, `AUTH_REQUIRED`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CORS_ORIGIN` (must list the frontend's exact production origin — in production `NODE_ENV=production` mode the CORS allowlist is `CORS_ORIGIN` **only**, no localhost fallback; an empty/missing `CORS_ORIGIN` in production silently blocks every cross-origin request from the browser, including watchlist, with no server-side error to point at), `PORT`, `NODE_ENV=production`.

Frontend build needs: `VITE_CONTRACT_ADDRESS` (newly required — see above), `VITE_COINGECKO_API_KEY` (optional but recommended), `VITE_API_BASE_URL` (see below — **required** if the frontend and backend are on different hosts).

If a feature "works locally but not in production" (e.g. watchlist), the CORS_ORIGIN mismatch above is a common cause of exactly that symptom, because the Vite dev proxy makes CORS a non-issue locally but a real, silent failure in a production deployment where the frontend and backend are different origins.

## Split-host deployment (frontend on a static host, backend elsewhere) — confirmed root cause, 2026-08

`cryptofolio-web3.netlify.app` serves only the built frontend — Netlify is a static host with no persistent Node process behind it. Every axios call in this app (`api.js`, `WalletContext.jsx`, `WatchlistContext.jsx`, `ContractContext.jsx`) uses a **relative** path like `/api/watchlist/...`, which resolves against whatever origin the page itself is served from. On Netlify that's Netlify's own SPA fallback, which serves `index.html` back for any unmatched route (confirmed live: `GET /api/market/coins` returns HTTP 200 with the frontend's own HTML, not JSON) — so every API call silently hits the wrong thing instead of a real backend. This is **not** a code bug in the request logic; the backend was simply never deployed anywhere reachable.

Two ways to fix this for real:

1. **Deploy `server/` to a host that runs a persistent Node process** (Render, Railway, Fly.io, a VPS — Netlify itself cannot run this Express app as-is; Netlify Functions would need a rewrite of every route into a serverless handler, not recommended given the working, tested Express app that already exists). Then:
   - Set `VITE_API_BASE_URL` on the Netlify frontend build to that backend's URL (added this session — see `main.jsx`; unset, behavior is unchanged).
   - Set `CORS_ORIGIN` on the backend to the exact Netlify URL (`https://cryptofolio-web3.netlify.app`, no trailing slash).
   - Set every other backend var in the checklist above on that host's dashboard.
2. Alternatively, put both frontend and backend behind one origin (e.g. a reverse proxy, or serve the built frontend from the Express app itself) — bigger change, not needed if (1) is acceptable.

This agent session has no hosting credentials for Netlify or any backend host, so the actual deploy step needs to happen from your side — the code above is ready for it the moment a backend URL exists.
