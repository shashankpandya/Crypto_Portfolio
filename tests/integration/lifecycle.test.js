'use strict';

/**
 * tests/integration/lifecycle.test.js (P6-06)
 *
 * Full transaction lifecycle integration test: connect (SIWE) -> transfer ->
 * on-chain event -> indexed by the server -> served via the REST API.
 *
 * Runs against a REAL local Hardhat node (spawned as a child process, not
 * Hardhat's in-process test network) so the server's blockchainService talks
 * to it exactly the way it talks to Sepolia in production — a real
 * JsonRpcProvider over HTTP, real event polling, real block numbers.
 *
 * The server's `dbState.connected` is left false (no MONGO_URI configured),
 * so this exercises the JSON-fallback indexing path end-to-end against the
 * real server/data/transactions.json + indexer_state.json files. Their
 * original content is snapshotted before this suite and restored after, so
 * running this suite leaves no trace on the repo's fixture data. This suite
 * is not designed to run concurrently with `npm test --prefix server`
 * against the same files — run it as its own step, as `npm run
 * test:integration` from the repo root does.
 */

const path = require('path');
const fs = require('fs');
const { spawn, execSync } = require('child_process');
const { ethers } = require('ethers');
const { SiweMessage } = require('siwe');
const request = require('supertest');

/**
 * Kills a spawned child and its full process tree. `hardhatNode` is spawned
 * with `shell: true` (needed for `npx` to resolve on Windows), which means
 * the returned ChildProcess is the *shell* wrapping the real `hardhat node`
 * process — plain `child.kill()` only kills that shell and leaves the real
 * node running, silently squatting on RPC_PORT for every subsequent run
 * (confirmed by hand: a second run failed with "Nonce too low" because it
 * was actually talking to the previous run's still-alive, still-stateful
 * node). `taskkill /T` (Windows) / negative-PID `kill` (POSIX) terminate the
 * whole tree instead.
 */
