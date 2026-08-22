# Rollback Procedure (P6-12)

## Scope

This app has three independently rollback-able pieces:
1. **Frontend** (Netlify static deploy) — instant, Netlify keeps every prior deploy.
2. **Server** (wherever it's hosted — process running `server/index.js`) — code rollback via git tag + redeploy/restart.
3. **Smart contract** — **not rollback-able once deployed** (per `docs/CONTRACT_STATE.md`: immutable; any change is a new deploy + new address + 3 ABI copies + 2 env vars updated). Rollback for the contract means reverting `CONTRACT_ADDRESS`/`VITE_CONTRACT_ADDRESS` to a previously-deployed address, not undeploying anything.

## Procedure

1. Identify the last known-good phase tag (`git tag -l` — this repo tags every phase boundary, e.g. `v0.7.0-phase5`).
2. **Frontend**: in the Netlify dashboard, "Deploys" → find the deploy matching that commit → "Publish deploy". No rebuild needed; instant.
3. **Server**: `git checkout <tag>` (or deploy that commit via whatever CD path is in use), reinstall (`npm ci` in `server/`), restart the process. `index.js`'s graceful shutdown (P3-11) drains in-flight requests before the old process exits.
4. **Contract**: only if the rollback target used a different contract address — update `CONTRACT_ADDRESS`/`VITE_CONTRACT_ADDRESS` on the server and `VITE_CONTRACT_ADDRESS` on the frontend build to the prior address, redeploy both.
5. Verify: `GET /health/ready` returns 200, and the manual checklist's smoke items (`docs/MANUAL_TEST_CHECKLIST.md`) pass against the rolled-back version.

## Rehearsed 2026-08-23

Rehearsed the server-code rollback path for real (not just described): created an isolated `git worktree` at the `v0.7.0-phase5` tag (the phase boundary immediately before this one), ran `npm install` + the full server test suite there, and confirmed **104/104 tests pass** — the tag is a genuinely valid, deployable rollback target, not just a label. Worktree removed after (`git worktree remove --force`); no changes to the working branch.

**Not rehearsed** (no live hosting/Netlify account in this environment): the actual Netlify "publish a prior deploy" click-through, and a real production traffic cutover. The code-level rollback — the part that actually matters for "is the old version still deployable" — is what was verified.
