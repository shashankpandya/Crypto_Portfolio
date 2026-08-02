#!/usr/bin/env node
/**
 * reindex.js — Backfill collapsed batch transfers
 *
 * Scans on-chain `TransactionAdded` events and backfills missing event records
 * (e.g. N-1 transfers lost when batch transactions collapsed on single txHash key).
 *
 * Usage:
 *   node server/scripts/reindex.js [--dry-run] [--commit] [--from-block=N] [--to-block=N]
 *
 * Options:
 *   --dry-run      Scan and report missing records without making changes (default)
 *   --commit       Persist missing records to MongoDB and server/data/transactions.json
 *   --from-block   Starting block number (default: latest - 500)
 *   --to-block     Ending block number (default: 'latest')
 */

'use strict';

const fs = require('fs');
const path = require('path');

// Load environment variables from root .env and server/.env
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { ethers } = require('ethers');
const mongoose = require('mongoose');
const Transaction = require('../src/models/Transaction');
const { dbState, connectDB } = require('../src/config/db');

const DATA_DIR = path.resolve(__dirname, '../data');
const TRANSACTIONS_FILE = path.join(DATA_DIR, 'transactions.json');
const BLOCK_CHUNK_SIZE = 10; // Alchemy Free Tier limit per eth_getLogs call

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
];

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

function normalizeEvent(event) {
  const args = event.args || {};
  const sender = (args.from || args.sender || args[0] || '').toLowerCase().trim();
  const recipient = (args.receiver || args.recipient || args[1] || '').toLowerCase().trim();
  const amount = (args.amount || args[2] || '0').toString();
  const message = args.message || args[3] || '';
  const keyword = args.category || args.keyword || args[4] || '';
  const timestamp = Number(args.timestamp || args[6] || 0);

  const txHash = event.transactionHash || event.log?.transactionHash || null;
  const blockNumber = event.blockNumber || event.log?.blockNumber || null;
  const logIndex = event.index ?? event.logIndex ?? event.log?.index ?? null;

  return {
    sender,
    recipient,
    amount,
    message,
    keyword,
    timestamp,
    ...(txHash != null && { txHash }),
    ...(blockNumber != null && { blockNumber }),
    ...(logIndex != null && { logIndex }),
  };
}

