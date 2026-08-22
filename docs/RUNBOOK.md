# Operational Runbook (P6-12)

## Monitoring

- **Uptime**: poll `GET /health/ready` (P3-10). Returns 200 when the process can serve traffic, 503 when critically degraded. `GET /health` gives the full breakdown (`db`, indexer status, last indexed block).
- **Error-rate alerting**: every response carries `X-Request-Id`/`X-Correlation-Id` (P3-01), and every 5xx error response body includes the same `correlationId` (P3-02/P1-15). Point log-based alerting at pino's `level >= 50` (error) records — each one carries the `correlationId` that ties back to the exact failed request.
- **Indexer-lag alert**: `GET /health` reports `blockchainService.getStatus()` (status/initialized/listenerAttached/reconnectAttempts). Alert if `status !== 'connected'` for more than a few minutes, or if `reconnectAttempts` is climbing (P3-07's backoff is actively retrying, meaning the RPC endpoint is down).

**Not independently verified in this environment** (no hosting/monitoring-service account available): an actual live alerting pipeline, and a synthetic-failure-fires-a-real-alert test. What *is* verified: the signals a real alerting system would key on (health endpoint status codes, correlationIds, indexer status fields) are all real, tested, and correct — confirmed via `tests/integration/degradation.test.js` (P6-07) hitting `/health` under every degraded combination and asserting the exact status codes/fields above. Wiring those signals into a specific alerting product (PagerDuty, Better Uptime, etc.) is an infra choice this repo doesn't make for you and this task can't rehearse without an account.

## Restart the indexer

The indexer (`blockchainService`) lives inside the same process as the API server — there's no separate indexer process to restart independently. To restart just the indexer's listener without restarting the whole server, there's no exposed HTTP endpoint for it (out of scope to add one here); the only way today is a full process restart.

Full restart: send `SIGTERM` to the server process (triggers the graceful shutdown from P3-11 — drains requests, stops the listener, closes Mongo) then start it again. On boot, `index.js`'s `start()` calls `blockchainService.syncHistoricalTransactions()` then `startEventListener()` automatically — no manual step needed.

## Re-run historical sync

`blockchainService.syncHistoricalTransactions()` runs automatically on every boot (see above) — reading the contract's full `getAllTransactions()` and upserting into Mongo/JSON, deduped on `(sender, timestamp)`. To force it manually without a full restart, there's no standalone script exposing just this call today (`server/scripts/reindex.js` from P1-06 is the closest — it re-derives from on-chain event logs directly rather than `getAllTransactions()`, run with `node scripts/reindex.js --dry-run` first, then `--commit`).

**Known gap** (found during P6-07): the persisted indexer cursor (`getLastIndexedBlock`/`saveLastIndexedBlock`) has no caller that reads it to seed a gap-recovery scan — a restart's live listener only picks up events from that moment forward. If the process was down for a window, `syncHistoricalTransactions()` on the next boot is what actually recovers anything missed during that window (via the full `getAllTransactions()` scan), not the cursor. Keep this in mind when diagnosing "we're missing some transactions" — check whether historical sync ran and succeeded on the most recent boot.

## Respond to a Mongo outage

Nothing to do by default — `dbState.connected` flips to `false` automatically (config/db.js's `disconnected` listener, P3-06, logs the transition at `warn`), every route falls back to `server/data/*.json` transparently (verified end-to-end under load and in isolation in P6-04/P6-07/P6-11). Watch for:
- `/health` reporting `db: "disconnected"` — expected during the outage, not itself an error to act on beyond confirming fallback is serving correctly.
- Once Mongo is back, the `reconnected` listener flips `dbState.connected` back to `true` automatically — no restart needed. Confirm via `/health` reporting `db: "connected"` again.
- Data written during the outage lives only in the JSON fallback files — there's no automatic sync-back into Mongo once it returns. If reconciling that data into Mongo is needed, that's a manual data-migration task, not covered by this runbook.

## Rotate keys

- **`JWT_SECRET`**: generate a new one, update it wherever the server's env is configured, restart. Every existing session's JWT becomes invalid immediately (forces re-login) — no graceful overlap window exists today.
- **`COINGECKO_API_KEY` / `VITE_COINGECKO_API_KEY` / `VITE_ETHERSCAN_API_KEY`**: rotate at the provider, update the env var, restart/redeploy. No downtime — these are optional and the app degrades gracefully without them.
- **`DEPLOYER_PRIVATE_KEY`**: only used at deploy time (`smart_contract/scripts/deploy.js`), not by the running app. Rotating it doesn't require any app restart — it only matters the next time someone deploys a new contract.
- **Third-party keys found leaked in git history** (see `docs/SECURITY_REVIEW.md` §3): rotate the Etherscan-style key and the CoinGecko key at their respective providers **now** — they predate this rotation guidance existing and should be treated as already compromised.
