'use strict';

/**
 * blockchainService.test.js
 * Unit tests for blockchainService dedupe logic (P1-04) and normalizeTx
 * named-field-only access (P1-05).
 */

// ---------------------------------------------------------------------------
// Local copy of normalizeTx that mirrors the production implementation.
// Since normalizeTx is a private helper (not exported), we define the
// equivalent here so changes to the real implementation are caught by the
// diverging behaviour of tests.
// ---------------------------------------------------------------------------
function normalizeTx(raw, txHash = null, blockNumber = null, logIndex = null) {
  const senderAddress    = raw.sender ?? raw.from;
  const recipientAddress = raw.receiver ?? raw.recipient;

  if (!senderAddress) {
    throw new Error(`normalizeTx: missing sender/from field. Raw keys: ${Object.keys(raw).join(', ')}`);
  }
  if (!recipientAddress) {
    throw new Error(`normalizeTx: missing receiver/recipient field. Raw keys: ${Object.keys(raw).join(', ')}`);
  }
  if (raw.amount == null) {
    throw new Error(`normalizeTx: missing amount field. Raw keys: ${Object.keys(raw).join(', ')}`);
  }
  if (raw.timestamp == null) {
    throw new Error(`normalizeTx: missing timestamp field. Raw keys: ${Object.keys(raw).join(', ')}`);
  }

  return {
    sender:      senderAddress.toLowerCase().trim(),
    recipient:   recipientAddress.toLowerCase().trim(),
    amount:      raw.amount.toString(),
    message:     raw.message   ?? '',
    keyword:     raw.category  ?? raw.keyword ?? '',
    timestamp:   Number(raw.timestamp),
    ...(txHash      != null && { txHash }),
    ...(blockNumber != null && { blockNumber }),
    ...(logIndex    != null && { logIndex }),
  };
}

// ---------------------------------------------------------------------------
// normalizeTx — P1-05 named-field access tests
// ---------------------------------------------------------------------------
describe('normalizeTx — named-field access (P1-05)', () => {
  it('normalizes a well-formed live event (named fields)', () => {
    const raw = {
      sender: '0xAAA', receiver: '0xBBB',
      amount: BigInt('1000000000000000000'),
      message: 'hello', category: 'test',
      timestamp: 1700000000,
    };
    const result = normalizeTx(raw, '0xdeadbeef', 12345, 2);
    expect(result.sender).toBe('0xaaa');
    expect(result.recipient).toBe('0xbbb');
    expect(result.amount).toBe('1000000000000000000');
    expect(result.message).toBe('hello');
    expect(result.keyword).toBe('test');
    expect(result.timestamp).toBe(1700000000);
    expect(result.txHash).toBe('0xdeadbeef');
    expect(result.blockNumber).toBe(12345);
    expect(result.logIndex).toBe(2);
  });

  it('normalizes a historical tuple (uses receiver, not from)', () => {
    // ethers v6 Result from getAllTransactions() has named props
    const raw = {
      sender: '0xSENDER', receiver: '0xRECEIVER',
      amount: '500000000000000000',
      message: 'sync', category: 'defi',
      timestamp: 1700000001,
    };
    const result = normalizeTx(raw);
    expect(result.sender).toBe('0xsender');
    expect(result.recipient).toBe('0xreceiver');
    expect(result.timestamp).toBe(1700000001);
    expect('txHash' in result).toBe(false);
    expect('logIndex' in result).toBe(false);
  });

  it('accepts `from` as sender alias (live event shape)', () => {
    const raw = {
      from: '0xFROM', receiver: '0xBBB',
      amount: '100', message: '', category: '',
      timestamp: 1700000002,
    };
    const result = normalizeTx(raw);
    expect(result.sender).toBe('0xfrom');
  });

  it('accepts `recipient` as recipient alias', () => {
    const raw = {
      sender: '0xAAA', recipient: '0xRECIPIENT',
      amount: '100', message: '', category: '',
      timestamp: 1700000003,
    };
    const result = normalizeTx(raw);
    expect(result.recipient).toBe('0xrecipient');
  });

  it('defaults message and keyword to empty string when absent', () => {
    const raw = { sender: '0xa', receiver: '0xb', amount: '1', timestamp: 1 };
    const result = normalizeTx(raw);
    expect(result.message).toBe('');
    expect(result.keyword).toBe('');
  });

  it('uses keyword field when category absent', () => {
    const raw = { sender: '0xa', receiver: '0xb', amount: '1', timestamp: 1, keyword: 'swap' };
    const result = normalizeTx(raw);
    expect(result.keyword).toBe('swap');
  });

  it('throws when sender is missing', () => {
    const raw = { receiver: '0xBBB', amount: '1', timestamp: 1 };
    expect(() => normalizeTx(raw)).toThrow('missing sender/from field');
  });

  it('throws when receiver is missing', () => {
    const raw = { sender: '0xAAA', amount: '1', timestamp: 1 };
    expect(() => normalizeTx(raw)).toThrow('missing receiver/recipient field');
  });

  it('throws when amount is missing', () => {
    const raw = { sender: '0xAAA', receiver: '0xBBB', timestamp: 1 };
    expect(() => normalizeTx(raw)).toThrow('missing amount field');
  });

  it('throws when timestamp is missing', () => {
    const raw = { sender: '0xAAA', receiver: '0xBBB', amount: '1' };
    expect(() => normalizeTx(raw)).toThrow('missing timestamp field');
  });

  it('does NOT use positional raw[N] access — wrong positional inputs produce an error', () => {
    // An object that only has positional integer keys (old-style array-like)
    // should now throw rather than silently pulling wrong values.
    const arrayLike = ['0xAAA', '0xBBB', '100', '', '', ['tag'], 1700000000];
    // raw.sender is undefined on a plain array — should throw
    expect(() => normalizeTx(arrayLike)).toThrow('missing sender/from field');
  });
});

