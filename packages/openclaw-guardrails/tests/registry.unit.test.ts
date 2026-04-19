/**
 * registry — ProviderRegistryImpl + composeDecisions.
 *
 * Priority: deny > review > modify > allow. Empty registry warns. R5 forces
 * external approval. postAudit is fire-and-forget.
 */

import { describe, expect, test, vi } from 'vitest';
import { ProviderRegistryImpl, composeDecisions } from '../src/registry.js';
import type {
  AuthorizationDecision,
  GuardrailProvider,
  ToolCallEvent,
} from '../src/index.js';

function event(): ToolCallEvent {
  return { server: 's', tool: 't', context: { conversationId: 'c-1' } };
}

function prov(
  name: string,
  decision: AuthorizationDecision,
  onAudit?: (e: ToolCallEvent, d: AuthorizationDecision) => Promise<void>,
): GuardrailProvider {
  return {
    name,
    async preAuthorize() {
      return decision;
    },
    async postAudit(e, d) {
      if (onAudit) await onAudit(e, d);
    },
    getCapabilities() {
      return {
        description: name,
        version: '0.0.1',
        riskClassification: true,
        auditTrail: false,
        externalApproval: false,
        argumentModification: false,
      };
    },
  };
}

describe('composeDecisions — priority ordering', () => {
  test('any deny wins', () => {
    const d = composeDecisions([
      { decision: 'allow', riskLevel: 1 },
      { decision: 'deny', reason: 'policy' },
      { decision: 'review', reason: 'held' },
    ]);
    expect(d.decision).toBe('deny');
    if (d.decision === 'deny') expect(d.reason).toBe('policy');
  });

  test('review wins over modify + allow', () => {
    const d = composeDecisions([
      { decision: 'allow' },
      { decision: 'modify', modifiedArguments: { a: 1 } },
      { decision: 'review', reason: 'check' },
    ]);
    expect(d.decision).toBe('review');
  });

  test('modify wins over allow', () => {
    const d = composeDecisions([
      { decision: 'allow' },
      { decision: 'modify', modifiedArguments: { a: 1 } },
    ]);
    expect(d.decision).toBe('modify');
  });

  test('all allow returns allow with highest risk', () => {
    const d = composeDecisions([
      { decision: 'allow', riskLevel: 1 },
      { decision: 'allow', riskLevel: 3 },
    ]);
    expect(d.decision).toBe('allow');
    if (d.decision === 'allow') expect(d.riskLevel).toBe(3);
  });

  test('R5 forces requiresExternalApproval true even on allow', () => {
    const d = composeDecisions([
      { decision: 'allow', riskLevel: 5 },
      { decision: 'allow', riskLevel: 1 },
    ]);
    expect(d.decision).toBe('allow');
    if (d.decision === 'allow') {
      expect(d.requiresExternalApproval).toBe(true);
      expect(d.riskLevel).toBe(5);
    }
  });

  test('requiresExternalApproval is OR-reduced across allow decisions', () => {
    const d = composeDecisions([
      { decision: 'allow', requiresExternalApproval: false, riskLevel: 2 },
      { decision: 'allow', requiresExternalApproval: true, riskLevel: 3 },
    ]);
    if (d.decision === 'allow') {
      expect(d.requiresExternalApproval).toBe(true);
    }
  });

  test('R5 modify winner carries requiresExternalApproval', () => {
    // modify (priority) beats allow-R5, but R5 must still force external
    // approval — the flag is carried on the modify variant for this reason
    const d = composeDecisions([
      { decision: 'modify', modifiedArguments: { safe: true }, riskLevel: 3 },
      { decision: 'allow', riskLevel: 5 },
    ]);
    expect(d.decision).toBe('modify');
    if (d.decision === 'modify') {
      expect(d.requiresExternalApproval).toBe(true);
      expect(d.riskLevel).toBe(5);
      expect(d.modifiedArguments).toEqual({ safe: true });
    }
  });

  test('modify without R5 does not set requiresExternalApproval', () => {
    const d = composeDecisions([
      { decision: 'modify', modifiedArguments: { x: 1 }, riskLevel: 2 },
      { decision: 'allow', riskLevel: 1 },
    ]);
    expect(d.decision).toBe('modify');
    if (d.decision === 'modify') {
      expect(d.requiresExternalApproval).toBeUndefined();
    }
  });

  test('modify inherits requiresExternalApproval from allow peer', () => {
    // if an allow peer flagged external-approval (even without R5), a modify
    // winner must carry the flag forward
    const d = composeDecisions([
      { decision: 'modify', modifiedArguments: {}, riskLevel: 2 },
      { decision: 'allow', requiresExternalApproval: true, riskLevel: 2 },
    ]);
    expect(d.decision).toBe('modify');
    if (d.decision === 'modify') {
      expect(d.requiresExternalApproval).toBe(true);
    }
  });

  test('empty decisions returns allow', () => {
    const d = composeDecisions([]);
    expect(d.decision).toBe('allow');
  });
});

describe('ProviderRegistryImpl', () => {
  test('register + preAuthorize composes multiple provider decisions', async () => {
    const r = new ProviderRegistryImpl();
    r.register(prov('a', { decision: 'allow', riskLevel: 1 }));
    r.register(prov('b', { decision: 'deny', reason: 'b-blocked' }));
    const d = await r.preAuthorize(event());
    expect(d.decision).toBe('deny');
    if (d.decision === 'deny') expect(d.reason).toBe('b-blocked');
  });

  test('empty registry warns and allows', async () => {
    const r = new ProviderRegistryImpl();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const d = await r.preAuthorize(event());
    expect(d.decision).toBe('allow');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  test('duplicate register throws', () => {
    const r = new ProviderRegistryImpl();
    r.register(prov('dup', { decision: 'allow' }));
    expect(() => r.register(prov('dup', { decision: 'allow' }))).toThrow(/registered/);
  });

  test('unregister removes provider', async () => {
    const r = new ProviderRegistryImpl();
    r.register(prov('a', { decision: 'deny', reason: 'a' }));
    r.register(prov('b', { decision: 'allow' }));
    r.unregister('a');
    const d = await r.preAuthorize(event());
    expect(d.decision).toBe('allow');
  });

  test('listProviders returns capabilities', () => {
    const r = new ProviderRegistryImpl();
    r.register(prov('cap-a', { decision: 'allow' }));
    r.register(prov('cap-b', { decision: 'allow' }));
    const caps = r.listProviders();
    expect(caps).toHaveLength(2);
    expect(caps.map((c) => c.description).sort()).toEqual(['cap-a', 'cap-b']);
  });

  test('postAudit is fire-and-forget — one failing sink does not block others', async () => {
    const r = new ProviderRegistryImpl();
    let bCalled = false;
    r.register(
      prov('a', { decision: 'allow' }, async () => {
        throw new Error('boom');
      }),
    );
    r.register(
      prov('b', { decision: 'allow' }, async () => {
        bCalled = true;
      }),
    );
    await r.postAudit(event(), { decision: 'allow' });
    expect(bCalled).toBe(true);
  });
});
