#!/usr/bin/env node
'use strict';

/**
 * check-lighthouse.cjs (P6-10)
 *
 * Runs Lighthouse against a running `vite preview` server and asserts each
 * category score against the budgets in ../../lighthouserc.json. Uses the
 * `lighthouse` + `chrome-launcher` npm packages directly (programmatic API)
 * rather than @lhci/cli's server/upload machinery — this repo just needs a
 * pass/fail gate in CI, not a dashboard.
 *
 * Usage: node scripts/check-lighthouse.cjs
 * (expects a server already running at the configured URL — see the
 * "Performance budget" CI job, which starts `vite preview` first)
 */

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.resolve(__dirname, '../../lighthouserc.json');

async function main() {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

  const lighthouse = (await import('lighthouse')).default;
  const chromeLauncher = await import('chrome-launcher');

  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu'],
  });

  let result;
  try {
    result = await lighthouse(config.url, {
      port: chrome.port,
      output: 'json',
      onlyCategories: Object.keys(config.budgets),
      logLevel: 'error',
    });
  } finally {
    await chrome.kill();
  }

  const scores = {};
  for (const [key, category] of Object.entries(result.lhr.categories)) {
    scores[key] = category.score;
  }

  console.log('Lighthouse scores vs. budget:');
  let failed = false;
  for (const [category, budget] of Object.entries(config.budgets)) {
    const score = scores[category];
    const ok = score >= budget;
    if (!ok) failed = true;
    console.log(`  [${ok ? 'OK  ' : 'FAIL'}] ${category.padEnd(16)} ${score} (budget: ${budget})`);
  }

  if (failed) {
    console.error('\nLighthouse budget not met — see FAIL lines above.');
    process.exit(1);
  }
  console.log('\nAll Lighthouse budgets satisfied.');
}

main().catch((err) => {
  console.error('Lighthouse check failed to run:', err);
  process.exit(1);
});