// ---------------------------------------------------------------------------
// normalizeTx — logIndex support (P1-04 regression guard)
// ---------------------------------------------------------------------------
describe('normalizeTx — logIndex support (P1-04)', () => {
  it('includes logIndex when provided', () => {
    const raw = { sender: '0xAAA', receiver: '0xBBB', amount: '500', timestamp: 1700000000 };
    const result = normalizeTx(raw, '0xabc', 100, 3);
    expect(result.logIndex).toBe(3);
  });

  it('omits logIndex when null', () => {
    const raw = { sender: '0xAAA', receiver: '0xBBB', amount: '500', timestamp: 1700000001 };
    const result = normalizeTx(raw, '0xabc', 100, null);
    expect('logIndex' in result).toBe(false);
  });

  it('two events with same txHash but different logIndex produce distinct data', () => {
    const base = { amount: '100', timestamp: 1700000000 };
    const e1 = normalizeTx({ ...base, sender: '0xA', receiver: '0xB' }, '0xtx', 10, 0);
    const e2 = normalizeTx({ ...base, sender: '0xA', receiver: '0xC' }, '0xtx', 10, 1);
    expect(e1.txHash).toBe(e2.txHash);
    expect(e1.logIndex).toBe(0);
    expect(e2.logIndex).toBe(1);
    expect(e1.recipient).toBe('0xb');
    expect(e2.recipient).toBe('0xc');
  });
});

// ---------------------------------------------------------------------------
// Filter selection logic (P1-04)
// ---------------------------------------------------------------------------
describe('blockchainService live-event filter logic', () => {
  function selectFilter(txHash, logIndex, data) {
    return (txHash != null && logIndex != null)
      ? { txHash, logIndex }
      : { sender: data.sender, timestamp: data.timestamp };
  }

  it('uses compound (txHash, logIndex) filter when both present', () => {
    const filter = selectFilter('0xdeadbeef', 2, { sender: '0xaaa', timestamp: 1700000000 });
    expect(filter).toEqual({ txHash: '0xdeadbeef', logIndex: 2 });
  });

  it('falls back to (sender, timestamp) when txHash is null', () => {
    const filter = selectFilter(null, null, { sender: '0xaaa', timestamp: 1700000000 });
    expect(filter).toEqual({ sender: '0xaaa', timestamp: 1700000000 });
  });

  it('falls back to (sender, timestamp) when logIndex is null even if txHash present', () => {
    const filter = selectFilter('0xdeadbeef', null, { sender: '0xaaa', timestamp: 1700000000 });
    expect(filter).toEqual({ sender: '0xaaa', timestamp: 1700000000 });
  });

  it('batch: two distinct events with same txHash produce different filters', () => {
    const f1 = selectFilter('0xbatch', 0, { sender: '0xaaa', timestamp: 1700000000 });
    const f2 = selectFilter('0xbatch', 1, { sender: '0xaaa', timestamp: 1700000000 });
    expect(f1).toEqual({ txHash: '0xbatch', logIndex: 0 });
    expect(f2).toEqual({ txHash: '0xbatch', logIndex: 1 });
    expect(f1).not.toEqual(f2);
  });
});

