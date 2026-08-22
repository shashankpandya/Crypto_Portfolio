'use strict';

// Seeds MongoDB with a realistic transaction history + watchlist for a
// freshly-generated demo wallet, so the dashboard/watchlist/allowance pages
// can be exercised end-to-end against real data instead of an empty DB.
//
// The demo wallet's private key is printed to stdout ONLY (never written to
// a file) — it's a throwaway Sepolia-testnet key with no funds, safe to
// import into MetaMask purely to view this seeded data as "your" wallet.
//
// Usage: node server/scripts/seed-demo-data.js

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { ethers } = require('ethers');
const mongoose = require('mongoose');
const Transaction = require('../src/models/Transaction');
const Watchlist = require('../src/models/Watchlist');

const COINS = [
  'bitcoin', 'ethereum', 'solana', 'cardano', 'chainlink',
  'polkadot', 'avalanche-2', 'matic-network',
];

const MESSAGES = [
  'Payment for design work', 'Monthly rent split', 'Invoice #4471', 'Gift',
  'Loan repayment', 'Freelance milestone', 'Coffee fund', 'Thanks!',
  'Split dinner bill', 'Consulting fee',
];

function randomAmountWei() {
  const eth = (Math.random() * 2 + 0.01).toFixed(4);
  return ethers.parseEther(eth).toString();
}

function randomTxHash() {
  return ethers.hexlify(ethers.randomBytes(32));
}

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI not set (checked server/.env and root .env) — cannot seed.');
    process.exit(1);
  }

  await mongoose.connect(uri, { family: 4 });
  console.log('[seed] Connected to MongoDB.');

  const demoWallet = ethers.Wallet.createRandom();
  const demoAddress = demoWallet.address.toLowerCase();

  const counterparties = Array.from({ length: 4 }, () =>
    ethers.Wallet.createRandom().address.toLowerCase()
  );

  const now = Math.floor(Date.now() / 1000);
  const txDocs = [];
  const TX_COUNT = 22;

  for (let i = 0; i < TX_COUNT; i++) {
    const outgoing = i % 2 === 0;
    const counterparty = counterparties[i % counterparties.length];
    const daysAgo = Math.floor((i / TX_COUNT) * 45) + Math.random();
    txDocs.push({
      sender: outgoing ? demoAddress : counterparty,
      recipient: outgoing ? counterparty : demoAddress,
      amount: randomAmountWei(),
      message: MESSAGES[i % MESSAGES.length],
      keyword: outgoing ? 'Transfer' : 'Received',
      timestamp: now - Math.floor(daysAgo * 86400),
      txHash: randomTxHash(),
      logIndex: 0,
      blockNumber: 4_500_000 + i * 37,
    });
  }

  await Transaction.insertMany(txDocs);
  console.log(`[seed] Inserted ${txDocs.length} demo transactions for ${demoAddress}.`);

  await Watchlist.findOneAndUpdate(
    { walletAddress: demoAddress },
    { walletAddress: demoAddress, coins: COINS.map((coinId) => ({ coinId, addedAt: new Date() })) },
    { upsert: true, new: true },
  );
  console.log(`[seed] Seeded watchlist (${COINS.length} coins) for ${demoAddress}.`);

  await mongoose.disconnect();

  console.log('\n=================================================================');
  console.log(' DEMO WALLET — TEST ONLY. No real funds. Sepolia testnet only.');
  console.log(' Import this private key into MetaMask to view the seeded data');
  console.log(' as this wallet\'s dashboard / transaction history / watchlist.');
  console.log('=================================================================');
  console.log(` Address:     ${demoWallet.address}`);
  console.log(` Private key: ${demoWallet.privateKey}`);
  console.log('=================================================================\n');
}

main().catch((err) => {
  console.error('[seed] Failed:', err);
  process.exit(1);
});
