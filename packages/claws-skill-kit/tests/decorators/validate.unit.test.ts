/**
 * L0: @validate decorator — attaches Zod schema to handler metadata.
 *
 * Tests:
 * 1. @validate(schema) attaches Zod schema to handler metadata for input validation
 */

import { describe, it, expect } from 'vitest';
import { skill } from '../../src/factory/skill.js';
import { validate } from '../../src/decorators/validate.js';
import { getGovernanceMetadata } from '../../src/types.js';

describe('@validate decorator', () => {
  it('attaches schema to handler metadata for input validation', () => {
    // Simulated Zod-like schema object
    const schema = {
      type: 'object',
      properties: {
        to: { type: 'string' },
        subject: { type: 'string' },
      },
      required: ['to', 'subject'],
    };

    const handler = skill('validated-tool', () => 'ok');
    const annotated = validate(schema, handler);

    expect(annotated).toBe(handler);

    const meta = getGovernanceMetadata(annotated);
    expect(meta).toBeDefined();
    expect(meta!.validationSchema).toBe(schema);
  });

  it('schema is not set by default', () => {
    const handler = skill('unvalidated', () => {});
    const meta = getGovernanceMetadata(handler);
    expect(meta!.validationSchema).toBeUndefined();
  });

  it('accepts any schema shape (Zod, JSON Schema, custom)', () => {
    // Zod-like
    const zodLike = { parse: () => {}, _def: { typeName: 'ZodObject' } };
    const h1 = skill('zod-skill', () => {});
    validate(zodLike, h1);
    expect(getGovernanceMetadata(h1)!.validationSchema).toBe(zodLike);

    // Plain object
    const plain = { fields: ['a', 'b'] };
    const h2 = skill('plain-skill', () => {});
    validate(plain, h2);
    expect(getGovernanceMetadata(h2)!.validationSchema).toBe(plain);
  });

  it('rejects primitive and null schemas with TypeError', () => {
    const handler = skill('guarded-skill', () => {});

    expect(() => validate(null, handler)).toThrow(TypeError);
    expect(() => validate(null, handler)).toThrow('validate() schema must be a non-null object');
    expect(() => validate(undefined, handler)).toThrow(TypeError);
    expect(() => validate('string-schema', handler)).toThrow(TypeError);
    expect(() => validate(42, handler)).toThrow(TypeError);
    expect(() => validate(true, handler)).toThrow(TypeError);
  });
});
