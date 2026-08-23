'use strict';

/**
 * watchlistRepo.js
 *
 * Persistence layer for watchlists. Hides the Mongo-vs-JSON-fallback
 * decision behind a single check (see isMongoMode below) so callers
 * (watchlistController) never branch on dbState themselves.
 *
 * JSON fallback path uses jsonStore's atomic read/write helpers instead of
 * raw fs.readFileSync/writeFileSync.
 *
 * Callers are expected to pass an already-normalized (lowercase, trimmed)
 * walletAddress and coinId — this module does not re-normalize, it only
 * preserves whatever casing it is given as the storage key.
 */

const path = require('path');
const Watchlist = require('../models/Watchlist');
const { readJson, writeJson } = require('../lib/jsonStore');

const DATA_DIR = path.resolve(__dirname, '../../data');
const WATCHLIST_FILE = path.join(DATA_DIR, 'watchlist.json');

// The single place this module inspects dbState.connected.
function isMongoMode(dbState) {
  return Boolean(dbState && dbState.connected);
}

function readLocalWatchlists() {
  return readJson(WATCHLIST_FILE, {});
}

function writeLocalWatchlists(data) {
  return writeJson(WATCHLIST_FILE, data);
}

// ---------------------------------------------------------------------------
// getWatchlist
// Returns { walletAddress, coins: [{ coinId, addedAt }] } (or the raw Mongo
// lean document when connected, which has the same shape plus _id/timestamps).
// ---------------------------------------------------------------------------
async function getWatchlist(dbState, walletAddress) {
  if (isMongoMode(dbState)) {
    const watchlist = await Watchlist.findOne({ walletAddress }).lean();
    return watchlist ?? { walletAddress, coins: [] };
  }

  const watchlists = readLocalWatchlists();
  const list = watchlists[walletAddress] || [];
  return {
    walletAddress,
    coins: list.map((coinId) => ({ coinId, addedAt: new Date() })),
  };
}

// ---------------------------------------------------------------------------
// addCoin
// Adds coinId to the wallet's watchlist (creating it if needed) and returns
// the resulting watchlist.
// ---------------------------------------------------------------------------
async function addCoin(dbState, walletAddress, coinId) {
  if (isMongoMode(dbState)) {
    // Atomic find-and-update instead of find → mutate in memory → save().
    // The latter has a lost-update race: two concurrent adds/removes for the
    // same wallet both read the same snapshot, and whichever .save() lands
    // second silently overwrites the first's change.
    //
    // $addToSet can't be used directly here — each entry carries an
    // `addedAt` timestamp that differs on every call, so $addToSet's exact
    // subdocument match would never recognize a re-add as a duplicate.
    // Instead: ensure the document exists, then push atomically only if no
    // existing entry already has this coinId — the existence check and the
    // push happen as one atomic operation, so a concurrent add for a
    // different coin can't race this one into a lost update.
    await Watchlist.findOneAndUpdate(
      { walletAddress },
      { $setOnInsert: { walletAddress } },
      { upsert: true },
    );
    await Watchlist.updateOne(
      { walletAddress, 'coins.coinId': { $ne: coinId } },
      { $push: { coins: { coinId, addedAt: new Date() } } },
    );
    return Watchlist.findOne({ walletAddress });
  }

  const watchlists = readLocalWatchlists();
  if (!watchlists[walletAddress]) {
    watchlists[walletAddress] = [];
  }
  if (!watchlists[walletAddress].includes(coinId)) {
    watchlists[walletAddress].push(coinId);
  }
  await writeLocalWatchlists(watchlists);

  return {
    walletAddress,
    coins: watchlists[walletAddress].map((id) => ({ coinId: id, addedAt: new Date() })),
  };
}

// ---------------------------------------------------------------------------
// removeCoin
// Removes coinId from the wallet's watchlist. Returns null if no watchlist
// exists for this wallet (caller maps that to a 404), otherwise returns the
// resulting watchlist.
// ---------------------------------------------------------------------------
async function removeCoin(dbState, walletAddress, coinId) {
  if (isMongoMode(dbState)) {
    // Atomic $pull instead of find → mutate in memory → save() — same
    // lost-update race as addCoin above.
    const existing = await Watchlist.findOne({ walletAddress });
    if (!existing) {
      return null;
    }
    return Watchlist.findOneAndUpdate(
      { walletAddress },
      { $pull: { coins: { coinId } } },
      { new: true },
    );
  }

  const watchlists = readLocalWatchlists();
  if (!watchlists[walletAddress]) {
    return null;
  }

  watchlists[walletAddress] = watchlists[walletAddress].filter((id) => id !== coinId);
  await writeLocalWatchlists(watchlists);

  return {
    walletAddress,
    coins: watchlists[walletAddress].map((id) => ({ coinId: id, addedAt: new Date() })),
  };
}

module.exports = { getWatchlist, addCoin, removeCoin };
