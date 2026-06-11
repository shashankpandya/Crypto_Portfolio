'use strict';

const Watchlist = require('../models/Watchlist');

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

    const watchlist = await Watchlist.findOne({ walletAddress }).lean();

    return res.status(200).json({
      success: true,
      data:    watchlist ?? { walletAddress, coins: [] },
    });
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
  } catch (err) {
    console.error('[watchlistController.removeCoin]', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
}

module.exports = { get, addCoin, removeCoin };