function killProcessTree(child) {
  if (!child || child.pid == null) return;
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /PID ${child.pid} /T /F`, { stdio: 'ignore' });
    } else {
      process.kill(-child.pid, 'SIGKILL');
    }
  } catch {
    // best-effort — process may have already exited
  }
}

/**
 * Belt-and-suspenders alongside killProcessTree: `npx` can insert enough
 * process-tree layers (npx.cmd -> cmd.exe -> node -> hardhat's own node)
 * that `taskkill /T` on the top PID doesn't always reach the bottom one —
 * confirmed by hand: a "killed" node's port was still answering, with
 * pre-existing chain state, on the very next run. This finds whatever
 * process is actually LISTENING on `port` (regardless of which spawn it
 * came from) and kills it directly, called both before spawning (defensive
 * — guarantee a clean start) and during cleanup (guarantee nothing survives
 * for the next run).
 */
function killWhoeverOwnsPort(port) {
  try {
    if (process.platform === 'win32') {
      const out = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
      const pids = new Set(
        out
          .split('\n')
          .map((line) => line.trim().split(/\s+/).pop())
          .filter((pid) => pid && /^\d+$/.test(pid)),
      );
      for (const pid of pids) {
        try {
          execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
        } catch {
          // already gone
        }
      }
    } else {
      execSync(`lsof -ti tcp:${port} | xargs -r kill -9`, { stdio: 'ignore', shell: '/bin/sh' });
    }
  } catch {
    // no process found on that port — nothing to do
  }
}

const SMART_CONTRACT_DIR = path.resolve(__dirname, '../../smart_contract');
const SERVER_DIR = path.resolve(__dirname, '../../server');
const RPC_PORT = 8555;
const RPC_URL = `http://127.0.0.1:${RPC_PORT}`;

// Hardhat's default accounts are deterministic and well-known (the same
// ones the existing `smart_contract/test/Transactions.js` suite gets via
// ethers.getSigners() against the in-process network) — public, not secret,
// and only ever funded on this throwaway local node. Parsed from the node's
// own startup output (rather than hardcoded) so a transcription slip can't
// silently produce an invalid or wrong private key.
function parsePrivateKeys(stdout, count) {
  const keys = [...stdout.matchAll(/Private Key:\s*(0x[0-9a-fA-F]{64})/g)].map((m) => m[1]);
  if (keys.length < count) {
    throw new Error(`Expected at least ${count} private keys in hardhat node output, found ${keys.length}`);
  }
  return keys.slice(0, count);
}

const TRANSACTIONS_FILE = path.join(SERVER_DIR, 'data', 'transactions.json');
const INDEXER_STATE_FILE = path.join(SERVER_DIR, 'data', 'indexer_state.json');

let hardhatNode;
let contractAddress;
let app;
let blockchainService;

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

function waitForRpcReady(url, timeoutMs = 30_000) {
  const provider = new ethers.JsonRpcProvider(url);
  const start = Date.now();
  return new Promise((resolve, reject) => {
    (async function poll() {
      try {
        await provider.getBlockNumber();
        resolve();
      } catch {
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Hardhat node did not become ready on ${url} within ${timeoutMs}ms`));
          return;
        }
        setTimeout(poll, 300);
      }
    })();
  });
}

/** Polls a predicate until it returns truthy or the timeout elapses. */
async function waitUntil(predicate, { timeoutMs = 15_000, intervalMs = 250 } = {}) {
  const start = Date.now();
  for (;;) {
    const result = await predicate();
    if (result) return result;
    if (Date.now() - start > timeoutMs) {
      throw new Error('waitUntil: condition not met within timeout');
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

describe('Full transaction lifecycle (P6-06)', () => {
  let originalTransactionsSnapshot;
  let originalIndexerStateSnapshot;
  let DEPLOYER_KEY;
  let SENDER_KEY;
  let RECIPIENT_KEY;
  // Shared across setup and every `it()` — see the pollingInterval comment
  // in beforeAll for why a fresh default-interval provider per test body
  // would silently reintroduce the same stale-nonce race.
  let sharedProvider;
  // Explicit nonce tracking for the `sender` account across `it()` blocks —
  // see the "Fund the sender account" comment in beforeAll for why relying
  // on ethers' automatic nonce resolution proved unreliable specifically
  // under vitest. `sender` sends exactly one transaction per test below, in
  // file order, so this counter stays accurate without re-querying the
  // chain.
  let senderNonce = 0;

  beforeAll(async () => {
    originalTransactionsSnapshot = readSnapshot(TRANSACTIONS_FILE);
    originalIndexerStateSnapshot = readSnapshot(INDEXER_STATE_FILE);

    try {
      // Defensive: make sure nothing from a previous (possibly
      // imperfectly-cleaned-up) run is still holding RPC_PORT before we
      // spawn ours, so we can never accidentally talk to stale chain state.
      killWhoeverOwnsPort(RPC_PORT);

      // 1. Spin up a real local Hardhat node as a child process, capturing
      // its startup output to parse the accounts it prints (see
      // parsePrivateKeys).
      let nodeStdout = '';
      hardhatNode = spawn(
        'npx',
        ['hardhat', 'node', '--port', String(RPC_PORT)],
        {
          cwd: SMART_CONTRACT_DIR,
          stdio: 'pipe',
          shell: true,
          // POSIX only: puts the whole shell+node tree in its own process
          // group so killProcessTree's negative-PID kill can reach all of it.
          detached: process.platform !== 'win32',
        },
      );
      hardhatNode.stdout.on('data', (chunk) => {
        nodeStdout += chunk.toString();
      });
      hardhatNode.stderr.on('data', () => {}); // swallow — errors surface via waitForRpcReady's timeout
      await waitForRpcReady(RPC_URL);
      // Hardhat prints all 20 accounts synchronously before the RPC server
      // starts serving, so by the time waitForRpcReady resolves nodeStdout
      // already contains every "Private Key:" line.
      [DEPLOYER_KEY, SENDER_KEY, RECIPIENT_KEY] = parsePrivateKeys(nodeStdout, 3);

      // 2. Deploy the contract with the deployer account.
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      // ethers v6's default ~4s polling interval means getTransactionCount
      // can return a stale ("latest" not yet advanced) nonce for a
      // back-to-back transaction from the same signer shortly after Hardhat
      // automines the previous one — confirmed by hand: the deploy tx (nonce
      // 0) mined and the chain correctly reported nonce 1, but the very next
      // transfer from the same deployer still got assigned nonce 0 by ethers
      // and was rejected with "Nonce too low. Expected nonce to be 1 but got
      // 0." Lowering pollingInterval BEFORE sending any transactions (not
      // just later on blockchainService's own provider, which only fixed the
      // event-listening side of this) avoids that stale read.
      provider.pollingInterval = 50;
      sharedProvider = provider;
      const deployer = new ethers.Wallet(DEPLOYER_KEY, provider);
      const artifact = require(
        path.join(SMART_CONTRACT_DIR, 'artifacts/contracts/Transactions.sol/Transactions.json'),
      );
      const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, deployer);
      const initialSupply = ethers.parseEther('1000000');
      const contract = await factory.deploy(initialSupply);
      await contract.waitForDeployment();
      contractAddress = await contract.getAddress();

      // Fund the sender account with tokens for the transfers below.
      //
      // Explicit nonce override (rather than letting ethers resolve it):
      // under vitest specifically (not reproducible in a bare `node` script
      // running the identical sequence — isolated by hand), the deployer's
      // very next transaction after the deploy tx was intermittently
      // assigned a stale nonce of 0 instead of 1, even with a low
      // provider.pollingInterval, and got rejected by Hardhat's automine
      // with "Nonce too low. Expected nonce to be 1 but got 0." This is the
      // deployer's deterministic second transaction on a node that was just
      // freshly spawned for this suite, so nonce 1 is known statically —
      // sidesteps whatever timing quirk in vitest's environment was making
      // the RPC-derived nonce lookup unreliable here.
      const sender = new ethers.Wallet(SENDER_KEY, provider);
      const fundTx = await contract.transfer(sender.address, ethers.parseEther('1000'), { nonce: 1 });
      await fundTx.wait();

      // 3. Point the server at this local node (before requiring server
      // modules — they read process.env at require time / on first _init()
      // call).
      process.env.CONTRACT_ADDRESS = contractAddress;
      process.env.VITE_CONTRACT_ADDRESS = contractAddress;
      process.env.ALCHEMY_URL = RPC_URL;
      process.env.AUTH_REQUIRED = 'false';
      process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-only-lifecycle-secret';
      process.env.NODE_ENV = 'test';

      app = require(path.join(SERVER_DIR, 'src/app'));
      app.locals.dbState = { connected: false }; // no MONGO_URI here — JSON fallback path

      blockchainService = require(path.join(SERVER_DIR, 'src/services/blockchainService'));
      await blockchainService.startEventListener();
      // Poll aggressively so the event-driven assertions below don't have to
      // wait out ethers' default ~4s polling interval.
      if (blockchainService.provider) {
        blockchainService.provider.pollingInterval = 250;
      }
    } catch (err) {
      // Setup failed partway through — kill whatever node process we did
      // manage to spawn so it doesn't squat on RPC_PORT for the next run
      // (this is exactly the failure mode that made an earlier version of
      // this suite non-repeatable: a leftover node from a failed run
      // answered the next run's requests with stale, non-zero nonces).
      killProcessTree(hardhatNode);
      killWhoeverOwnsPort(RPC_PORT);
      throw err;
    }
  });

  afterAll(async () => {
    try {
      blockchainService?.stopEventListener();
    } catch {
      // best-effort cleanup
    }
    // Stop the shared provider's polling loop BEFORE killing the node it
    // polls — otherwise an in-flight poll request can land on an
    // already-closed socket right as the process dies, surfacing as an
    // unhandled "write ECONNRESET" rejection after the suite has already
    // reported its results (harmless, but noisy).
    try {
      blockchainService?.provider?.destroy?.();
      sharedProvider?.destroy?.();
    } catch {
      // best-effort cleanup
    }
    if (hardhatNode) {
      killProcessTree(hardhatNode);
    }
    killWhoeverOwnsPort(RPC_PORT);
    restoreSnapshot(TRANSACTIONS_FILE, originalTransactionsSnapshot);
    restoreSnapshot(INDEXER_STATE_FILE, originalIndexerStateSnapshot);
  });

  it('connects via SIWE nonce -> sign -> verify and receives a JWT', async () => {
    const provider = sharedProvider;
    const sender = new ethers.Wallet(SENDER_KEY, provider);
    const senderAddress = sender.address.toLowerCase();

    const nonceRes = await request(app).get(`/api/auth/nonce?address=${senderAddress}`);
    expect(nonceRes.status).toBe(200);
    expect(nonceRes.body.success).toBe(true);

    const siweMessage = new SiweMessage({
      domain: 'localhost',
      address: sender.address,
      statement: 'Sign in with Ethereum to Crypto Portfolio.',
      uri: 'http://localhost',
      version: '1',
      chainId: 31337,
      nonce: nonceRes.body.nonce,
    });
    const messageText = siweMessage.prepareMessage();
    const signature = await sender.signMessage(messageText);

    const verifyRes = await request(app)
      .post('/api/auth/verify')
      .send({ message: messageText, signature });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);
    expect(verifyRes.body.address).toBe(senderAddress);
    expect(typeof verifyRes.body.token).toBe('string');
  });

  it('a single on-chain transfer is picked up by the indexer and appears via the API', async () => {
    const provider = sharedProvider;
    const sender = new ethers.Wallet(SENDER_KEY, provider);
    const recipient = new ethers.Wallet(RECIPIENT_KEY, provider);
    const artifact = require(
      path.join(SMART_CONTRACT_DIR, 'artifacts/contracts/Transactions.sol/Transactions.json'),
    );
    const contract = new ethers.Contract(contractAddress, artifact.abi, sender);

    const amount = ethers.parseEther('10');
    const tx = await contract.addToBlockchain(
      recipient.address,
      amount,
      'integration test transfer',
      'test',
      [],
      { nonce: senderNonce++ },
    );
    const receipt = await tx.wait();

    const senderAddress = sender.address.toLowerCase();

    const found = await waitUntil(async () => {
      const res = await request(app).get(`/api/transactions/${senderAddress}`);
      return res.body?.data?.find((t) => t.txHash === receipt.hash);
    });

    expect(found).toBeTruthy();
    expect(found.sender).toBe(senderAddress);
    expect(found.recipient).toBe(recipient.address.toLowerCase());
    expect(BigInt(found.amount)).toBe(amount);
  });

  it('a batch transfer produces N distinct indexed rows, not one collapsed row (P1-04)', async () => {
    const provider = sharedProvider;
    const sender = new ethers.Wallet(SENDER_KEY, provider);
    const recipient = new ethers.Wallet(RECIPIENT_KEY, provider);
    const artifact = require(
      path.join(SMART_CONTRACT_DIR, 'artifacts/contracts/Transactions.sol/Transactions.json'),
    );
    const contract = new ethers.Contract(contractAddress, artifact.abi, sender);

    const amounts = [ethers.parseEther('1'), ethers.parseEther('2'), ethers.parseEther('3')];
    const receivers = [recipient.address, recipient.address, recipient.address];

    const tx = await contract.addToBlockchainBatch(receivers, amounts, 'batch test', 'test', [], {
      nonce: senderNonce++,
    });
    const receipt = await tx.wait();

    const senderAddress = sender.address.toLowerCase();

    const rows = await waitUntil(async () => {
      const res = await request(app).get(`/api/transactions/${senderAddress}?limit=100`);
      const matches = (res.body?.data || []).filter((t) => t.txHash === receipt.hash);
      return matches.length >= 3 ? matches : null;
    });

    expect(rows).toHaveLength(3);
    const logIndexes = new Set(rows.map((r) => r.logIndex));
    expect(logIndexes.size).toBe(3); // three distinct logIndex values — not collapsed
  });

  it('is repeatable: re-running the same GET does not create duplicate rows or drift the count', async () => {
    const provider = sharedProvider;
    const sender = new ethers.Wallet(SENDER_KEY, provider);
    const senderAddress = sender.address.toLowerCase();

    const first = await request(app).get(`/api/transactions/${senderAddress}?limit=100`);
    const second = await request(app).get(`/api/transactions/${senderAddress}?limit=100`);

    expect(first.body.pagination.total).toBe(second.body.pagination.total);
    expect(first.body.data.map((t) => t.txHash + ':' + t.logIndex)).toEqual(
      second.body.data.map((t) => t.txHash + ':' + t.logIndex),
    );
  });
});
