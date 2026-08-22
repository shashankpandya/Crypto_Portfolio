'use strict';

/**
 * jsonStore.js
 *
 * Small helper for reading/writing JSON files that replaces the
 * non-atomic `fs.readFileSync` / `fs.writeFileSync` pattern used by the
 * on-disk fallback stores (server/data/*.json).
 *
 * - writeJson() writes to a temp file in the SAME directory as the target,
 *   then renames it over the target path. Rename-over-existing-file is
 *   atomic on both POSIX and NTFS, so a reader never observes a partially
 *   written file.
 * - Concurrent writeJson() calls for the SAME path are serialized through
 *   an in-process queue keyed by the resolved path, so they cannot race
 *   each other. Writes to different paths are independent and do not
 *   block one another.
 *
 * This module is additive only — nothing in server/src currently imports
 * it. Wiring existing callers (watchlistController, blockchainService,
 * transactionController) onto this module is a separate, later task.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Resolved path -> Promise chain tail for in-flight/queued writes to that path.
const writeQueues = new Map();

/**
 * Reads and parses a JSON file.
 * Returns `defaultValue` (without throwing) if the file does not exist,
 * or if it exists but cannot be read/parsed.
 */
function readJson(filePath, defaultValue) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return defaultValue;
  }
}

/**
 * Serializes `data` to JSON and atomically writes it to `filePath`.
 * Concurrent calls for the same `filePath` are queued and applied in order.
 * Returns a Promise that resolves once this write has been applied.
 */
function writeJson(filePath, data) {
  const key = path.resolve(filePath);
  const previous = writeQueues.get(key) || Promise.resolve();

  const next = previous
    .catch(() => {}) // a prior write's failure must not block this one
    .then(() => writeJsonNow(filePath, data));

  writeQueues.set(key, next);

  // Avoid unbounded growth: drop the entry once this write settles, unless
  // another write has already been queued behind it in the meantime.
  next.finally(() => {
    if (writeQueues.get(key) === next) writeQueues.delete(key);
  });

  return next;
}

function writeJsonNow(filePath, data) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });

  const tmpFile = path.join(
    dir,
    `.${path.basename(filePath)}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`
  );

  const json = JSON.stringify(data, null, 2);

  fs.writeFileSync(tmpFile, json, 'utf8');
  fs.renameSync(tmpFile, filePath);
}

module.exports = { readJson, writeJson };
