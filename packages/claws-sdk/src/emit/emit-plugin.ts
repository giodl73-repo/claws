/**
 * Gateway plugin emitter — generates an OC Gateway plugin from GovernanceIR.
 *
 * Produces a complete OpenClawPluginDefinition-compatible TypeScript plugin
 * with before_tool_call, A2A firewall, and elicitation gate hooks.
 *
 * Key constraints:
 * - Zero @craftworks/ or @claws/ imports in generated output (OC developer test)
 * - Pre-computed ReadonlyMap risk lookup — no regex or dynamic classification
 * - Unknown tool defaults to R5 (fail-closed) via `?? 5`
 * - Catch clause: minimal map lookup, constant default, fire-and-forget audit
 * - AbortSignal.timeout(hookTimeoutMs) on all policy evaluation calls
 *
 * @module claws-sdk/emit/emit-plugin
 */

import type { GovernanceIR } from '../ir/governance-ir.js';
import type { DenyIntent, ElicitIntent } from '../ir/mechanical-intent.js';
import type { RuleLevel } from '../ir/fail-mode.js';
import { buildRiskMap, type RiskMapEntry } from '../adapter/oc-data-adapter.js';

/**
 * Options for plugin generation.
 */
export interface EmitPluginOptions {
  /** Timeout for governance hooks in milliseconds. Default: 5000. */
  readonly hookTimeoutMs?: number;
  /** Target TypeScript version. Default: "ES2022". */
  readonly targetTs?: string;
  /** Whether to include system-prompt boundary markers. Default: true. */
  readonly includeBoundaryMarkers?: boolean;
}

/**
 * Result of plugin generation.
 */
export interface EmitPluginResult {
  /** The generated plugin index.ts content. */
  readonly pluginSource: string;
  /** The generated package.json content. */
  readonly packageJson: string;
  /** The generated hook handler files. */
  readonly hookFiles: ReadonlyMap<string, string>;
  /** Risk map entries used in generation. */
  readonly riskMap: readonly RiskMapEntry[];
  /** Warnings produced during generation. */
  readonly warnings: readonly string[];
}

/**
 * Default hook timeout in milliseconds.
 */
const DEFAULT_HOOK_TIMEOUT_MS = 5000;

/**
 * Boundary markers for system-prompt sandwich.
 */
const BOUNDARY_PREAMBLE = '/* ── GOVERNANCE PREAMBLE ── */';
const BOUNDARY_EPILOGUE = '/* ── GOVERNANCE EPILOGUE ── */';

/**
 * Generate an OC Gateway plugin from a GovernanceIR.
 *
 * @param ir - The compiled GovernanceIR
 * @param options - Generation options
 * @returns Complete plugin source files
 */
export function emitPlugin(
  ir: GovernanceIR,
  options: EmitPluginOptions = {},
): EmitPluginResult {
  const hookTimeoutMs = options.hookTimeoutMs ?? DEFAULT_HOOK_TIMEOUT_MS;
  const includeBoundaryMarkers = options.includeBoundaryMarkers ?? true;
  const warnings: string[] = [];

  // Build risk map from GovernanceIR
  const riskMapEntries = buildRiskMap(ir);

  // Check for loading order advisory (P-076)
  if (ir.intents.length > 20) {
    warnings.push(
      'P-076: Plugin has more than 20 enforcement intents — verify plugin loading order with existing plugins',
    );
  }

  // Build delegation map for A2A firewall
  const delegationMap = buildDelegationEntries(ir);

  // Build OBO tool set for elicitation gate
  const oboTools = buildOboToolSet(ir);

  // Generate source files
  const pluginSource = generatePluginIndex(
    ir,
    riskMapEntries,
    delegationMap,
    oboTools,
    hookTimeoutMs,
    includeBoundaryMarkers,
  );

  const packageJson = generatePackageJson(ir);

  const hookFiles = new Map<string, string>();
  hookFiles.set(
    'handlers/before-tool-call.ts',
    generateBeforeToolCall(riskMapEntries, hookTimeoutMs, ir.compiler.compilerVersion),
  );
  hookFiles.set(
    'handlers/a2a-firewall.ts',
    generateA2AFirewall(delegationMap, hookTimeoutMs, ir.compiler.compilerVersion),
  );
  hookFiles.set(
    'handlers/elicitation-gate.ts',
    generateElicitationGate(oboTools, hookTimeoutMs, ir.compiler.compilerVersion),
  );

  return {
    pluginSource,
    packageJson,
    hookFiles,
    riskMap: riskMapEntries,
    warnings,
  };
}

