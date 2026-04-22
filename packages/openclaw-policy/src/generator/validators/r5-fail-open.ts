/**
 * r5-fail-open validator (CP-6 pulse 53, SC-07) — rejects any tool that
 * combines `riskTier: R5` with `failOpen: true`. Proposal §1.6 declares the
 * pair mutually exclusive; `failOpen` silently weakens R5's fail-closed
 * invariant at runtime so we reject at generate time.
 *
 * Pure function with no I/O. The generator's declaration-lowering pass
 * calls this per `ToolSpec` and accumulates diagnostics. Runtime defences
 * in SC-03/SC-04 (TTL floors) handle tools that escape this gate by
 * bypassing the generator.
 *
 * @module @bic/openclaw-policy/generator/validators/r5-fail-open
 */

import type { ToolSpec } from '../../types/index.js';
import type { R5FailOpenDiagnostic } from '../diagnostics.js';

export interface ValidateOk {
  readonly ok: true;
}

export interface ValidateFail {
  readonly ok: false;
  readonly diagnostic: R5FailOpenDiagnostic;
}

export type ValidateResult = ValidateOk | ValidateFail;

export function validateR5FailOpen(tool: ToolSpec): ValidateResult {
  if (tool.riskLevel !== 5 || tool.failOpen !== true) {
    return { ok: true };
  }
  const loc = tool.sourceLocation;
  const diagnostic: R5FailOpenDiagnostic = {
    kind: 'r5-fail-open',
    toolName: tool.name,
    sourcePath: loc?.path ?? 'TOOLS.md',
    line: loc?.line ?? 0,
    column: loc?.column ?? 0,
    invalidReason: 'r5-fail-open-declared',
    message:
      `tool ${tool.name} declares R5 with failOpen: true; ` +
      `R5 requires fail-closed semantics (proposal §1.6)`,
  };
  return { ok: false, diagnostic };
}
