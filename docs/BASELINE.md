# API Baseline

**Task:** P0-01
**Captured:** 2026-08-01
**Commit at capture:** `96c2c2e`
**Capture tool:** [`server/scripts/capture-baseline.js`](../server/scripts/capture-baseline.js)
**Raw record:** [`BASELINE.raw.json`](BASELINE.raw.json)

This file is the reference every later phase diffs against. If a change alters
any status code or response shape recorded here and the task did not say it
would, that is a regression.

---

## How this was captured

`capture-baseline.js` mounts `server/src/app.js` in-process on an ephemeral
port. It deliberately does **not** boot `server/index.js`, so the blockchain
indexer never runs and no on-chain writes occur during capture. `dbState` is
mutated in place (never reassigned) to switch modes, matching the invariant the
app relies on.

Re-run with:

```bash
node server/scripts/capture-baseline.js
```

Takes ~13 minutes on a host that cannot reach Mongo — `connectDB()` burns five
attempts with a 5 s delay plus a DNS timeout per attempt before giving up. That
is the real connect path, so it is left intact rather than short-circuited. On a
host that reaches Mongo the run takes well under a minute.

### Mongo-mode writes are opt-in

Six cases mutate state: `market.coins`, `market.coins.cachehit`,
`watchlist.add`, `watchlist.add.readd`, `watchlist.remove.absentcoin`,
`watchlist.remove`.

In fallback mode they only touch `server/data/watchlist.json` and are
self-restoring, so they always run. Against Mongo they are **skipped by
default**, because:

- `watchlist.add` creates a `Watchlist` document that `watchlist.remove` does
  **not** delete — `removeCoin` empties `coins[]` and leaves the document behind.
- `market.coins` runs `PriceCache.bulkWrite(…, { upsert: true })`, overwriting
  real cache entries that `market.coins.cachehit` then reads back.

Opt in only when `MONGO_URI` points at a throwaway database:

```bash
BASELINE_ALLOW_WRITES=1 node server/scripts/capture-baseline.js
```

The raw record carries `dbUpWritesSkipped` so a later diff can tell "not
captured" from "captured and unchanged".

---

## Capture environment — read this before trusting a diff

The capture host has **no outbound network**. DNS resolution and TLS both fail:

- `dns.resolveSrv('_mongodb._tcp.…mongodb.net')` → `ECONNREFUSED`
- `fetch('https://api.coingecko.com/api/v3/ping')` → `ECONNRESET`

Confirmed outside the tool sandbox too, so this is the machine/network (a
Cloudflare WARP client is installed), not the harness.

Two consequences, both material:

