/**
 * L0: Gateway plugin emitter — branch coverage for verifyNoForbiddenImports,
 * verifyCatchClauses edge cases, P-076 warning, delegation/OBO formatting.
 */

import { describe, it, expect } from 'vitest';
import {
  emitPlugin,
  verifyNoForbiddenImports,
  verifyCatchClauses,
} from '../../src/emit/emit-plugin.js';
import { minimalGovernanceIR } from '../fixtures/minimal/governance-ir.js';
import type { GovernanceIR } from '../../src/ir/governance-ir.js';

function cloneIR(ir: GovernanceIR): GovernanceIR {
  return JSON.parse(JSON.stringify(ir)) as GovernanceIR;
}

describe('verifyNoForbiddenImports', () => {
  it('returns empty array for clean source', () => {
    const result = verifyNoForbiddenImports('import { foo } from "bar";');
    expect(result).toEqual([]);
  });

  it('detects @craftworks/ imports', () => {
    const source = 'import { x } from "@craftworks/sdk";\nimport { y } from "@craftworks/cli";';
    const result = verifyNoForbiddenImports(source);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe('@craftworks/');
    expect(result[1]).toBe('@craftworks/');
  });

  it('detects @claws/ imports', () => {
    const source = 'import { z } from "@claws/core";';
    const result = verifyNoForbiddenImports(source);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe('@claws/');
  });

  it('detects mixed forbidden imports', () => {
    const source = 'import "@craftworks/a";\nimport "@claws/b";';
    const result = verifyNoForbiddenImports(source);
    expect(result).toHaveLength(2);
    expect(result).toContain('@craftworks/');
    expect(result).toContain('@claws/');
  });
});

describe('verifyCatchClauses', () => {
  it('returns empty for source with no catch blocks', () => {
    const result = verifyCatchClauses('function foo() { return 1; }');
    expect(result).toEqual([]);
  });

  it('skips fire-and-forget catch blocks', () => {
    const source = `
      try { audit(); } catch { /* fire-and-forget */ }
    `;
    const result = verifyCatchClauses(source);
    expect(result).toEqual([]);
  });

  it('detects audit logging not wrapped in try/catch', () => {
    const source = `
      catch (err) {
        host.emitAuditEvent({ event: 'error' });
        return { allowed: false };
      }
    `;
    const result = verifyCatchClauses(source);
    expect(result).toHaveLength(1);
    expect(result[0]).toContain('Audit logging not wrapped in try/catch');
  });

  it('handles catch with unclosed parenthesis gracefully', () => {
    // catch( without closing paren — should skip
    const source = 'catch( broken { something }';
    const result = verifyCatchClauses(source);
    expect(result).toEqual([]);
  });

  it('handles catch without opening brace gracefully', () => {
    // catch (err) followed by non-brace
    const source = 'catch (err) return false;';
    const result = verifyCatchClauses(source);
    expect(result).toEqual([]);
  });

  it('handles unbalanced braces in catch block', () => {
    // Open brace but never balanced — depth never reaches 0
    const source = 'catch { { unclosed';
    const result = verifyCatchClauses(source);
    // No balanced block found, so no violations
    expect(result).toEqual([]);
  });

  it('passes for catch blocks where audit is fire-and-forget wrapped', () => {
    const source = `
      catch (err) {
        try { host.emitAuditEvent({ event: 'x' }); } catch { /* fire-and-forget */ }
        return { allowed: false };
      }
    `;
    const result = verifyCatchClauses(source);
    expect(result).toEqual([]);
  });
});

describe('emitPlugin — branch coverage', () => {
  it('emits P-076 warning when more than 20 intents', () => {
    const ir = cloneIR(minimalGovernanceIR());
    // Add enough intents to trigger P-076 (>20)
    const intents = ir.intents as unknown[];
    for (let i = 0; i < 25; i++) {
      intents.push({
        id: `intent-extra-${i}`,
        ruleId: `EXTRA-${i}`,
        level: 3,
        kind: 'deny',
        description: `Extra deny intent ${i}`,
        target: `tool_${i}`,
        reason: `Test reason ${i}`,
      });
    }

    const result = emitPlugin(ir);
    expect(result.warnings.some((w) => w.includes('P-076'))).toBe(true);
  });

  it('no P-076 warning when 20 or fewer intents', () => {
    const ir = minimalGovernanceIR();
    // Default fixture has 3 intents
    const result = emitPlugin(ir);
    expect(result.warnings.every((w) => !w.includes('P-076'))).toBe(true);
  });

  it('generates correct delegation map format for A2A firewall', () => {
    const ir = minimalGovernanceIR();
    const result = emitPlugin(ir);

    const a2a = result.hookFiles.get('handlers/a2a-firewall.ts')!;
    // primary → reviewer delegation exists
    expect(a2a).toContain('ALLOWED_DELEGATIONS');
    expect(a2a).toContain('"primary"');
    expect(a2a).toContain('"reviewer"');
  });

  it('generates OBO tool set in elicitation gate', () => {
    const ir = minimalGovernanceIR();
    const result = emitPlugin(ir);

    const elicit = result.hookFiles.get('handlers/elicitation-gate.ts')!;
    // send_email should be in OBO_TOOLS (from elicit intent + oboFlag)
    expect(elicit).toContain('OBO_TOOLS');
    expect(elicit).toContain('send_email');
  });

  it('handles IR with no delegations (empty delegation map)', () => {
    const ir = cloneIR(minimalGovernanceIR());
    // Remove all delegations
    for (const agent of ir.capabilities.agents as Array<{ delegations: unknown[] }>) {
      agent.delegations = [];
    }

    const result = emitPlugin(ir);
    const a2a = result.hookFiles.get('handlers/a2a-firewall.ts')!;
    // Should have empty delegation map
    expect(a2a).toContain('new Map([])');
  });

  it('handles IR with no elicit intents and no OBO tools', () => {
    const ir = cloneIR(minimalGovernanceIR());
    // Remove elicit intents and OBO flags
    (ir as { intents: unknown[] }).intents = ir.intents.filter((i) => i.kind !== 'elicit');
    for (const tool of ir.capabilities.tools as Array<{ oboFlag: boolean }>) {
      tool.oboFlag = false;
    }

    const result = emitPlugin(ir);
    const elicit = result.hookFiles.get('handlers/elicitation-gate.ts')!;
    // Should have empty OBO tool set
    expect(elicit).toContain('new Set([])');
  });

  it('custom hookTimeoutMs propagates to generated source', () => {
    const ir = minimalGovernanceIR();
    const result = emitPlugin(ir, { hookTimeoutMs: 10000 });

    expect(result.pluginSource).toContain('10000');
    const btc = result.hookFiles.get('handlers/before-tool-call.ts')!;
    expect(btc).toContain('10000');
  });
});