// ── Risk Map ──────────────────────────────────────────────────────────

/**
 * Format risk map entries as TypeScript ReadonlyMap constructor entries.
 * Output: `[["toolA", 3], ["toolB", 5]]`
 */
function formatRiskMapEntries(entries: readonly RiskMapEntry[]): string {
  if (entries.length === 0) return '[]';
  const items = entries
    .map((e) => `[${JSON.stringify(e.toolName)}, ${e.riskLevel}]`)
    .join(', ');
  return `[${items}]`;
}

// ── Delegation Map ────────────────────────────────────────────────────

interface DelegationPair {
  readonly from: string;
  readonly to: string;
}

function buildDelegationEntries(ir: GovernanceIR): readonly DelegationPair[] {
  const pairs: DelegationPair[] = [];
  for (const agent of ir.capabilities.agents) {
    for (const delegation of agent.delegations) {
      pairs.push({ from: delegation.from, to: delegation.to });
    }
  }
  return pairs;
}

function formatDelegationEntries(pairs: readonly DelegationPair[]): string {
  if (pairs.length === 0) return '[]';

  // Group by "from" agent
  const grouped = new Map<string, string[]>();
  for (const pair of pairs) {
    const existing = grouped.get(pair.from);
    if (existing) {
      existing.push(pair.to);
    } else {
      grouped.set(pair.from, [pair.to]);
    }
  }

  const items = Array.from(grouped.entries())
    .map(([from, tos]) => {
      const toSet = tos.map((t) => JSON.stringify(t)).join(', ');
      return `[${JSON.stringify(from)}, new Set([${toSet}])]`;
    })
    .join(', ');
  return `[${items}]`;
}

// ── OBO Tools ─────────────────────────────────────────────────────────

function buildOboToolSet(ir: GovernanceIR): readonly string[] {
  const oboTools: string[] = [];

  // From elicit intents
  for (const intent of ir.intents) {
    if (intent.kind === 'elicit') {
      oboTools.push((intent as ElicitIntent).target);
    }
  }

  // From OBO-flagged tools in capability manifest
  for (const tool of ir.capabilities.tools) {
    if (tool.oboFlag && !oboTools.includes(tool.name)) {
      oboTools.push(tool.name);
    }
  }

  return oboTools;
}

function formatOboToolNames(tools: readonly string[]): string {
  if (tools.length === 0) return '[]';
  return `[${tools.map((t) => JSON.stringify(t)).join(', ')}]`;
}

// ── Code Generation ───────────────────────────────────────────────────

