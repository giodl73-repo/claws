/**
 * Emit gateway-plugin.ts — the executable TypeScript plugin implementing
 * GuardrailProvider + FileIngestProvider against OC's hook surface.
 *
 * The emitter is deterministic: same IR + snapshotId produces byte-identical
 * source. The CL-14 §1.6 forbidden-import scan runs on the rendered output.
 *
 * Steward M2 — this file absorbs responsibilities from both
 * `claws-sdk/src/emit/emit-plugin.ts` (rich business logic) and
 * `claws-sdk/src/compiler/emit/oc-emitter.ts` (ts.factory AST discipline).
 * See CONSOLIDATION-LOG.md for the merge decisions.
 */

import type { PolicyIR } from '../types/index.js';

const FORBIDDEN = /@(craftworks|claws)\//g;

const IDENTITY_NAME_RE = /^[a-zA-Z0-9_-]{1,64}$/;

export interface EmitPluginOptions {
  ir: PolicyIR;
  snapshotId: string;
  scopePrefix?: '@openclaw' | '@bic/openclaw';
}

export const DEFAULT_SCOPE_PREFIX: '@bic/openclaw' = '@bic/openclaw';

export function emitPluginCode(opts: EmitPluginOptions): string {
  const scope = opts.scopePrefix ?? DEFAULT_SCOPE_PREFIX;
  assertValidIdentityName(opts.ir.identity.name);
  const src = renderSource(opts.ir, opts.snapshotId, scope);
  verifyNoForbiddenImports(src, scope);
  return src;
}

export function assertValidIdentityName(name: string): void {
  if (!IDENTITY_NAME_RE.test(name)) {
    throw new Error(
      `Refusing to emit: ir.identity.name must match ${IDENTITY_NAME_RE.source} — got ${JSON.stringify(name)}`,
    );
  }
}

export function verifyNoForbiddenImports(src: string, scope: string): void {
  const allow = scope === '@bic/openclaw' ? /@bic\/openclaw-/g : null;
  const hits: string[] = [];
  let m: RegExpExecArray | null;
  FORBIDDEN.lastIndex = 0;
  while ((m = FORBIDDEN.exec(src)) !== null) {
    const ok = allow && allow.test(src.slice(Math.max(0, m.index - 5), m.index + 20));
    if (!ok) hits.push(m[0]);
  }
  if (hits.length > 0) {
    const unique = Array.from(new Set(hits));
    throw new Error(
      `Refusing to emit: generated output contains forbidden @craftworks/* or @claws/* reference(s): ${unique.join(', ')}`,
    );
  }
}

function scopedImports(scope: string): {
  guardrails: string;
  runtime: string;
  workspacePath: string;
} {
  if (scope === '@bic/openclaw') {
    return {
      guardrails: '@bic/openclaw-guardrails',
      runtime: '@bic/openclaw-policy/runtime',
      workspacePath: '@bic/openclaw-workspace/path',
    };
  }
  return {
    guardrails: `${scope}/guardrails`,
    runtime: `${scope}/policy/runtime`,
    workspacePath: `${scope}/workspace/path`,
  };
}

