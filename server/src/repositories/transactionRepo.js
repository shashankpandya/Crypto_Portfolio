'use strict';

/**
 * transactionRepo.js
 *
 * Encapsulates the dbState.connected ? mongo : json-fallback branching for
 * transactions so controllers stay thin. This module reads
 * `dbState.connected` in exactly ONE place (see `isDbConnected`).
 */

const path = require('path');
const Transaction = require('../models/Transaction');
const { readJson } = require('../lib/jsonStore');

const DATA_DIR = path.resolve(__dirname, '../../data');
const TRANSACTIONS_FILE = path.join(DATA_DIR, 'transactions.json');

function isDbConnected(dbState) {
  return Boolean(dbState && dbState.connected);
}

function getLocalTransactions() {
  return readJson(TRANSACTIONS_FILE, []);
}

/**
 * Returns transactions where sender OR recipient matches `address`,
 * sorted desc by timestamp, paginated by { skip, limit }.
 * @returns {Promise<{ total: number, transactions: object[] }>}
 */
async function findByAddress(dbState, address, { skip, limit }) {
  if (isDbConnected(dbState)) {
    const filter = {
      $or: [
        { sender:    address },
        { recipient: address },
      ],
    };

    const [total, transactions] = await Promise.all([
      Transaction.countDocuments(filter),
      Transaction.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    return { total, transactions };
  }

  const txs = getLocalTransactions();
  const filtered = txs.filter((t) => t.sender === address || t.recipient === address);
  filtered.sort((a, b) => b.timestamp - a.timestamp);

  const total = filtered.length;
  const transactions = filtered.slice(skip, skip + limit);

  return { total, transactions };
}

/**
 * Returns the total number of transactions.
 * @returns {Promise<number>}
 */
async function countAll(dbState) {
  if (isDbConnected(dbState)) {
    return Transaction.countDocuments();
  }

  return getLocalTransactions().length;
}

module.exports = { findByAddress, countAll };
