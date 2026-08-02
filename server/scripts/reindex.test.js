'use strict';

/**
 * reindex.test.js
 * Unit tests for reindex.js backfill script (P1-06).
 */

const fs = require('fs');
const path = require('path');
const { runReindex, normalizeEvent } = require('./reindex');
const Transaction = require('../src/models/Transaction');
const { dbState } = require('../src/config/db');

describe('reindex.js script', () => {
  describe('normalizeEvent helper', () => {
    it('normalizes ethers event log with txHash, blockNumber, logIndex', () => {
      const event = {
        transactionHash: '0xhash123',
        blockNumber: 100,
        index: 2,
        args: {
          from: '0xSENDER',
          receiver: '0xRECEIVER',
          amount: '1000',
          message: 'batch transfer',
          category: 'test',
          timestamp: 1700000000,
        },
      };

      const result = normalizeEvent(event);
      expect(result.sender).toBe('0xsender');
      expect(result.recipient).toBe('0xreceiver');
      expect(result.amount).toBe('1000');
      expect(result.txHash).toBe('0xhash123');
      expect(result.blockNumber).toBe(100);
      expect(result.logIndex).toBe(2);
    });
  });

  describe('runReindex dry-run and commit behavior', () => {
    const dataDir = path.resolve(__dirname, '../data');
    const txFile = path.join(dataDir, 'transactions.json');
    let originalFileContent = null;

    beforeAll(() => {
      if (fs.existsSync(txFile)) {
        originalFileContent = fs.readFileSync(txFile, 'utf8');
      }
    });

    afterAll(() => {
      if (originalFileContent !== null) {
        fs.writeFileSync(txFile, originalFileContent, 'utf8');
      }
    });

    it('handles dry-run mode without crashing when RPC is unconfigured', async () => {
      const res = await runReindex({ commit: false });
      expect(res).toHaveProperty('scanned');
      expect(res).toHaveProperty('missing');
      expect(res).toHaveProperty('backfilled');
      expect(res).toHaveProperty('skipped');
    });
  });
});