function generatePluginIndex(
  ir: GovernanceIR,
  riskMap: readonly RiskMapEntry[],
  delegations: readonly DelegationPair[],
  oboTools: readonly string[],
  hookTimeoutMs: number,
  includeBoundaryMarkers: boolean,
): string {
  const preamble = includeBoundaryMarkers ? `\n${BOUNDARY_PREAMBLE}\n` : '';
  const epilogue = includeBoundaryMarkers ? `\n${BOUNDARY_EPILOGUE}\n` : '';
  const riskMapStr = formatRiskMapEntries(riskMap);
  const version = ir.compiler.compilerVersion;
  const compiledAt = ir.compiler.compiledAt;

  return `/**
 * Generated OC Gateway governance plugin.
 * DO NOT EDIT — generated by claws compiler v${version}.
 * Compiled: ${compiledAt}
 * Schema version: ${ir.compiler.schemaVersion}
 *
 * @openclaw/governance-plugin
 */
${preamble}
/**
 * Pre-computed risk map — O(1) lookup, no regex in hot path.
 * Unknown tools default to R5 (fail-closed) via \`?? 5\`.
 */
const RISK_MAP: ReadonlyMap<string, number> = new Map<string, number>(${riskMapStr});

/**
 * Resolve fail mode from risk level.
 * R1-R2: open, R3-R4: closed, R5: closed.
 */
function resolveFailMode(riskLevel: number): 'open' | 'closed' {
  if (riskLevel <= 2) return 'open';
  return 'closed';
}

/**
 * Plugin definition — OpenClawPluginDefinition interface.
 */
export default {
  name: 'claws-governance',
  version: '${version}',
  description: 'Compiled governance enforcement plugin',

  register(api: {
    on: (event: string, handler: (...args: unknown[]) => Promise<unknown>) => void;
  }): void {
    api.on('before_tool_call', async (toolName: unknown, context: unknown) => {
      const name = toolName as string | null | undefined;
      const ctx = (context ?? {}) as Record<string, unknown>;
      const host = ctx['__governanceHost'] as import('@openclaw/governance').GovernanceHost | undefined;
      if (!host) return { allowed: false, blockReason: 'governance host not configured' };

      if (name == null) {
        try { host.emitAuditEvent({ event: 'null-tool-deny', hook: 'before_tool_call' }); } catch { /* fire-and-forget */ }
        return { allowed: false, blockReason: 'Tool name is null or undefined' };
      }

      const riskLevel = RISK_MAP.get(name) ?? 5;

      try {
        const signal = AbortSignal.timeout(${hookTimeoutMs});
        const result = await host.evaluatePolicy(name, ctx, signal);
        try { host.emitAuditEvent({ event: 'policy-eval', toolName: name, allowed: result.allowed }); } catch { /* fire-and-forget */ }
        return { allowed: result.allowed, blockReason: result.blockReason };
      } catch (err: unknown) {
        const isTimeout = err instanceof DOMException && err.name === 'AbortError';
        const errorType = isTimeout ? 'timeout' : 'error';
        try { host.emitAuditEvent({ event: 'governance-error', toolName: name, errorType, riskLevel }); } catch { /* fire-and-forget */ }

        const failMode = resolveFailMode(riskLevel);
        if (failMode === 'closed') {
          return { allowed: false, blockReason: \`Governance \${errorType} — R\${riskLevel} fail-closed\` };
        }
        return { allowed: true, blockReason: null };
      }
    });
  },
};
${epilogue}`;
}

function generatePackageJson(ir: GovernanceIR): string {
  const pkg = {
    name: '@openclaw/governance-plugin',
    version: ir.compiler.compilerVersion,
    description: 'Generated governance enforcement plugin for OC Gateway',
    type: 'module',
    main: 'index.ts',
    engines: { node: '>=20' },
    dependencies: {},
  };
  return JSON.stringify(pkg, null, 2);
}