function sanitizeForComment(s: string): string {
  return s.replace(/\*\//g, '* /');
}

function renderSource(ir: PolicyIR, snapshotId: string, scope: string): string {
  const name = ir.identity.name;
  const nameLit = JSON.stringify(name);
  const nameComment = sanitizeForComment(name);
  const snapLit = JSON.stringify(snapshotId);
  const imports = scopedImports(scope);
  return [
    `// ${nameComment}.gateway-plugin.ts  (emitted — don't hand-edit)`,
    `// policyId: ${sanitizeForComment(ir.policyId)}`,
    `// snapshotId: ${sanitizeForComment(snapshotId)}`,
    `import { issueHandle, propagatedSensitivity, matchDenyRules }`,
    `  from '${imports.runtime}';`,
    `import type { GuardrailProvider, FileIngestProvider, ProviderLifecycle, HostContext,`,
    `  AuthorizationDecision, IngestDecision }`,
    `  from '${imports.guardrails}';`,
    `import { formatOcPath } from '${imports.workspacePath}';`,
    `import POLICY_IR from './policy-ir.json' with { type: 'json' };`,
    ``,
    `const SNAPSHOT = ${snapLit};`,
    `const PROVIDER_NAME = ${nameLit};`,
    ``,
    `let ctx: HostContext;`,
    ``,
    `const guardrail: GuardrailProvider & ProviderLifecycle = {`,
    `  name: PROVIDER_NAME,`,
    `  async init(hostCtx) { ctx = hostCtx; },`,
    `  getCapabilities: () => ({`,
    `    description: ${JSON.stringify(`policy-compiled gateway provider for ${name}`)},`,
    `    version: POLICY_IR.version,`,
    `    riskClassification: true,`,
    `    auditTrail: true,`,
    `    externalApproval: true,`,
    `    argumentModification: false,`,
    `  }),`,
    `  async preAuthorize(e): Promise<AuthorizationDecision> {`,
    `    const tool = POLICY_IR.tools.find((t) => t.name === e.tool);`,
    `    if (!tool) return { decision: 'deny', reason: 'unknown tool' };`,
    `    if (tool.riskLevel === 5) {`,
    `      const tainted = propagatedSensitivity(e.provenance, POLICY_IR) === 'RESTRICTED';`,
    `      if (tainted) {`,
    `        return { decision: 'review', reason: 'RESTRICTED source',`,
    `          approvalHandle: await issueHandle(ctx, e) };`,
    `      }`,
    `    }`,
    `    const rule = matchDenyRules(e, POLICY_IR.soul.denyRules);`,
    `    if (rule) return { decision: 'review', reason: rule.reason,`,
    `      approvalHandle: await issueHandle(ctx, e) };`,
    `    const requiresExternal = tool.capabilities.includes('IRREVERSIBLE_EXTERNAL');`,
    `    return { decision: 'allow', riskLevel: tool.riskLevel,`,
    `      requiresExternalApproval: requiresExternal };`,
    `  },`,
    `  async postAudit(e, decision): Promise<void> {`,
    `    await ctx.auditSink.append({`,
    `      timestamp: new Date().toISOString(),`,
    `      source: PROVIDER_NAME,`,
    `      action: 'tool_call',`,
    `      target: formatOcPath({ file: 'TOOLS.md', section: 'Tools', item: e.tool }),`,
    `      scope: 'policy:' + SNAPSHOT,`,
    `      outcome: decision.decision === 'deny' ? 'failed' : 'success',`,
    `      reason: 'reason' in decision ? decision.reason : undefined,`,
    `    });`,
    `  },`,
    `  async onSnapshotPromoted(_meta) {},`,
    `};`,
    ``,
    `const fileIngest: FileIngestProvider & ProviderLifecycle = {`,
    `  name: PROVIDER_NAME,`,
    `  async init(hostCtx) { ctx = hostCtx; },`,
    `  getCapabilities: () => ({`,
    `    description: ${JSON.stringify(`policy-compiled file-ingest provider for ${name}`)},`,
    `    version: POLICY_IR.version,`,
    `    sensitivityLabeling: true,`,
    `    contentModification: false,`,
    `    externalApproval: true,`,
    `  }),`,
    `  async beforeIngest(e): Promise<IngestDecision> {`,
    `    if (e.operation === 'write' && e.author === 'agent'`,
    `        && POLICY_IR.governance.governanceSurface.includes(e.path)) {`,
    `      return { decision: 'deny',`,
    `        reason: e.path + ' is governance — humans edit this one' };`,
    `    }`,
    `    const label = POLICY_IR.files?.[e.path]?.sensitivity;`,
    `    return { decision: 'allow', sensitivity: label };`,
    `  },`,
    `  async afterIngest(e, decision): Promise<void> {`,
    `    await ctx.auditSink.append({`,
    `      timestamp: new Date().toISOString(),`,
    `      source: PROVIDER_NAME,`,
    `      action: 'file_ingest',`,
    `      target: formatOcPath({ file: e.path }),`,
    `      scope: 'policy:' + SNAPSHOT,`,
    `      outcome: decision.decision === 'deny' ? 'failed' : 'success',`,
    `      reason: 'reason' in decision ? decision.reason : undefined,`,
    `    });`,
    `  },`,
    `};`,
    ``,
    `export const registration = [`,
    `  { pluginId: PROVIDER_NAME, hookName: 'before_tool_call', handler: (e: Parameters<typeof guardrail.preAuthorize>[0]) => guardrail.preAuthorize(e) },`,
    `  { pluginId: PROVIDER_NAME, hookName: 'after_tool_call', handler: (e: Parameters<typeof guardrail.postAudit>[0], r: Parameters<typeof guardrail.postAudit>[1]) => guardrail.postAudit(e, r) },`,
    `  { pluginId: PROVIDER_NAME, hookName: 'before_workspace_file_ingest', handler: (e: Parameters<typeof fileIngest.beforeIngest>[0]) => fileIngest.beforeIngest(e) },`,
    `  { pluginId: PROVIDER_NAME, hookName: 'after_workspace_file_ingest', handler: (e: Parameters<typeof fileIngest.afterIngest>[0], d: Parameters<typeof fileIngest.afterIngest>[1]) => fileIngest.afterIngest(e, d) },`,
    `];`,
    ``,
  ].join('\n');
}
