/**
 * L0: CLI bypass evaluation — wraps SDK evaluateBypass with terminal-ready messages.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { evaluateCliBypass } from '../../src/config/bypass.js';
import type { FleetPolicy } from '@bic/claws-sdk/config';

describe('evaluateCliBypass()', () => {
  const savedEnv = { ...process.env };

  beforeEach(() => {
    delete process.env['CLAWS_BYPASS'];
  });

  afterEach(() => {
    // Restore env
    delete process.env['CLAWS_BYPASS'];
    if (savedEnv['CLAWS_BYPASS'] !== undefined) {
      process.env['CLAWS_BYPASS'] = savedEnv['CLAWS_BYPASS'];
    }
  });

  const allowPolicy: FleetPolicy = { allowBypass: true };
  const denyPolicy: FleetPolicy = { allowBypass: false };

  it('returns inactive state with null message when CLAWS_BYPASS is not set', () => {
    const result = evaluateCliBypass(denyPolicy);

    expect(result.state.outcome).toBe('inactive');
    expect(result.auditEvent).toBeNull();
    expect(result.message).toBeNull();
  });

  it('returns activated state with warning message when CLAWS_BYPASS=1 and policy allows', () => {
    process.env['CLAWS_BYPASS'] = '1';

    const result = evaluateCliBypass(allowPolicy);

    expect(result.state.outcome).toBe('activated');
    expect(result.state.envDetected).toBe(true);
    expect(result.state.policyAllows).toBe(true);
    expect(result.auditEvent).not.toBeNull();
    expect(result.auditEvent!.eventType).toBe('bypass');
    expect(result.auditEvent!.outcome).toBe('activated');
    expect(result.message).toContain('BYPASS MODE ACTIVE');
    expect(result.message).toContain('CLAWS_BYPASS=1');
  });

  it('returns denied state with denial message when CLAWS_BYPASS=1 and policy denies', () => {
    process.env['CLAWS_BYPASS'] = '1';

    const result = evaluateCliBypass(denyPolicy);

    expect(result.state.outcome).toBe('denied');
    expect(result.state.envDetected).toBe(true);
    expect(result.state.policyAllows).toBe(false);
    expect(result.auditEvent).not.toBeNull();
    expect(result.auditEvent!.outcome).toBe('denied');
    expect(result.message).toContain('BYPASS DENIED');
    expect(result.message).toContain('fleet policy');
  });

  it('returns inactive when CLAWS_BYPASS is set to a value other than "1"', () => {
    process.env['CLAWS_BYPASS'] = 'true';

    const result = evaluateCliBypass(allowPolicy);

    expect(result.state.outcome).toBe('inactive');
    expect(result.auditEvent).toBeNull();
    expect(result.message).toBeNull();
  });

  it('audit event includes a timestamp and actor when bypass is attempted', () => {
    process.env['CLAWS_BYPASS'] = '1';

    const result = evaluateCliBypass(allowPolicy);

    expect(result.auditEvent).not.toBeNull();
    expect(result.auditEvent!.timestamp).toBeTruthy();
    // ISO 8601 timestamp format
    expect(result.auditEvent!.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(result.auditEvent!.actor).toBeTruthy();
    expect(result.auditEvent!.reason).toBeTruthy();
  });
});
