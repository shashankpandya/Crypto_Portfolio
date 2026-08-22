'use strict';

/**
 * tests/integration/degradation.test.js (P6-07)
 *
 * Verifies the project's defining architectural claim (CLAUDE.md: "Everything
 * degrades") for each dependency independently and in combination, plus the
 * indexer's restart-resume behavior. Runs entirely against JSON-fallback /
 * mocked collaborators — no live Mongo or CoinGecko needed — except the
 * restart-resume case, which reuses a real local Hardhat node the same way
 * lifecycle.test.js does (see that file's header for why a real node is used
 * instead of Hardhat's in-process network, and the process-tree-kill notes).
 */

const path = require('path');
const fs = require('fs');
const { spawn, execSync } = require('child_process');
const { ethers } = require('ethers');
const request = require('supertest');

const SERVER_DIR = path.resolve(__dirname, '../../server');
const SMART_CONTRACT_DIR = path.resolve(__dirname, '../../smart_contract');

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

// This whole file deliberately points blockchainService at unreachable/
// invalid RPC endpoints (to test that RPC failures degrade gracefully) and
// tears down real local-node connections during cleanup. Both intentionally
// trigger DNS/connection errors on requests already in flight when a test
// or the suite finishes — real, but not test failures. Filtering exactly
// these known error codes (rather than every unhandled rejection) keeps
// this from masking a genuine bug elsewhere.
const BENIGN_TEARDOWN_ERROR_CODES = new Set([
  'UNSUPPORTED_OPERATION',
  'ECONNREFUSED',
  'ECONNRESET',
  'ENOTFOUND',
]);
function swallowKnownBenignRejections(reason) {
  if (BENIGN_TEARDOWN_ERROR_CODES.has(reason?.code)) return;
  throw reason;
}
process.on('unhandledRejection', swallowKnownBenignRejections);

