# Dependency Vulnerability Audit

**Task:** P0-03  
**Date:** 2026-08-02  
**Tool:** `npm audit` across all three packages  
**Raw data:** Run `npm audit --json` in `server/`, `vite-project/`, `smart_contract/` to reproduce.

This document records the vulnerability baseline **before any code changes**. P2-02/P2-03 remove the unused packages. P1-xx tasks address the production-blocking CVEs.

---

## Summary

| Package | critical | high | moderate | low | Total | Unused deps flagged |
|---------|----------|------|----------|-----|-------|---------------------|
| `server/` | 0 | 4 | 2 | 1 | **7** | `express-slow-down` |
| `vite-project/` | 0 | 8 | 4 | 0 | **12** | `framer-motion` |
| `smart_contract/` | 6 | 20 | 22 | 15 | **63** | — (dev tooling only) |

The `smart_contract/` numbers are large but **all dev-only Hardhat tooling** — they do not affect the production surface. They are noted for awareness; no immediate action required because the contract is already deployed and these run locally only.

---

## `server/` — 7 vulnerabilities

### axios `^1.7.7` → installed ~1.7.x, vulnerable through <1.18.0

| # | Severity | Advisory | Fix |
|---|----------|----------|-----|
| 1 | **high** | GHSA-gcfj-64vw-6mp9 — Inherited proxy after interceptor cloning | `npm update axios` (≥1.18.0) |
| 2 | moderate | GHSA-hcpx-6fm6-wx23 — form serializer maxDepth bypass | same |
| 3 | moderate | GHSA-7q8q-rj6j-mhjq — Nested option prototype pollution | same |
| 4 | moderate | GHSA-mwf2-3pr3-8698 — HTTP/2 upload bypasses maxBodyLength | same |

**Status:** ✅ Fixable — `npm install axios@^1.18.0`. Deferred to P1-XX (not breaking, low complexity).

---

### body-parser (indirect via express)

| # | Severity | Advisory | Fix |
|---|----------|----------|-----|
| 5 | low | GHSA-v422-hmwv-36x6 — Invalid limit value disables size enforcement | `npm update express` |

**Status:** ✅ Fixable. Deferred to P1-XX.

---

### brace-expansion (indirect via globbing utils)

| # | Severity | Advisory | Fix |
|---|----------|----------|-----|
| 6 | **high** | GHSA-3jxr-9vmj-r5cp — Exponential expansion DoS | `npm update` |
| 7 | **high** | GHSA-mh99-v99m-4gvg — OOM process crash | same |

**Status:** ✅ Fixable. Deferred to P1-XX.

---

### ethers `^6.16.0` (via ws — see below)

**Status:** ✅ Fixable via ws update (ethers 6.17.0+). Deferred.

---

### form-data (indirect)

| # | Severity | Advisory | Fix |
|---|----------|----------|-----|
| — | **high** | GHSA-hmw2-7cc7-3qxx — CRLF injection via unescaped field names | `npm update` |

**Status:** ✅ Fixable. Deferred to P1-XX.

---

### mongoose `^9.7.0`

| # | Severity | Advisory | Fix |
|---|----------|----------|-----|
| — | moderate | GHSA-664h-wqgq-64gw — Prototype pollution via `__proto__`-prefixed dotted path | `npm install mongoose@^9.7.2` |

**Status:** ✅ Fixable — non-breaking patch update. P1 candidate.

---

### ws (indirect via ethers)

| # | Severity | Advisory | Fix |
|---|----------|----------|-----|
| — | moderate | GHSA-58qx-3vcg-4xpx — Uninitialized memory disclosure | `npm update ws` |
| — | **high** | GHSA-96hv-2xvq-fx4p — Memory exhaustion DoS | same |

**Status:** ✅ Fixable. Deferred to P1-XX.

---

### express-slow-down `^2.0.3` — **UNUSED**

Declared in `server/package.json`. **Zero imports** in `server/src/`. No CVE.

**Status:** 🗑 Remove in P2-03 (`chore: remove unused express-slow-down`).

---

## `vite-project/` — 12 vulnerabilities

### http-proxy-middleware `^3.0.6` (devDependency)

| # | Severity | Advisory | Fix |
|---|----------|----------|-----|
| — | **high** | GHSA-gcq2-9pq2-cxqm — CRLF injection in `fixRequestBody` | `npm update http-proxy-middleware` (≥3.0.7) |

**Status:** ✅ Fixable. Dev-only (used by Vite proxy). Deferred.

---

### js-yaml (indirect)

| # | Severity | Advisory | Fix |
|---|----------|----------|-----|
| — | **high** | GHSA-52cp-r559-cp3m — YAML merge-key chains cause quadratic CPU | `npm update` |

