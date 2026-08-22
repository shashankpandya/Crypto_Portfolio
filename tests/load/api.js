#!/usr/bin/env node
'use strict';

/**
 * tests/load/api.js (P6-11)
 *
 * Load-tests the real server (spawned as a child process, JSON-fallback
 * mode — no live Mongo needed) with `autocannon`:
 *   1. Sustained read load against a generous-limit route (readLimiter,
 *      120 req/min) — confirms it holds up and does NOT rate-limit at a
 *      reasonable sustained RPS.
 *   2. Burst write load against a moderate-limit route (writeLimiter,
 *      30 req/min) — confirms the P3-05 cap actually engages (some
 *      requests get a real 429), proving the limiter isn't a no-op.
 *   3. A real local Hardhat node + indexer burst check — 8 individual
 *      transfers fired back-to-back, confirming the indexer keeps pace
 *      instead of dropping or duplicating any of them.
 *
 * Usage: node tests/load/api.js
 */

const path = require('path');
const fs = require('fs');
const { spawn, execSync } = require('child_process');
const autocannon = require(path.resolve(__dirname, '../../server/node_modules/autocannon'));

// Section 3 tears down real local-node connections; an in-flight poll can
// land on an already-closed socket right as that happens (same benign
// teardown noise as tests/integration/*.test.js).
process.on('unhandledRejection', (reason) => {
  const code = reason?.code;
  if (['UNSUPPORTED_OPERATION', 'ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND'].includes(code)) return;
  console.error('Unhandled rejection:', reason);
  process.exitCode = 1;
});

const SERVER_DIR = path.resolve(__dirname, '../../server');
const PORT = 4501;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const WATCHLIST_FILE = path.join(SERVER_DIR, 'data', 'watchlist.json');
const LOAD_TEST_ADDRESS = '0x' + 'a1'.repeat(20); // valid 40-hex-char test address

function readSnapshot(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;
}
function restoreSnapshot(filePath, content) {
  if (content === null) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } else {
    fs.writeFileSync(filePath, content, 'utf8');
  }
}
function killWhoeverOwnsPort(port) {
  // Only match LISTENING rows, not every line that happens to mention the
  // port (an ESTABLISHED row for THIS SAME script's own outbound connection
  // to that port also matches ":PORT" and reports this process's own PID —
  // confirmed by hand: an earlier version matched on any line, self-killed
  // this script mid-run via taskkill, and silently truncated all output
  // right after the last log line before cleanup). Excluding process.pid
  // is a second, defense-in-depth guard against the same class of bug.
  try {
    if (process.platform === 'win32') {
      const out = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, { encoding: 'utf8' });
      const pids = new Set(
        out
          .split('\n')
          .map((l) => l.trim().split(/\s+/).pop())
          .filter((p) => p && /^\d+$/.test(p) && Number(p) !== process.pid),
      );
      for (const pid of pids) {
        try { execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' }); } catch { /* already gone */ }
      }
    } else {
      const pids = execSync(`lsof -ti tcp:${port} -sTCP:LISTEN`, { encoding: 'utf8' })
        .split('\n')
        .filter((p) => p && Number(p) !== process.pid);
      for (const pid of pids) {
        try { execSync(`kill -9 ${pid}`, { stdio: 'ignore' }); } catch { /* already gone */ }
      }
    }
  } catch { /* nothing listening */ }
}

function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    (function poll() {
      require('http')
        .get(url, (res) => {
          res.resume();
          resolve();
        })
        .on('error', () => {
          if (Date.now() - start > timeoutMs) return reject(new Error('server did not start in time'));
          setTimeout(poll, 300);
        });
    })();
  });
}

