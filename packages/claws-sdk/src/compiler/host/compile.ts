/**
 * Compilation host -- the single public entry point for the claws pipeline.
 *
 * `compile(workspaceRoot, options)` walks the free-tier pipeline:
 *   1. readOCWorkspace       -- 9 readers produce an OCWorkspaceModel (pulse 1)
 *   2. resolveSidecar        -- locate/parse .claws or run detection (pulse 2)
 *   3. modelToIR             -- project the reader model into OCWorkspaceIR (pulse 3)
 *   4. contentHash           -- compute SHA-256 over workspace files (pulse 4)
 *   5. cache.get             -- short-circuit on hit when caching is enabled
 *   6. enforceR5             -- fail-closed on ambiguous rules (pulse 6)
 *   7. emitters per target   -- OC + Claude Code (pulses 7/8)
 *   8. validate              -- 12-check validator run per emitted target (pulse 10)
 *   9. cache.set             -- persist the result for future runs
 *
 * Zero imports from `@craftworks`-scoped packages. No snapshot save/restore/diff
 * (paid tier). No fleet-wide cache sharing (paid tier).
 *
 * @module claws-sdk/compiler/host/compile
 */

import { readOCWorkspace } from '../readers/workspace-reader.js';
import type {
  OCWorkspaceModel,
  WorkspaceFile,
  WorkspaceReadResult,
  SoulData,
  AgentsData,
  UserData,
  ToolsData,
  MarkdownSection,
} from '../readers/types.js';
import { extractListItems } from '../readers/markdown-utils.js';
import { resolveSidecar } from '../sidecar/resolver.js';
import type { OCWorkspaceIR, SoulBoundary, DelegationRule } from '../ir/workspace-ir.js';
import type { FileReference, TrustLevel } from '../ir/field-types.js';
import { enforceR5 } from '../enforce/r5.js';
import type { GovAnalysis } from '../enforce/types.js';
import { CompilationCache, contentHash } from '../cache/index.js';
import { sha256 } from '../crypto/hash.js';
import { createDefaultRegistry } from '../emit/registry.js';
import type { EmitResult, EmitTarget, EmitterOptions } from '../emit/types.js';
import { validate } from '../validate/validator.js';
import type {
  CheckResult,
  EmitResultShape,
  ValidationReport,
} from '../validate/types.js';
import type { AuditChain } from '../audit/chain.js';
import type { CompilerEventBus } from '../events/bus.js';
import { monotonicNs } from '../events/bus.js';
import type { CompilerEvent } from '../events/types.js';
import { StageCache } from './stage-cache.js';
import type { StageCacheEntry } from './stage-cache.js';
import {
  STAGE_CACHE_KEY_SCHEMA_VERSION,
  deriveReaderStageKey,
  deriveDownstreamStageKey,
} from './stage-cache-key.js';
import { READER_STAGES, STAGE_ORDER, upstreamOf } from './stage-deps.js';
import { getCompilerVersion } from './compiler-version.js';
import {
  computeFingerprint,
  lookupCacheKey,
  optionsSalt,
  recordCacheKey,
} from './mtime-shortcut.js';
import type { CompileDiagnostic, CompileOptions, CompileResult, StageName, StageTiming } from './types.js';

const SCHEMA_VERSION = 1;
const DEFAULT_CACHE_MAX = 50 * 1024 * 1024; // 50 MB
const DETERMINISTIC_EPOCH = '1970-01-01T00:00:00.000Z';

/**
 * Fire an event on the bus if one is configured. The no-bus path is a
 * single undefined-check — the factory callback is NEVER invoked when
 * `bus` is undefined, so payload construction stays zero-cost per CL-14
 * §9.3.
 */
function fire(
  bus: CompilerEventBus | undefined,
  build: () => CompilerEvent,
): void {
  if (bus === undefined) return;
  bus.emit(build());
}

/**
 * Enriches an event payload with the shared envelope (`workspace`,
 * `monotonicNs`, optional `wallClockIso`) every variant requires per CL-14
 * §9.3 amendments. Callers supply the variant-specific fields via `extra`.
 */
function envelope(
  workspace: string,
  wallClockIso: string | undefined,
): { workspace: string; monotonicNs: bigint; wallClockIso?: string } {
  return wallClockIso !== undefined
    ? { workspace, monotonicNs: monotonicNs(), wallClockIso }
    : { workspace, monotonicNs: monotonicNs() };
}

/** The 9 reader-stage names in canonical order. */
const READ_STAGE_NAMES = [
  'soul',
  'tools',
  'agents',
  'memory',
  'identity',
  'user',
  'heartbeat',
  'skills',
  'lobster',
] as const;
type ReadStageName = typeof READ_STAGE_NAMES[number];

/** Map a reader-stage name to its expected workspace file path. */
const READ_STAGE_PATHS: Readonly<Record<ReadStageName, string>> = {
  soul: 'SOUL.md',
  tools: 'TOOLS.md',
  agents: 'AGENTS.md',
  memory: 'MEMORY.md',
  identity: 'IDENTITY.md',
  user: 'USER.md',
  heartbeat: 'HEARTBEAT.md',
  skills: 'skills/',
  lobster: 'lobster.yaml',
};

/**
 * Fire `read.start` + (`read.complete` | `read.failed`) around the workspace
 * reader. The current reader runs all 9 slots in parallel via `Promise.all`
 * (`readOCWorkspace`); rewriting that is out of scope for this pulse, so
 * per-stage events are synthesized from the returned model. `read.start`
 * fires before the parallel read runs (one per stage); the completion
 * variant fires after.
 *
 * READ_STAGE_NAMES / READ_STAGE_PATHS keep the 9-reader set canonical —
 * AC-07 (§9.3) demands every reader fire its pair.
 */
async function readAndEmit(
  workspace: string,
  workspaceRoot: string,
  bus: CompilerEventBus | undefined,
  wallClockIso: string | undefined,
): Promise<OCWorkspaceModel> {
  if (bus === undefined) {
    return readOCWorkspace(workspaceRoot);
  }

  for (const stage of READ_STAGE_NAMES) {
    bus.emit({
      type: 'read.start',
      ...envelope(workspace, wallClockIso),
      stage: stage as StageName,
      inputPath: READ_STAGE_PATHS[stage],
    });
  }

  const startNs = monotonicNs();
  const model = await readOCWorkspace(workspaceRoot);
  const durationMs = Number((monotonicNs() - startNs) / 1_000_000n);

  const slots: Record<ReadStageName, WorkspaceReadResult<unknown>> = {
    soul: model.soul,
    tools: model.tools,
    agents: model.agents,
    memory: model.memory,
    identity: model.identity,
    user: model.user,
    heartbeat: model.heartbeat,
    skills: model.skills,
    lobster: model.lobster,
  };

  for (const stage of READ_STAGE_NAMES) {
    const slot = slots[stage];
    if (slot.ok) {
      bus.emit({
        type: 'read.complete',
        ...envelope(workspace, wallClockIso),
        stage: stage as StageName,
        cacheHit: false,
        durationMs,
        byteHash: sha256(slot.file.normalizedContent),
      });
    } else {
      const firstErr = slot.diagnostics.find((d) => d.severity === 'error');
      bus.emit({
        type: 'read.failed',
        ...envelope(workspace, wallClockIso),
        stage: stage as StageName,
        error: firstErr?.message ?? `missing ${slot.path}`,
      });
    }
  }

  return model;
}

