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
    let watchlist = await Watchlist.findOne({ walletAddress });

    if (!watchlist) {
      watchlist = new Watchlist({ walletAddress, coins: [] });
    }

    await watchlist.addCoin(coinId);
    return watchlist;
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
    const watchlist = await Watchlist.findOne({ walletAddress });

    if (!watchlist) {
      return null;
    }

    await watchlist.removeCoin(coinId);
    return watchlist;
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