async function runReindex({ commit = false, customFromBlock = null, customToBlock = null } = {}) {
  console.log(`=== Reindex Script (${commit ? 'COMMIT MODE' : 'DRY-RUN MODE'}) ===\n`);

  const alchemyUrl = process.env.ALCHEMY_URL;
  const contractAddress = process.env.CONTRACT_ADDRESS || process.env.VITE_CONTRACT_ADDRESS;

  // Try DB connection if MONGO_URI exists
  const mongoUri = process.env.MONGO_URI;
  if (mongoUri) {
    try {
      await connectDB();
    } catch (err) {
      console.warn('[Reindex] Could not connect to MongoDB:', err.message);
    }
  }

  const isMongoConnected = Boolean(dbState && dbState.connected && mongoose.connection.readyState === 1);
  console.log(`[Reindex] Target Storage: ${isMongoConnected ? 'MongoDB + JSON Fallback' : 'JSON Fallback Only'}`);

  let events = [];
  if (alchemyUrl && contractAddress) {
    try {
      console.log(`[Reindex] Connecting to RPC: ${alchemyUrl.slice(0, 40)}...`);
      const provider = new ethers.JsonRpcProvider(alchemyUrl);
      const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, provider);
      
      const currentBlock = await provider.getBlockNumber();
      const endBlock = customToBlock !== null ? Number(customToBlock) : currentBlock;
      const startBlock = customFromBlock !== null ? Number(customFromBlock) : Math.max(0, endBlock - 200);

      console.log(`[Reindex] Querying TransactionAdded events (blocks ${startBlock} to ${endBlock})...`);

      for (let b = startBlock; b <= endBlock; b += BLOCK_CHUNK_SIZE) {
        const chunkEnd = Math.min(b + BLOCK_CHUNK_SIZE - 1, endBlock);
        try {
          const chunkEvents = await contract.queryFilter('TransactionAdded', b, chunkEnd);
          events.push(...chunkEvents);
        } catch (chunkErr) {
          console.warn(`[Reindex] Chunk ${b}-${chunkEnd} failed: ${chunkErr.message.slice(0, 80)}`);
        }
      }

      console.log(`[Reindex] Found ${events.length} on-chain event(s).`);
    } catch (err) {
      console.warn(`[Reindex] RPC event query failed: ${err.message}`);
      console.warn('[Reindex] Continuing with local analysis.');
    }
  } else {
    console.warn('[Reindex] ALCHEMY_URL or CONTRACT_ADDRESS not set. Skipping on-chain RPC query.');
  }

  // Load existing records from DB or local JSON
  let existingDbRecords = [];
  if (isMongoConnected) {
    existingDbRecords = await Transaction.find({}).lean();
  }
  const existingJsonRecords = getLocalTransactions();

  console.log(`[Reindex] Existing MongoDB records: ${existingDbRecords.length}`);
  console.log(`[Reindex] Existing JSON records:    ${existingJsonRecords.length}`);

  if (events.length === 0) {
    console.log('\n[Reindex] No on-chain events fetched to process. Reindex complete.');
    if (isMongoConnected) await mongoose.disconnect();
    return { scanned: 0, missing: 0, backfilled: 0, skipped: 0 };
  }

  let missingCount = 0;
  let backfilledCount = 0;
  let skippedCount = 0;
  const toInsert = [];

  for (const event of events) {
    const normalized = normalizeEvent(event);
    const { txHash, logIndex, sender, timestamp } = normalized;

    // Check if present in DB / JSON
    const existsInDb = isMongoConnected
      ? existingDbRecords.some((r) =>
          txHash != null && logIndex != null
            ? r.txHash === txHash && r.logIndex === logIndex
            : r.sender === sender && r.timestamp === timestamp,
        )
      : false;

    const existsInJson = existingJsonRecords.some((r) =>
      txHash != null && logIndex != null
        ? r.txHash === txHash && r.logIndex === logIndex
        : r.sender === sender && r.timestamp === timestamp,
    );

    if (!existsInDb && !existsInJson) {
      missingCount++;
      toInsert.push(normalized);
    } else {
      skippedCount++;
    }
  }

  console.log(`\n[Reindex] Analysis Summary:`);
  console.log(`  - Total on-chain events: ${events.length}`);
  console.log(`  - Existing / Up-to-date: ${skippedCount}`);
  console.log(`  - Collapsed / Missing:   ${missingCount}`);

  if (missingCount > 0 && commit) {
    console.log(`\n[Reindex] Backfilling ${missingCount} missing event(s)...`);
    
    // JSON file update
    const updatedJson = [...existingJsonRecords];
    for (const record of toInsert) {
      const idx = updatedJson.findIndex((r) =>
        record.txHash != null && record.logIndex != null
          ? r.txHash === record.txHash && r.logIndex === record.logIndex
          : r.sender === record.sender && r.timestamp === record.timestamp,
      );
      if (idx > -1) {
        updatedJson[idx] = { ...updatedJson[idx], ...record };
      } else {
        updatedJson.push(record);
      }
    }
    saveLocalTransactions(updatedJson);
    console.log(`[Reindex] Updated ${TRANSACTIONS_FILE}`);

    // MongoDB update
    if (isMongoConnected) {
      const ops = toInsert.map((record) => ({
        updateOne: {
          filter:
            record.txHash != null && record.logIndex != null
              ? { txHash: record.txHash, logIndex: record.logIndex }
              : { sender: record.sender, timestamp: record.timestamp },
          update: { $set: record },
          upsert: true,
        },
      }));
      const bulkRes = await Transaction.bulkWrite(ops, { ordered: false });
      console.log(`[Reindex] MongoDB bulk write completed — upserted: ${bulkRes.upsertedCount}, modified: ${bulkRes.modifiedCount}`);
    }
    backfilledCount = missingCount;
  } else if (missingCount > 0) {
    console.log(`\n[Reindex] DRY-RUN: Run with --commit to persist ${missingCount} missing record(s).`);
  }

  if (isMongoConnected) {
    await mongoose.disconnect();
  }

  console.log('\n=== Reindex Completed Successfully ===');
  return { scanned: events.length, missing: missingCount, backfilled: backfilledCount, skipped: skippedCount };
}

// Execute CLI entry point if executed directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const commit = args.includes('--commit');
  const fromArg = args.find((a) => a.startsWith('--from-block='));
  const toArg = args.find((a) => a.startsWith('--to-block='));
  const customFromBlock = fromArg ? fromArg.split('=')[1] : null;
  const customToBlock = toArg ? toArg.split('=')[1] : null;

  runReindex({ commit, customFromBlock, customToBlock })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('\n[Reindex] Fatal Error:', err);
      process.exit(1);
    });
}

module.exports = { runReindex, normalizeEvent };
