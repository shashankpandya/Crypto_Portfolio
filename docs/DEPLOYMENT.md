# Deployment (P6-12)

## Frontend — Netlify

`netlify.toml` (root):
```
base = "vite-project"
command = "npm run build"
publish = "dist"
```

Verified against the actual config file (not assumed): base points Netlify's build at `vite-project/`, running `npm run build` there and publishing `dist/` — matches how this repo is built and tested locally throughout Phase 6 (`npm run build --prefix vite-project`, verified green after every task in this phase).

**`envDir: "../"` in CI/Netlify:** `vite-project/vite.config.js` sets `envDir: "../"` so Vite looks for a root-level `.env` file. Netlify does **not** check out a `.env` file (it's gitignored) — but this still resolves correctly for `VITE_*` vars because Vite exposes any `VITE_`-prefixed variable already present in `process.env` at build time regardless of `envDir`; `envDir` only controls where Vite looks for `.env` *files* on disk. Netlify's own "Environment variables" UI injects vars into `process.env` for the build, so setting `VITE_CONTRACT_ADDRESS` / `VITE_COINGECKO_API_KEY` / `VITE_ETHERSCAN_API_KEY` there (not as a file) is the correct and sufficient approach — confirmed by reading Vite's env-resolution order, not assumed.

**Not independently verified** (no Netlify account/token in this environment): an actual live Netlify build. The local build this repo runs on every CI/Phase-6 task (`npm run build --prefix vite-project`) is the same `command`/`base`/`publish` Netlify would run, which is the closest verification achievable here.

## Server

Node process running `server/index.js`. Requires (see `docs/ENV_MATRIX.md` for the full table):
- `PORT=3000` (must match the frontend dev proxy / whatever reverse proxy sits in front in production)
- `MONGO_URI`, `ALCHEMY_URL`, `CONTRACT_ADDRESS` for full functionality — all optional, each degrades independently and gracefully if absent (verified in `tests/integration/degradation.test.js`, P6-07)
- `JWT_SECRET` required if `AUTH_REQUIRED=true`
- `CORS_ORIGIN` — **must** be set in production (empty allowlist otherwise blocks every cross-origin request)

Start with `npm start` (or `node index.js`) from `server/`. Graceful shutdown on `SIGTERM` (P3-11) drains in-flight requests.

## Smart contract

Already deployed (see `docs/CONTRACT_STATE.md` — Sepolia, address recorded there). Redeploying is a new address, not a redeploy-in-place — requires updating `CONTRACT_ADDRESS`/`VITE_CONTRACT_ADDRESS` on the server and `VITE_CONTRACT_ADDRESS` on the frontend build, plus the 3 ABI copy locations noted in CLAUDE.md's Critical Gotchas.