async function main() {
  killWhoeverOwnsPort(PORT);
  const originalWatchlist = readSnapshot(WATCHLIST_FILE);

  const server = spawn(process.execPath, ['index.js'], {
    cwd: SERVER_DIR,
    env: {
      ...process.env,
      PORT: String(PORT),
      NODE_ENV: 'test',
      AUTH_REQUIRED: 'false',
      // Deliberately no MONGO_URI/ALCHEMY_URL — exercises the exact
      // JSON-fallback + no-indexer degraded mode P6-07 already verified,
      // now under load instead of a handful of supertest calls.
      MONGO_URI: '',
      ALCHEMY_URL: '',
    },
    stdio: 'pipe',
  });
  let serverOutput = '';
  server.stdout.on('data', (c) => { serverOutput += c.toString(); });
  server.stderr.on('data', (c) => { serverOutput += c.toString(); });

  try {
    await waitForServer(`${BASE_URL}/health`);

    // ---- 1. Sustained read load (readLimiter: 120 req/min = 2 req/s) ----
    // Paced at 1.5 req/s (well under the 2 req/s limit) via autocannon's
    // overallRate — on localhost, an unthrottled run reaches 800+ req/s in
    // milliseconds and trips the limiter almost immediately, which would
    // prove nothing about "sustained legitimate load" specifically.
    console.log('\n=== Sustained read load: GET /api/transactions/count at 1.5 req/s for 10s ===');
    const readResult = await autocannon({
      url: `${BASE_URL}/api/transactions/count`,
      connections: 1,
      duration: 10,
      overallRate: 1.5,
    });
    const readTotal = readResult.non2xx + readResult['2xx'];
    console.log(
      `requests: ${readResult.requests.total}, 2xx: ${readResult['2xx']}, non-2xx: ${readResult.non2xx}, ` +
        `avg RPS: ${readResult.requests.average.toFixed(1)}, avg latency: ${readResult.latency.average}ms`,
    );
    const readAssertOk = readResult['2xx'] > 0 && readResult['2xx'] === readTotal;
    console.log(
      readAssertOk
        ? '[OK  ] sustained read load: 100% 2xx at 1.5 req/s — generous readLimiter (120/min = 2/s) correctly does not trip legitimate sustained traffic'
        : '[FAIL] sustained read load: unexpected non-2xx responses at a rate well under the read limit',
    );

    // ---- 2. Burst write load (writeLimiter: 30 req/min) ----
    console.log('\n=== Burst write load: POST /api/watchlist/:address/coins, 60 requests fired together ===');
    const writeResult = await autocannon({
      url: `${BASE_URL}/api/watchlist/${LOAD_TEST_ADDRESS}/coins`,
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ coinId: 'bitcoin' }),
      connections: 10,
      amount: 60, // total requests, fired as fast as the 10 connections allow
    });
    const statusCounts = writeResult.statusCodeStats || {};
    console.log('status code breakdown:', JSON.stringify(statusCounts));
    const got429 = Object.keys(statusCounts).includes('429');
    console.log(
      got429
        ? '[OK  ] burst write load: writeLimiter (30/min) engaged — some requests got a real 429'
        : '[FAIL] burst write load: expected at least one 429 from 60 rapid writes against a 30/min cap',
    );

    let indexerAssertOk = true;
    try {
      indexerAssertOk = await checkIndexerKeepsPaceWithBurst();
    } catch (err) {
      console.error('[FAIL] indexer burst check crashed:', err.message);
      indexerAssertOk = false;
    }

    const overallOk = readAssertOk && got429 && indexerAssertOk;
    if (!overallOk) {
      console.error('\nLoad test FAILED — see [FAIL] lines above.');
      console.error('--- API server output (last 2000 chars) ---');
      console.error(serverOutput.slice(-2000));
    } else {
      console.log('\nAll load test assertions passed.');
    }

    try {
      server.kill();
      killWhoeverOwnsPort(PORT);
      restoreSnapshot(WATCHLIST_FILE, originalWatchlist);
    } catch (cleanupErr) {
      console.error('Cleanup error (non-fatal):', cleanupErr.message);
    }

    // Explicit exit: several ephemeral providers/child processes are
    // created across the three sections above, and a stray open handle
    // from any of them can otherwise leave the process hanging instead of
    // exiting naturally — observed by hand (all three [OK] lines printed,
    // then the process never returned control despite every explicit
    // `.kill()`/`.destroy()` call already having run).
    process.exit(overallOk ? 0 : 1);
  } catch (err) {
    console.error('Load test crashed:', err);
    try {
      server.kill();
      killWhoeverOwnsPort(PORT);
    } catch {
      // best-effort
    }
    process.exit(1);
  }
}

/**
 * Indexer keeps pace with chain head during a transaction burst: spins up a
 * real local Hardhat node (same pattern as tests/integration/lifecycle.test.js
 * — see that file's header for why a real node, not the in-process test
 * network), fires 8 individual transfers back-to-back with no delay between
 * them, then confirms all 8 are indexed and queryable with zero duplicates —
 * not just "eventually", but within a bounded wait.
 */