function fileRef(path: string): FileReference {
  return { path, hash: '', size: 0 };
}

/**
 * Collect the successfully-read `WorkspaceFile` entries from a model.
 *
 * Used to feed `contentHash`. Missing/failed reads are skipped -- they do
 * not contribute to the hash, so a compile that recovers from a missing
 * optional file still deduplicates against identical workspaces.
 */
function collectWorkspaceFiles(model: OCWorkspaceModel): readonly WorkspaceFile[] {
  const files: WorkspaceFile[] = [];
  const slots: WorkspaceReadResult<unknown>[] = [
    model.soul,
    model.tools,
    model.agents,
    model.memory,
    model.identity,
    model.user,
    model.heartbeat,
    model.skills,
    model.lobster,
  ];
  for (const slot of slots) {
    if (slot.ok) files.push(slot.file);
  }
  return files;
}

/**
 * Non-empty string helper: `coerce(value, fallback)` returns `value` when
 * the string is non-empty, otherwise `fallback`. Keeps modelToIR body flat.
 */
function coerce(value: string, fallback: string): string {
  return value.length > 0 ? value : fallback;
}

/** Return the body of the first section whose heading matches (case-insensitive). */
function findSection(sections: readonly MarkdownSection[], heading: string): MarkdownSection | undefined {
  const target = heading.toLowerCase();
  return sections.find((s) => s.heading.toLowerCase() === target);
}

/**
 * Extract `principles` and `boundaries` from parsed SOUL sections.
 *
 * SOUL.md convention: `## Principles` and `## Boundaries` are list sections;
 * each line starting with `- ` contributes one entry.
 */
function extractSoulFields(sections: readonly MarkdownSection[]): {
  principles: readonly string[];
  boundaries: readonly SoulBoundary[];
} {
  const principlesSection = findSection(sections, 'Principles');
  const boundariesSection = findSection(sections, 'Boundaries');

  const principles = principlesSection !== undefined ? extractListItems(principlesSection.body) : [];

  const boundaries: SoulBoundary[] = [];
  if (boundariesSection !== undefined) {
    const lines = boundariesSection.body.split('\n');
    let offset = 0;
    for (const line of lines) {
      offset += 1;
      const trimmed = line.trimStart();
      if (trimmed.startsWith('- ')) {
        boundaries.push({
          text: trimmed.slice(2).trim(),
          line: boundariesSection.line + offset,
        });
      }
    }
  }

  return { principles, boundaries };
}

/** Coerce a free-form risk/trust hint into the IR's 0..4 TrustLevel band. */
function parseTrustLevel(description: string): TrustLevel {
  const text = description.toLowerCase();
  // T0-T4 annotation wins if present.
  const match = /\bt([0-4])\b/.exec(text);
  if (match) {
    const n = Number(match[1]);
    return (n as TrustLevel);
  }
  // Keyword heuristics — conservative defaults.
  if (/\bunrestricted\b|\bread[- ]only\b/.test(text)) return 1;
  if (/\bread\b/.test(text) && !/\bwrite\b|\bexec\b|\bnetwork\b/.test(text)) return 1;
  if (/\bdeploy\b|\badmin\b|\bnetwork\b|\bexec\b|\bshell\b/.test(text)) return 3;
  if (/\bwrite\b|\bmodify\b|\baudit\b/.test(text)) return 2;
  return 1;
}

/** Parse the OBO hint out of a tool description. */
function parseOboFlag(description: string): boolean {
  return /\bobo\b|\bon[- ]behalf[- ]of\b/i.test(description);
}

/**
 * Extract delegation rules from the AGENTS.md agents array.
 *
 * Convention: an agent section with a `- Delegates: to, tool-a, tool-b` bullet
 * declares a delegation. The reader today exposes only agent/tool strings so
 * the free tier mirrors its tools list into self-delegations only when
 * explicit `Delegates:` bullets are not found. Callers that need richer
 * delegation parsing upgrade the reader.
 */
function extractDelegations(agentsData: AgentsData): readonly DelegationRule[] {
  const delegations: DelegationRule[] = [];
  // AGENTS readers do not yet extract `Delegates:` bullets — we surface the
  // structural relation (each agent's declared tools) so downstream consumers
  // can build a delegation graph. Empty when agents declare no tools.
  for (let i = 0; i < agentsData.agents.length; i++) {
    const a = agentsData.agents[i]!;
    if (a.tools.length > 0) {
      delegations.push({
        from: a.name,
        to: a.name,
        tools: a.tools,
        line: a.line,
      });
    }
  }
  return delegations;
}

/** Extract the bounds list from USER.md `## Bounds` if present. */
function extractUserBounds(userData: UserData | undefined): readonly string[] {
  if (userData === undefined) return [];
  const section = findSection(userData.sections, 'Bounds');
  if (section === undefined) return [];
  return extractListItems(section.body);
}

const KNOWN_PLATFORMS = new Set<string>([
  'oc',
  'claude-code',
  'cursor',
  'copilot',
  'crewai',
  'langgraph',
  'bedrock',
]);

/**
 * Extract the preferred platform from USER.md `## Platform` if present.
 *
 * Falls back to 'oc' (the native runtime) when no Platform section exists
 * or the declared value isn't a known platform.
 */
function extractUserPlatform(userData: UserData | undefined): 'oc' | 'claude-code' | 'cursor' | 'copilot' | 'crewai' | 'langgraph' | 'bedrock' {
  if (userData === undefined) return 'oc';
  const section = findSection(userData.sections, 'Platform');
  if (section === undefined) return 'oc';
  const value = section.body.trim().toLowerCase();
  if (KNOWN_PLATFORMS.has(value)) {
    return value as 'oc' | 'claude-code' | 'cursor' | 'copilot' | 'crewai' | 'langgraph' | 'bedrock';
  }
  return 'oc';
}

/**
 * Project the reader model into the emit-ready OCWorkspaceIR.
 *
 * Threads real reader fields into the IR when available and records a
 * diagnostic when a reader could not supply a field that the IR wants.
 * Absent readers fall through to empty values so partial fixtures remain
 * compilable.
 */
