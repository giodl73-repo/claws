/**
 * L0: Gateway plugin emitter — plugin generation, hook registration,
 * fail-mode, catch clause verifier, risk map immutability.
 *
 * 5 unit tests:
 * 1. emit-plugin produces valid TypeScript for minimal GovernanceIR
 * 2. Generated handler has pre-computed ReadonlyMap risk lookup
 * 3. Catch clause uses `riskMap.get(toolName) ?? 5` (fail-closed default)
 * 4. Null/undefined toolName defaults to deny before map lookup
 * 5. Risk map is ReadonlyMap (immutable)
 */

import { describe, it, expect } from 'vitest';
import { emitPlugin, verifyCatchClauses } from '../../src/emit/emit-plugin.js';
import { minimalGovernanceIR } from '../fixtures/minimal/governance-ir.js';

describe('emitPlugin', () => {
  it('produces valid TypeScript for minimal GovernanceIR', () => {
    const ir = minimalGovernanceIR();
    const result = emitPlugin(ir);

    // Plugin source should be non-empty
    expect(result.pluginSource.length).toBeGreaterThan(0);

    // Should contain plugin definition
    expect(result.pluginSource).toContain('claws-governance');
    expect(result.pluginSource).toContain('register(api');

    // Package.json should be valid JSON
    const pkg = JSON.parse(result.packageJson);
    expect(pkg.name).toBe('@openclaw/governance-plugin');
    expect(pkg.type).toBe('module');

    // Hook files should be generated
    expect(result.hookFiles.size).toBe(3);
    expect(result.hookFiles.has('handlers/before-tool-call.ts')).toBe(true);
    expect(result.hookFiles.has('handlers/a2a-firewall.ts')).toBe(true);
    expect(result.hookFiles.has('handlers/elicitation-gate.ts')).toBe(true);
  });

  it('generates handler with pre-computed ReadonlyMap risk lookup', () => {
    const ir = minimalGovernanceIR();
    const result = emitPlugin(ir);

    // Plugin source must contain ReadonlyMap declaration
    expect(result.pluginSource).toContain('ReadonlyMap<string, number>');
    expect(result.pluginSource).toContain('new Map<string, number>');

    // Before-tool-call handler also has ReadonlyMap
    const btcHandler = result.hookFiles.get('handlers/before-tool-call.ts')!;
    expect(btcHandler).toContain('ReadonlyMap<string, number>');
    expect(btcHandler).toContain('RISK_MAP');
  });

  it('catch clause uses riskMap.get(toolName) ?? 5 (fail-closed default)', () => {
    const ir = minimalGovernanceIR();
    const result = emitPlugin(ir);

    // Plugin source must contain the ?? 5 pattern
    expect(result.pluginSource).toContain('?? 5');

    // Before-tool-call handler also uses ?? 5
    const btcHandler = result.hookFiles.get('handlers/before-tool-call.ts')!;
    expect(btcHandler).toContain('?? 5');

    // Verify it's RISK_MAP.get(name) ?? 5, not ?? 1 or some other value
    expect(result.pluginSource).toMatch(/RISK_MAP\.get\(\w+\)\s*\?\?\s*5/);
  });

  it('null/undefined toolName defaults to deny before map lookup', () => {
    const ir = minimalGovernanceIR();
    const result = emitPlugin(ir);

    // Plugin source must check for null/undefined toolName
    expect(result.pluginSource).toContain('== null');
    expect(result.pluginSource).toContain('Tool name is null or undefined');

    // The null check must appear BEFORE the RISK_MAP.get call
    const nullCheckIdx = result.pluginSource.indexOf('== null');
    const riskMapIdx = result.pluginSource.indexOf('RISK_MAP.get');
    expect(nullCheckIdx).toBeLessThan(riskMapIdx);
  });

  it('risk map is ReadonlyMap (immutable)', () => {
    const ir = minimalGovernanceIR();
    const result = emitPlugin(ir);

    // Must be declared as ReadonlyMap, not Map
    expect(result.pluginSource).toContain('const RISK_MAP: ReadonlyMap');

    // Risk map entries from the result must be readonly
    expect(result.riskMap).toBeDefined();
    expect(result.riskMap.length).toBeGreaterThan(0);

    // Before-tool-call handler also uses ReadonlyMap
    const btcHandler = result.hookFiles.get('handlers/before-tool-call.ts')!;
    expect(btcHandler).toContain('const RISK_MAP: ReadonlyMap');
  });

  it('includes system-prompt boundary markers by default', () => {
    const ir = minimalGovernanceIR();
    const result = emitPlugin(ir);

    expect(result.pluginSource).toContain('GOVERNANCE PREAMBLE');
    expect(result.pluginSource).toContain('GOVERNANCE EPILOGUE');
  });

  it('omits boundary markers when disabled', () => {
    const ir = minimalGovernanceIR();
    const result = emitPlugin(ir, { includeBoundaryMarkers: false });

    expect(result.pluginSource).not.toContain('GOVERNANCE PREAMBLE');
    expect(result.pluginSource).not.toContain('GOVERNANCE EPILOGUE');
  });

  it('governance absence returns deny (fail-closed)', () => {
    const ir = minimalGovernanceIR();
    const result = emitPlugin(ir);

    // UX-3: When __governanceHost is absent, the plugin must deny
    expect(result.pluginSource).toContain('governance host not configured');
    expect(result.pluginSource).toContain('allowed: false');
    // Must NOT have an early return with allowed: true for missing host
    expect(result.pluginSource).not.toMatch(/if\s*\(!host\)\s*return\s*\{\s*allowed:\s*true/);
  });

  it('elicitation gate passes signal to checkElicitation', () => {
    const ir = minimalGovernanceIR();
    const result = emitPlugin(ir);

    // CM-2: Signal must be passed to checkElicitation
    const elicitGate = result.hookFiles.get('handlers/elicitation-gate.ts')!;
    expect(elicitGate).toContain('checkElicitation(toolName, principal, signal)');
  });

  it('catch clause verifier passes for generated output', () => {
    const ir = minimalGovernanceIR();
    const result = emitPlugin(ir);

    const violations = verifyCatchClauses(result.pluginSource);
    expect(violations).toEqual([]);
  });
});
