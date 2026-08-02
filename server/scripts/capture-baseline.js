'use strict';

// Boots server/src/app in-process (no index.js, so the blockchain indexer never
// starts) and records every route's response with dbState.connected forced to
// false and then true. Output: docs/BASELINE.raw.json

const path = require('path');
// index.js loads only the root .env, but MONGO_URI lives in server/.env.
// Load both so this script can capture the dbState.connected === true mode.
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const fs = require('fs');
const app = require('../src/app');
const { connectDB, dbState } = require('../src/config/db');

const ADDR = '0xcb9d0aa389456eb5a46c772f38b59c40b092ebcc';
const BAD_ADDR = '0xzzz';

// Read-only cases. Safe to run against any database, including production.
const READ_CASES = [
  ['health', 'GET', '/health'],
  ['market.coins.badlimit', 'GET', '/api/market/coins?limit=abc'],
  ['market.coinDetails', 'GET', '/api/market/coins/bitcoin'],
  ['market.coinDetails.404', 'GET', '/api/market/coins/definitely-not-a-coin'],
  ['tx.count', 'GET', '/api/transactions/count'],
  ['tx.byAddress', 'GET', `/api/transactions/${ADDR}?page=1&limit=5`],
  ['tx.byAddress.badaddr', 'GET', `/api/transactions/${BAD_ADDR}`],
  ['tx.byAddress.page99', 'GET', `/api/transactions/${ADDR}?page=99`],
  ['watchlist.get', 'GET', `/api/watchlist/${ADDR}`],
  ['watchlist.get.unknown', 'GET', '/api/watchlist/0x0000000000000000000000000000000000000001'],
  ['watchlist.get.badaddr', 'GET', `/api/watchlist/${BAD_ADDR}`],
  ['watchlist.add.nobody', 'POST', `/api/watchlist/${ADDR}/coins`, {}],
  ['watchlist.remove.unknown', 'DELETE', '/api/watchlist/0x0000000000000000000000000000000000000002/coins/solana'],
  ['badjson', 'POST', `/api/watchlist/${ADDR}/coins`, { raw: '{' }],
  ['toolarge', 'POST', `/api/watchlist/${ADDR}/coins`, { raw: JSON.stringify({ coinId: 'x'.repeat(11 * 1024) }) }],
  ['notfound', 'GET', '/api/nope'],
  ['notfound.root', 'GET', '/'],
];

// Cases that write. In fallback mode they only touch server/data/watchlist.json
// and are self-restoring (add then remove). In Mongo mode they would create a
// Watchlist document and overwrite PriceCache entries, so they are skipped
// unless BASELINE_ALLOW_WRITES=1 confirms MONGO_URI points at a throwaway DB.
const WRITE_CASES = [
  ['market.coins', 'GET', '/api/market/coins?limit=3'],
  ['market.coins.cachehit', 'GET', '/api/market/coins?limit=3'],
  ['watchlist.add', 'POST', `/api/watchlist/${ADDR}/coins`, { coinId: 'solana' }],
  ['watchlist.add.readd', 'POST', `/api/watchlist/${ADDR}/coins`, { coinId: 'solana' }],
  ['watchlist.remove.absentcoin', 'DELETE', `/api/watchlist/${ADDR}/coins/not-a-coin`],
  ['watchlist.remove', 'DELETE', `/api/watchlist/${ADDR}/coins/solana`],
];

const VOLATILE_HEADERS = new Set(['date', 'etag', 'content-length']);

async function runAll(base, cases) {
  const out = {};
  for (const [name, method, url, body] of cases) {
    const started = Date.now();
    // body.raw lets a case send a deliberately invalid or oversized payload.
    const payload = body && 'raw' in body ? body.raw : body && JSON.stringify(body);
    try {
      const res = await fetch(base + url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: payload,
      });
      const text = await res.text();
      let json;
      try { json = JSON.parse(text); } catch { json = null; }
      out[name] = {
        request: { method, url, body: body ?? null },
        status: res.status,
        headers: Object.fromEntries(
          [...res.headers].filter(([k]) => !VOLATILE_HEADERS.has(k)),
        ),
        body: json ?? text.slice(0, 400),
        ms: Date.now() - started,
      };
    } catch (err) {
      out[name] = { request: { method, url, body: body ?? null }, error: err.message };
    }
  }
  return out;
}

const ALLOW_WRITES = process.env.BASELINE_ALLOW_WRITES === '1';

(async () => {
  app.locals.dbState = dbState;
  dbState.connected = false;

  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;

  console.log('[baseline] capturing dbDown...');
  const dbDown = { ...(await runAll(base, READ_CASES)), ...(await runAll(base, WRITE_CASES)) };

  console.log('[baseline] connecting mongo...');
  const connected = await connectDB();
  console.log('[baseline] mongo connected:', connected);

  let dbUp = null;
  let dbUpWritesSkipped = false;
  if (connected) {
    dbState.connected = true;
    console.log('[baseline] capturing dbUp (read-only)...');
    dbUp = await runAll(base, READ_CASES);
    if (ALLOW_WRITES) {
      console.log('[baseline] BASELINE_ALLOW_WRITES=1 — capturing dbUp write cases...');
      Object.assign(dbUp, await runAll(base, WRITE_CASES));
    } else {
      dbUpWritesSkipped = true;
      console.log('[baseline] skipping dbUp write cases (they mutate Mongo).');
      console.log('[baseline] set BASELINE_ALLOW_WRITES=1 only when MONGO_URI is a throwaway database.');
    }
  }

  const outFile = path.resolve(__dirname, '../../docs/BASELINE.raw.json');
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(
    outFile,
    JSON.stringify(
      { capturedAt: new Date().toISOString(), mongoAvailable: connected, dbUpWritesSkipped, dbDown, dbUp },
      null,
      2,
    ),
  );
  console.log('[baseline] wrote', outFile);

  server.close();
  if (connected) await require('mongoose').connection.close();
  process.exit(0);
})().catch((err) => {
  // Never exit 0 on a partial capture — a truncated baseline is worse than none.
  console.error('[baseline] FAILED — no file written:', err);
  process.exit(1);
});