1. **`dbState.connected === true` mode is NOT captured.** Every row below is the
   JSON-fallback path. The Mongo path is recorded as *expected shape derived
   from source*, clearly marked, and must be re-captured on a networked host
   before Phase 2 (P2-07 / P2-08 are the tasks that claim "byte-identical in
   both DB modes" — that claim is unverifiable until then).
2. **CoinGecko happy paths are NOT captured.** Both market routes return their
   upstream-failure branch. That failure branch is itself a real, useful
   baseline row — it is how the app behaves during a CoinGecko outage — but the
   200 shapes are derived from source, not observed.

> **Blocking gap for the Phase 0 tag:** re-run this script on a host with
> outbound network and Mongo Atlas reachable, then replace the marked sections.
> Tracked in the P0-01 PR description.

---

## Environment finding — MONGO_URI is not loaded

`server/index.js:5` loads **only** the repository-root `.env`:

```js
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
```

Root `.env` defines: `PORT`, `NODE_ENV`, `API_TIMEOUT`, `CORS_ORIGIN`,
`RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`, `SLOW_DOWN_WINDOW_MS`,
`SLOW_DOWN_DELAY_AFTER`, `SLOW_DOWN_DELAY_MS`.

`MONGO_URI`, `ALCHEMY_URL`, `CONTRACT_ADDRESS` and `COINGECKO_API_KEY` live in
`server/.env`, which is **never loaded**. As shipped, `connectDB()` logs
`MONGO_URI environment variable is not set` and returns `false` — the server
always runs on the JSON fallback path regardless of whether Mongo is reachable.

The capture script loads both files so it *can* reach the Mongo mode; the app
itself cannot. Recorded here as an observation only — no code changed in P0-01.

---

## Route inventory

Every route reachable in `server/src/routes/` plus the two app-level handlers.

| # | Method | Path | Source |
|---|---|---|---|
| 1 | GET | `/health` | `app.js:80` |
| 2 | GET | `/api/market/coins` | `routes/market.js` |
| 3 | GET | `/api/market/coins/:coinId` | `routes/market.js` |
| 4 | GET | `/api/transactions/count` | `routes/transactions.js` |
| 5 | GET | `/api/transactions/:address` | `routes/transactions.js` |
| 6 | GET | `/api/watchlist/:walletAddress` | `routes/watchlist.js` |
| 7 | POST | `/api/watchlist/:walletAddress/coins` | `routes/watchlist.js` |
| 8 | DELETE | `/api/watchlist/:walletAddress/coins/:coinId` | `routes/watchlist.js` |
| 9 | — | any unmatched path | `app.js:96` (404) |
| 10 | — | any thrown error | `app.js:106` (global handler) |

Route-order invariant: `/count` is declared **before** `/:address`. Reversing
that order makes `count` parse as an address. Do not reorder.

Test address used throughout: `0xcb9d0aa389456eb5a46c772f38b59c40b092ebcc`
(the only key present in `server/data/watchlist.json`).

---

# 1. `GET /health`

Mounted at `/health`, outside the `/api` prefix, so no `/api` middleware applies
to it. It reads `dbState` from `app.locals` and reports rather than short-
circuits, so it answers in both DB modes. (The comment at `app.js:74-78` says it
is placed after a DB guard; that guard is the no-op described under
*Cross-cutting behavior* below.)

### DB down — **observed**

`503`

```json
{
  "success": false,
  "status": "degraded",
  "db": "disconnected",
  "uptime": 1.3074865,
  "timestamp": "2026-08-01T15:45:56.720Z"
}
```

### DB up — **derived from `app.js:80-91`, not observed**

`200`

```json
{
  "success": true,
  "status": "ok",
  "db": "connected",
  "uptime": 12.34,
  "timestamp": "2026-08-01T15:45:56.720Z"
}
```

`uptime` and `timestamp` vary per call — compare keys and types, not values.

> Note for P3-10: a 503 here means "Mongo is down", but the app serves every
> watchlist and transaction route perfectly well in that state. Uptime monitors
> pointed at `/health` currently page for a non-outage.

---

# 2. `GET /api/market/coins`

Query: `limit` (default 100, clamped to 1…250 by `marketController.js`).

### Upstream unreachable — **observed, both DB modes**

`500`

```json
{
  "success": false,
  "message": "CoinGecko API error: read ECONNRESET"
}
```

Identical for `?limit=3`, a repeat of the same call, and `?limit=abc`. Note the
raw upstream error string is echoed to the client — P1-14 redacts this.

### Upstream reachable — **derived from `marketService.js` + controller, not observed**

`200`

```json
{
  "success": true,
  "count": 3,
  "data": [ { "id": "bitcoin", "symbol": "btc", "name": "Bitcoin", "…": "…" } ]
}
```

**Known-broken behavior to preserve awareness of, not to preserve:** the cache
path is the subject of P1-01 and P1-02. On a cache *hit* the response is not
expected to equal the cache *miss* response, because the PriceCache schema
discards most fields the service writes. Do not treat the pre-fix cache-hit
payload as a contract.

### Rate limited — **derived, not observed**

`429` when the upstream error message contains `429`:

```json
{ "success": false, "message": "CoinGecko rate limit reached. Please try again shortly." }
```

---

# 3. `GET /api/market/coins/:coinId`

No cache. Proxies CoinGecko directly.

### Upstream unreachable — **observed, both DB modes**

`500`

```json
{ "success": false, "message": "read ECONNRESET" }
```

Observed for both `/bitcoin` and `/definitely-not-a-coin` — with no network,
the 404 branch is unreachable.

### Derived, not observed

| Case | Status | Body |
|---|---|---|
| Valid id | 200 | `{ "success": true, "data": { …full CoinGecko coin object… } }` |
| Unknown id | 404 | `{ "success": false, "message": "Coin not found: <id>" }` |
| Upstream 429 | 429 | `{ "success": false, "message": "CoinGecko rate limit reached. Please try again shortly." }` |

`coinId` is lowercased and trimmed before use.

---

# 4. `GET /api/transactions/count`

### DB down — **observed**

`200`

```json
{ "success": true, "count": 0 }
```

`server/data/transactions.json` does not exist, so `getLocalTransactions()`
returns `[]`. **This is a real gap, not an empty-database result:** the indexer
never wrote a fallback file. Distinguish "no transactions" from "no file" when
diffing later.

### DB up — **derived, not observed**

`200`, same shape, `count` = `Transaction.countDocuments()`.

---

# 5. `GET /api/transactions/:address`

Query: `page` (≥1, default 1), `limit` (1…100, default 20).

### DB down — **observed**

All three cases return `200`:

| Case | `pagination` |
|---|---|
| `?page=1&limit=5` | `{ total: 0, page: 1, limit: 5, totalPages: 0, hasNextPage: false }` |
| no query | `{ total: 0, page: 1, limit: 20, totalPages: 0, hasNextPage: false }` |
| `?page=99` | `{ total: 0, page: 99, limit: 20, totalPages: 0, hasNextPage: false }` |

```json
{ "success": true, "data": [], "pagination": { "…": "…" } }
```

**`0xzzz` returns `200`, not `400`.** There is no address-format validation on
this route — the malformed address simply matches nothing. P1-09 covers the
watchlist routes; this route's validation lands with P3-03. Until then, `200`
with an empty array is the recorded baseline for garbage input.

Out-of-range `page` returns an empty array, not a 404, and echoes the requested
page back.

### DB up — **derived, not observed**

Same envelope. Filter is `{ $or: [{ sender: addr }, { recipient: addr }] }`,
sorted `timestamp: -1`, `.lean()`. Address is lowercased before querying —
the lowercase-address convention is load-bearing and must survive Phase 2.

---

# 6. `GET /api/watchlist/:walletAddress`

### DB down — **observed**

Known wallet → `200`:

```json
{
  "success": true,
  "data": {
    "walletAddress": "0xcb9d0aa389456eb5a46c772f38b59c40b092ebcc",
    "coins": [
      { "coinId": "ethereum", "addedAt": "2026-08-01T15:45:57.366Z" },
      { "coinId": "tether",   "addedAt": "2026-08-01T15:45:57.366Z" },
      { "coinId": "bitcoin",  "addedAt": "2026-08-01T15:45:57.366Z" }
    ]
  }
}
```

**`addedAt` is fabricated on every read.** The JSON file stores a bare array of
coin ids with no timestamps, so the controller stamps `new Date()` at response
time — every coin shares the current instant, and the value changes on each
request. Diff `coinId` values and array order; never diff `addedAt` in fallback
mode.

Unknown wallet → `200` with `coins: []`. **Not a 404** — deliberate, so a
first-time visitor does not see an error.

Malformed address `0xzzz` → `200` with `coins: []`. No validation. P1-09.

### DB up — **derived, not observed**

`200`, `data` is the Mongo document (`_id`, `walletAddress`, `coins[]`,
`createdAt`, `updatedAt`) or the synthetic `{ walletAddress, coins: [] }` when
absent. `addedAt` is real and stable in this mode. The two modes therefore
return **structurally different** `data` objects today — worth knowing before
P2-07 claims byte-identical parity.

---

# 7. `POST /api/watchlist/:walletAddress/coins`

Body: `{ "coinId": "<id>" }`

### DB down — **observed**

Valid → `200`, echoes the full post-write list:

```json
{
  "success": true,
  "message": "solana added to watchlist.",
  "data": { "walletAddress": "0xcb9d…", "coins": [ { "coinId": "ethereum", "addedAt": "…" }, "…" ] }
}
```

New coin appends to the end. Adding a coin already present is a silent no-op
that still returns `200` and the same message.

Missing/empty body → `400`:

```json
{ "success": false, "message": "coinId is required in the request body." }
```

`coinId` is lowercased and trimmed.

### DB up — **derived, not observed**

`200`, `data` is the saved Mongoose document. Uses the `addCoin` instance
method and upserts when no document exists.

---

# 8. `DELETE /api/watchlist/:walletAddress/coins/:coinId`

### DB down — **observed**

Existing wallet → `200`, echoes the post-delete list:

```json
{ "success": true, "message": "solana removed from watchlist.", "data": { "…": "…" } }
```

Unknown wallet → `404`:

```json
{ "success": false, "message": "Watchlist not found for this wallet." }
```

**Asymmetry to preserve:** GET on an unknown wallet is `200`; DELETE on an
unknown wallet is `404`. Deleting a coin that is not in an *existing* wallet's
list is `200` (filter removes nothing).

### DB up — **derived, not observed**

Same status codes. `404` when `Watchlist.findOne` returns null.

---

# 9. Unmatched routes

**Observed, both DB modes.** `GET /api/nope` and `GET /` both → `404`:

```json
{ "success": false, "message": "Route not found." }
```

There is no static file handler and no frontend served from Express — `/` is a
404 by design.

---

# 10. Global error handler

**Not observed** — no recorded case reached it; controllers catch their own
errors today. `app.js:106`:

- Status: `err.status ?? err.statusCode ?? 500`
- Body: `{ success: false, message: err.message || 'Internal server error.' }`
- `stack` included only when `NODE_ENV === 'development'`

Note the redaction check tests for `development`, so **`NODE_ENV=staging` (or
anything not `development`) already hides the stack**, but the raw `err.message`
is returned in every environment. Route 2 shows this leaking `read ECONNRESET`
to the client. P1-14 and P3-02 address it.

---

## Cross-cutting behavior

**CORS.** `origin: process.env.CORS_ORIGIN || '*'`; root `.env` sets
`CORS_ORIGIN=*`, so every origin is currently allowed. P1-14.

**Rate limiting.** One global limiter, 100 requests / 15 min / IP, `RateLimit-*`
headers on, `X-RateLimit-*` off. `/health` is **not** exempt today. On trip:
`429` with
`{ "success": false, "message": "Too many requests from this IP. Please try again after 15 minutes." }`.
The `RATE_LIMIT_*` env vars in root `.env` are **not read** — `app.js` hardcodes
both values.

**Body limit.** `express.json({ limit: '10kb' })`. Oversized body → Express's
own `413`, which reaches the global handler.

**`/api` pass-through.** `app.js:62` is a no-op `(req,res,next) => next()` with
a stale comment claiming it 503s on DB loss. It does not. P1-14 deletes it.

**Response envelope.** Every route returns `success: boolean`. Successes carry
`data` (or `count`), failures carry `message`. This envelope is frozen — see
`FREEZE_LIST.md`.

---

## Diffing against this baseline

1. `node server/scripts/capture-baseline.js` → rewrites `docs/BASELINE.raw.json`
2. `git diff docs/BASELINE.raw.json`

Fields that change every run and must be ignored: `health.uptime`,
`health.timestamp`, every `addedAt` in fallback mode, and `ms` on all rows.

The capture is self-restoring — case 7 adds `solana` and case 8 removes it, so
`server/data/watchlist.json` ends byte-identical to how it started. Verified
with `git status` after the run. If a future case breaks that pairing, the data
file will drift; keep add/remove balanced.