async function checkIndexerKeepsPaceWithBurst() {
  console.log('\n=== Indexer burst: 8 rapid-fire individual transfers ===');
  const { ethers } = require(path.resolve(__dirname, '../../server/node_modules/ethers'));
  const request = require(path.resolve(__dirname, '../../server/node_modules/supertest'));

  const RPC_PORT = 8580;
  const RPC_URL = `http://127.0.0.1:${RPC_PORT}`;
  const TRANSACTIONS_FILE = path.join(SERVER_DIR, 'data', 'transactions.json');
  const INDEXER_STATE_FILE = path.join(SERVER_DIR, 'data', 'indexer_state.json');
  const originalTx = readSnapshot(TRANSACTIONS_FILE);
  const originalIndexer = readSnapshot(INDEXER_STATE_FILE);

  killWhoeverOwnsPort(RPC_PORT);
  let nodeStdout = '';
  const hardhatNode = spawn('npx', ['hardhat', 'node', '--port', String(RPC_PORT)], {
    cwd: path.resolve(__dirname, '../../smart_contract'),
    stdio: 'pipe',
    shell: true,
  });
  hardhatNode.stdout.on('data', (c) => { nodeStdout += c.toString(); });
  hardhatNode.stderr.on('data', () => {});

  try {
    await new Promise((resolve, reject) => {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const start = Date.now();
      (function poll() {
        provider.getBlockNumber().then(resolve).catch(() => {
          if (Date.now() - start > 30000) return reject(new Error('hardhat node not ready'));
          setTimeout(poll, 300);
        });
      })();
    });

    const [deployerKey] = [...nodeStdout.matchAll(/Private Key:\s*(0x[0-9a-fA-F]{64})/g)].map((m) => m[1]);
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    provider.pollingInterval = 100;
    const deployer = new ethers.Wallet(deployerKey, provider);
    const artifact = require(path.resolve(__dirname, '../../smart_contract/artifacts/contracts/Transactions.sol/Transactions.json'));
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, deployer);
    const contract = await factory.deploy(ethers.parseEther('1000000'));
    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();

    process.env.CONTRACT_ADDRESS = contractAddress;
    process.env.VITE_CONTRACT_ADDRESS = contractAddress;
    process.env.ALCHEMY_URL = RPC_URL;
    process.env.AUTH_REQUIRED = 'false';

    delete require.cache[require.resolve(path.resolve(__dirname, '../../server/src/app'))];
    const app = require(path.resolve(__dirname, '../../server/src/app'));
    app.locals.dbState = { connected: false };
    const blockchainService = require(path.resolve(__dirname, '../../server/src/services/blockchainService'));
    await blockchainService.startEventListener();
    if (blockchainService.provider) blockchainService.provider.pollingInterval = 100;

    const BURST_SIZE = 8;
    const receipts = [];
    for (let i = 0; i < BURST_SIZE; i++) {
      const tx = await contract.addToBlockchain(deployer.address, ethers.parseEther('1'), `burst-${i}`, 'load', [], {
        nonce: 1 + i, // deploy used nonce 0; deterministic sequence, no delay between sends
      });
      receipts.push(await tx.wait());
    }

    const deployerAddress = deployer.address.toLowerCase();
    const allIndexed = await new Promise((resolve, reject) => {
      const start = Date.now();
      (function poll() {
        request(app)
          .get(`/api/transactions/${deployerAddress}?limit=100`)
          .then((res) => {
            const hashes = new Set((res.body.data || []).map((t) => t.txHash));
            const allPresent = receipts.every((r) => hashes.has(r.hash));
            if (allPresent) return resolve(res.body.data);
            if (Date.now() - start > 20000) return reject(new Error('burst: not all 8 transactions indexed within 20s'));
            setTimeout(poll, 300);
          })
          .catch(reject);
      })();
    });

    const dupCount = allIndexed.filter((t) => receipts.some((r) => r.hash === t.txHash)).length;
    const ok = dupCount === BURST_SIZE;
    console.log(`8 rapid transfers sent; ${dupCount}/${BURST_SIZE} indexed exactly once each.`);
    console.log(ok ? '[OK  ] indexer kept pace with the burst, zero duplicates/drops' : '[FAIL] indexer lost or duplicated a burst transaction');

    blockchainService.stopEventListener();
    blockchainService.provider?.destroy?.();
    provider.destroy?.();
    return ok;
  } finally {
    hardhatNode.kill();
    killWhoeverOwnsPort(RPC_PORT);
    restoreSnapshot(TRANSACTIONS_FILE, originalTx);
    restoreSnapshot(INDEXER_STATE_FILE, originalIndexer);
    delete process.env.CONTRACT_ADDRESS;
    delete process.env.VITE_CONTRACT_ADDRESS;
    delete process.env.ALCHEMY_URL;
  }
}

main().catch((err) => {
  console.error('Load test crashed:', err);
  process.exit(1);
});
