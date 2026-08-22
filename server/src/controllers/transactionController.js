'use strict';

const { normalizeAddress } = require('../utils/addressUtils');
const transactionRepo = require('../repositories/transactionRepo');
const AppError = require('../lib/AppError');
const { asyncHandler } = require('../middleware/errorHandler');

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
  const address = normalizeAddress(req.params.address);

  if (!address) {
    throw AppError.badRequest('Invalid or missing wallet address.');
  }

  const { page, limit, skip } = parsePagination(req.query);
  const { dbState } = req.app.locals;

  const { total, transactions } = await transactionRepo.findByAddress(dbState, address, { skip, limit });

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
}

// ---------------------------------------------------------------------------
// getCount
// GET /api/transactions/count
// Returns the total number of transaction documents in the collection.
// ---------------------------------------------------------------------------
async function getCount(req, res) {
  const { dbState } = req.app.locals;
  const count = await transactionRepo.countAll(dbState);
  return res.status(200).json({ success: true, count });
}

module.exports = {
  getByAddress: asyncHandler(getByAddress),
  getCount: asyncHandler(getCount),
};
