/**
 * Audit types validation unit tests.
 *
 * L0: validateAuditEntry and validateChainFileHeader — every field check,
 * every error branch, plus AuditEntryValidationError construction.
 */

import { describe, it, expect } from 'vitest';
import {
  validateAuditEntry,
  validateChainFileHeader,
  AuditEntryValidationError,
} from '#src/compiler/audit/types.js';

/** Minimal valid audit entry shape. */
function validEntry(): Record<string, unknown> {
  return {
    index: 0,
    timestamp: '2026-01-01T00:00:00.000Z',
    action: 'compile',
    subject: 'a.oc',
    payload: { file: 'a.oc' },
    hash: 'abc123',
    previousHash: null,
    signature: 'deadbeef',
  };
}

/** Minimal valid chain file header shape. */
function validHeader(): Record<string, unknown> {
  return {
    type: 'audit-chain',
    version: 1,
    meta: {
      chainId: 'test-chain',
      createdAt: '2026-01-01T00:00:00.000Z',
      lastEntryHash: null,
      entryCount: 0,
      publicKeyFingerprint: 'abcdef1234567890',
    },
  };
}

describe('AuditEntryValidationError', () => {
  it('sets name and message correctly', () => {
    const err = new AuditEntryValidationError('bad field');
    expect(err.name).toBe('AuditEntryValidationError');
    expect(err.message).toBe('Invalid audit entry: bad field');
    expect(err).toBeInstanceOf(Error);
  });
});

describe('validateAuditEntry', () => {
  it('returns the entry when all fields are valid', () => {
    const entry = validEntry();
    const result = validateAuditEntry(entry);
    expect(result.index).toBe(0);
    expect(result.action).toBe('compile');
  });

  it('accepts previousHash as a string', () => {
    const entry = validEntry();
    entry['previousHash'] = 'abc123';
    const result = validateAuditEntry(entry);
    expect(result.previousHash).toBe('abc123');
  });

  it('throws on null input', () => {
    expect(() => validateAuditEntry(null)).toThrow(AuditEntryValidationError);
    expect(() => validateAuditEntry(null)).toThrow('expected an object');
  });

  it('throws on undefined input', () => {
    expect(() => validateAuditEntry(undefined)).toThrow('expected an object');
  });

  it('throws on non-object (string)', () => {
    expect(() => validateAuditEntry('not an object')).toThrow('expected an object');
  });

  it('throws on non-object (number)', () => {
    expect(() => validateAuditEntry(42)).toThrow('expected an object');
  });

  it('throws when index is not a number', () => {
    const entry = validEntry();
    entry['index'] = 'not-a-number';
    expect(() => validateAuditEntry(entry)).toThrow('index must be a number');
  });

  it('throws when index is missing', () => {
    const entry = validEntry();
    delete entry['index'];
    expect(() => validateAuditEntry(entry)).toThrow('index must be a number');
  });

  it('throws when timestamp is not a string', () => {
    const entry = validEntry();
    entry['timestamp'] = 12345;
    expect(() => validateAuditEntry(entry)).toThrow('timestamp must be a string');
  });

  it('throws when timestamp is missing', () => {
    const entry = validEntry();
    delete entry['timestamp'];
    expect(() => validateAuditEntry(entry)).toThrow('timestamp must be a string');
  });

  it('throws when action is not a string', () => {
    const entry = validEntry();
    entry['action'] = 99;
    expect(() => validateAuditEntry(entry)).toThrow('action must be a string');
  });

  it('throws when action is missing', () => {
    const entry = validEntry();
    delete entry['action'];
    expect(() => validateAuditEntry(entry)).toThrow('action must be a string');
  });

  it('throws when subject is not a string', () => {
    const entry = validEntry();
    entry['subject'] = false;
    expect(() => validateAuditEntry(entry)).toThrow('subject must be a string');
  });

  it('throws when subject is missing', () => {
    const entry = validEntry();
    delete entry['subject'];
    expect(() => validateAuditEntry(entry)).toThrow('subject must be a string');
  });

  it('throws when payload is null', () => {
    const entry = validEntry();
    entry['payload'] = null;
    expect(() => validateAuditEntry(entry)).toThrow('payload must be an object');
  });

  it('throws when payload is not an object', () => {
    const entry = validEntry();
    entry['payload'] = 'not-an-object';
    expect(() => validateAuditEntry(entry)).toThrow('payload must be an object');
  });

  it('throws when payload is missing', () => {
    const entry = validEntry();
    delete entry['payload'];
    expect(() => validateAuditEntry(entry)).toThrow('payload must be an object');
  });

  it('throws when hash is not a string', () => {
    const entry = validEntry();
    entry['hash'] = 123;
    expect(() => validateAuditEntry(entry)).toThrow('hash must be a string');
  });

  it('throws when hash is missing', () => {
    const entry = validEntry();
    delete entry['hash'];
    expect(() => validateAuditEntry(entry)).toThrow('hash must be a string');
  });

  it('throws when previousHash is not a string or null', () => {
    const entry = validEntry();
    entry['previousHash'] = 42;
    expect(() => validateAuditEntry(entry)).toThrow('previousHash must be a string or null');
  });

  it('throws when previousHash is a boolean', () => {
    const entry = validEntry();
    entry['previousHash'] = true;
    expect(() => validateAuditEntry(entry)).toThrow('previousHash must be a string or null');
  });

  it('throws when signature is not a string', () => {
    const entry = validEntry();
    entry['signature'] = 42;
    expect(() => validateAuditEntry(entry)).toThrow('signature must be a string');
  });

  it('throws when signature is missing', () => {
    const entry = validEntry();
    delete entry['signature'];
    expect(() => validateAuditEntry(entry)).toThrow('signature must be a string');
  });
});

