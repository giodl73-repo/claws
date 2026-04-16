/**
 * L0: Consolidated bypass module — config-path and init-path produce identical results.
 *
 * Validates D-04/A-02 fix: single bypass evaluation module at config/bypass.ts
 * eliminates divergence between config-path and init-path bypass decisions.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { evaluateBypass, checkBypass } from '../../src/config/bypass.js';

describe('consolidated bypass evaluation', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('evaluateBypass (config-path) correctly evaluates bypass scenarios', () => {
    // Scenario 1: bypass activated
    const activated = evaluateBypass(
      { CLAWS_BYPASS: '1', USER: 'alice' },
      { allowBypass: true },
    );
    expect(activated.state.outcome).toBe('activated');
    expect(activated.state.envDetected).toBe(true);
    expect(activated.state.policyAllows).toBe(true);
    expect(activated.auditEvent).not.toBeNull();
    expect(activated.auditEvent!.actor).toBe('alice');

    // Scenario 2: bypass denied by fleet policy
    const denied = evaluateBypass(
      { CLAWS_BYPASS: '1', USER: 'bob' },
      { allowBypass: false },
    );
    expect(denied.state.outcome).toBe('denied');
    expect(denied.state.envDetected).toBe(true);
    expect(denied.state.policyAllows).toBe(false);
    expect(denied.auditEvent!.outcome).toBe('denied');

    // Scenario 3: not requested
    const inactive = evaluateBypass({}, { allowBypass: true });
    expect(inactive.state.outcome).toBe('inactive');
    expect(inactive.state.envDetected).toBe(false);
    expect(inactive.auditEvent).toBeNull();
  });

  it('checkBypass (init-path) produces identical decisions to evaluateBypass', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-bypass-'));

    // Set up minimal workspace for audit chain
    const auditDir = join(tempDir, '.claws', 'audit');
    await mkdir(auditDir, { recursive: true });

    // Test 1: not-requested — both paths agree
    const configResult = evaluateBypass({}, { allowBypass: true });
    const initResult = await checkBypass(tempDir, { allowBypass: true }, {});
    expect(configResult.state.outcome).toBe('inactive');
    expect(initResult.bypassed).toBe(false);
    expect(initResult.reason).toBe('not-requested');

    // Test 2: fleet-prohibited — both paths agree
    const configDenied = evaluateBypass(
      { CLAWS_BYPASS: '1' },
      { allowBypass: false },
    );
    const initDenied = await checkBypass(
      tempDir,
      { allowBypass: false },
      { CLAWS_BYPASS: '1' },
    );
    expect(configDenied.state.outcome).toBe('denied');
    expect(initDenied.bypassed).toBe(false);
    expect(initDenied.reason).toBe('fleet-prohibited');

    // Test 3: activated — both paths agree
    const configActivated = evaluateBypass(
      { CLAWS_BYPASS: '1', USER: 'tester' },
      { allowBypass: true },
    );
    const initActivated = await checkBypass(
      tempDir,
      { allowBypass: true },
      { CLAWS_BYPASS: '1', USER: 'tester' },
    );
    expect(configActivated.state.outcome).toBe('activated');
    expect(initActivated.bypassed).toBe(true);
    expect(initActivated.reason).toBe('env-bypass');
    expect(initActivated.auditRecorded).toBe(true);
  });
});
