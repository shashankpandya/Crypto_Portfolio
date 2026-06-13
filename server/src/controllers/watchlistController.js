'use strict';

const fs = require('fs');
const path = require('path');
const Watchlist = require('../models/Watchlist');

const DATA_DIR = path.resolve(__dirname, '../../data');
const WATCHLIST_FILE = path.join(DATA_DIR, 'watchlist.json');

function getLocalWatchlists() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(WATCHLIST_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(WATCHLIST_FILE, 'utf8'));
  } catch (e) {
    return {};
  }
}

function saveLocalWatchlists(data) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(WATCHLIST_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// ---------------------------------------------------------------------------
// get
// GET /api/watchlist/:walletAddress
// Returns the watchlist for the given wallet, or an empty coins array if
// no document exists yet (avoids a 404 on first visit).
// ---------------------------------------------------------------------------
async function get(req, res) {
  try {
    const walletAddress = req.params.walletAddress?.toLowerCase().trim();

    if (!walletAddress) {
      return res.status(400).json({ success: false, message: 'walletAddress is required.' });
    }

    const { dbState } = req.app.locals;
    if (dbState && dbState.connected) {
      const watchlist = await Watchlist.findOne({ walletAddress }).lean();
      return res.status(200).json({
        success: true,
        data:    watchlist ?? { walletAddress, coins: [] },
      });
    } else {
      const watchlists = getLocalWatchlists();
      const list = watchlists[walletAddress] || [];
      return res.status(200).json({
        success: true,
        data: {
          walletAddress,
          coins: list.map(coinId => ({ coinId, addedAt: new Date() })),
        },
      });
    }
  } catch (err) {
    console.error('[watchlistController.get]', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
}

// ---------------------------------------------------------------------------
// addCoin
// POST /api/watchlist/:walletAddress/coins
// Body: { coinId: string }
// Upserts the watchlist document and adds the coin if not already present.
// ---------------------------------------------------------------------------
async function addCoin(req, res) {
  try {
    const walletAddress = req.params.walletAddress?.toLowerCase().trim();
    const coinId        = req.body.coinId?.toLowerCase().trim();

    if (!walletAddress) {
      return res.status(400).json({ success: false, message: 'walletAddress is required.' });
    }
    if (!coinId) {
      return res.status(400).json({ success: false, message: 'coinId is required in the request body.' });
    }

    const { dbState } = req.app.locals;
    if (dbState && dbState.connected) {
      let watchlist = await Watchlist.findOne({ walletAddress });

      if (!watchlist) {
        watchlist = new Watchlist({ walletAddress, coins: [] });
      }

      await watchlist.addCoin(coinId);

      return res.status(200).json({
        success: true,
        message: `${coinId} added to watchlist.`,
        data:    watchlist,
      });
    } else {
      const watchlists = getLocalWatchlists();
      if (!watchlists[walletAddress]) {
        watchlists[walletAddress] = [];
      }
      if (!watchlists[walletAddress].includes(coinId)) {
        watchlists[walletAddress].push(coinId);
      }
      saveLocalWatchlists(watchlists);
      return res.status(200).json({
        success: true,
        message: `${coinId} added to watchlist.`,
        data: {
          walletAddress,
          coins: watchlists[walletAddress].map(id => ({ coinId: id, addedAt: new Date() })),
        },
      });
    }
  } catch (err) {
    console.error('[watchlistController.addCoin]', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
}

// ---------------------------------------------------------------------------
// removeCoin
// DELETE /api/watchlist/:walletAddress/coins/:coinId
// Removes the specified coin from the wallet's watchlist.
// Returns 404 if the watchlist document does not exist.
// ---------------------------------------------------------------------------
async function removeCoin(req, res) {
  try {
    const walletAddress = req.params.walletAddress?.toLowerCase().trim();
    const coinId        = req.params.coinId?.toLowerCase().trim();

    if (!walletAddress) {
      return res.status(400).json({ success: false, message: 'walletAddress is required.' });
    }
    if (!coinId) {
      return res.status(400).json({ success: false, message: 'coinId is required.' });
    }

    const { dbState } = req.app.locals;
    if (dbState && dbState.connected) {
      const watchlist = await Watchlist.findOne({ walletAddress });

      if (!watchlist) {
        return res.status(404).json({ success: false, message: 'Watchlist not found for this wallet.' });
      }

      await watchlist.removeCoin(coinId);

      return res.status(200).json({
        success: true,
        message: `${coinId} removed from watchlist.`,
        data:    watchlist,
      });
    } else {
      const watchlists = getLocalWatchlists();
      if (!watchlists[walletAddress]) {
        return res.status(404).json({ success: false, message: 'Watchlist not found for this wallet.' });
      }
      watchlists[walletAddress] = watchlists[walletAddress].filter((id) => id !== coinId);
      saveLocalWatchlists(watchlists);
      return res.status(200).json({
        success: true,
        message: `${coinId} removed from watchlist.`,
        data: {
          walletAddress,
          coins: watchlists[walletAddress].map(id => ({ coinId: id, addedAt: new Date() })),
        },
      });
    }
  } catch (err) {
    console.error('[watchlistController.removeCoin]', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
}

module.exports = { get, addCoin, removeCoin };
