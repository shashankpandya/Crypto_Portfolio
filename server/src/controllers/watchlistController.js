'use strict';

const watchlistRepo = require('../repositories/watchlistRepo');
const { normalizeAddress } = require('../utils/addressUtils');

// ---------------------------------------------------------------------------
// get
// GET /api/watchlist/:walletAddress
// Returns the watchlist for the given wallet, or an empty coins array if
// no document exists yet (avoids a 404 on first visit).
// ---------------------------------------------------------------------------
async function get(req, res) {
  try {
    const walletAddress = normalizeAddress(req.params.walletAddress);

    if (!walletAddress) {
      return res.status(400).json({ success: false, message: 'Invalid or missing walletAddress.' });
    }

    const { dbState } = req.app.locals;
    const data = await watchlistRepo.getWatchlist(dbState, walletAddress);

    return res.status(200).json({ success: true, data });
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
    const walletAddress = normalizeAddress(req.params.walletAddress);
    const coinId        = req.body.coinId?.toLowerCase().trim();

    if (!walletAddress) {
      return res.status(400).json({ success: false, message: 'Invalid or missing walletAddress.' });
    }
    if (!coinId) {
      return res.status(400).json({ success: false, message: 'coinId is required in the request body.' });
    }

    const { dbState } = req.app.locals;
    const data = await watchlistRepo.addCoin(dbState, walletAddress, coinId);

    return res.status(200).json({
      success: true,
      message: `${coinId} added to watchlist.`,
      data,
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
    const walletAddress = normalizeAddress(req.params.walletAddress);
    const coinId        = req.params.coinId?.toLowerCase().trim();

    if (!walletAddress) {
      return res.status(400).json({ success: false, message: 'Invalid or missing walletAddress.' });
    }
    if (!coinId) {
      return res.status(400).json({ success: false, message: 'coinId is required.' });
    }

    const { dbState } = req.app.locals;
    const data = await watchlistRepo.removeCoin(dbState, walletAddress, coinId);

    if (!data) {
      return res.status(404).json({ success: false, message: 'Watchlist not found for this wallet.' });
    }

    return res.status(200).json({
      success: true,
      message: `${coinId} removed from watchlist.`,
      data,
    });
  } catch (err) {
    console.error('[watchlistController.removeCoin]', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
}

module.exports = { get, addCoin, removeCoin };