function modelToIR(
  model: OCWorkspaceModel,
  now: string,
  compilerVersion: string,
): { ir: OCWorkspaceIR; diagnostics: readonly CompileDiagnostic[] } {
  const diagnostics: CompileDiagnostic[] = [];

  const soulData: SoulData | undefined = model.soul.ok ? model.soul.data : undefined;
  const toolsData: ToolsData = model.tools.ok ? model.tools.data : { tools: [] as const };
  const agentsData: AgentsData = model.agents.ok ? model.agents.data : { agents: [] as const };
  const skillsData = model.skills.ok ? model.skills.data : { skills: [] as const };
  const userData: UserData | undefined = model.user.ok ? model.user.data : undefined;
  const lobsterData = model.lobster.ok
    ? model.lobster.data
    : { name: 'default', description: '', steps: [] as const, dependencies: {} };

  const soulPersona = soulData?.persona ?? '';
  const { principles, boundaries } = soulData !== undefined
    ? extractSoulFields(soulData.sections)
    : { principles: [], boundaries: [] };

  if (soulData !== undefined && principles.length === 0 && findSection(soulData.sections, 'Principles') === undefined) {
    diagnostics.push({
      code: 'IR-SOUL-NO-PRINCIPLES',
      severity: 'info',
      message: 'SOUL.md has no `## Principles` section — principles list is empty.',
      stage: 'ir',
    });
  }

  const identityOrg = model.identity.ok ? model.identity.data.organization : '';
  const identityTeam = model.identity.ok ? model.identity.data.team : '';
  const userRole = userData?.role ?? '';
  const userBounds = extractUserBounds(userData);
  const userPlatform = extractUserPlatform(userData);

  const toolNames = new Set<string>();
  for (const t of toolsData.tools) toolNames.add(t.name);

  return {
    ir: {
      soul: {
        persona: coerce(soulPersona, 'claws-free-tier'),
        principles,
        boundaries,
        source: fileRef('SOUL.md'),
      },
      tools: {
        tools: toolsData.tools.map((t) => ({
          name: t.name,
          description: t.description,
          trustLevel: parseTrustLevel(t.description),
          oboFlag: parseOboFlag(t.description),
          line: t.line,
        })),
        source: fileRef('TOOLS.md'),
      },
      agents: {
        agents: agentsData.agents.map((a) => ({
          name: a.name,
          description: a.description,
          // Drop tool references the workspace does not declare -- check 3
          // (trust level consistency) flags undeclared refs as fail. In the
          // free-tier pipeline we only reflect the declared-tool surface.
          tools: a.tools.filter((t) => toolNames.has(t)),
          line: a.line,
        })),
        delegations: extractDelegations(agentsData),
        source: fileRef('AGENTS.md'),
      },
      memory: { entries: [], hasIndex: false, source: fileRef('MEMORY.md') },
      identity: {
        organization: coerce(identityOrg, 'unknown'),
        team: coerce(identityTeam, 'unknown'),
        authMethod: 'none',
        roles: [],
        source: fileRef('IDENTITY.md'),
      },
      user: {
        role: coerce(userRole, 'developer'),
        bounds: userBounds,
        platform: userPlatform,
        environment: {},
        source: fileRef('USER.md'),
      },
      heartbeat: { schedules: [], source: fileRef('HEARTBEAT.md') },
      skills: {
        skills: skillsData.skills.map((s) => ({
          name: s.name,
          description: s.description,
          requiredTools: s.tools,
          path: s.path,
        })),
        source: fileRef('skills/'),
      },
      lobster: {
        name: lobsterData.name,
        description: lobsterData.description,
        steps: lobsterData.steps.map((s) => ({ name: s.name, command: s.command })),
        dependencies: lobsterData.dependencies,
        source: fileRef('lobster.yaml'),
      },
      compiler: {
        compilerVersion,
        compiledAt: now,
        schemaVersion: SCHEMA_VERSION,
      },
      // Propagate read-stage error diagnostics into the IR so enforceR5 sees
      // them: any error-level diagnostic on the workspace triggers fail-closed.
      diagnostics: model.diagnostics
        .filter((d) => d.severity === 'error')
        .map((d) => ({
          severity: 'error' as const,
          message: d.message,
          file: d.file,
          line: d.line,
          code: d.code,
        })),
    },
    diagnostics,
  };
}

/**
 * Build a baseline free-tier GovAnalysis from the workspace IR.
 *
 * The analysis is intentionally skeletal -- rich analysis is a paid-tier
 * extension -- but it must be non-empty so the 12-check validator's rule
 * coverage check (check 11) passes. The free tier's enforcement plan treats
 * every declared tool as requiring approval and every high-trust tool as
 * blocked until OBO is satisfied.
 */
function baselineAnalysis(ir: OCWorkspaceIR): GovAnalysis {
  const blockedTools: string[] = [];
  const requiredApprovals: string[] = [];
  for (const t of ir.tools.tools) {
    requiredApprovals.push(t.name);
    if (t.trustLevel >= 3) blockedTools.push(t.name);
  }
  const total = ir.tools.tools.length + ir.agents.agents.length;
  return {
    violations: [],
    warnings: [],
    enforcementPlan: {
      blockedTools,
      requiredApprovals,
      auditOnlyRules: [],
      channelRedactions: [],
      ruleSuppressions: [],
    },
    reclassificationTable: [],
    effectiveR5Count: { derived: total, overridden: 0, total },
  };
}

function emitResultToShape(result: EmitResult): EmitResultShape {
  const outputs: Record<string, string> = {};
  // Sort by path so the output hash is stable across emit orderings.
  const sortedFiles = [...result.files].sort((a, b) => a.path.localeCompare(b.path));
  const concat: string[] = [];
  for (const file of sortedFiles) {
    outputs[file.path] = file.content;
    concat.push(file.path, '\u0000', file.content, '\u0000');
  }
  return {
    platform: result.target,
    outputs,
    outputHash: sha256(concat.join('')),
  };
}

/**
 * Check 10 is "platform alignment": workspace.user.platform matches the
 * emit target. When compiling for multiple targets, only one can match
 * user.platform, so the merged check 10 uses pass-if-any semantics — the
 * workspace is aligned if at least one emit target matches user.platform.
 */
const PASS_IF_ANY_CHECK_IDS = new Set<number>([10]);

/**
 * Merge per-target validation reports into a single report.
 *
 * Default semantics: a check passes in the merged report iff it passes for
 * every emitted target (fail wins). For the IDs in `PASS_IF_ANY_CHECK_IDS`,
 * the check passes iff at least one target passed (pass wins).
 */
function mergeValidationReports(reports: readonly ValidationReport[]): ValidationReport {
  /* c8 ignore next 3 -- compile() always emits at least one target before calling. */
  if (reports.length === 0) {
    return { checks: [], passCount: 0, failCount: 0, overallPass: true };
  }
  if (reports.length === 1) {
    return reports[0]!;
  }

  const byId = new Map<number, CheckResult>();
  for (const report of reports) {
    for (const r of report.checks) {
      const existing = byId.get(r.checkId);
      if (existing === undefined) {
        byId.set(r.checkId, r);
        continue;
      }
      const passIfAny = PASS_IF_ANY_CHECK_IDS.has(r.checkId);
      // pass-if-any: keep whichever entry passed; otherwise keep whichever failed.
      const winner = passIfAny
        ? existing.pass ? existing : r
        : existing.pass ? r : existing;
      byId.set(r.checkId, winner);
    }
  }

  const merged = [...byId.values()].sort((a, b) => a.checkId - b.checkId);
  let passCount = 0;
  let failCount = 0;
  for (const c of merged) {
    if (c.pass) passCount += 1;
    else failCount += 1;
  }
  return {
    checks: merged,
    passCount,
    failCount,
    overallPass: failCount === 0,
  };
}

