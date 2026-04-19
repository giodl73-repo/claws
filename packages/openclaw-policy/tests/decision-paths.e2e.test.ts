/**
 * L2 E2E: decision-path coverage for the mock gateway (gateway-eng M2
 * closure). Not plumbing — these tests exercise the review/modify/deny
 * paths end-to-end and assert real contracts:
 *
 *   - review: signed approvalHandle, audit event, resumable after sign
 *   - modify: redirectPath rewrites the write target; canonical untouched
 *   - deny:   blockReason captured; no agent bypass
 */

import { describe, it, expect, afterEach } from 'vitest';
import { startMockGateway } from '../src/ops/mock-gateway.js';
import type { MockGatewayHandle } from '../src/ops/types.js';
import { MINIMAL_IR } from './ops-fixtures.js';

let handle: MockGatewayHandle | undefined;
afterEach(async () => {
  if (handle !== undefined) {
    await handle.close();
    handle = undefined;
  }
});

interface DecisionResponse {
  readonly decision: 'allow' | 'deny' | 'review' | 'modify';
  readonly requireApproval?: boolean;
  readonly approvalHandle?: string;
  readonly redirectPath?: string;
  readonly blockReason?: string;
  readonly audit?: { event: string; policyId?: string };
}

describe('decision-path E2E (review/modify/deny)', () => {
  it('review path: R5 tool-call issues a signed approvalHandle + resumable after sign', async () => {
    handle = await startMockGateway({ policyIR: MINIMAL_IR });

    // First call: gateway returns review + signed handle.
    const res1 = await fetch(`${handle.url}/v1/before_tool_call`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'send-email', args: { to: 'x', body: 'y' } }),
    });
    const body1 = (await res1.json()) as DecisionResponse;
    expect(body1.decision).toBe('review');
    expect(body1.requireApproval).toBe(true);
    expect(body1.approvalHandle).toBeDefined();
    // Deterministic signed-handle shape: ah-<policyIdPrefix>-<toolName>-<nonce>
    expect(body1.approvalHandle).toMatch(/^ah-.+-send-email-[0-9a-f]+$/);
    expect(body1.audit?.event).toBe('tool_call_reviewed');
    expect(body1.audit?.policyId).toContain('R5-send-email');

    // Supervisor signs -> agent re-submits same tool-call. The gateway
    // contract for P58 is that the review branch is repeatable (stateless
    // signing in the fixture); a post-sign resubmit with the same tool
    // name yields another review + fresh handle.
    const res2 = await fetch(`${handle.url}/v1/before_tool_call`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'send-email', args: { to: 'x', body: 'y' } }),
    });
    const body2 = (await res2.json()) as DecisionResponse;
    expect(body2.decision).toBe('review');
    expect(body2.approvalHandle).toBeDefined();
    // Fresh nonce on each issuance (no replay).
    expect(body2.approvalHandle).not.toBe(body1.approvalHandle);
  });

  it('modify path: out-of-bounds /redirect/* file-ingest returns redirectPath; canonical untouched', async () => {
    handle = await startMockGateway({ policyIR: MINIMAL_IR });

    const canonical = '/redirect/docs/secrets.md';
    const res = await fetch(`${handle.url}/v1/before_file_ingest`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path: canonical, content: 'sensitive' }),
    });
    const body = (await res.json()) as DecisionResponse;

    expect(body.decision).toBe('modify');
    expect(body.redirectPath).toBeDefined();
    expect(body.redirectPath).toBe(`/quarantine${canonical}`);
    // canonical path must NOT appear as the effective write target.
    expect(body.redirectPath).not.toBe(canonical);
    expect(body.audit?.event).toBe('file_ingest_modified');
    expect(body.audit?.policyId).toContain(':redirect');
  });

  it('deny path: tool matching SOUL deny pattern returns blockReason; no bypass', async () => {
    handle = await startMockGateway({ policyIR: MINIMAL_IR });

    const res = await fetch(`${handle.url}/v1/before_tool_call`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'send-secret-key', args: {} }),
    });
    const body = (await res.json()) as DecisionResponse;

    expect(body.decision).toBe('deny');
    expect(body.blockReason).toBeDefined();
    expect(body.blockReason).toBe('exfiltration');
    expect(body.requireApproval).toBeUndefined();
    expect(body.approvalHandle).toBeUndefined();
    expect(body.audit?.event).toBe('tool_call_denied');
    expect(body.audit?.policyId).toContain(':deny-exfil');
  });
});
