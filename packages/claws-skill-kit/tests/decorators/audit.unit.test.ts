/**
 * L0: @audit decorator — sets audit trail inclusion flag on handler metadata.
 *
 * Tests:
 * 1. @audit() sets audit trail inclusion flag on handler metadata
 */

import { describe, it, expect } from 'vitest';
import { skill } from '../../src/factory/skill.js';
import { audit } from '../../src/decorators/audit.js';
import { getGovernanceMetadata } from '../../src/types.js';

describe('@audit decorator', () => {
  it('sets audit trail inclusion flag on handler metadata', () => {
    const handler = skill('auditable-tool', () => 'done');
    const annotated = audit(handler);

    expect(annotated).toBe(handler);

    const meta = getGovernanceMetadata(annotated);
    expect(meta).toBeDefined();
    expect(meta!.audit).toBe(true);
  });

  it('audit flag is not set by default', () => {
    const handler = skill('no-audit', () => {});
    const meta = getGovernanceMetadata(handler);
    expect(meta!.audit).toBeUndefined();
  });

  it('handler remains callable after decoration', () => {
    const handler = skill('auditable', (x: string) => x.toUpperCase());
    audit(handler);
    expect(handler('hello')).toBe('HELLO');
  });
});