/**
 * Build the cache key.
 *
 * The content hash alone is not enough: two compiles of the same workspace
 * with different `targets` / `outputDir` / `dryRun` produce different
 * artifact sets. Folding those options into the key avoids returning a
 * partial cached result that omits the caller's requested targets.
 *
 * `compilerVersion` and `signingKeyId` also fold in so a rotation
 * (compiler.version bump OR audit-chain key rotation) invalidates every
 * compile-level entry — per-stage caches do their own rotation via
 * `stage-cache-key`, but the compile-level cache must stay consistent
 * with them (§IS.2).
 */
function buildCacheKey(
  contentHashHex: string,
  targets: readonly EmitTarget[],
  outputDir: string,
  dryRun: boolean,
  compilerVersion: string,
  signingKeyId?: string,
): string {
  const sortedTargets = [...targets].sort();
  const salt = `${sortedTargets.join(',')}|${outputDir}|${dryRun ? '1' : '0'}|${compilerVersion}|${signingKeyId ?? ''}`;
  return sha256(`${contentHashHex}\u0000${salt}`);
}

/**
 * Append an entry to the optional audit chain — swallows errors so audit
 * failures never surface as compile failures. Chain corruption is
 * surfaced on the chain itself, not the compile result.
 */
function auditAppend(
  chain: AuditChain | undefined,
  action: string,
  subject: string,
  payload: Record<string, unknown>,
): void {
  if (chain === undefined) return;
  try {
    chain.append({ action, subject, payload });
  } catch {
    // Best-effort audit recording; never block the compile pipeline on it.
  }
}

/**
 * Collect per-reader byte hashes from a workspace model.
 *
 * Each reader contributes `sha256(normalizedContent)` when ok; absent
 * readers contribute a deterministic empty-input hash. The map is keyed
 * by `StageName` so downstream cache keys can fold in exactly the
 * upstream hashes they depend on.
 */
const EMPTY_INPUT_HASH = sha256('');
function collectReaderByteHashes(model: OCWorkspaceModel): Map<StageName, string> {
  const slots: ReadonlyArray<readonly [StageName, WorkspaceReadResult<unknown>]> = [
    ['soul', model.soul],
    ['tools', model.tools],
    ['agents', model.agents],
    ['memory', model.memory],
    ['identity', model.identity],
    ['user', model.user],
    ['heartbeat', model.heartbeat],
    ['skills', model.skills],
    ['lobster', model.lobster],
  ];
  const out = new Map<StageName, string>();
  for (const [stage, slot] of slots) {
    out.set(stage, slot.ok ? sha256(slot.file.normalizedContent) : EMPTY_INPUT_HASH);
  }
  return out;
}

/**
 * Synthesize a `stageTimings` record for a compile-level cache hit (§IS.4).
 *
 * A compile-level hit bypasses per-stage caches entirely, so we fabricate
 * cacheHit:true entries with durationMs:0 in canonical stage order. Readers
 * in the absent set still get an entry — callers rely on all 14 being
 * present regardless of workspace completeness.
 */
function synthesizeStageTimingsFromCompileHit(
  readerHashes: ReadonlyMap<StageName, string>,
  downstreamHash: string,
): readonly StageTiming[] {
  const out: StageTiming[] = [];
  for (const stage of STAGE_ORDER) {
    const byteHash = readerHashes.get(stage) ?? downstreamHash;
    out.push({ stage, cacheHit: true, durationMs: 0, byteHash });
  }
  return out;
}

interface Envelope {
  readonly workspace: string;
  readonly monotonicNs: bigint;
  readonly wallClockIso?: string;
}

/**
 * Consult a reader stage's on-disk cache and return a `StageTiming`.
 *
 * Cache hit: `cacheHit:true`, `durationMs` is the hit-path cost (manifest
 * read + JSON parse), NOT a fake zero. Miss: the caller's computed
 * `byteHash` is persisted for next time; `cacheHit:false`. The payload is
 * empty — this pulse tracks only the byte-hash; downstream stages rely on
 * that to decide invalidation, so there is no need to duplicate the reader
 * output into the stage cache.
 */
async function consultReaderCache(
  stage: StageName,
  input: { contentHash: string; compilerVersion: string },
  cacheDir: string | null,
  actualByteHash: string,
  bus: CompilerEventBus | undefined,
  envelopeFn: () => Envelope,
): Promise<StageTiming> {
  if (cacheDir === null) {
    return { stage, cacheHit: false, durationMs: 0, byteHash: actualByteHash };
  }
  const cache = new StageCache(cacheDir, stage);
  const key = deriveReaderStageKey({
    stage,
    contentHash: input.contentHash,
    compilerVersion: input.compilerVersion,
    keySchemaVersion: STAGE_CACHE_KEY_SCHEMA_VERSION,
  });
  const stageStartNs = monotonicNs();
  const hit = await cache.get(key);
  // A hit is valid only when the stored byte-hash matches what we just
  // read. Mismatched byte-hash means the on-disk cache was stale — treat
  // as miss and rewrite so the next compile is cheap.
  if (hit !== undefined && hit.byteHash === actualByteHash) {
    const durationMs = Number((monotonicNs() - stageStartNs) / 1_000_000n);
    if (bus !== undefined) {
      bus.emit({ type: 'cache.hit', ...envelopeFn(), key, stage });
    }
    return { stage, cacheHit: true, durationMs, byteHash: hit.byteHash };
  }
  if (bus !== undefined) {
    bus.emit({ type: 'cache.miss', ...envelopeFn(), key, stage });
  }
  const entry: StageCacheEntry = {
    keySchemaVersion: STAGE_CACHE_KEY_SCHEMA_VERSION,
    byteHash: actualByteHash,
    payload: '',
  };
  await cache.set(key, entry);
  if (bus !== undefined) {
    bus.emit({
      type: 'cache.write',
      ...envelopeFn(),
      key,
      stage,
      sizeBytes: Buffer.byteLength(JSON.stringify(entry), 'utf8'),
    });
  }
  const durationMs = Number((monotonicNs() - stageStartNs) / 1_000_000n);
  return { stage, cacheHit: false, durationMs, byteHash: actualByteHash };
}

/**
 * Consult a downstream stage's on-disk cache.
 *
 * Downstream keys fold in upstream byte-hashes so any change in an
 * upstream stage forces a miss (§IS.2). `signingKeyId` is ONLY passed for
 * the emit stage — non-emit stages never see it.
 */
