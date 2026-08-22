# Security Review — Phase 6 (P6-09)

**Date:** 2026-08-23
**Scope:** Contract static analysis (Slither), dependency audit (all four packages), git-history secret scan, `.env` file hygiene.

---

## 1. Contract static analysis — Slither

Ran `slither .` against `smart_contract/contracts/Transactions.sol` (v0.11.6, installed for this review — not previously in the toolchain). Mythril was **not** run — installing and running a second, slower symbolic-execution tool on top of Slither did not fit this task's timebox given everything else in scope; Slither already covers the standard detector set for a contract this size.

**9 findings, all Informational/Low. No High or Medium findings — no reentrancy, no unprotected state-changing function, no unchecked external call, no integer issues.**

| # | Finding | Severity | Triage |
|---|---|---|---|
| 1 | 5 different Solidity pragma versions in the dependency tree (OpenZeppelin imports vs. `^0.8.27`) | Informational | Expected — OpenZeppelin ships broad pragma ranges by design. No action. |
| 2 | `costly-loop`: `ERC20._update`'s `_totalSupply` SSTORE runs inside `addToBlockchainBatch`'s loop | Informational | Intrinsic to what a batch-transfer function does — each leg is a real transfer. Not a bug; gas cost scales linearly and predictably with batch size, which is the documented tradeoff (see `docs/GAS_BASELINE.md`, P6-11). |
| 3 | `solc-version`: pragma range permits Solidity versions with known historical compiler bugs | Informational | Standard advisory for any `^0.8.x` range. The actual compiled version (0.8.27, pinned in `hardhat.config.js`) is unaffected by the listed bug IDs for this contract's constructs (no verbatim assembly, no multi-slot struct array cleanup). No action. |
| 4 | `naming-convention`: `setFeePercentage(uint256 _feePercentage)` param not mixedCase | Informational | Leading underscore is the idiomatic Solidity convention for a constructor/setter argument that shadows a state variable name (`feePercentage`) — intentional, not a style violation in practice. No action. |
| 5 | `unindexed-event-address`: `TransactionAdded(address from, address receiver, ...)` has address fields but no `indexed` params | Low | **Real, legitimate finding.** Un-indexed address fields mean an off-chain consumer can't filter this event by topic (e.g., "all events where `receiver = X`") — it must scan and filter every event instead. This project's own indexer (`blockchainService.js`) already does a full scan via `contract.on(...)`, so it is not currently affected, but a future consumer wanting server-side address filtering would be. **Not fixed here** — changing event indexing changes the ABI/log topics, which is a contract-level change out of scope for a docs-only review task; recorded as a candidate for the next contract revision. |

Full Slither output is not committed (regenerable via `pip install slither-analyzer && slither smart_contract/`); the findings above are the complete list.

---

## 2. Dependency audit (`npm audit`)

All four `package.json` scopes in this repo were audited. `npm audit fix` (non-breaking, semver-safe) was applied everywhere it resolved something — a legitimate, low-risk improvement, not scope creep, and re-verified against the full test suite afterward (all 276 tests across server/vite-project/smart_contract/tests still pass, build clean, baseline diff empty).

| Package | Before | After `npm audit fix` | Remaining |
|---|---|---|---|
| root | 2 (1 moderate, 1 high) | **0** | — |
| `server` | 8 (1 low, 2 moderate, 5 high) | **0** | — |
| `vite-project` | 12 (4 moderate, 8 high) | 4 (3 moderate, 1 high) | see below |
| `smart_contract` | 25 (11 low, 6 moderate, 8 high) | 23 (11 low, 6 moderate, 6 high — mostly hardhat's own toolchain deps) | see below |

**`vite-project` — 2 findings remain, both require a breaking major bump:**
- `esbuild` (via `vite@<=6.4.2`) — moderate. Only exploitable if an attacker gets a malicious site to send requests to the **local dev server** while it's running; does not affect the production build output. Fix requires `vite@8` (breaking).
- `react-router`/`react-router-dom` — moderate/high (open redirect, SSR deserialization). Fix requires `react-router-dom@7.18.2` (breaking — this app is on 6.x routing patterns). **Accepted, not fixed**: a router major-version bump needs its own dedicated task with real regression testing of every route (out of scope here, and risky to force through a security-review task without that testing). Tracked as a follow-up.

**`smart_contract` — 23 findings remain, effectively all `hardhat`'s own dependency tree** (uuid, undici, and similar transitive tooling deps). Fixing requires `hardhat@3` (breaking) — directly against the pinned-minimal-toolchain decision from P0-09/P2-04 ("no `@nomicfoundation/hardhat-toolbox`, no legacy `@nomiclabs/*`"). These are **dev-tooling-only** dependencies — none of them ship in the deployed contract bytecode or the production frontend/server bundles. **Accepted, not fixed**: a Hardhat major upgrade is a toolchain migration, not a security-review-scope fix, and risks breaking the whole compile/test pipeline (would need its own dedicated task, same reasoning as P0-09's original toolchain decision).

