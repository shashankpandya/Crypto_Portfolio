'use strict';

/**
 * jsonStore.test.js
 * Unit tests for the atomic jsonStore helper (P2-06).
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { readJson, writeJson } = require('./jsonStore');

let tmpDir;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jsonstore-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('jsonStore.readJson', () => {
  it('returns the default value when the file does not exist, without throwing', () => {
    const missingFile = path.join(tmpDir, 'does-not-exist.json');
    const fallback = { coins: [] };

    let result;
    expect(() => {
      result = readJson(missingFile, fallback);
    }).not.toThrow();

    expect(result).toEqual(fallback);
  });

  it('returns the parsed contents when the file exists', () => {
    const file = path.join(tmpDir, 'existing.json');
    fs.writeFileSync(file, JSON.stringify({ hello: 'world' }), 'utf8');

    const result = readJson(file, null);

    expect(result).toEqual({ hello: 'world' });
  });
});

describe('jsonStore.writeJson', () => {
  it('writes valid JSON that readJson can read back', async () => {
    const file = path.join(tmpDir, 'roundtrip.json');
    const payload = { a: 1, nested: { b: [1, 2, 3] } };

    await writeJson(file, payload);

    expect(readJson(file, null)).toEqual(payload);
  });

  it('creates the target directory if it does not exist yet', async () => {
    const file = path.join(tmpDir, 'nested', 'dir', 'file.json');

    await writeJson(file, { ok: true });

    expect(fs.existsSync(file)).toBe(true);
    expect(readJson(file, null)).toEqual({ ok: true });
  });

  it('leaves no leftover .tmp files behind after a successful write', async () => {
    const file = path.join(tmpDir, 'clean.json');

    await writeJson(file, { ok: true });

    const entries = fs.readdirSync(tmpDir);
    expect(entries).toEqual(['clean.json']);
  });

  it('serializes 100 concurrent writes to the SAME path without corrupting the file', async () => {
    const file = path.join(tmpDir, 'concurrent.json');
    const N = 100;

    const writes = Array.from({ length: N }, (_, i) =>
      writeJson(file, { index: i, payload: `value-${i}` })
    );

    // All queued writes must themselves resolve successfully (nothing lost/rejected).
    await expect(Promise.all(writes)).resolves.toHaveLength(N);

    // The file on disk must be intact, parseable JSON — never truncated or
    // interleaved from two concurrent writers stepping on each other.
    const raw = fs.readFileSync(file, 'utf8');
    let parsed;
    expect(() => {
      parsed = JSON.parse(raw);
    }).not.toThrow();

    // The final content must equal exactly one of the writes that was queued
    // (proves the queue serialized full writes rather than interleaving them).
    expect(parsed).toHaveProperty('index');
    expect(parsed.index).toBeGreaterThanOrEqual(0);
    expect(parsed.index).toBeLessThan(N);
    expect(parsed).toEqual({ index: parsed.index, payload: `value-${parsed.index}` });

    // No stray temp files should remain once every queued write has settled.
    const entries = fs.readdirSync(tmpDir);
    expect(entries).toEqual(['concurrent.json']);
  });

  it('applies same-path writes in the order they were queued', async () => {
    const file = path.join(tmpDir, 'ordered.json');
    const N = 50;
    const completionOrder = [];

    const writes = [];
    for (let i = 0; i < N; i++) {
      writes.push(
        writeJson(file, { seq: i }).then(() => completionOrder.push(i))
      );
    }

    await Promise.all(writes);

    expect(completionOrder).toEqual(Array.from({ length: N }, (_, i) => i));
    expect(readJson(file, null)).toEqual({ seq: N - 1 });
  });

  it('does not block writes to a different path while one path is busy', async () => {
    const fileA = path.join(tmpDir, 'a.json');
    const fileB = path.join(tmpDir, 'b.json');

    await Promise.all([
      writeJson(fileA, { who: 'a' }),
      writeJson(fileB, { who: 'b' }),
    ]);

    expect(readJson(fileA, null)).toEqual({ who: 'a' });
    expect(readJson(fileB, null)).toEqual({ who: 'b' });
  });
});
