/**
 * blockchainService.js
 * Listens for on-chain TransactionAdded events and syncs historical
 * transactions from the smart contract into MongoDB.
 *
 * ALCHEMY_URL must be a valid https:// or wss:// Alchemy endpoint.
 * Example: https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');
const Transaction = require('../models/Transaction');
const { dbState } = require('../config/db');

const DATA_DIR = path.resolve(__dirname, '../../data');
const TRANSACTIONS_FILE = path.join(DATA_DIR, 'transactions.json');

function getLocalTransactions() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(TRANSACTIONS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(TRANSACTIONS_FILE, 'utf8'));
  } catch (e) {
    return [];
  }
}

function saveLocalTransactions(txs) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(txs, null, 2), 'utf8');
}

// ---------------------------------------------------------------------------
// Minimal ABI
// ---------------------------------------------------------------------------
const CONTRACT_ABI = [
  {
    type: 'event',
    name: 'TransactionAdded',
    inputs: [
      { indexed: false, name: 'from',      type: 'address' },
      { indexed: false, name: 'receiver',  type: 'address' },
      { indexed: false, name: 'amount',    type: 'uint256' },
      { indexed: false, name: 'message',   type: 'string'  },
      { indexed: false, name: 'category',  type: 'string'  },
      { indexed: false, name: 'tags',      type: 'string[]' },
      { indexed: false, name: 'timestamp', type: 'uint256' },
    ],
  },
  {
    type: 'function',
    name: 'getAllTransactions',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'tuple[]',
        components: [
          { name: 'sender',    type: 'address' },
          { name: 'receiver',  type: 'address' },
          { name: 'amount',    type: 'uint256' },
          { name: 'message',   type: 'string'  },
          { name: 'category',  type: 'string'  },
          { name: 'tags',      type: 'string[]' },
          { name: 'timestamp', type: 'uint256' },
        ],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helper — normalise raw on-chain data into a Mongoose-compatible object.
// ---------------------------------------------------------------------------
function normalizeTx(raw, txHash = null, blockNumber = null) {
  const senderAddress = raw.sender ?? raw.from ?? raw[0];
  const recipientAddress = raw.receiver ?? raw.recipient ?? raw[1];
  return {
    sender:      senderAddress ? senderAddress.toLowerCase().trim() : '',
    recipient:   recipientAddress ? recipientAddress.toLowerCase().trim() : '',
    amount:      (raw.amount   ?? raw[2]).toString(),
    message:     raw.message   ?? raw[3] ?? '',
    keyword:     raw.category  ?? raw.keyword ?? raw[4] ?? '',
    timestamp:   Number(raw.timestamp ?? raw[6] ?? raw[4] ?? 0),
    ...(txHash      && { txHash }),
    ...(blockNumber && { blockNumber }),
  };
}

// ---------------------------------------------------------------------------
// Validate ALCHEMY_URL format before passing it to ethers.
// ethers.JsonRpcProvider only accepts http://, https://, ws://, or wss://.
// A missing, placeholder, or malformed value produces the cryptic
// "unsupported protocol" error seen in the logs.
// ---------------------------------------------------------------------------
function validateAlchemyUrl(url) {
  if (!url) {
    throw new Error('ALCHEMY_URL environment variable is not set.');
  }
  const valid = url.startsWith('https://') ||
                url.startsWith('http://')  ||
                url.startsWith('wss://')   ||
                url.startsWith('ws://');
  if (!valid) {
    throw new Error(
      `ALCHEMY_URL has an unsupported protocol. ` +
      `It must start with https://, http://, wss://, or ws://. ` +
      `Current value starts with: "${url.slice(0, 30)}..."`,
    );
  }
}

// ---------------------------------------------------------------------------
// BlockchainService
// ---------------------------------------------------------------------------
class BlockchainService {
  constructor() {
    this.provider = null;
    this.contract = null;
    this._listenerAttached = false;
  }

  _init() {
    if (this.contract) return;

    const alchemyUrl      = process.env.ALCHEMY_URL;
    const contractAddress = process.env.CONTRACT_ADDRESS || process.env.VITE_CONTRACT_ADDRESS;

    // Validate URL format — throws a clear error instead of the cryptic
    // "unsupported protocol" message from ethers internals.
    validateAlchemyUrl(alchemyUrl);

    if (!contractAddress) {
      throw new Error('CONTRACT_ADDRESS environment variable is not set.');
    }

    this.provider = new ethers.JsonRpcProvider(alchemyUrl);
    this.contract = new ethers.Contract(contractAddress, CONTRACT_ABI, this.provider);

    console.log('[BlockchainService] Initialised provider and contract.');
    console.log(`[BlockchainService] Network URL: ${alchemyUrl.slice(0, 50)}...`);
  }

  async startEventListener() {
    try {
      this._init();
    } catch (err) {
      console.warn('[BlockchainService] Initialization failed (non-fatal listener):', err.message);
      return;
    }

    if (this._listenerAttached) {
      console.warn('[BlockchainService] Event listener already attached — skipping.');
      return;
    }

    this.contract.on(
      'TransactionAdded',
      async (from, receiver, amount, message, category, tags, timestamp, event) => {
        const txHash      = event?.log?.transactionHash ?? null;
        const blockNumber = event?.log?.blockNumber      ?? null;

        console.log(`[BlockchainService] TransactionAdded event — txHash: ${txHash}`);

        try {
          const data   = normalizeTx({ sender: from, receiver, amount, message, category, timestamp }, txHash, blockNumber);

          if (dbState && dbState.connected) {
            const filter = txHash
              ? { txHash }
              : { sender: data.sender, timestamp: data.timestamp };

            await Transaction.findOneAndUpdate(filter, data, {
              upsert: true,
              new: true,
              setDefaultsOnInsert: true,
            });
          } else {
            // Local JSON file fallback
            const txs = getLocalTransactions();
            const index = txs.findIndex(t => 
              txHash ? t.txHash === txHash : (t.sender === data.sender && t.timestamp === data.timestamp)
            );
            if (index > -1) {
              txs[index] = { ...txs[index], ...data };
            } else {
              txs.push(data);
            }
            saveLocalTransactions(txs);
          }

          console.log(`[BlockchainService] Saved transaction — txHash: ${txHash}`);
        } catch (err) {
          console.error('[BlockchainService] Failed to save event transaction:', err);
        }
      },
    );

    this._listenerAttached = true;
    console.log('[BlockchainService] Listening for TransactionAdded events.');
  }

  async syncHistoricalTransactions() {
    try {
      this._init();
    } catch (err) {
      console.warn('[BlockchainService] Initialization failed (non-fatal sync):', err.message);
      return [];
    }

    console.log('[BlockchainService] Fetching historical transactions from contract.');

    let rawTxs;
    try {
      rawTxs = await this.contract.getAllTransactions();
    } catch (err) {
      console.error('[BlockchainService] getAllTransactions() call failed:', err.message);
      throw err;
    }

    if (!rawTxs || rawTxs.length === 0) {
      console.log('[BlockchainService] No historical transactions found.');
      return [];
    }

    console.log(`[BlockchainService] Processing ${rawTxs.length} historical transaction(s).`);

    if (dbState && dbState.connected) {
      const ops = rawTxs.map((raw) => {
        const data = normalizeTx(raw);
        return {
          updateOne: {
            filter: { sender: data.sender, timestamp: data.timestamp },
            update: { $set: data },
            upsert: true,
          },
        };
      });

      try {
        const result = await Transaction.bulkWrite(ops, { ordered: false });
        console.log(
          `[BlockchainService] Sync complete — ` +
          `upserted: ${result.upsertedCount}, modified: ${result.modifiedCount}`,
        );
        return rawTxs;
      } catch (err) {
        console.error('[BlockchainService] Bulk upsert failed:', err.message);
        throw err;
      }
    } else {
      // Local JSON file fallback
      const txs = getLocalTransactions();
      let updatedCount = 0;
      let upsertedCount = 0;

      rawTxs.forEach((raw) => {
        const data = normalizeTx(raw);
        const index = txs.findIndex(t => t.sender === data.sender && t.timestamp === data.timestamp);
        if (index > -1) {
          txs[index] = { ...txs[index], ...data };
          updatedCount++;
        } else {
          txs.push(data);
          upsertedCount++;
        }
      });

      saveLocalTransactions(txs);
      console.log(
        `[BlockchainService] Local JSON sync complete — ` +
        `upserted: ${upsertedCount}, modified: ${updatedCount}`,
      );
      return rawTxs;
    }
  }

  stopEventListener() {
    if (this.contract && this._listenerAttached) {
      this.contract.removeAllListeners('TransactionAdded');
      this._listenerAttached = false;
      console.log('[BlockchainService] Event listener removed.');
    }
  }
}

module.exports = new BlockchainService();
