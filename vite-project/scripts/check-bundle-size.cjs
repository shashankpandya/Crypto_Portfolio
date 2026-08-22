#!/usr/bin/env node
'use strict';

/**
 * check-bundle-size.js (P6-10)
 *
 * Enforces a byte-size budget per named chunk group, matching the manual
 * Rollup chunks vite.config.js already defines (ethers / charts / gsap /
 * vendor) plus the shared entry (index) and per-route lazy chunks. Budgets
 * are set from the sizes measured on 2026-08-23 (see docs/GAS_BASELINE.md's
 * sibling doc, docs/PERFORMANCE_BASELINE.md) with ~20% headroom — enough to
 * absorb normal dependency bumps without masking a real regression (e.g.
 * accidentally importing all of lodash, or losing tree-shaking on an icon
 * library).
 *
 * Exits 1 (fails CI) if any group exceeds its budget.
 */

const fs = require('fs');
const path = require('path');

const DIST_ASSETS = path.resolve(__dirname, '../dist/assets');

// [prefix, budget in bytes]. Order matters: first matching prefix wins, so
// list the named manualChunks before the catch-all "route chunk" bucket.
const BUDGETS = [
  ['ethers-', 340_000], // measured 275,844
  ['vendor-', 640_000], // measured 532,469
  ['charts-', 185_000], // measured 150,171
  ['gsap-', 85_000], // measured 70,444
  ['index-', 46_000], // measured 38,016
];
// Every other .js file is a lazy per-route chunk (Home, Watchlist,
// TokenTransfer, AdminPanel, AllowanceManager, CoinDetails, EmptyState, ...)
// — budgeted as a group since new routes/components are expected to add
// more of these over time; the individual named chunks above are the ones
// with a fixed, known identity that regressing would mean something specific
// broke (e.g. "ethers" chunk bloating means a second ethers copy got bundled).
const ROUTE_CHUNKS_TOTAL_BUDGET = 120_000; // measured total ~55,829

function main() {
  if (!fs.existsSync(DIST_ASSETS)) {
    console.error(`Bundle size check: ${DIST_ASSETS} does not exist — run "npm run build" first.`);
    process.exit(1);
  }

  const files = fs.readdirSync(DIST_ASSETS).filter((f) => f.endsWith('.js'));
  const remaining = new Set(files);
  let failed = false;

  for (const [prefix, budget] of BUDGETS) {
    const matches = files.filter((f) => f.startsWith(prefix));
    matches.forEach((f) => remaining.delete(f));
    const total = matches.reduce((sum, f) => sum + fs.statSync(path.join(DIST_ASSETS, f)).size, 0);
    const status = total <= budget ? 'OK  ' : 'FAIL';
    if (total > budget) failed = true;
    console.log(`[${status}] ${prefix.padEnd(10)} ${total.toString().padStart(8)} B / ${budget} B budget`);
  }

  const routeTotal = [...remaining].reduce(
    (sum, f) => sum + fs.statSync(path.join(DIST_ASSETS, f)).size,
    0,
  );
  const routeStatus = routeTotal <= ROUTE_CHUNKS_TOTAL_BUDGET ? 'OK  ' : 'FAIL';
  if (routeTotal > ROUTE_CHUNKS_TOTAL_BUDGET) failed = true;
  console.log(
    `[${routeStatus}] route chunks (${remaining.size} files) ${routeTotal
      .toString()
      .padStart(8)} B / ${ROUTE_CHUNKS_TOTAL_BUDGET} B budget`,
  );

  if (failed) {
    console.error('\nBundle size budget exceeded — see FAIL lines above.');
    process.exit(1);
  }
  console.log('\nAll bundle size budgets satisfied.');
}

main();
