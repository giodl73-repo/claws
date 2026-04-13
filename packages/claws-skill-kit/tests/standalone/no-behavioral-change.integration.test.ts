/**
 * L1 Integration: Decorated skill runs identically to undecorated handler.
 *
 * A skill wrapped with skill() + @classify('R3') + @obo('email') must produce
 * the exact same output as the original handler function given the same input.
 * Decorators add metadata only — they must NOT alter behavior.
 */

import { describe, it, expect } from 'vitest';
import { skill } from '../../src/factory/skill.js';
import { classify } from '../../src/decorators/classify.js';
import { obo } from '../../src/decorators/obo.js';
import { audit } from '../../src/decorators/audit.js';
import { budget } from '../../src/decorators/budget.js';
import { timeout } from '../../src/decorators/timeout.js';
import { GOVERNANCE_METADATA_KEY } from '../../src/types.js';

describe('no behavioral change — decorated vs undecorated', () => {
  // The raw handler function — no skill-kit involvement
  const rawHandler = (input: { to: string; body: string }) => ({
    sent: true,
    to: input.to,
    bodyLength: input.body.length,
  });

  it('sync handler: decorated skill returns identical output to raw handler', () => {
    const input = { to: 'alice@example.com', body: 'Hello world' };

    // Run raw handler
    const rawResult = rawHandler(input);

    // Wrap and decorate
    let decorated = skill('send-email', rawHandler);
    decorated = classify('R3', decorated);
    decorated = obo('email', decorated);

    // Run decorated handler
    const decoratedResult = decorated(input);

    expect(decoratedResult).toEqual(rawResult);
  });

  it('async handler: decorated skill returns identical output to raw handler', async () => {
    const asyncRaw = async (input: { query: string }) => {
      return { results: [`result for ${input.query}`], count: 1 };
    };

    const input = { query: 'test search' };

    // Run raw handler
    const rawResult = await asyncRaw(input);

    // Wrap and decorate
    let decorated = skill('search-docs', asyncRaw);
    decorated = classify('R1', decorated);

    // Run decorated handler
    const decoratedResult = await decorated(input);

    expect(decoratedResult).toEqual(rawResult);
  });

  it('fully-decorated handler preserves exact output', async () => {
    const handler = async (input: { amount: number }) => ({
      processed: true,
      amount: input.amount,
      tax: input.amount * 0.1,
    });

    const input = { amount: 100 };
    const rawResult = await handler(input);

    // Apply ALL decorators
    let decorated = skill('process-payment', handler);
    decorated = classify('R5', decorated);
    decorated = obo('transact', decorated);
    decorated = audit(decorated);
    decorated = budget(5000, decorated);
    decorated = timeout(60, decorated);

    const decoratedResult = await decorated(input);

    expect(decoratedResult).toEqual(rawResult);
  });

  it('decorators only add metadata — handler identity is preserved', () => {
    const original = (x: number) => x * 2;
    let handler = skill('double', original);
    handler = classify('R1', handler);
    handler = obo('email', handler);

    // The handler is the same function object
    expect(handler(5)).toBe(10);
    expect(handler(0)).toBe(0);
    expect(handler(-3)).toBe(-6);

    // Governance metadata is set
    const meta = handler[GOVERNANCE_METADATA_KEY];
    expect(meta.riskLevel).toBe('R1');
    expect(meta.obo).toBe('email');
  });

  it('handler error propagation is unchanged by decorators', () => {
    const failing = () => {
      throw new Error('expected failure');
    };

    let handler = skill('fail-skill', failing);
    handler = classify('R2', handler);

    expect(() => handler(undefined)).toThrow('expected failure');
  });
});