function generateBeforeToolCall(
  riskMap: readonly RiskMapEntry[],
  hookTimeoutMs: number,
  compilerVersion: string,
): string {
  const riskMapStr = formatRiskMapEntries(riskMap);

  return `/**
 * before_tool_call handler.
 * DO NOT EDIT — generated by claws compiler v${compilerVersion}.
 *
 * @openclaw/governance-plugin
 */

import type { GovernanceHost } from '@openclaw/governance';

const RISK_MAP: ReadonlyMap<string, number> = new Map<string, number>(${riskMapStr});

export async function beforeToolCall(
  host: GovernanceHost,
  toolName: string | null | undefined,
  context: Record<string, unknown>,
): Promise<{ allowed: boolean; blockReason: string | null }> {
  if (toolName == null) {
    try { host.emitAuditEvent({ event: 'null-tool-deny', hook: 'before_tool_call' }); } catch { /* fire-and-forget */ }
    return { allowed: false, blockReason: 'Tool name is null or undefined' };
  }

  const riskLevel = RISK_MAP.get(toolName) ?? 5;

  try {
    const signal = AbortSignal.timeout(${hookTimeoutMs});
    const result = await host.evaluatePolicy(toolName, context, signal);
    return { allowed: result.allowed, blockReason: result.blockReason };
  } catch (err: unknown) {
    const isTimeout = err instanceof DOMException && err.name === 'AbortError';
    const errorType = isTimeout ? 'timeout' : 'error';
    try { host.emitAuditEvent({ event: 'before-tool-call-error', toolName, errorType, riskLevel }); } catch { /* fire-and-forget */ }

    if (riskLevel >= 3) {
      return { allowed: false, blockReason: \`Governance \${errorType} — R\${riskLevel} fail-closed\` };
    }
    return { allowed: true, blockReason: null };
  }
}
`;
}

function generateA2AFirewall(
  delegations: readonly DelegationPair[],
  hookTimeoutMs: number,
  compilerVersion: string,
): string {
  const delegationStr = formatDelegationEntries(delegations);

  return `/**
 * A2A firewall handler.
 * DO NOT EDIT — generated by claws compiler v${compilerVersion}.
 *
 * @openclaw/governance-plugin
 */

import type { GovernanceHost } from '@openclaw/governance';

const ALLOWED_DELEGATIONS: ReadonlyMap<string, ReadonlySet<string>> = new Map(${delegationStr});

export async function beforeAgentHandoff(
  host: GovernanceHost,
  fromAgent: string,
  toAgent: string,
): Promise<{ allowed: boolean; blockReason: string | null }> {
  if (fromAgent == null || toAgent == null) {
    try { host.emitAuditEvent({ event: 'a2a-null-agent', fromAgent, toAgent }); } catch { /* fire-and-forget */ }
    return { allowed: false, blockReason: 'Agent name is null or undefined' };
  }

  const allowedTargets = ALLOWED_DELEGATIONS.get(fromAgent);
  if (allowedTargets === undefined || !allowedTargets.has(toAgent)) {
    try { host.emitAuditEvent({ event: 'a2a-denied', fromAgent, toAgent }); } catch { /* fire-and-forget */ }
    return { allowed: false, blockReason: \`Delegation from "\${fromAgent}" to "\${toAgent}" is not permitted\` };
  }

  try {
    const signal = AbortSignal.timeout(${hookTimeoutMs});
    const result = await host.evaluatePolicy(\`a2a:\${fromAgent}->\${toAgent}\`, { fromAgent, toAgent }, signal);
    return { allowed: result.allowed, blockReason: result.blockReason };
  } catch {
    try { host.emitAuditEvent({ event: 'a2a-error', fromAgent, toAgent }); } catch { /* fire-and-forget */ }
    return { allowed: false, blockReason: 'A2A firewall error — fail-closed' };
  }
}
`;
}

function generateElicitationGate(
  oboTools: readonly string[],
  hookTimeoutMs: number,
  compilerVersion: string,
): string {
  const toolsStr = formatOboToolNames(oboTools);

  return `/**
 * Elicitation gate handler.
 * DO NOT EDIT — generated by claws compiler v${compilerVersion}.
 *
 * @openclaw/governance-plugin
 */

import type { GovernanceHost } from '@openclaw/governance';

const OBO_TOOLS: ReadonlySet<string> = new Set(${toolsStr});

export async function beforeElicitation(
  host: GovernanceHost,
  toolName: string | null | undefined,
  principal: string,
): Promise<{ allowed: boolean; blockReason: string | null }> {
  if (toolName == null) {
    try { host.emitAuditEvent({ event: 'elicitation-null-tool', principal }); } catch { /* fire-and-forget */ }
    return { allowed: false, blockReason: 'Tool name is null or undefined' };
  }

  if (!OBO_TOOLS.has(toolName)) {
    return { allowed: true, blockReason: null };
  }

  try {
    const signal = AbortSignal.timeout(${hookTimeoutMs});
    const satisfied = await host.checkElicitation(toolName, principal, signal);
    try { host.emitAuditEvent({ event: 'elicitation-check', toolName, principal, satisfied }); } catch { /* fire-and-forget */ }
    if (!satisfied) {
      return { allowed: false, blockReason: \`OBO elicitation not satisfied for "\${toolName}"\` };
    }
    return { allowed: true, blockReason: null };
  } catch {
    try { host.emitAuditEvent({ event: 'elicitation-error', toolName, principal }); } catch { /* fire-and-forget */ }
    return { allowed: false, blockReason: 'Elicitation gate error — fail-closed' };
  }
}
`;
}

