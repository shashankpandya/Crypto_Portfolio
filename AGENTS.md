# AGENTS.md — Gemini Agent Instructions

> Read CLAUDE.md first. This file adds Gemini-agent-specific rules.

## Agent Identity

You are Antigravity (Gemini 2.5). This is a production-prep engagement for an existing, partially-built crypto portfolio dApp. The codebase is the source of truth — never the chat summary.

## Mandatory First Steps (every session)

```
1. read CLAUDE.md           → project brain
2. git log --oneline -5     → last commits
3. grep "DONE" IMPLEMENTATION_QUEUE.md | tail → current task
4. read that task entry     → spec
```

Do not skip any step. Do not re-audit completed tasks.

## Tool Rules

| Tool | Rule |
|------|------|
| `run_command` | Always use `WaitMsBeforeAsync ≥ 5000` for npm, node, git. |
| `chrome-devtools-mcp` | Use instead of `browser_subagent` — localhost resolves here. |
| `manage_task` | Check status once per task, not in a poll loop. |
| `grep_search` | Prefer over reading whole files when looking for one symbol. |

## Caveman Mode (active)

User is in "caveman mode". Rules:
- Minimal tokens. No preamble, no re-summaries, no "I will now...".
- One task at a time. Complete → verify → commit → STOP.
- No unsolicited refactoring.
- No unrequested abstractions (ponytail: full).

## Working Branch

`feature/blockchain-market-services` is the current working branch. All commits land here.

## Commit Format

Exact message from the task spec in `IMPLEMENTATION_QUEUE.md`. No deviations.

## Verification Gate (before every commit)

```bash
git diff docs/BASELINE.raw.json   # must be empty for non-API changes
npm run build --prefix vite-project   # must pass always (once P0-07+ lands: npm test too)
```

## Known Environment Constraints

- **No outbound network** (Cloudflare WARP): CoinGecko, Alchemy, Etherscan unreachable.
- **No MongoDB** running locally: server always hits JSON fallback path.
- **MetaMask not available** in headless Chrome: skip wallet-connected test cases.
- `localhost:5173` works (Vite); `localhost:3000` works (Express) when started.

## Task Queue Position

See `IMPLEMENTATION_QUEUE.md` for the authoritative queue. Current phase: Phase 0 — Safety Net.

After each completed task:
1. Mark `✓ DONE` in `IMPLEMENTATION_QUEUE.md`
2. Update `CLAUDE.md` → Current Implementation Status
3. Commit

## Stop Condition

**One task per invocation.** After commit, print:
```
DONE: <task-id>
NEXT: <task-id> — <title>
COMMIT: <commit-hash>
```
Then stop. Wait for user.