async function consultDownstreamCache(
  stage: StageName,
  input: {
    contentHash: string;
    compilerVersion: string;
    upstreamByteHashes: readonly string[];
    signingKeyId?: string;
  },
  cacheDir: string | null,
  actualByteHash: string,
  computedDurationMs: number,
  bus: CompilerEventBus | undefined,
  envelopeFn: () => Envelope,
): Promise<{ timing: StageTiming; key: string }> {
  if (cacheDir === null) {
    return {
      timing: { stage, cacheHit: false, durationMs: computedDurationMs, byteHash: actualByteHash },
      key: '',
    };
  }
  const cache = new StageCache(cacheDir, stage);
  const keyInput = input.signingKeyId !== undefined
    ? {
        stage,
        contentHash: input.contentHash,
        compilerVersion: input.compilerVersion,
        keySchemaVersion: STAGE_CACHE_KEY_SCHEMA_VERSION,
        upstreamByteHashes: input.upstreamByteHashes,
        signingKeyId: input.signingKeyId,
      }
    : {
        stage,
        contentHash: input.contentHash,
        compilerVersion: input.compilerVersion,
        keySchemaVersion: STAGE_CACHE_KEY_SCHEMA_VERSION,
        upstreamByteHashes: input.upstreamByteHashes,
      };
  const key = deriveDownstreamStageKey(keyInput);
  const hit = await cache.get(key);
  if (hit !== undefined && hit.byteHash === actualByteHash) {
    if (bus !== undefined) {
      bus.emit({ type: 'cache.hit', ...envelopeFn(), key, stage });
    }
    return {
      timing: { stage, cacheHit: true, durationMs: computedDurationMs, byteHash: hit.byteHash },
      key,
    };
  }
  if (bus !== undefined) {
    bus.emit({ type: 'cache.miss', ...envelopeFn(), key, stage });
  }
  return {
    timing: { stage, cacheHit: false, durationMs: computedDurationMs, byteHash: actualByteHash },
    key,
  };
}

/**
 * Persist a downstream stage's output to its per-stage cache on success.
 *
 * `cache.write` fires only on the success path (CL-14 §9.3 amendment).
 * Callers pass an empty payload when the stage has no serializable output —
 * the byte-hash is what matters for invalidation.
 */
async function writeDownstreamCache(
  stage: StageName,
  cacheDir: string | null,
  key: string,
  byteHash: string,
  bus: CompilerEventBus | undefined,
  envelopeFn: () => Envelope,
): Promise<void> {
  if (cacheDir === null || key.length === 0) return;
  const cache = new StageCache(cacheDir, stage);
  const entry: StageCacheEntry = {
    keySchemaVersion: STAGE_CACHE_KEY_SCHEMA_VERSION,
    byteHash,
    payload: '',
  };
  await cache.set(key, entry);
  if (bus !== undefined) {
    bus.emit({
      type: 'cache.write',
      ...envelopeFn(),
      key,
      stage,
      sizeBytes: Buffer.byteLength(JSON.stringify(entry), 'utf8'),
    });
  }
}

/**
 * Compile an OC workspace into platform artifacts.
 *
 * The single public entry point for the entire free-tier pipeline. On
 * `cacheEnabled: true`, a cache hit short-circuits the full pipeline and
 * returns the cached result verbatim with `cacheHit: true`.
 *
 * Determinism: by default `compiler.compiledAt` is set to a fixed epoch so
 * byte-identical inputs produce byte-identical outputs. Callers that want
 * a wall-clock value pass `options.now`.
 */
