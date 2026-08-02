#!/usr/bin/env node
/**
 * backup.js — back up MongoDB and JSON fallback data
 *
 * Usage:
 *   node server/scripts/backup.js
 *
 * Creates: backup/YYYY-MM-DD_HH-MM-SS/ with:
 *   mongo/           — mongodump output (if Mongo is reachable)
 *   data/            — JSON fallback files
 *   MANIFEST.json    — what was backed up and when
 *
 * Add backup/ to .gitignore — it is not committed.
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const DATA_DIR = path.join(ROOT, "server/data");

const ts = new Date()
  .toISOString()
  .replace(/[:.]/g, "-")
  .replace("T", "_")
  .slice(0, 19);

const BACKUP_DIR = path.join(ROOT, "backup", ts);
const MONGO_DIR = path.join(BACKUP_DIR, "mongo");
const DATA_BACKUP_DIR = path.join(BACKUP_DIR, "data");

fs.mkdirSync(MONGO_DIR, { recursive: true });
fs.mkdirSync(DATA_BACKUP_DIR, { recursive: true });

const manifest = { timestamp: new Date().toISOString(), items: [] };

// --- JSON fallback files ---
const jsonFiles = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));
for (const file of jsonFiles) {
  const src = path.join(DATA_DIR, file);
  const dst = path.join(DATA_BACKUP_DIR, file);
  fs.copyFileSync(src, dst);
  manifest.items.push({ type: "json", file: `data/${file}` });
  console.log(`  Copied: ${file}`);
}

// --- MongoDB dump ---
const mongoUri =
  process.env.MONGO_URI || "mongodb://localhost:27017/crypto_portfolio";
let mongoOk = false;
try {
  execSync(`mongodump --uri="${mongoUri}" --out="${MONGO_DIR}"`, {
    stdio: "pipe",
    timeout: 30000,
  });
  mongoOk = true;
  manifest.items.push({ type: "mongodump", uri: mongoUri, dir: "mongo/" });
  console.log(`  MongoDB dumped to ${MONGO_DIR}`);
} catch (err) {
  console.warn(`  MongoDB dump SKIPPED: ${err.message.slice(0, 100)}`);
  manifest.items.push({ type: "mongodump", status: "SKIPPED", reason: err.message.slice(0, 200) });
}

// Write manifest
fs.writeFileSync(
  path.join(BACKUP_DIR, "MANIFEST.json"),
  JSON.stringify(manifest, null, 2)
);

console.log(`\nBackup complete: ${BACKUP_DIR}`);
if (!mongoOk) {
  console.warn("WARNING: MongoDB was not backed up. Run when Mongo is available.");
  process.exit(0); // Don't fail the script — JSON backup succeeded
}