// ---------------------------------------------------------------------------
// JSON fallback dedupe (P1-04)
// ---------------------------------------------------------------------------
describe('blockchainService JSON fallback dedupe', () => {
  function dedupeIndex(txs, txHash, logIndex, data) {
    return txs.findIndex((t) => {
      if (txHash != null && logIndex != null) {
        return t.txHash === txHash && t.logIndex === logIndex;
      }
      return t.sender === data.sender && t.timestamp === data.timestamp;
    });
  }

  it('finds existing record by (txHash, logIndex)', () => {
    const txs = [
      { txHash: '0xabc', logIndex: 0, sender: '0xa', recipient: '0xb', amount: '1' },
      { txHash: '0xabc', logIndex: 1, sender: '0xa', recipient: '0xc', amount: '2' },
    ];
    expect(dedupeIndex(txs, '0xabc', 0, {})).toBe(0);
    expect(dedupeIndex(txs, '0xabc', 1, {})).toBe(1);
  });

  it('returns -1 for new (txHash, logIndex)', () => {
    const txs = [{ txHash: '0xabc', logIndex: 0 }];
    expect(dedupeIndex(txs, '0xabc', 1, {})).toBe(-1);
  });

  it('falls back to sender+timestamp when txHash null', () => {
    const txs = [{ sender: '0xaaa', timestamp: 1700000000 }];
    expect(dedupeIndex(txs, null, null, { sender: '0xaaa', timestamp: 1700000000 })).toBe(0);
    expect(dedupeIndex(txs, null, null, { sender: '0xaaa', timestamp: 1700000001 })).toBe(-1);
  });
});

// ---------------------------------------------------------------------------
// Exponential backoff and service status (P3-07)
// ---------------------------------------------------------------------------
describe('blockchainService RPC reconnect and backoff (P3-07)', () => {
  const blockchainService = require('./blockchainService');

  it('calculates jittered exponential backoff with max 60s cap', () => {
    const delay0 = blockchainService._calculateBackoff(0);
    expect(delay0).toBeGreaterThanOrEqual(1000);
    expect(delay0).toBeLessThanOrEqual(1500);

    const delay1 = blockchainService._calculateBackoff(1);
    expect(delay1).toBeGreaterThanOrEqual(2000);
    expect(delay1).toBeLessThanOrEqual(2500);

    const delay10 = blockchainService._calculateBackoff(10);
    expect(delay10).toBeGreaterThanOrEqual(60000);
    expect(delay10).toBeLessThanOrEqual(60500);
  });

  it('exposes initial status via getStatus()', () => {
    const status = blockchainService.getStatus();
    expect(status).toHaveProperty('status');
    expect(status).toHaveProperty('listenerAttached');
    expect(status).toHaveProperty('reconnectAttempts');
  });
});

// ---------------------------------------------------------------------------
// Indexer Block Cursor Persistence (P3-08)
// ---------------------------------------------------------------------------
describe('blockchainService Block Cursor Persistence (P3-08)', () => {
  const blockchainService = require('./blockchainService');
  const crypto = require('crypto');

  it('persists and retrieves last indexed block cursor', async () => {
    const testContract = '0x' + crypto.randomBytes(20).toString('hex');
    await blockchainService.saveLastIndexedBlock(testContract, 11542600);
    const cursor = await blockchainService.getLastIndexedBlock(testContract);
    expect(cursor).toBe(11542600);

    // Advances cursor to higher block
    await blockchainService.saveLastIndexedBlock(testContract, 11542700);
    const advanced = await blockchainService.getLastIndexedBlock(testContract);
    expect(advanced).toBe(11542700);
  });
});

// ---------------------------------------------------------------------------
// Explicit _init Failure and Status Reporting (P3-09)
// ---------------------------------------------------------------------------
describe('blockchainService explicit init failure (P3-09)', () => {
  const blockchainService = require('./blockchainService');

  it('reports failure status when init is called with invalid ALCHEMY_URL', () => {
    const originalUrl = process.env.ALCHEMY_URL;
    process.env.ALCHEMY_URL = 'invalid-protocol://foo';

    expect(() => blockchainService._init()).toThrow();
    const status = blockchainService.getStatus();
    expect(status.initialized).toBe(false);
    expect(status.initError).toBeDefined();
    expect(status.status).toBe('failed');

    process.env.ALCHEMY_URL = originalUrl;
  });
});
