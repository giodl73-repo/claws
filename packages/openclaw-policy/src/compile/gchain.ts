/**
 * G-CHAIN generator-compile: compute `effectiveSensitivity` per tool by
 * propagating the max sensitivity of every `args_from` source through the
 * transitive closure of the provenance graph (CL-07 §1a G-CHAIN, proposal §5
 * property 1 row 2, SC-15).
 *
 * Sensitivity tagging sources today:
 *   - `args_from: [ memory.RESTRICTED ]` — source is a memory lane at
 *     RESTRICTED sensitivity (already supported by `ProvenanceSource`).
 *   - `args_from: [ tool_output.<name> ]` — transitive: downstream tool
 *     inherits the `max(declared, source.effectiveSensitivity)` of its
 *     upstream tool. Used to model TOOLS.md declarations like
 *     `args_from: [{ source: 'RESTRICTED-classifier' }]` when the
 *     upstream classifier is itself modelled as an R3+ tool whose
 *     `memory.RESTRICTED` provenance tags it.
 *
 * This is the shipping behaviour. OC-9 (hook-result stickiness, proposal
 * §6.1) is NOT shipping; this module does not read provider hook results.
 *
 * @module @bic/openclaw-policy/compile/gchain
 */

import type { ProvenanceSource, Sensitivity, ToolSpec } from '../types/index.js';

const RANK: Record<Sensitivity, number> = {
  PUBLIC: 0,
  INTERNAL: 1,
  CONFIDENTIAL: 2,
  RESTRICTED: 3,
};

/**
 * Compute the effective sensitivity per tool by walking `args_from` sources
 * transitively. Cycles are safe: each visit short-circuits on a revisit
 * (the outer `analyze.ts` already rejects cycles; this function is
 * defensive so mis-ordered callers get a deterministic result instead of a
 * stack overflow).
 *
 * Returns a map keyed by tool name; tools with no elevating source keep
 * their declared sensitivity (defaults to `PUBLIC` when none is declared).
 */
export function computeEffectiveSensitivity(
  tools: ReadonlyArray<ToolSpec>,
): ReadonlyMap<string, Sensitivity> {
  const byName = new Map<string, ToolSpec>();
  for (const t of tools) byName.set(t.name, t);

  const cache = new Map<string, Sensitivity>();

  function visit(name: string, visiting: ReadonlySet<string>): Sensitivity {
    const cached = cache.get(name);
    if (cached !== undefined) return cached;
    if (visiting.has(name)) {
      // Cycle: break without elevation. The analyze pass reports the cycle
      // as a diagnostic; we just need a deterministic exit.
      return 'PUBLIC';
    }
    const tool = byName.get(name);
    if (tool === undefined) return 'PUBLIC';
    const nextVisiting = new Set(visiting);
    nextVisiting.add(name);

    let eff: Sensitivity = tool.sensitivity ?? 'PUBLIC';
    for (const [, sources] of Object.entries(tool.argsFrom ?? {})) {
      for (const src of sources) {
        eff = maxSens(eff, sensitivityOfSource(src, byName, nextVisiting, visit));
      }
    }
    cache.set(name, eff);
    return eff;
  }

  const out = new Map<string, Sensitivity>();
  for (const t of tools) {
    out.set(t.name, visit(t.name, new Set()));
  }
  return out;
}

function sensitivityOfSource(
  src: ProvenanceSource,
  byName: ReadonlyMap<string, ToolSpec>,
  visiting: ReadonlySet<string>,
  visit: (name: string, visiting: ReadonlySet<string>) => Sensitivity,
): Sensitivity {
  if (typeof src === 'string') return 'PUBLIC';
  if ('memory' in src) return src.memory;
  if ('tool_output' in src) {
    const upstream = byName.get(src.tool_output);
    if (upstream === undefined) return 'PUBLIC';
    return visit(src.tool_output, visiting);
  }
  return 'PUBLIC';
}

function maxSens(a: Sensitivity, b: Sensitivity): Sensitivity {
  return RANK[a] >= RANK[b] ? a : b;
}