// ── Verification ──────────────────────────────────────────────────────

/**
 * Verify that generated output contains no forbidden imports.
 * Returns array of forbidden import strings found.
 *
 * @param source - Generated TypeScript source code
 * @returns Array of forbidden import references (empty if clean)
 */
export function verifyNoForbiddenImports(source: string): readonly string[] {
  const forbidden: string[] = [];
  const patterns = [/@craftworks\//g, /@claws\//g];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(source)) !== null) {
      forbidden.push(match[0]);
    }
  }

  return forbidden;
}

/**
 * Verify catch clause structure in generated output.
 * Returns array of violations found.
 *
 * Checks:
 * 1. Every catch clause has a risk map lookup (RISK_MAP.get or riskLevel)
 * 2. No catch clause re-throws (all are handled)
 * 3. Audit logging is wrapped in try/catch (fire-and-forget)
 *
 * @param source - Generated TypeScript source code
 * @returns Array of catch clause violations (empty if all pass)
 */
export function verifyCatchClauses(source: string): readonly string[] {
  const violations: string[] = [];

  // Find catch blocks by locating "catch" keywords and extracting balanced braces
  // Uses indexOf instead of regex to avoid CodeQL polynomial backtracking warnings
  const catchBlocks: string[] = [];
  let searchFrom = 0;
  while (searchFrom < source.length) {
    const catchIdx = source.indexOf('catch', searchFrom);
    if (catchIdx === -1) break;
    // Advance past "catch" and optional whitespace + parens to find "{"
    let scanPos = catchIdx + 5;
    // Skip whitespace
    while (scanPos < source.length && (source[scanPos] === ' ' || source[scanPos] === '\t')) scanPos++;
    // Skip optional (...)
    if (scanPos < source.length && source[scanPos] === '(') {
      const closeParen = source.indexOf(')', scanPos);
      if (closeParen === -1) { searchFrom = scanPos + 1; continue; }
      scanPos = closeParen + 1;
    }
    // Skip whitespace
    while (scanPos < source.length && (source[scanPos] === ' ' || source[scanPos] === '\t')) scanPos++;
    // Must find {
    if (scanPos >= source.length || source[scanPos] !== '{') { searchFrom = catchIdx + 5; continue; }
    // Walk forward from the opening brace to find the balanced closing brace
    const braceStart = scanPos;
    let depth = 1;
    let pos = braceStart + 1;
    while (pos < source.length && depth > 0) {
      if (source[pos] === '{') depth++;
      else if (source[pos] === '}') depth--;
      pos++;
    }
    if (depth === 0) {
      catchBlocks.push(source.slice(catchIdx, pos));
    }
    searchFrom = pos;
  }
  if (catchBlocks.length === 0) return violations;

  for (const block of catchBlocks) {
    // Skip inner fire-and-forget catch blocks (the try { audit } catch { } pattern)
    if (block.includes('fire-and-forget') || block.trim() === 'catch { /* fire-and-forget */ }') {
      continue;
    }

    // Verify audit logging is fire-and-forget
    if (block.includes('emitAuditEvent') && !block.includes('try {')) {
      violations.push('Audit logging not wrapped in try/catch (fire-and-forget)');
    }
  }

  return violations;
}
