/**
 * L0: bypass evaluation — env detection and fleet policy enforcement.
 */

import { describe, it, expect } from 'vitest';
import { evaluateBypass } from '../../src/config/bypass.js';

describe('evaluateBypass()', () => {
  it('activates bypass when CLAWS_BYPASS=1 and fleet policy allows', () => {
    const env = { CLAWS_BYPASS: '1', USER: 'testuser' };
    const fleetPolicy = { allowBypass: true };

    const { state, auditEvent } = evaluateBypass(env, fleetPolicy);

    expect(state.envDetected).toBe(true);
    expect(state.policyAllows).toBe(true);
    expect(state.outcome).toBe('activated');
    expect(auditEvent).not.toBeNull();
    expect(auditEvent!.eventType).toBe('bypass');
    expect(auditEvent!.outcome).toBe('activated');
    expect(auditEvent!.actor).toBe('testuser');
    expect(auditEvent!.timestamp).toBeTruthy();
  });

  it('denies bypass when CLAWS_BYPASS=1 but fleet policy disallows', () => {
    const env = { CLAWS_BYPASS: '1', USER: 'testuser' };
    const fleetPolicy = { allowBypass: false };

    const { state, auditEvent } = evaluateBypass(env, fleetPolicy);

    expect(state.envDetected).toBe(true);
    expect(state.policyAllows).toBe(false);
    expect(state.outcome).toBe('denied');
    expect(auditEvent).not.toBeNull();
    expect(auditEvent!.eventType).toBe('bypass');
    expect(auditEvent!.outcome).toBe('denied');
    expect(auditEvent!.reason).toContain('allowBypass=false');
  });

  it('returns inactive when CLAWS_BYPASS is not set', () => {
    const env = {};
    const fleetPolicy = { allowBypass: true };

    const { state, auditEvent } = evaluateBypass(env, fleetPolicy);

    expect(state.envDetected).toBe(false);
    expect(state.policyAllows).toBe(true);
    expect(state.outcome).toBe('inactive');
    expect(auditEvent).toBeNull();
  });

  it('returns inactive when CLAWS_BYPASS is not "1"', () => {
    const env = { CLAWS_BYPASS: '0' };
    const fleetPolicy = { allowBypass: false };

    const { state, auditEvent } = evaluateBypass(env, fleetPolicy);

    expect(state.envDetected).toBe(false);
    expect(state.outcome).toBe('inactive');
    expect(auditEvent).toBeNull();
  });

  it('falls back to USERNAME when USER is not set', () => {
    const env = { CLAWS_BYPASS: '1', USERNAME: 'winuser' };
    const fleetPolicy = { allowBypass: true };

    const { auditEvent } = evaluateBypass(env, fleetPolicy);

    expect(auditEvent).not.toBeNull();
    expect(auditEvent!.actor).toBe('winuser');
  });

  it('falls back to "unknown" when neither USER nor USERNAME is set', () => {
    const env = { CLAWS_BYPASS: '1' };
    const fleetPolicy = { allowBypass: true };

    const { auditEvent } = evaluateBypass(env, fleetPolicy);

    expect(auditEvent).not.toBeNull();
    expect(auditEvent!.actor).toBe('unknown');
  });
});