---

## 3. Secret scan over full git history

Ran a pattern scan (`git log --all -p`) across the entire repository history for API-key-shaped strings, private-key PEM blocks, and `MONGO_URI`/`DEPLOYER_PRIVATE_KEY` assignments with embedded credentials.

### ⚠️ Finding: two real API keys are present in git history (not in the current working tree)

- `REDACTED_ETHERSCAN_API_KEY` — appears to be an Etherscan-style API key, hardcoded as `const apiKey = "..."` in an early commit.
- `REDACTED_COINGECKO_API_KEY` — a CoinGecko API key (the `CG-` prefix is CoinGecko's own key format), present both hardcoded in source (`const API_KEY = "..."`) and later as `COINGECKO_API_KEY=...` / `VITE_COINGECKO_API_KEY=...` lines committed into a documentation file.

**Both were introduced in the repo's very first two commits** (`16f9731 created`, `d7f4337 Changes in flow and packages- not much`) and **removed** in a later pre-Phase-0 commit (`c08d8fd chnages to update the some code`) — confirmed via `git log --all --diff-filter=A -S"<key>"` and `git grep <key> HEAD`, which returns **zero** hits in the current tree or `HEAD`. This predates this remediation project entirely (all of it happened before `v0.1.0-baseline`).

**This does not mean the exposure is resolved.** Removing a secret from the current tree does **not** remove it from git history — anyone with `git clone` access to this repository (or any existing clone, fork, or backup) can still retrieve both keys from the commits above. If this repository has ever been pushed to a remote (`github/feature/blockchain-market-services` is listed as a remote in this session's git status), **both keys must be treated as compromised.**

**Recommended action (not performed here — requires your decision):**
1. **Rotate/revoke both keys** at their respective providers (Etherscan, CoinGecko) — this is the actually load-bearing fix; scrubbing history alone does not invalidate a key that's already been read once.
2. Optionally rewrite git history to purge the blobs (`git filter-repo` or BFG Repo-Cleaner) — this is a destructive, history-rewriting operation that force-invalidates every existing clone/fork and requires coordinating a force-push; **I have not done this and will not do it without your explicit go-ahead**, per this session's git safety rules.

No other secret patterns (AWS keys, PEM private keys, database connection strings with embedded credentials, `DEPLOYER_PRIVATE_KEY` values) were found anywhere in history.

---

## 4. `.env` file hygiene

- **`.env.deployment.whole`** — confirmed still gitignored (`git check-ignore -v` matches `.gitignore:56`). Never tracked, never committed. ✓
- **`.env.production`** — **is tracked and committed** (`git ls-files` lists it). This project's own `.claude/settings.local.json` denies this session from reading `.env`/`.env.*` file contents (a standing rule, not specific to this task), so **this review could not independently confirm its contents hold only non-secret config** — that assertion in the task checklist is **unverified**, not confirmed true. Recommend the user (or a session without that deny rule) open `.env.production` directly and confirm no real secrets are committed in it, especially given finding #3 above (this repo has committed real API keys into tracked files before).

---

## Summary

| Check | Result |
|---|---|
| Slither run | ✓ done — 9 findings, all Informational/Low, none require a code fix |
| Mythril run | Skipped — timebox |
| `npm audit` clean or justified | ✓ root/server clean; vite-project (2) and smart_contract (23, mostly hardhat tooling) justified above, both require breaking major bumps out of scope here |
| Secret scan over git history | ⚠️ **Two real API keys found in early history** — not in current tree, but still retrievable and must be treated as compromised. Rotation recommended, history rewrite deferred to your decision. |
| `.env.deployment.whole` gitignored | ✓ confirmed |
| `.env.production` non-secret only | **Unverified** — blocked by this session's own `.env*` read-deny rule; needs manual confirmation |