**Status:** ✅ Fixable. Indirect dev dep.

---

### postcss `^8.4.47` (devDependency)

| # | Severity | Advisory | Fix |
|---|----------|----------|-----|
| — | **high** | GHSA-r28c-9q8g-f849 — Path traversal in source map auto-loading | `npm update postcss` |

**Status:** ✅ Fixable. Dev-only (build tool). No production exposure. Deferred.

---

### react-router-dom `^6.26.2`

| # | Severity | Advisory | Fix |
|---|----------|----------|-----|
| — | moderate | GHSA-jjmj-jmhj-qwj2 — Open redirect leading to XSS (6.30.2–6.30.4) | Update to ≥6.30.5 or ≥7.18.0 |
| — | moderate | GHSA-wrjc-x8rr-h8h6 — Open redirect via backslash | Same |
| — | moderate | GHSA-337j-9hxr-rhxg — Arbitrary constructor injection (SSR only) | Does not apply — SPA, no SSR |

**Status:** ⚠ The SSR advisory (GHSA-337j-9hxr-rhxg) does not apply — this is a client-only SPA. The open-redirect advisories apply. Fix: bump to latest 6.x non-vulnerable patch or upgrade to v7. **Breaking** to upgrade to v7; non-breaking patch may be available within 6.x range. Deferred to P4.

---

### vite `^5.4.21` (devDependency)

| # | Severity | Advisory | Fix |
|---|----------|----------|-----|
| — | moderate | GHSA-4w7w-66w2-5vf9 — Path traversal in optimized deps `.map` handling | Update to ≥6.4.2 (semver major) |
| — | moderate | GHSA-v6wh-96g9-6wx3 — NTLMv2 hash disclosure via UNC path (Windows) | same |
| — | **high** | GHSA-fx2h-pf6j-xcff — `server.fs.deny` bypass on Windows alternate paths | Update to ≥6.4.3 or latest |
| — | (indirect) | esbuild indirect | via vite |

**Status:** ⚠ Fix requires vite major bump (v5 → v8 minimum). **Breaking**. The Windows-specific path (`server.fs.deny`) and NTLMv2 disclosures are **dev-server only** — they do not affect the production build. The `.map` path traversal could affect hosted build artifacts. Accepted-with-reason for dev period; must fix before production deploy. Deferred to P4-XX.

---

### ws (indirect via ethers in vite-project)

Same as server — fixable, deferred.

---

### framer-motion `^12.40.0` — **UNUSED**

Declared in `vite-project/package.json`. **Zero imports** in `vite-project/src/`. No CVE.

**Status:** 🗑 Remove in P2-02 (`chore: remove unused framer-motion`).

---

## `smart_contract/` — 63 vulnerabilities

**Context:** All findings are in the Hardhat development toolchain. The contract is **already deployed** on Sepolia. These tools run locally only; no production attack surface exists.

| Vulnerability | Severity | Status |
|--------------|----------|--------|
| uuid `<11.1.1` in hardhat + request | moderate | ⚠ No fix available — `fixAvailable: false`. Accept. |
| web3-utils 1.x | moderate | Fix requires major bump (web3-utils v4) — breaking. Accept. |
| ws (various) | high | Fixable via dep updates; hardhat tooling update. Deferred. |
| undici `<6.27.0` | low–high | Fixable via Node/hardhat update. Deferred. |
| yargs-parser `<=5.0.0` | moderate | Fix requires solc `0.5.0` — breaking contract change. Accept. |
| (49 others, mostly indirect, all dev) | various | See `npm audit` output for full list. |

**Action:** None required before production. Add a note to the pre-deploy checklist (P6) to run `npm audit --production` (prod deps only) in each package.

---

## Unused dependencies (removal tracked in Phase 2)

| Package | File | Impact | Task |
|---------|------|--------|------|
| `framer-motion` ^12.40.0 | `vite-project/package.json` | Bundle size bloat, 0 CVEs | P2-02 |
| `express-slow-down` ^2.0.3 | `server/package.json` | Unused middleware slot, 0 CVEs | P2-03 |

---

## Fixability summary

| Scope | Fix available | Breaking fix | No fix |
|-------|--------------|--------------|--------|
| server | 7/7 | 0 | 0 |
| vite-project | 10/12 | 2 (react-router v7, vite v8) | 0 |
| smart_contract | 54/63 | 7 | 2 |

---

## Reproduction

```bash
cd server && npm audit
cd ../vite-project && npm audit
cd ../smart_contract && npm audit
```

Suppress dev-only findings in server:
```bash
cd server && npm audit --omit=dev
```