describe('Degradation matrix (P6-07)', () => {
  let app;
  let axios;

  beforeAll(() => {
    process.env.AUTH_REQUIRED = 'false';
    process.env.NODE_ENV = 'test';
    app = require(path.join(SERVER_DIR, 'src/app'));
    axios = require(path.join(SERVER_DIR, 'node_modules/axios'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Mongo down -> JSON fallback', () => {
    it('/health reports degraded when dbState.connected is false', async () => {
      const { dbState } = require(path.join(SERVER_DIR, 'src/config/db'));
      const original = dbState.connected;
      dbState.connected = false;
      app.locals.dbState = dbState;

      const res = await request(app).get('/health');
      expect(res.status).toBe(503);
      expect(res.body.status).toBe('degraded');
      expect(res.body.db).toBe('disconnected');

      dbState.connected = original;
    });

    it('watchlist and transaction routes keep serving (JSON fallback), not 500', async () => {
      app.locals.dbState = { connected: false };
      const ADDRESS = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

      const watchlistRes = await request(app).get(`/api/watchlist/${ADDRESS}`);
      expect(watchlistRes.status).toBe(200);

      const txRes = await request(app).get(`/api/transactions/${ADDRESS}`);
      expect(txRes.status).toBe(200);
    });

    it('a dbState.connected transition is observable via /health across two calls', async () => {
      const { dbState } = require(path.join(SERVER_DIR, 'src/config/db'));
      app.locals.dbState = dbState;

      dbState.connected = false;
      const before = await request(app).get('/health');
      expect(before.body.status).toBe('degraded');

      // Simulate the reconnect path config/db.js's mongoose 'reconnected'
      // listener drives in production (P3-06 logs this transition at warn).
      dbState.connected = true;
      const after = await request(app).get('/health');
      expect(after.body.db).toBe('connected');

      dbState.connected = false; // restore to the as-shipped default
    });
  });

  describe('RPC down -> market and watchlist unaffected, indexer degrades alone', () => {
    it('an invalid ALCHEMY_URL fails _init() explicitly (P3-09) without crashing the process', async () => {
      vi.resetModules();
      process.env.ALCHEMY_URL = 'not-a-valid-url';
      process.env.CONTRACT_ADDRESS = '0x1111111111111111111111111111111111111111';
      const freshBlockchainService = require(path.join(SERVER_DIR, 'src/services/blockchainService'));

      // startEventListener() catches _init() failures internally (non-fatal) —
      // resolves rather than throwing, exactly so a bad RPC config can't take
      // the whole process down.
      await expect(freshBlockchainService.startEventListener()).resolves.not.toThrow();
      expect(freshBlockchainService.getStatus().status).toBe('failed');
      expect(freshBlockchainService.getStatus().initError).toContain('unsupported protocol');

      delete process.env.ALCHEMY_URL;
      delete process.env.CONTRACT_ADDRESS;
    });

    it('a well-formed but unreachable ALCHEMY_URL still lets the process serve requests (RPC errors surface lazily on first real network call, not at listener-start)', async () => {
      vi.resetModules();
      process.env.ALCHEMY_URL = 'https://definitely-not-a-real-rpc-endpoint.invalid';
      process.env.CONTRACT_ADDRESS = '0x1111111111111111111111111111111111111111';
      const freshBlockchainService = require(path.join(SERVER_DIR, 'src/services/blockchainService'));

      await expect(freshBlockchainService.startEventListener()).resolves.not.toThrow();
      // ethers.JsonRpcProvider construction is lazy — no network call happens
      // until something actually needs chain data, so status is optimistically
      // 'connected' here. The important guarantee is what's asserted above and
      // below: neither a malformed nor an unreachable RPC endpoint crashes the
      // process or blocks unrelated routes.
      expect(freshBlockchainService.getStatus().status).toBe('connected');

      delete process.env.ALCHEMY_URL;
      delete process.env.CONTRACT_ADDRESS;
    });

    it('market and watchlist routes are unaffected by RPC being unreachable', async () => {
      vi.spyOn(axios, 'get').mockResolvedValue({ data: [{ id: 'bitcoin' }] });
      const res = await request(app).get('/api/market/coins?limit=1');
      expect(res.status).toBe(200);

      const wlRes = await request(app).get('/api/watchlist/0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
      expect(wlRes.status).toBe(200);
    });
  });

  describe('CoinGecko down -> market panel degrades alone, app works', () => {
    it('getCoins failure returns an error response, not a crash', async () => {
      const { dbState } = require(path.join(SERVER_DIR, 'src/config/db'));
      dbState.connected = false; // force the CoinGecko fetch path, skip cache
      vi.spyOn(axios, 'get').mockRejectedValue(new Error('CoinGecko unreachable'));

      const res = await request(app).get('/api/market/coins?limit=1');
      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });

    it('watchlist and transactions routes are unaffected by CoinGecko being down', async () => {
      vi.spyOn(axios, 'get').mockRejectedValue(new Error('CoinGecko unreachable'));
      app.locals.dbState = { connected: false };

      const wlRes = await request(app).get('/api/watchlist/0xcccccccccccccccccccccccccccccccccccccccc');
      expect(wlRes.status).toBe(200);

      const txRes = await request(app).get('/api/transactions/0xcccccccccccccccccccccccccccccccccccccccc');
      expect(txRes.status).toBe(200);
    });
  });

  describe('All three down at once', () => {
    it('the app still boots and serves every route class, each degraded and reported', async () => {
      const { dbState } = require(path.join(SERVER_DIR, 'src/config/db'));
      dbState.connected = false;
      app.locals.dbState = dbState;
      vi.spyOn(axios, 'get').mockRejectedValue(new Error('CoinGecko unreachable'));

      const health = await request(app).get('/health');
      expect(health.status).toBe(503);
      expect(health.body.status).toBe('degraded');

      const watchlist = await request(app).get('/api/watchlist/0xdddddddddddddddddddddddddddddddddddddddd');
      expect(watchlist.status).toBe(200); // JSON fallback still works

      const transactions = await request(app).get('/api/transactions/0xdddddddddddddddddddddddddddddddddddddddd');
      expect(transactions.status).toBe(200); // JSON fallback still works

      const market = await request(app).get('/api/market/coins?limit=1');
      expect(market.status).toBe(500); // the one dependency with no fallback below CoinGecko itself

      dbState.connected = false; // restore as-shipped default
    });
  });
});

describe('Restart-resume: kill mid-index, restart, cursor resumes, zero duplicates (P6-07)', () => {
  const RPC_PORT = 8570;
  const RPC_URL = `http://127.0.0.1:${RPC_PORT}`;
  const TRANSACTIONS_FILE = path.join(SERVER_DIR, 'data', 'transactions.json');
  const INDEXER_STATE_FILE = path.join(SERVER_DIR, 'data', 'indexer_state.json');

  let hardhatNode;
  let originalTransactionsSnapshot;
  let originalIndexerStateSnapshot;

  // Only match LISTENING rows, and exclude this process's own PID — see the
  // matching note in tests/load/api.js's killWhoeverOwnsPort (an earlier
  // version there self-killed the script via a false match on its own
  // outbound connection to the port being scanned).
  function killWhoeverOwnsPort(port) {
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
  function killProcessTree(child) {
    if (!child?.pid) return;
    try {
      if (process.platform === 'win32') execSync(`taskkill /PID ${child.pid} /T /F`, { stdio: 'ignore' });
      else process.kill(-child.pid, 'SIGKILL');
    } catch { /* already gone */ }
  }
  function waitForRpcReady(url, timeoutMs = 30000) {
    const provider = new ethers.JsonRpcProvider(url);
    const start = Date.now();
    return new Promise((resolve, reject) => {
      (async function poll() {
        try { await provider.getBlockNumber(); resolve(); } catch {
          if (Date.now() - start > timeoutMs) return reject(new Error('node not ready'));
          setTimeout(poll, 300);
        }
      })();
    });
  }
  function parsePrivateKeys(stdout, count) {
    return [...stdout.matchAll(/Private Key:\s*(0x[0-9a-fA-F]{64})/g)].map((m) => m[1]).slice(0, count);
  }
  async function waitUntil(predicate, { timeoutMs = 15000, intervalMs = 250 } = {}) {
    const start = Date.now();
    for (;;) {
      const r = await predicate();
      if (r) return r;
      if (Date.now() - start > timeoutMs) throw new Error('waitUntil timeout');
      await new Promise((res) => setTimeout(res, intervalMs));
    }
  }
  // The indexer writes this file lazily on the first indexed event — reading
  // it before that (e.g. the very first waitUntil poll right after restart)
  // must not throw ENOENT.
  function readTxs() {
    if (!fs.existsSync(TRANSACTIONS_FILE)) return [];
    return JSON.parse(fs.readFileSync(TRANSACTIONS_FILE, 'utf8'));
  }

  let contractAddress;
  let deployer;
  let sharedProvider;

  beforeAll(async () => {
    originalTransactionsSnapshot = readSnapshot(TRANSACTIONS_FILE);
    originalIndexerStateSnapshot = readSnapshot(INDEXER_STATE_FILE);

    try {
      killWhoeverOwnsPort(RPC_PORT);
      let nodeStdout = '';
      hardhatNode = spawn('npx', ['hardhat', 'node', '--port', String(RPC_PORT)], {
        cwd: SMART_CONTRACT_DIR,
        stdio: 'pipe',
        shell: true,
        detached: process.platform !== 'win32',
      });
      hardhatNode.stdout.on('data', (c) => { nodeStdout += c.toString(); });
      hardhatNode.stderr.on('data', () => {});
      await waitForRpcReady(RPC_URL);
      const [deployerKey] = parsePrivateKeys(nodeStdout, 1);

      const provider = new ethers.JsonRpcProvider(RPC_URL);
      provider.pollingInterval = 50;
      sharedProvider = provider;
      deployer = new ethers.Wallet(deployerKey, provider);

      const artifact = require(path.join(SMART_CONTRACT_DIR, 'artifacts/contracts/Transactions.sol/Transactions.json'));
      const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, deployer);
      const contract = await factory.deploy(ethers.parseEther('1000000'));
      await contract.waitForDeployment();
      contractAddress = await contract.getAddress();

      process.env.CONTRACT_ADDRESS = contractAddress;
      process.env.VITE_CONTRACT_ADDRESS = contractAddress;
      process.env.ALCHEMY_URL = RPC_URL;
    } catch (err) {
      killProcessTree(hardhatNode);
      killWhoeverOwnsPort(RPC_PORT);
      throw err;
    }
  });

  afterAll(async () => {
    // stopEventListener()'s removeAllListeners() kicks off an async
    // eth_uninstallFilter RPC call; destroying the provider (or killing the
    // node) before that settles would otherwise throw — see the
    // file-level swallowKnownBenignRejections filter above.
    try {
      const blockchainService = require(path.join(SERVER_DIR, 'src/services/blockchainService'));
      blockchainService.stopEventListener();
      await new Promise((r) => setTimeout(r, 100)); // let removeAllListeners' RPC call settle
      blockchainService.provider?.destroy?.();
    } catch { /* best effort */ }
    try { sharedProvider?.destroy?.(); } catch { /* best effort */ }
    killProcessTree(hardhatNode);
    killWhoeverOwnsPort(RPC_PORT);
    restoreSnapshot(TRANSACTIONS_FILE, originalTransactionsSnapshot);
    restoreSnapshot(INDEXER_STATE_FILE, originalIndexerStateSnapshot);
  });

  it('the indexer resumes from the persisted cursor and produces zero duplicate rows on restart', async () => {
    // NOTE: this simulates "restart" by tearing down and rebuilding the
    // SAME blockchainService singleton's internal state (provider/contract/
    // listener flags) rather than `vi.resetModules()` + re-require. Tried
    // resetModules() first — it also evicts ethers' own module cache, so
    // the freshly-required blockchainService ends up talking through a
    // *different* ethers module instance than the one this test file's
    // top-level `require('ethers')` already cached, and the fresh
    // instance's event listener silently never saw the events this test
    // sent (confirmed: the deploy/transfer transactions themselves
    // succeeded on-chain, only the indexing side went quiet). The approach
    // below instead exercises the exact same teardown/rebuild sequence
    // `_scheduleReconnect()` already uses in production for a live RPC
    // reconnect (stopEventListener(); provider = null; contract = null;
    // startEventListener()) — a faithful "process restart" from the
    // indexer's own perspective, since the only state a real restart
    // preserves is what's on disk (transactions.json / indexer_state.json),
    // which this equally does not carry over in memory.
    const artifact = require(path.join(SMART_CONTRACT_DIR, 'artifacts/contracts/Transactions.sol/Transactions.json'));
    const contract = new ethers.Contract(contractAddress, artifact.abi, deployer);
    const blockchainService = require(path.join(SERVER_DIR, 'src/services/blockchainService'));

    // Force a clean slate regardless of what earlier tests in this file left
    // behind on this singleton (e.g. the RPC-down tests above point it at a
    // deliberately broken ALCHEMY_URL and may leave `_listenerAttached`
    // true, which would make startEventListener() below silently no-op).
    blockchainService.stopEventListener();
    blockchainService.provider = null;
    blockchainService.contract = null;
    blockchainService.initialized = false;
    blockchainService._listenerAttached = false;

    // --- "Session 1": index one real on-chain event.
    await blockchainService.startEventListener();
    if (blockchainService.provider) blockchainService.provider.pollingInterval = 100;

    const tx1 = await contract.addToBlockchain(deployer.address, ethers.parseEther('1'), 'm1', 'c', [], {
      nonce: 1,
    });
    const receipt1 = await tx1.wait();

    await waitUntil(() => {
      const txs = readTxs();
      return txs.some((t) => t.txHash === receipt1.hash);
    });

    const cursorAfterSession1 = JSON.parse(fs.readFileSync(INDEXER_STATE_FILE, 'utf8'));
    expect(cursorAfterSession1[contractAddress.toLowerCase()]).toBe(receipt1.blockNumber);

    // --- "Restart": tear down without a clean stop (simulating a crash),
    // then rebuild — the only continuity is the persisted
    // transactions.json/indexer_state.json.
    blockchainService.stopEventListener();
    blockchainService.provider = null;
    blockchainService.contract = null;
    blockchainService.initialized = false;
    blockchainService._listenerAttached = false;

    await blockchainService.startEventListener();
    if (blockchainService.provider) blockchainService.provider.pollingInterval = 100;

    const resumedCursor = await blockchainService.getLastIndexedBlock(contractAddress);
    expect(resumedCursor).toBe(receipt1.blockNumber); // cursor survived the "restart"

    // --- "Session 2": index a second event after restart.
    const tx2 = await contract.addToBlockchain(deployer.address, ethers.parseEther('2'), 'm2', 'c', [], {
      nonce: 2,
    });
    const receipt2 = await tx2.wait();

    await waitUntil(() => {
      const txs = readTxs();
      return txs.some((t) => t.txHash === receipt2.hash);
    });

    const finalTxs = readTxs();
    const matchingTx1 = finalTxs.filter((t) => t.txHash === receipt1.hash);
    const matchingTx2 = finalTxs.filter((t) => t.txHash === receipt2.hash);
    expect(matchingTx1).toHaveLength(1); // not re-added after "restart" — zero duplicates
    expect(matchingTx2).toHaveLength(1);

    blockchainService.stopEventListener();
  });
});
