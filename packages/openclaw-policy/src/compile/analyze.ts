/**
 * Analyze phase — run governance-fatal invariants against the extracted IR.
 * Diagnostics here carry the OC-POLICY-E code family.
 */

import type { Diagnostic, PolicyIR, ToolSpec } from '../types/index.js';

const E_R5_FAIL_OPEN = 'OC-POLICY-E101';
const E_CAP_R5_CLAMP = 'OC-POLICY-E102';
const E_ARGS_FROM_CYCLE = 'OC-POLICY-E230';
const E_R3_PROVENANCE_MISSING = 'OC-POLICY-E231';

export function analyze(ir: PolicyIR): { ok: boolean; diagnostics: Diagnostic[] } {
  const diagnostics: Diagnostic[] = [];
  diagnostics.push(...checkCapabilityClamp(ir.tools));
  diagnostics.push(...checkArgsFromCycles(ir.tools));
  diagnostics.push(...checkR3Provenance(ir.tools));
  diagnostics.push(...checkR5FailMode(ir.tools));
  const ok = diagnostics.every((d) => d.severity !== 'error');
  return { ok, diagnostics };
}

export function checkCapabilityClamp(tools: ToolSpec[]): Diagnostic[] {
  const out: Diagnostic[] = [];
  for (const t of tools) {
    if (t.capabilities.includes('IRREVERSIBLE_EXTERNAL') && t.riskLevel < 5) {
      out.push({
        code: E_CAP_R5_CLAMP,
        severity: 'error',
        message: `tool ${t.name} declares IRREVERSIBLE_EXTERNAL but risk is R${t.riskLevel} — must be R5`,
      });
    }
  }
  return out;
}

export function checkArgsFromCycles(tools: ToolSpec[]): Diagnostic[] {
  const graph = new Map<string, Set<string>>();
  for (const t of tools) {
    const deps = new Set<string>();
    for (const srcs of Object.values(t.argsFrom ?? {})) {
      for (const s of srcs) {
        if (typeof s === 'object' && 'tool_output' in s) deps.add(s.tool_output);
      }
    }
    graph.set(t.name, deps);
  }
  const out: Diagnostic[] = [];
  for (const [name] of graph) {
    if (hasCycle(name, graph, new Set())) {
      out.push({
        code: E_ARGS_FROM_CYCLE,
        severity: 'error',
        message: `args_from cycle detected at tool ${name}`,
      });
    }
  }
  return out;
}

export function checkR3Provenance(tools: ToolSpec[]): Diagnostic[] {
  const out: Diagnostic[] = [];
  for (const t of tools) {
    if (t.riskLevel < 3) continue;
    if (!t.argsFrom) {
      out.push({
        code: E_R3_PROVENANCE_MISSING,
        severity: 'error',
        message: `tool ${t.name} is R${t.riskLevel} but declares no args_from provenance`,
      });
      continue;
    }
    for (const [arg, srcs] of Object.entries(t.argsFrom)) {
      const hasNonUser = srcs.some((s) => s !== 'user_prompt');
      const hasDeclared = srcs.length > 0;
      if (hasNonUser && !hasDeclared) {
        out.push({
          code: E_R3_PROVENANCE_MISSING,
          severity: 'error',
          message: `tool ${t.name} arg ${arg} consumes non-user_prompt without declared provenance`,
        });
      }
    }
  }
  return out;
}

export function checkR5FailMode(tools: ToolSpec[]): Diagnostic[] {
  const out: Diagnostic[] = [];
  for (const t of tools) {
    if (t.riskLevel === 5 && t.capabilities.length === 0) {
      out.push({
        code: E_R5_FAIL_OPEN,
        severity: 'warning',
        message: `tool ${t.name} is R5 with no declared capabilities — verify fail-closed posture`,
      });
    }
  }
  return out;
}

function hasCycle(
  node: string,
  graph: Map<string, Set<string>>,
  visiting: Set<string>,
): boolean {
  if (visiting.has(node)) return true;
  visiting.add(node);
  const deps = graph.get(node) ?? new Set();
  for (const d of deps) {
    if (graph.has(d) && hasCycle(d, graph, visiting)) return true;
  }
  visiting.delete(node);
  return false;
}