describe('validateChainFileHeader', () => {
  it('returns the header when all fields are valid', () => {
    const header = validHeader();
    const result = validateChainFileHeader(header);
    expect(result.type).toBe('audit-chain');
    expect(result.version).toBe(1);
    expect(result.meta).toBeDefined();
  });

  it('throws on null input', () => {
    expect(() => validateChainFileHeader(null)).toThrow('expected an object for chain file header');
  });

  it('throws on undefined input', () => {
    expect(() => validateChainFileHeader(undefined)).toThrow('expected an object for chain file header');
  });

  it('throws on non-object (string)', () => {
    expect(() => validateChainFileHeader('not-an-object')).toThrow('expected an object for chain file header');
  });

  it('throws on non-object (number)', () => {
    expect(() => validateChainFileHeader(123)).toThrow('expected an object for chain file header');
  });

  it('throws when type is wrong', () => {
    const header = validHeader();
    header['type'] = 'wrong-type';
    expect(() => validateChainFileHeader(header)).toThrow("header type must be 'audit-chain'");
  });

  it('throws when type is missing', () => {
    const header = validHeader();
    delete header['type'];
    expect(() => validateChainFileHeader(header)).toThrow("header type must be 'audit-chain'");
  });

  it('throws when version is wrong', () => {
    const header = validHeader();
    header['version'] = 99;
    expect(() => validateChainFileHeader(header)).toThrow('header version must be 1');
  });

  it('throws when version is missing', () => {
    const header = validHeader();
    delete header['version'];
    expect(() => validateChainFileHeader(header)).toThrow('header version must be 1');
  });

  it('throws when meta is null', () => {
    const header = validHeader();
    header['meta'] = null;
    expect(() => validateChainFileHeader(header)).toThrow('header meta must be an object');
  });

  it('throws when meta is not an object', () => {
    const header = validHeader();
    header['meta'] = 'not-an-object';
    expect(() => validateChainFileHeader(header)).toThrow('header meta must be an object');
  });

  it('throws when meta is missing', () => {
    const header = validHeader();
    delete header['meta'];
    expect(() => validateChainFileHeader(header)).toThrow('header meta must be an object');
  });
});