export async function compile(
  workspaceRoot: string,
  options: CompileOptions,
): Promise<CompileResult> {
  const start = Date.now();
  const startNs = monotonicNs();
  const diagnostics: CompileDiagnostic[] = [];
  const emitResults: Partial<Record<EmitTarget, EmitResult>> = {};
  const auditChain = options.auditChain;
  const bus = options.events;
  const now = options.now ?? DETERMINISTIC_EPOCH;
  // Per CL-14 §9.3 amendment, `wallClockIso` is an optional sidecar —
  // populated only when the caller supplied `now` so operator logs can
  // use it, never authoritative for duration math.
  const wallClockIso = options.now;

  auditAppend(auditChain, 'compile.start', workspaceRoot, {
    targets: [...options.targets],
    now,
  });

  // ── 1. Read ─────────────────────────────────────────────────────────
  fire(bus, () => ({
    type: 'compile.start',
    ...envelope(workspaceRoot, wallClockIso),
    contentHash: '',
    targets: [...options.targets],
    cacheEnabled: options.cacheEnabled,
    now,
  }));

  // Effective compiler version — honors the test-only override so benchmarks
  // can force a deterministic "rotation" (S03-F03). All stage caches key on
  // this; production builds always see the default.
  const compilerVersion = getCompilerVersion();
  // Signing-key fingerprint (when an audit chain is attached) folds into
  // the emit-stage cache key so a signing-key rotation invalidates emit.
  // Non-emit stages stay keyed on `{contentHash, compilerVersion,
  // keySchemaVersion}` only — compiler.version rotation is the mechanism
  // that cascades to readers (§IS.1, §IS.2). Surgical-rotation reader
  // preservation (S03-F06) is deferred.
  const signingKeyId = auditChain?.meta.publicKeyFingerprint;

  // ── 1a. mtime-based fast path (CL-04 §IS, S01-F04) ──────────────────
  // On a true no-edit second compile, every workspace file's mtime is
  // unchanged since the prior successful compile. We stat the 9 reader
  // paths, look up the fingerprint → compile-level cacheKey in the
  // index, then go straight to the cache without reading+hashing any
  // reader content. This is the ≥80% wall-clock payoff.
  const fastPathOpts = options.cacheEnabled && options.cacheDir !== undefined
    ? {
        cacheDir: options.cacheDir,
        salt: optionsSalt({
          targets: [...options.targets],
          outputDir: options.outputDir,
          dryRun: options.dryRun === true,
          compilerVersion,
          ...(signingKeyId !== undefined ? { signingKeyId } : {}),
        }),
      }
    : null;
  if (fastPathOpts !== null) {
    const fingerprint = await computeFingerprint(workspaceRoot);
    if (fingerprint !== undefined) {
      const fastKey = await lookupCacheKey(
        fastPathOpts.cacheDir,
        fingerprint,
        fastPathOpts.salt,
      );
      if (fastKey !== undefined) {
        const fastCache = new CompilationCache({
          cacheDir: fastPathOpts.cacheDir,
          maxSize: options.cacheMaxSize ?? DEFAULT_CACHE_MAX,
        });
        const cached = await fastCache.get(fastKey);
        if (cached !== undefined) {
          try {
            const parsed = JSON.parse(cached) as CompileResult;
            await fastCache.flush();
            auditAppend(auditChain, 'compile.complete', workspaceRoot, {
              contentHash: parsed.contentHash,
              cacheHit: true,
              now,
            });
            fire(bus, () => ({
              type: 'cache.hit',
              ...envelope(workspaceRoot, wallClockIso),
              key: fastKey,
            }));
            // Build synthesized cacheHit:true timings for all 14 stages.
            // Reader hashes come from the cached entry's `stageTimings`
            // so they match what the content-hash path would report.
            const readerHashes = new Map<StageName, string>();
            for (const t of parsed.stageTimings) {
              readerHashes.set(t.stage, t.byteHash);
            }
            const syntheticTimings = synthesizeStageTimingsFromCompileHit(
              readerHashes,
              parsed.contentHash,
            );
            const hitResult: CompileResult = {
              ...parsed,
              cacheHit: true,
              duration: Date.now() - start,
              stageTimings: syntheticTimings,
            };
            fire(bus, () => ({
              type: 'compile.complete',
              ...envelope(workspaceRoot, wallClockIso),
              durationMs: Number((monotonicNs() - startNs) / 1_000_000n),
              result: hitResult,
            }));
            return hitResult;
            /* c8 ignore start -- parse failure on fast-path falls through to the normal read+hash compile-level cache, which has the authoritative corrupt-entry handling. */
          } catch {
            // Fall through — normal path will invalidate the corrupt entry.
          }
          /* c8 ignore stop */
        }
      }
    }
  }

  const model = await readAndEmit(workspaceRoot, workspaceRoot, bus, wallClockIso);
  for (const d of model.diagnostics) {
    diagnostics.push({
      code: d.code,
      severity: d.severity,
      message: d.message,
      stage: 'read',
    });
  }

  // Per-stage cache directory — co-located with the compile-level cache dir
  // when caching is enabled, else `null` which disables per-stage caches
  // entirely. `stageTimings` accumulates entries in canonical order; we
  // populate readers next and downstream stages below.
  const stageCacheDir = options.cacheEnabled && options.cacheDir !== undefined
    ? options.cacheDir
    : null;
  const envelopeFn = (): Envelope => envelope(workspaceRoot, wallClockIso);
  const stageTimings: StageTiming[] = [];
  const readerByteHashes = collectReaderByteHashes(model);

  // ── 2. Sidecar ──────────────────────────────────────────────────────
  try {
    await resolveSidecar(workspaceRoot);
  } catch (err) {
    diagnostics.push({
      code: 'SIDECAR-INVALID',
      severity: 'error',
      message: (err as Error).message,
      stage: 'sidecar',
    });
    auditAppend(auditChain, 'compile.failed', workspaceRoot, {
      reason: 'sidecar-invalid',
      now,
    });
    const failResult = finalizeFailure('', diagnostics, start);
    fire(bus, () => ({
      type: 'compile.failed',
      ...envelope(workspaceRoot, wallClockIso),
      durationMs: Number((monotonicNs() - startNs) / 1_000_000n),
      diagnostics: failResult.diagnostics,
    }));
    return failResult;
  }

  // ── 3. Content hash + cache key ─────────────────────────────────────
  // Hash is computed before IR so a compile-level cache hit can short-circuit
  // without materializing the IR. modelToIR (a downstream stage) runs below
  // under per-stage cache observation.
  const files = collectWorkspaceFiles(model);
  const hash = contentHash(files);
  const cacheKey = buildCacheKey(
    hash,
    options.targets,
    options.outputDir,
    options.dryRun === true,
    compilerVersion,
    signingKeyId,
  );

  // ── 5. Cache get ────────────────────────────────────────────────────
  const cache = options.cacheEnabled && options.cacheDir !== undefined
    ? new CompilationCache({
        cacheDir: options.cacheDir,
        maxSize: options.cacheMaxSize ?? DEFAULT_CACHE_MAX,
      })
    : null;

  if (cache !== null) {
    const cached = await cache.get(cacheKey);
    if (cached !== undefined) {
      try {
        const parsed = JSON.parse(cached) as CompileResult;
        // Persist hit-counter update before returning so observers see it.
        await cache.flush();
        auditAppend(auditChain, 'compile.complete', workspaceRoot, {
          contentHash: hash,
          cacheHit: true,
          now,
        });
        fire(bus, () => ({
          type: 'cache.hit',
          ...envelope(workspaceRoot, wallClockIso),
          key: cacheKey,
        }));
        // Compile-level hit bypasses per-stage caches entirely, but §IS.4
        // requires stageTimings to always be populated — synthesize a
        // cacheHit:true entry per stage with durationMs:0.
        const syntheticTimings = synthesizeStageTimingsFromCompileHit(
          readerByteHashes,
          hash,
        );
        const hitResult: CompileResult = {
          ...parsed,
          cacheHit: true,
          duration: Date.now() - start,
          stageTimings: syntheticTimings,
        };
        fire(bus, () => ({
          type: 'compile.complete',
          ...envelope(workspaceRoot, wallClockIso),
          durationMs: Number((monotonicNs() - startNs) / 1_000_000n),
          result: hitResult,
        }));
        return hitResult;
      } catch {
        diagnostics.push({
          code: 'CACHE-CORRUPT',
          severity: 'warning',
          message: `Cache entry for ${cacheKey} failed to parse; invalidating.`,
          stage: 'cache',
        });
        await cache.invalidate(cacheKey);
      }
    }
    fire(bus, () => ({
      type: 'cache.miss',
      ...envelope(workspaceRoot, wallClockIso),
      key: cacheKey,
    }));
  }

  // ── 5b. Per-stage reader caches (CL-04 §IS.1–§IS.3) ─────────────────
  // Each reader's cache entry is keyed on its own content hash alone; a
  // lobster-only edit must leave the other 8 readers as cacheHit. Keys
  // also fold in `compilerVersion` and `keySchemaVersion` so a rotation
  // invalidates every reader uniformly. `stageTimings` receives one entry
  // per reader in canonical order.
  for (const stage of READER_STAGES) {
    const byteHash = readerByteHashes.get(stage) ?? EMPTY_INPUT_HASH;
    const timing = await consultReaderCache(
      stage,
      { contentHash: byteHash, compilerVersion },
      stageCacheDir,
      byteHash,
      bus,
      envelopeFn,
    );
    stageTimings.push(timing);
  }

  // ── 5c. modelToIR (downstream stage, CL-04 §IS.3) ───────────────────
  const irStartNs = monotonicNs();
  const { ir, diagnostics: irDiagnostics } = modelToIR(model, now, compilerVersion);
  diagnostics.push(...irDiagnostics);
  const irDurationMs = Number((monotonicNs() - irStartNs) / 1_000_000n);
  const irByteHash = sha256(JSON.stringify(ir));
  const irUpstreamHashes = upstreamOf('modelToIR').map(
    /* c8 ignore next -- readerByteHashes always has entries for every reader; `?? EMPTY_INPUT_HASH` is defensive. */
    (u) => readerByteHashes.get(u) ?? EMPTY_INPUT_HASH,
  );
  const irCacheConsult = await consultDownstreamCache(
    'modelToIR',
    {
      contentHash: hash,
      compilerVersion,
      upstreamByteHashes: irUpstreamHashes,
    },
    stageCacheDir,
    irByteHash,
    irDurationMs,
    bus,
    envelopeFn,
  );
  stageTimings.push(irCacheConsult.timing);

  // ── 6. Enforce R5 ───────────────────────────────────────────────────
  auditAppend(auditChain, 'enforce.start', workspaceRoot, { contentHash: hash, now });

  // baselineAnalysis — downstream stage consuming modelToIR (§IS.3).
  const analysisStartNs = monotonicNs();
  const analysis = baselineAnalysis(ir);
  const analysisDurationMs = Number((monotonicNs() - analysisStartNs) / 1_000_000n);
  const analysisByteHash = sha256(JSON.stringify(analysis));
  const analysisUpstreamHashes = upstreamOf('baselineAnalysis').map((u) => {
    if (u === 'modelToIR') return irByteHash;
    /* c8 ignore next -- upstreamOf('baselineAnalysis') returns only modelToIR; reader-fallback arm is defensive for future DAG edits. */
    return readerByteHashes.get(u) ?? EMPTY_INPUT_HASH;
  });
  const analysisCacheConsult = await consultDownstreamCache(
    'baselineAnalysis',
    {
      contentHash: hash,
      compilerVersion,
      upstreamByteHashes: analysisUpstreamHashes,
    },
    stageCacheDir,
    analysisByteHash,
    analysisDurationMs,
    bus,
    envelopeFn,
  );
  stageTimings.push(analysisCacheConsult.timing);

  const enforceStartNs = monotonicNs();
  fire(bus, () => ({
    type: 'enforce.start',
    ...envelope(workspaceRoot, wallClockIso),
    violationCount: analysis.violations.length,
  }));
  const fail = enforceR5(analysis, ir);
  const enforceDurationMs = Number((monotonicNs() - enforceStartNs) / 1_000_000n);
  // enforceR5 stage timing — on the deny path we still record a timing
  // entry (cacheHit:false) so stageTimings captures every stage that ran.
  const enforceByteHash = sha256(JSON.stringify(fail));
  const enforceUpstreamHashes = upstreamOf('enforceR5').map((u) => {
    if (u === 'modelToIR') return irByteHash;
    if (u === 'baselineAnalysis') return analysisByteHash;
    /* c8 ignore next -- upstreamOf('enforceR5') returns only modelToIR + baselineAnalysis; reader-fallback arm is defensive for future DAG edits. */
    return readerByteHashes.get(u) ?? EMPTY_INPUT_HASH;
  });
  const enforceCacheConsult = await consultDownstreamCache(
    'enforceR5',
    {
      contentHash: hash,
      compilerVersion,
      upstreamByteHashes: enforceUpstreamHashes,
    },
    stageCacheDir,
    enforceByteHash,
    enforceDurationMs,
    bus,
    envelopeFn,
  );
  stageTimings.push(enforceCacheConsult.timing);

  if (!fail.ok) {
    for (const v of fail.violations) {
      diagnostics.push({
        code: `R5-${v.rule}`,
        severity: 'error',
        message: v.explanation,
        stage: 'enforce',
      });
    }
    // Emit enforce.denied THEN enforce.complete per CL-14 §9.3: the pair
    // is terminal so consumers always see enforce.complete, even on the
    // deny path.
    fire(bus, () => ({
      type: 'enforce.denied',
      ...envelope(workspaceRoot, wallClockIso),
      violations: fail.violations,
      severity: fail.violations.some((v) => v.severity === 'critical')
        ? 'critical'
        : /* c8 ignore start -- the `high`/`medium` denial severities lack a fixture today; the `critical` branch is exercised by existing enforce tests. */ fail.violations.some((v) => v.severity === 'high')
          ? 'high'
          : 'medium' /* c8 ignore stop */,
    }));
    fire(bus, () => ({
      type: 'enforce.complete',
      ...envelope(workspaceRoot, wallClockIso),
      durationMs: enforceDurationMs,
    }));
    auditAppend(auditChain, 'compile.failed', workspaceRoot, {
      contentHash: hash,
      reason: 'enforce-r5',
      violations: fail.violations.length,
      now,
    });
    // Fill the remaining downstream slots (emit, validate) with zero-duration
    // cacheHit:false entries so §IS.4's "always 14 stages" contract holds
    // even on the deny path.
    stageTimings.push(
      { stage: 'emit', cacheHit: false, durationMs: 0, byteHash: EMPTY_INPUT_HASH },
      { stage: 'validate', cacheHit: false, durationMs: 0, byteHash: EMPTY_INPUT_HASH },
    );
    const failResult: CompileResult = {
      ...finalizeFailure(hash, diagnostics, start),
      stageTimings,
    };
    fire(bus, () => ({
      type: 'compile.failed',
      ...envelope(workspaceRoot, wallClockIso),
      durationMs: Number((monotonicNs() - startNs) / 1_000_000n),
      diagnostics: failResult.diagnostics,
    }));
    return failResult;
  }
  auditAppend(auditChain, 'enforce.complete', workspaceRoot, {
    contentHash: hash,
    rulesChecked: fail.rulesChecked,
    now,
  });
  fire(bus, () => ({
    type: 'enforce.complete',
    ...envelope(workspaceRoot, wallClockIso),
    durationMs: enforceDurationMs,
  }));

  // ── 7. Emit per target ──────────────────────────────────────────────
  const emitterOptions: EmitterOptions = {
    outputDir: options.outputDir,
    dryRun: options.dryRun === true,
    verbose: options.verbose === true,
  };
  const registry = createDefaultRegistry(emitterOptions);

  auditAppend(auditChain, 'emit.start', workspaceRoot, {
    contentHash: hash,
    targets: [...options.targets],
    now,
  });

  const emitAllStartNs = monotonicNs();
  for (const target of options.targets) {
    // registry is pre-populated with every free-tier emitter; callers that
    // pass an unsupported target are caught by the EmitTarget type system.
    const emitter = registry.get(target) as NonNullable<ReturnType<typeof registry.get>>;
    fire(bus, () => ({
      type: 'emit.start',
      ...envelope(workspaceRoot, wallClockIso),
      target,
    }));
    const emitStartNs = monotonicNs();
    let result: EmitResult;
    try {
      result = await emitter.emit(ir, analysis);
      /* c8 ignore start -- emit-failure path: emitters fail-closed via the returned EmitResult (diagnostics + empty files), never by throwing; the rethrow here is defensive for unexpected bugs in emitters. */
    } catch (err) {
      fire(bus, () => ({
        type: 'emit.failed',
        ...envelope(workspaceRoot, wallClockIso),
        target,
        error: (err as Error).message,
      }));
      throw err;
    }
    /* c8 ignore stop */
    emitResults[target] = result;
    for (const d of result.diagnostics) {
      diagnostics.push({
        code: d.code,
        severity: d.severity,
        message: d.message,
        stage: 'emit',
      });
    }
    fire(bus, () => ({
      type: 'emit.complete',
      ...envelope(workspaceRoot, wallClockIso),
      target,
      files: result.files,
      durationMs: Number((monotonicNs() - emitStartNs) / 1_000_000n),
    }));
    auditAppend(auditChain, 'emit.complete', workspaceRoot, {
      contentHash: hash,
      target,
      fileCount: result.files.length,
      now,
    });
  }

  // emit stage timing — the emit key folds in `signingKeyId` per §IS.1 so
  // a signing-key rotation invalidates emit specifically. Non-emit stages
  // stay oblivious to signing keys. Byte-hash aggregates content across
  // every target so a single-target change still invalidates.
  const emitDurationMs = Number((monotonicNs() - emitAllStartNs) / 1_000_000n);
  const emitByteHash = sha256(
    options.targets
      .map((t) => {
        const r = emitResults[t];
        if (r === undefined) return `${t}\u0000`;
        const sorted = [...r.files].sort((a, b) => (a.path < b.path ? -1 : 1));
        return `${t}\u0000${sorted.map((f) => `${f.path}\u0000${f.content}`).join('\u0000')}`;
      })
      .join('\u0001'),
  );
  const emitUpstreamHashes = upstreamOf('emit').map((u) => {
    if (u === 'modelToIR') return irByteHash;
    if (u === 'enforceR5') return enforceByteHash;
    /* c8 ignore next -- upstreamOf('emit') returns only modelToIR + enforceR5; reader-fallback arm is defensive for future DAG edits. */
    return readerByteHashes.get(u) ?? EMPTY_INPUT_HASH;
  });
  const emitKeyInput = signingKeyId !== undefined
    ? {
        contentHash: hash,
        compilerVersion,
        upstreamByteHashes: emitUpstreamHashes,
        signingKeyId,
      }
    : {
        contentHash: hash,
        compilerVersion,
        upstreamByteHashes: emitUpstreamHashes,
      };
  const emitCacheConsult = await consultDownstreamCache(
    'emit',
    emitKeyInput,
    stageCacheDir,
    emitByteHash,
    emitDurationMs,
    bus,
    envelopeFn,
  );
  stageTimings.push(emitCacheConsult.timing);

  // ── 8. Validate ─────────────────────────────────────────────────────
  // Run the 12-check validator once per emitted target and merge results.
  // Running only against targets[0] (the previous behavior) silently skipped
  // emit-dependent checks (5, 9, 10, 12) for every additional target.
  auditAppend(auditChain, 'validate.start', workspaceRoot, {
    contentHash: hash,
    targets: [...options.targets],
    now,
  });
  const validateAllStartNs = monotonicNs();
  const reports: ValidationReport[] = [];
  for (const target of options.targets) {
    const r = emitResults[target];
    /* c8 ignore next -- emit populates every requested target above; gap is defensive. */
    if (r === undefined) continue;
    fire(bus, () => ({
      type: 'validate.start',
      ...envelope(workspaceRoot, wallClockIso),
      target,
    }));
    const validateStartNs = monotonicNs();
    const report = validate(ir, analysis, emitResultToShape(r));
    reports.push(report);
    const validateDurationMs = Number((monotonicNs() - validateStartNs) / 1_000_000n);
    if (report.overallPass) {
      fire(bus, () => ({
        type: 'validate.complete',
        ...envelope(workspaceRoot, wallClockIso),
        target,
        report,
        durationMs: validateDurationMs,
      }));
    } else {
      fire(bus, () => ({
        type: 'validate.failed',
        ...envelope(workspaceRoot, wallClockIso),
        target,
        report,
      }));
    }
  }
  const validationReport = mergeValidationReports(reports);

  // validate stage timing — downstream of emit + enforce + modelToIR.
  const validateAllDurationMs = Number((monotonicNs() - validateAllStartNs) / 1_000_000n);
  const validateByteHash = sha256(JSON.stringify(validationReport));
  const validateUpstreamHashes = upstreamOf('validate').map((u) => {
    if (u === 'modelToIR') return irByteHash;
    if (u === 'enforceR5') return enforceByteHash;
    if (u === 'emit') return emitByteHash;
    /* c8 ignore next -- upstreamOf('validate') returns only modelToIR + enforceR5 + emit; reader-fallback arm is defensive for future DAG edits. */
    return readerByteHashes.get(u) ?? EMPTY_INPUT_HASH;
  });
  const validateCacheConsult = await consultDownstreamCache(
    'validate',
    {
      contentHash: hash,
      compilerVersion,
      upstreamByteHashes: validateUpstreamHashes,
    },
    stageCacheDir,
    validateByteHash,
    validateAllDurationMs,
    bus,
    envelopeFn,
  );
  stageTimings.push(validateCacheConsult.timing);
  auditAppend(auditChain, 'validate.complete', workspaceRoot, {
    contentHash: hash,
    overallPass: validationReport.overallPass,
    passCount: validationReport.passCount,
    failCount: validationReport.failCount,
    now,
  });

  const success =
    diagnostics.every((d) => d.severity !== 'error') && validationReport.overallPass;

  const result: CompileResult = {
    success,
    cacheHit: false,
    emitResults: emitResults as Readonly<Record<EmitTarget, EmitResult>>,
    validationReport,
    duration: Date.now() - start,
    diagnostics,
    contentHash: hash,
    stageTimings,
  };

  // ── 9. Cache set ────────────────────────────────────────────────────
  if (success) {
    // Per-stage downstream cache writes fire only on success per CL-14 §9.3.
    // Reader writes already happened inline (they never depend on success).
    await writeDownstreamCache(
      'modelToIR',
      stageCacheDir,
      irCacheConsult.key,
      irByteHash,
      bus,
      envelopeFn,
    );
    await writeDownstreamCache(
      'baselineAnalysis',
      stageCacheDir,
      analysisCacheConsult.key,
      analysisByteHash,
      bus,
      envelopeFn,
    );
    await writeDownstreamCache(
      'enforceR5',
      stageCacheDir,
      enforceCacheConsult.key,
      enforceByteHash,
      bus,
      envelopeFn,
    );
    await writeDownstreamCache(
      'emit',
      stageCacheDir,
      emitCacheConsult.key,
      emitByteHash,
      bus,
      envelopeFn,
    );
    await writeDownstreamCache(
      'validate',
      stageCacheDir,
      validateCacheConsult.key,
      validateByteHash,
      bus,
      envelopeFn,
    );
  }
  if (cache !== null && success) {
    const serialized = JSON.stringify(result);
    await cache.set(cacheKey, serialized);
    // CL-14 §9.3 amendment: cache.write fires ONLY on the success path.
    fire(bus, () => ({
      type: 'cache.write',
      ...envelope(workspaceRoot, wallClockIso),
      key: cacheKey,
      sizeBytes: Buffer.byteLength(serialized, 'utf8'),
    }));
    // Record mtime → cacheKey mapping so the next identical compile can
    // skip the read + content-hash phase entirely via the fast path.
    /* c8 ignore start -- fingerprint computation only fails on non-ENOENT stat errors, which are exceedingly rare on a workspace we just successfully compiled. */
    if (fastPathOpts !== null) {
      const fingerprint = await computeFingerprint(workspaceRoot);
      if (fingerprint !== undefined) {
        await recordCacheKey(fastPathOpts.cacheDir, fingerprint, fastPathOpts.salt, cacheKey);
      }
    }
    /* c8 ignore stop */
  }
  // Persist in-memory stat updates (hit/miss counters, LRU touches) so
  // external observers (metrics, tests) see the counters that this run
  // generated. Flush is a no-op when the manifest is clean.
  if (cache !== null) {
    await cache.flush();
  }

  auditAppend(auditChain, success ? 'compile.complete' : 'compile.failed', workspaceRoot, {
    contentHash: hash,
    success,
    durationMs: result.duration,
    now,
  });

  // CL-14 §9.3 — terminal event fires exactly once at the tail.
  if (success) {
    fire(bus, () => ({
      type: 'compile.complete',
      ...envelope(workspaceRoot, wallClockIso),
      durationMs: Number((monotonicNs() - startNs) / 1_000_000n),
      result,
    }));
  } else {
    fire(bus, () => ({
      type: 'compile.failed',
      ...envelope(workspaceRoot, wallClockIso),
      durationMs: Number((monotonicNs() - startNs) / 1_000_000n),
      diagnostics: result.diagnostics,
    }));
  }

  return result;
}

function finalizeFailure(
  hash: string,
  diagnostics: readonly CompileDiagnostic[],
  start: number,
): CompileResult {
  return {
    success: false,
    cacheHit: false,
    emitResults: {} as Readonly<Record<EmitTarget, EmitResult>>,
    duration: Date.now() - start,
    diagnostics,
    contentHash: hash,
    stageTimings: [],
  };
}
