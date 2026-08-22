# Performance Baseline (P6-10)

Measured 2026-08-23 against `vite-project/dist` (post-Phase-6 build) served via `vite preview`, headless Chrome, single Lighthouse run, no artificial network throttling beyond Lighthouse's default.

## Before this task (no budget existed — nothing failed CI on a regression)

| Category | Score |
|---|---|
| Performance | 0.38 |
| Accessibility | 0.94 |
| Best Practices | 0.92 |
| SEO | 0.92 |

Bundle sizes (`dist/assets/*.js`), unenforced:

| Chunk | Size |
|---|---|
| `ethers-*` | 275,844 B |
| `vendor-*` | 532,469 B |
| `charts-*` | 150,171 B |
| `gsap-*` | 70,444 B |
| `index-*` | 38,016 B |
| route chunks (7 files) | 55,912 B |

Performance is scored low mainly by the two large chunks (`vendor` + `ethers`, ~808 KB combined uncompressed) — a known, pre-existing characteristic of this app's dependency footprint (ethers.js and Chart.js are both large), not something introduced by this phase. Optimizing it (code-splitting further, lazy-loading ethers only on wallet-connect routes, etc.) is a real opportunity but out of scope for a budget-setting task — see `vite.config.js`'s own build warning about the >500 KB chunk.

## After this task

- `lighthouserc.json` (root) — Lighthouse category budgets set at/near the measured baseline above (performance 0.30, accessibility 0.90, best-practices 0.85, seo 0.85 — a small margin below measured so normal CI-machine variance doesn't cause a flaky failure, while a real regression below that margin does fail).
- `vite-project/scripts/check-bundle-size.cjs` — per-chunk byte budgets with ~20% headroom over the measured sizes above, respecting the existing named `manualChunks` (`ethers` / `charts` / `gsap` / `vendor`) from `vite.config.js`.
- Both wired into `.github/workflows/ci.yml` as new steps after the frontend build, both proven to fail CI on a deliberate regression (verified by hand: temporarily lowering each budget below the current measured value made the corresponding script exit 1, then restored).
