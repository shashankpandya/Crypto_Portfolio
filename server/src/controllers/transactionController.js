'use strict';

const Transaction = require('../models/Transaction');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const DEFAULT_PAGE      = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE     = 100;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse and clamp pagination query params.
 * @param {object} query  - req.query
 * @returns {{ page: number, limit: number, skip: number }}
 */
function parsePagination(query) {
  const page  = Math.max(1, parseInt(query.page,  10) || DEFAULT_PAGE);
  const limit = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(query.limit, 10) || DEFAULT_PAGE_SIZE),
  );
  return { page, limit, skip: (page - 1) * limit };
}

// ---------------------------------------------------------------------------
// getByAddress
// GET /api/transactions/:address
// Query params: page, limit
// Returns paginated transactions where sender OR recipient matches address.
// ---------------------------------------------------------------------------
async function getByAddress(req, res) {
  try {
    const address = req.params.address?.toLowerCase().trim();

    if (!address) {
      return res.status(400).json({ success: false, message: 'Wallet address is required.' });
    }

    const { page, limit, skip } = parsePagination(req.query);

    const filter = {
      $or: [
        { sender:    address },
        { recipient: address },
      ],
    };

    // Run count and data queries in parallel for performance.
    const [total, transactions] = await Promise.all([
      Transaction.countDocuments(filter),
      Transaction.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      data: transactions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
      },
    });
  } catch (err) {
    console.error('[transactionController.getByAddress]', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
}

// ---------------------------------------------------------------------------
// getCount
// GET /api/transactions/count
// Returns the total number of transaction documents in the collection.
// ---------------------------------------------------------------------------
async function getCount(req, res) {
  try {
    const count = await Transaction.countDocuments();
    return res.status(200).json({ success: true, count });
  } catch (err) {
    console.error('[transactionController.getCount]', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
}

module.exports = { getByAddress, getCount };
