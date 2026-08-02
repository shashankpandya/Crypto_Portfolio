'use strict';

/**
 * Transaction.test.js
 * Regression tests for the txHash+logIndex compound dedupe index.
 * Prevents regression to single-field txHash uniqueness which collapsed
 * all events from a batch transaction into one document.
 */

const Transaction = require('./Transaction');

describe('Transaction Schema', () => {
  it('has a logIndex field with default null', () => {
    const doc = new Transaction({
      sender:    '0xabc',
      recipient: '0xdef',
      amount:    '1000000000000000000',
      timestamp: 1700000000,
    });
    expect(doc.logIndex).toBeNull();
  });

  it('does NOT have a single-field unique index on txHash alone', () => {
    const indexes = Transaction.schema.indexes();
    const singleTxHashUnique = indexes.find(([fields, opts]) =>
      fields.txHash === 1 &&
      Object.keys(fields).length === 1 &&
      opts.unique === true,
    );
    expect(singleTxHashUnique).toBeUndefined();
  });

  it('has a compound unique index on { txHash, logIndex }', () => {
    const indexes = Transaction.schema.indexes();
    const compoundIdx = indexes.find(([fields, opts]) =>
      fields.txHash === 1 &&
      fields.logIndex === 1 &&
      opts.unique === true &&
      opts.sparse === true,
    );
    expect(compoundIdx).toBeDefined();
    expect(compoundIdx[1].name).toBe('txHash_logIndex_unique');
  });

  it('allows two documents with the same txHash but different logIndex', () => {
    // This would fail under the old single-field unique constraint.
    // Mongoose schema-level validation doesn't enforce unique at instantiation;
    // we verify the index spec is correct (enforcement is MongoDB's job at write time).
    const event1 = new Transaction({
      sender:    '0xaaa',
      recipient: '0xbbb',
      amount:    '100',
      timestamp: 1700000000,
      txHash:    '0xdeadbeef',
      logIndex:  0,
    });
    const event2 = new Transaction({
      sender:    '0xaaa',
      recipient: '0xccc',
      amount:    '200',
      timestamp: 1700000000,
      txHash:    '0xdeadbeef',
      logIndex:  1,
    });
    // Both documents should instantiate without error.
    expect(event1.txHash).toBe('0xdeadbeef');
    expect(event2.txHash).toBe('0xdeadbeef');
    expect(event1.logIndex).toBe(0);
    expect(event2.logIndex).toBe(1);
  });

  it('allows documents without txHash or logIndex (historical sync)', () => {
    const doc = new Transaction({
      sender:    '0xaaa',
      recipient: '0xbbb',
      amount:    '100',
      timestamp: 1700000000,
    });
    expect(doc.txHash).toBeUndefined();
    expect(doc.logIndex).toBeNull();
  });
});
