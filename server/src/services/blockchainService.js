/**
 * blockchainService.js
 * Listens for on-chain TransactionAdded events and syncs historical
 * transactions from the smart contract into MongoDB.
 */

'use strict';

const { ethers } = require('ethers');
const Transaction = require('../models/Transaction');

// ---------------------------------------------------------------------------
// Minimal ABI – only the pieces this service needs.
// ---------------------------------------------------------------------------
const CONTRACT_ABI = [
  // Event emitted whenever a new transaction is recorded on-chain.
  {
    type: 'event',
    name: 'TransactionAdded',
    inputs: [
      { indexed: true,  name: 'id',        type: 'uint256' },
      { indexed: true,  name: 'sender',    type: 'address' },
      { indexed: false, name: 'recipient', type: 'address' },
      { indexed: false, name: 'amount',    type: 'uint256' },
      { indexed: false, name: 'message',   type: 'string'  },
      { indexed: false, name: 'timestamp', type: 'uint256' },
      { indexed: false, name: 'keyword',   type: 'string'  },
    ],
  },

  // View function that returns every stored transaction.
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
          { name: 'timestamp', type: 'uint256' },
          { name: 'keyword',   type: 'string'  },
        ],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helper – convert a raw on-chain tuple / event args into a plain object
// that matches the Transaction Mongoose schema.
// ---------------------------------------------------------------------------
function normalizeTx(raw, txHash = null, blockNumber = null) {
  return {
    sender:      raw.sender    ?? raw[0],
    recipient:   raw.recipient ?? raw.receiver ?? raw[1],
    amount:      (raw.amount   ?? raw[2]).toString(),   // keep as string – BigInt safe
    message:     raw.message   ?? raw[3] ?? '',
    timestamp:   Number(raw.timestamp ?? raw[4]),
    keyword:     raw.keyword   ?? raw[5] ?? '',
    ...(txHash      && { txHash }),
    ...(blockNumber && { blockNumber }),
  };
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

  // -------------------------------------------------------------------------
  // _init – lazy initialisation so the class can be imported before env vars
  // are loaded (e.g. during unit tests).
  // -------------------------------------------------------------------------
  _init() {
    if (this.contract) return; // already initialised

    const alchemyUrl       = process.env.ALCHEMY_URL;
    const contractAddress  = process.env.CONTRACT_ADDRESS;

    if (!alchemyUrl) {
      throw new Error('ALCHEMY_URL environment variable is not set.');
    }
    if (!contractAddress) {
      throw new Error('CONTRACT_ADDRESS environment variable is not set.');
    }

    // Read-only provider – no signer needed.
    this.provider = new ethers.JsonRpcProvider(alchemyUrl);
    this.contract = new ethers.Contract(contractAddress, CONTRACT_ABI, this.provider);

    console.log('[BlockchainService] Initialised provider and contract.');
  }

  // -------------------------------------------------------------------------
  // startEventListener
  // Subscribes to the TransactionAdded event and persists each new event
  // to MongoDB via an upsert (idempotent – safe to call after a restart).
  // -------------------------------------------------------------------------
  async startEventListener() {
    this._init();

    if (this._listenerAttached) {
      console.warn('[BlockchainService] Event listener already attached – skipping.');
      return;
    }

    this.contract.on(
      'TransactionAdded',
      async (id, sender, recipient, amount, message, timestamp, keyword, event) => {
        const txHash      = event?.log?.transactionHash ?? null;
        const blockNumber = event?.log?.blockNumber      ?? null;

        console.log(`[BlockchainService] TransactionAdded event – txHash: ${txHash}`);

        try {
          const data = normalizeTx(
            { sender, recipient, amount, message, timestamp, keyword },
            txHash,
            blockNumber,
          );

          // Upsert by txHash when available, otherwise by (sender + timestamp).
          const filter = txHash
            ? { txHash }
            : { sender: data.sender, timestamp: data.timestamp };

          await Transaction.findOneAndUpdate(filter, data, {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
          });

          console.log(`[BlockchainService] Saved transaction – txHash: ${txHash}`);
        } catch (err) {
          console.error('[BlockchainService] Failed to save event transaction:', err);
        }
      },
    );

    this._listenerAttached = true;
    console.log('[BlockchainService] Listening for TransactionAdded events…');
  }

  // -------------------------------------------------------------------------
  // syncHistoricalTransactions
  // Calls getAllTransactions() on the contract and upserts every record into
  // MongoDB.  Designed to be called once at server startup so the database
  // is always in sync with the chain.
  // -------------------------------------------------------------------------
  async syncHistoricalTransactions() {
    this._init();

    console.log('[BlockchainService] Fetching historical transactions from contract…');

    let rawTxs;
    try {
      rawTxs = await this.contract.getAllTransactions();
    } catch (err) {
      console.error('[BlockchainService] getAllTransactions() call failed:', err);
      throw err;
    }

    if (!rawTxs || rawTxs.length === 0) {
      console.log('[BlockchainService] No historical transactions found.');
      return [];
    }

    console.log(`[BlockchainService] Upserting ${rawTxs.length} historical transaction(s)…`);

    const ops = rawTxs.map((raw) => {
      const data = normalizeTx(raw);

      // Use (sender + timestamp) as a stable natural key when no txHash exists.
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
        `[BlockchainService] Sync complete – ` +
        `upserted: ${result.upsertedCount}, modified: ${result.modifiedCount}`,
      );
      return rawTxs;
    } catch (err) {
      console.error('[BlockchainService] Bulk upsert failed:', err);
      throw err;
    }
  }

  // -------------------------------------------------------------------------
  // stopEventListener – graceful shutdown helper.
  // -------------------------------------------------------------------------
  stopEventListener() {
    if (this.contract && this._listenerAttached) {
      this.contract.removeAllListeners('TransactionAdded');
      this._listenerAttached = false;
      console.log('[BlockchainService] Event listener removed.');
    }
  }
}

// Export a singleton so the provider / contract are shared across the app.
module.exports = new BlockchainService();
