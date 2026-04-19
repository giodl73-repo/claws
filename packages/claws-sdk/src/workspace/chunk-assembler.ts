/**
 * assembleChunks — join WorkspaceState + GovernanceIR + fleet policy into
 * the 9 typed chunks that CAP partners consume.
 *
 * This is the heaviest single function in the serve layer. It owns every
 * per-tab data projection, per-field editability derivation, and per-item
 * lock decision. Routes in pulses 24-27 are pure adapters: they call
 * `assembleChunks` and serialize the result.
 *
 * CAP subsections under IDENTITY.md (CP-5 M01): knowledge sources,
 * entitlements, and deny rules used to live in standalone OC files. They
 * now flow through `IDENTITY.md` H2 subsections named
 * `Knowledge Sources`, `Entitlements`, and `Deny Rules`. The chunk
 * projections read from those subsections so the wire shapes
 * (MemoryData.knowledgeSources, EntitlementsData.core/governance) stay
 * identical to partners — only the source changed.
 *
 * P-271 atomic snapshot: if any OC file's mtime shifts between the
 * assembler's pre-snapshot and post-snapshot reads, the assembler retries
 * (max 3 attempts). If drift still exists on the final attempt, every
 * chunk's `governance.snapshotStale` is set to `true` so partners can
 * surface a stale-data warning instead of silently committing writes
 * against an inconsistent view.
 *
 * The assembler NEVER re-derives risk classification. Risk levels come
 * from the compiled GovernanceIR (single source of truth per CL-11); the
 * assembler reads them and projects them into chunks.
 *
 * @module claws-sdk/workspace/chunk-assembler
 */

import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { GovernanceIR } from '../ir/governance-ir.js';
import type { ToolCapability, ToolRiskLevel } from '../ir/capability-manifest.js';
import type { FleetOverride } from '../emit/host-approval-policy-types.js';
import type {
  ChunkAssemblyResult,
  ChunkGovernance,
  ChunkWarning,
  Chunk,
  ConnectionsData,
  ConnectionsSummary,
  ConnectionsToolEntry,
  EntitlementEntry,
  EntitlementsData,
  FieldEditability,
  GeneralData,
  GroupsData,
  ItemLock,
  KnowledgeSourceEntry,
  MemoryData,
  PreferencesData,
  RiskClassification,
  ScheduleData,
  TrustData,
  WorkqueueData,
  OcParsedFile,
  ParsedSection,
  WorkspaceState,
} from '@bic/openclaw-workspace/path';
import { OC_PARSED_FILES } from '@bic/openclaw-workspace/path';

/** Maximum number of atomic-snapshot retries before giving up (P-271). */
const MAX_SNAPSHOT_RETRIES = 3;

/**
 * Canonical H2 heading used under IDENTITY.md to carry the
 * knowledge-sources CAP subsection.
 */
const IDENTITY_KNOWLEDGE_HEADING = 'Knowledge Sources';

/**
 * Canonical H2 heading used under IDENTITY.md to carry the entitlements
 * CAP subsection.
 */
const IDENTITY_ENTITLEMENTS_HEADING = 'Entitlements';

/** Fleet policy bundle consumed by chunk assembly. */
export interface FleetPolicy {
  readonly overrides: readonly FleetOverride[];
}

/** Injected mtime reader — overridable for deterministic drift tests. */
export type MtimeReader = (path: string) => Promise<number | null>;

/** Options bag for `assembleChunks`. Lets tests inject an mtime reader. */
export interface AssembleChunksOptions {
  readonly fleetPolicy?: FleetPolicy;
  readonly readMtimes?: MtimeReader;
}

const RISK_LEVEL_MAP: Record<ToolRiskLevel, 2 | 3 | 4 | 5> = {
  low: 2,
  medium: 3,
  high: 4,
  critical: 5,
};

/** Default mtime reader — `null` when the file is absent. */
const defaultReadMtime: MtimeReader = async (path) => {
  try {
    const info = await stat(path);
    return info.mtimeMs;
  } catch {
    return null;
  }
};

/**
 * Assemble all 9 typed chunks from a parsed workspace and compiled IR.
 *
 * The assembler:
 * 1. Takes an mtime snapshot of all OC files under `workspace.workspaceRoot`.
 * 2. Projects tools, knowledge sources, entitlements, etc. into chunks.
 * 3. Re-reads the mtimes and compares; retries if any file drifted.
 * 4. After `MAX_SNAPSHOT_RETRIES`, returns with `snapshotStale: true`.
 *
 * @param workspace - Parsed WorkspaceState (pulse 22)
 * @param governanceIR - Compiled GovernanceIR (pulse 21 CompilationHost)
 * @param options - Optional fleet policy + injected mtime reader
 */
export async function assembleChunks(
  workspace: WorkspaceState,
  governanceIR: GovernanceIR,
  options: AssembleChunksOptions = {},
): Promise<ChunkAssemblyResult> {
  const read = options.readMtimes ?? defaultReadMtime;
  const fleetPolicy = options.fleetPolicy;

  for (let attempt = 1; attempt <= MAX_SNAPSHOT_RETRIES; attempt++) {
    const pre = await snapshotMtimes(workspace.workspaceRoot, read);
    const candidate = buildResult(workspace, governanceIR, fleetPolicy, false);
    const post = await snapshotMtimes(workspace.workspaceRoot, read);
    if (mtimesEqual(pre, post)) return candidate;
  }
  return buildResult(workspace, governanceIR, fleetPolicy, true);
}

// ── Snapshot helpers ───────────────────────────────────────────────────

async function snapshotMtimes(
  root: string,
  read: MtimeReader,
): Promise<ReadonlyMap<OcParsedFile, number | null>> {
  const entries = await Promise.all(
    OC_PARSED_FILES.map(
      async (name) => [name, await read(join(root, name))] as const,
    ),
  );
  return new Map(entries);
}

function mtimesEqual(
  a: ReadonlyMap<OcParsedFile, number | null>,
  b: ReadonlyMap<OcParsedFile, number | null>,
): boolean {
  if (a.size !== b.size) return false;
  for (const [key, value] of a) {
    if (b.get(key) !== value) return false;
  }
  return true;
}

// ── Top-level result builder ───────────────────────────────────────────

function buildResult(
  workspace: WorkspaceState,
  ir: GovernanceIR,
  fleetPolicy: FleetPolicy | undefined,
  snapshotStale: boolean,
): ChunkAssemblyResult {
  return {
    general: assembleGeneral(workspace, ir, snapshotStale),
    preferences: assemblePreferences(workspace, ir, snapshotStale),
    connections: assembleConnections(workspace, ir, fleetPolicy, snapshotStale),
    memory: assembleMemory(workspace, ir, snapshotStale),
    groups: assembleGroups(workspace, snapshotStale),
    entitlements: assembleEntitlements(workspace, ir, snapshotStale),
    trust: assembleTrust(workspace, snapshotStale),
    schedule: assembleSchedule(workspace, snapshotStale),
    workqueue: assembleWorkqueue(snapshotStale),
    snapshotStale,
  };
}

// ── Per-tab assemblers ─────────────────────────────────────────────────

function assembleGeneral(
  workspace: WorkspaceState,
  ir: GovernanceIR,
  snapshotStale: boolean,
): Chunk<'general'> {
  const name = valueFromSections(workspace.identity?.sections ?? [], 'Organization', 'Organization')
    ?? 'Unnamed Agent';
  const description = workspace.soul.preamble.length > 0
    ? workspace.soul.preamble
    : 'No description provided.';
  const language = valueFromSections(
    workspace.identity?.sections ?? [],
    'Organization',
    'Language',
  ) ?? 'English (United States)';
  const managerName = firstAgentName(workspace) ?? 'Unassigned';
  const managerRole = valueFromSections(
    workspace.identity?.sections ?? [],
    'Organization',
    'Team',
  ) ?? 'Owner';

  const data: GeneralData = {
    name,
    description,
    language,
    managedBy: { name: managerName, role: managerRole },
  };

  const editable: Record<string, FieldEditability> = {
    name: { type: 'string', required: true },
    description: { type: 'text', required: true },
    language: { type: 'enum', options: ['English (United States)', 'French (France)'] },
    managedBy: { type: 'object', lock: { source: 'none' } },
  };

  return {
    tab: 'general',
    section: 'identity',
    data,
    editable,
    governance: buildGovernance(ir, snapshotStale),
    writeBack: { method: 'PATCH', url: '/api/chunks/general/identity' },
  };
}

function assemblePreferences(
  workspace: WorkspaceState,
  ir: GovernanceIR,
  snapshotStale: boolean,
): Chunk<'preferences'> {
  const instructions = workspace.soul.preamble;
  const reviewers: Array<{ name: string; id: string }> = [];
  for (const section of workspace.identity?.sections ?? []) {
    if (section.heading !== 'RBAC') continue;
    for (const line of section.body.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('-')) continue;
      const content = trimmed.replace(/^[-*]\s*/, '');
      const colon = content.indexOf(':');
      if (colon === -1) continue;
      const role = content.slice(0, colon).trim();
      const id = content.slice(colon + 1).trim();
      reviewers.push({ name: role, id });
    }
  }

  const schedule = scheduleFromHeartbeat(workspace);
  const data: PreferencesData = schedule === null
    ? { instructions, reviewers }
    : { instructions, reviewers, schedule };
  const editable: Record<string, FieldEditability> = {
    instructions: { type: 'text', required: true },
    reviewers: { type: 'object' },
  };

  return {
    tab: 'preferences',
    section: 'prefs',
    data,
    editable,
    governance: buildGovernance(ir, snapshotStale),
    writeBack: { method: 'PATCH', url: '/api/chunks/preferences/prefs' },
  };
}

/**
 * Derive `PreferencesData.schedule` from HEARTBEAT.md. Returns `null` when
 * the file is absent or has no recurrence-bearing section, so callers can
 * decide whether to omit the field (`exactOptionalPropertyTypes`-safe).
 *
 * Promoted from claws-serve/src/routes/chunks-preferences.ts (CP-5 R1 M02):
 * routes are thin adapters and must not contain domain projection logic.
 * The preferences chunk's schedule surface now flows through the assembler
 * like every other per-tab projection.
 */
function scheduleFromHeartbeat(
  workspace: WorkspaceState,
): NonNullable<PreferencesData['schedule']> | null {
  const heartbeat = workspace.heartbeat;
  if (heartbeat === null) return null;
  const first = heartbeat.sections[0];
  if (first === undefined) return null;
  return {
    start: '',
    time: '',
    frequency: inferRecurrence(first.heading),
  };
}

function assembleConnections(
  workspace: WorkspaceState,
  ir: GovernanceIR,
  fleetPolicy: FleetPolicy | undefined,
  snapshotStale: boolean,
): Chunk<'connections'>[] {
  const toolsIR = ir.capabilities.tools;
  const declaredTools = new Set(
    (workspace.tools?.sections ?? []).map((s) => s.heading),
  );
  // Tools present in IR that were not in TOOLS.md are 'unclassified' if any.
  const byServer = new Map<string, ToolCapability[]>();
  for (const tool of toolsIR) {
    const server = tool.mcpServer ?? 'local';
    const list = byServer.get(server) ?? [];
    list.push(tool);
    byServer.set(server, list);
  }

  const chunks: Chunk<'connections'>[] = [];
  for (const [server, tools] of byServer) {
    const entries: ConnectionsToolEntry[] = tools.map((tool) =>
      buildConnectionEntry(tool, fleetPolicy, declaredTools),
    );
    const summary = summarizeConnections(entries);
    const data: ConnectionsData = {
      server,
      name: titleCase(server),
      tools: entries,
      summary,
    };
    const hasFleetOverride = entries.some((e) => e.approvalSource === 'fleet-override');
    const r5Tools = entries.filter((e) => e.risk.level === 5);
    const warnings: ChunkWarning[] = r5Tools.length > 0
      ? [{
          rule: 'G-ELICIT',
          message: `${r5Tools.length} R5 tool${r5Tools.length === 1 ? '' : 's'} require approval on every call`,
        }]
      : [];
    const baseGov = buildGovernance(ir, snapshotStale);
    const governance: ChunkGovernance = {
      ...baseGov,
      ...(r5Tools[0] !== undefined ? { risk: r5Tools[0].risk } : {}),
      ...(hasFleetOverride ? { fleetOverride: true } : {}),
      warnings: [...(baseGov.warnings ?? []), ...warnings],
    };
    chunks.push({
      tab: 'connections',
      section: server,
      data,
      editable: {},
      governance,
      writeBack: { method: 'PATCH', url: `/api/chunks/connections/${encodeURIComponent(server)}` },
    });
  }
  return chunks;
}

function buildConnectionEntry(
  tool: ToolCapability,
  fleetPolicy: FleetPolicy | undefined,
  declaredTools: ReadonlySet<string>,
): ConnectionsToolEntry {
  const level = RISK_LEVEL_MAP[tool.riskLevel];
  const risk = makeRisk(level);
  const fleetMatch = fleetPolicy?.overrides.find(
    (o) =>
      o.tool === tool.name
      && (o.server === undefined || o.server === tool.mcpServer),
  );
  let approvalRequired: boolean;
  let approvalSource: 'compiled' | 'fleet-override' | 'admin';
  let lock: ItemLock;
  if (level === 5) {
    approvalRequired = true;
    approvalSource = 'compiled';
    lock = { source: 'r5', reason: tool.oboFlag ? 'R5 OBO — non-negotiable' : 'R5 critical — non-negotiable' };
  } else if (fleetMatch !== undefined) {
    approvalRequired = fleetMatch.requires_approval;
    approvalSource = 'fleet-override';
    lock = { source: 'fleet', reason: fleetMatch.reason };
  } else if (!declaredTools.has(tool.name)) {
    approvalRequired = level >= 3;
    approvalSource = 'compiled';
    lock = { source: 'unclassified', reason: 'Tool not declared in TOOLS.md' };
  } else {
    approvalRequired = level >= 3;
    approvalSource = 'compiled';
    lock = { source: 'none' };
  }

  return {
    tool: tool.name,
    description: tool.description,
    enabled: lock.source !== 'unclassified',
    risk,
    obo: tool.oboFlag,
    approvalRequired,
    approvalSource,
    lock,
  };
}

function summarizeConnections(entries: readonly ConnectionsToolEntry[]): ConnectionsSummary {
  let enabled = 0;
  let gated = 0;
  let r5Count = 0;
  for (const e of entries) {
    if (e.enabled) enabled++;
    if (e.approvalRequired) gated++;
    if (e.risk.level === 5) r5Count++;
  }
  return { total: entries.length, enabled, gated, r5Count };
}

function assembleMemory(
  workspace: WorkspaceState,
  ir: GovernanceIR,
  snapshotStale: boolean,
): Chunk<'memory'> {
  const memorySections = workspace.memory?.sections ?? [];
  const personal = countListItems(sectionBody(memorySections, 'Personal'));
  const shared = countListItems(sectionBody(memorySections, 'Shared'));
  const pinned = countListItems(sectionBody(memorySections, 'Pinned'));

  const knowledgeEntries = extractIdentityCapEntries(
    workspace,
    IDENTITY_KNOWLEDGE_HEADING,
  );
  const knowledgeSources: KnowledgeSourceEntry[] = knowledgeEntries.map((entry) => {
    const type = classifyKnowledgeHeading(entry.heading);
    const dataLabel = inferDataLabel(entry.heading, entry.body);
    const lock: ItemLock = dataLabel === 'CONFIDENTIAL' || dataLabel === 'RESTRICTED'
      ? { source: 'governance', reason: `Contains ${dataLabel} data — disabling requires admin approval` }
      : { source: 'none' };
    return {
      type,
      name: entry.heading,
      enabled: true,
      dataLabel,
      lock,
    };
  });

  const data: MemoryData = {
    memories: {
      personal: { count: personal },
      shared: { count: shared + pinned },
    },
    knowledgeSources,
  };
  return {
    tab: 'memory',
    section: 'knowledge',
    data,
    editable: {},
    governance: buildGovernance(ir, snapshotStale),
    writeBack: { method: 'PATCH', url: '/api/chunks/memory/knowledge' },
  };
}

function assembleGroups(workspace: WorkspaceState, snapshotStale: boolean): Chunk<'groups'> {
  const identitySections = workspace.identity?.sections ?? [];
  const data: GroupsData = {
    m365: listFromSection(identitySections, 'M365'),
    security: listFromSection(identitySections, 'Security'),
    onPremise: listFromSection(identitySections, 'On-Premise'),
  };
  const governance: ChunkGovernance = {
    ...(snapshotStale ? { snapshotStale: true } : {}),
  };
  return {
    tab: 'groups',
    section: 'membership',
    data,
    editable: {},
    governance,
    writeBack: { method: 'PATCH', url: '/api/chunks/groups/membership' },
  };
}

function assembleEntitlements(
  workspace: WorkspaceState,
  ir: GovernanceIR,
  snapshotStale: boolean,
): Chunk<'entitlements'> {
  const tiers = extractIdentityCapEntries(workspace, IDENTITY_ENTITLEMENTS_HEADING);
  const core: EntitlementEntry[] = [];
  const governance: EntitlementEntry[] = [];
  for (const tier of tiers) {
    const isGovernance = /governance|compliance|policy/i.test(tier.heading);
    const target = isGovernance ? governance : core;
    for (const role of listItems(tier.body)) {
      target.push({ role, type: tier.heading });
    }
  }
  const data: EntitlementsData = { core, governance };
  return {
    tab: 'entitlements',
    section: 'grants',
    data,
    editable: {},
    governance: buildGovernance(ir, snapshotStale),
    // Read-only: no writeBack
  };
}

function assembleTrust(workspace: WorkspaceState, snapshotStale: boolean): Chunk<'trust'> {
  const trustLine = firstMatchingLine(
    workspace.identity?.sections ?? [],
    /trust:\s*(L\d+|T\d+)/i,
  );
  const currentTier = inferTrustTier(trustLine);
  const data: TrustData = {
    currentTier,
    escalationHistory: [],
  };
  const governance: ChunkGovernance = {
    ...(snapshotStale ? { snapshotStale: true } : {}),
    trustTier: currentTier,
  };
  return {
    tab: 'trust',
    section: 'tier',
    data,
    editable: {},
    governance,
  };
}

function assembleSchedule(
  workspace: WorkspaceState,
  snapshotStale: boolean,
): Chunk<'schedule'> {
  const events = (workspace.heartbeat?.sections ?? []).map((s) => ({
    title: s.heading,
    recurrence: inferRecurrence(s.heading),
    nextRun: '',
  }));
  const data: ScheduleData = { events };
  const governance: ChunkGovernance = snapshotStale ? { snapshotStale: true } : {};
  return {
    tab: 'schedule',
    section: 'events',
    data,
    editable: {},
    governance,
    writeBack: { method: 'PATCH', url: '/api/chunks/schedule/events' },
  };
}

function assembleWorkqueue(snapshotStale: boolean): Chunk<'workqueue'> {
  const data: WorkqueueData = { tasks: [] };
  const governance: ChunkGovernance = snapshotStale ? { snapshotStale: true } : {};
  return {
    tab: 'workqueue',
    section: 'tasks',
    data,
    editable: {},
    governance,
    writeBack: { method: 'PATCH', url: '/api/chunks/workqueue/tasks' },
  };
}

// ── Governance helper ──────────────────────────────────────────────────

function buildGovernance(ir: GovernanceIR, snapshotStale: boolean): ChunkGovernance {
  const warnings: ChunkWarning[] = ir.analysis.warnings.map((w) => ({
    rule: w.ruleId,
    message: w.message,
  }));
  const violations = ir.analysis.violations.map((v) => ({
    path: v.target,
    severity: String(v.level),
    rule: v.ruleId,
    message: v.message,
    fixGuidance: v.fixSuggestions[0]?.description ?? 'No fix guidance available',
    scope: 'isolated' as const,
  }));
  const result: ChunkGovernance = {
    ...(warnings.length > 0 ? { warnings } : {}),
    ...(violations.length > 0 ? { violations } : {}),
    ...(snapshotStale ? { snapshotStale: true } : {}),
  };
  return result;
}

// ── Small extractors ───────────────────────────────────────────────────

/**
 * An entry inside an IDENTITY.md CAP subsection — each subsection
 * (Knowledge Sources, Entitlements) contains one or more H3 entries
 * whose headings are the entry names and whose bodies carry the
 * entry-specific data (labels, list items, etc).
 */
interface IdentityCapEntry {
  readonly heading: string;
  readonly body: string;
}

/**
 * Parse IDENTITY.md subsection entries. Each CAP subsection is an H2 in
 * IDENTITY.md (e.g. `## Knowledge Sources`) whose body carries H3 entries
 * (e.g. `### SharePoint sites`). This helper locates the requested H2 by
 * heading and extracts its H3 children. Returns an empty array when
 * IDENTITY.md is absent or the requested subsection is missing — partners
 * see an empty list in that case, never an error.
 */
function extractIdentityCapEntries(
  workspace: WorkspaceState,
  subsectionHeading: string,
): readonly IdentityCapEntry[] {
  const section = (workspace.identity?.sections ?? []).find(
    (s) => s.heading === subsectionHeading,
  );
  if (section === undefined) return [];
  return parseH3Entries(section.body);
}

/**
 * Extract H3 entries from an H2 section body. Each `### heading` starts a
 * new entry; the entry body runs until the next `### ` line. Lines before
 * the first `### ` are ignored (they belong to the H2's own preamble).
 */
function parseH3Entries(body: string): IdentityCapEntry[] {
  const lines = body.split('\n');
  const entries: IdentityCapEntry[] = [];
  let currentHeading: string | null = null;
  let bodyLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith('### ')) {
      if (currentHeading !== null) {
        entries.push({ heading: currentHeading, body: bodyLines.join('\n').trim() });
      }
      currentHeading = line.slice(4).trim();
      bodyLines = [];
    } else if (currentHeading !== null) {
      bodyLines.push(line);
    }
  }
  if (currentHeading !== null) {
    entries.push({ heading: currentHeading, body: bodyLines.join('\n').trim() });
  }
  return entries;
}

/**
 * Build a RiskClassification from a numeric level with type-level proof
 * that the (level, capability) pair is a valid discriminated-union member.
 *
 * Each branch returns a literal that matches exactly one union variant;
 * TypeScript narrows without any `as` cast and enforces exhaustiveness on
 * the 1|2|3|4|5 domain. Dropping a branch is a compile error (caught by
 * the `assertNever(level)` tail). Changing the level→capability pairing
 * requires editing this switch — the cross-check that was previously
 * defeated by the `Record<number, ...>` indexed access (CP-5 R1 M09).
 */
function makeRisk(level: 1 | 2 | 3 | 4 | 5): RiskClassification {
  switch (level) {
    case 1: return { level: 1, capability: 'read' };
    case 2: return { level: 2, capability: 'write' };
    case 3: return { level: 3, capability: 'communicate' };
    case 4: return { level: 4, capability: 'execute' };
    case 5: return { level: 5, capability: 'transact' };
    default: return assertNever(level);
  }
}

function assertNever(x: never): never {
  throw new Error(`Unreachable: unhandled RiskClassification level ${String(x)}`);
}

function titleCase(s: string): string {
  if (s.length === 0) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function valueFromSections(
  sections: readonly { heading: string; body: string }[],
  heading: string,
  key: string,
): string | null {
  const section = sections.find((s) => s.heading === heading);
  if (section === undefined) return null;
  for (const line of section.body.split('\n')) {
    const trimmed = line.trim().replace(/^[-*]\s*/, '');
    const separator = trimmed.indexOf(':');
    if (separator === -1) continue;
    const k = trimmed.slice(0, separator).trim();
    const v = trimmed.slice(separator + 1).trim();
    if (k.toLowerCase() === key.toLowerCase()) return v;
  }
  return null;
}

function firstAgentName(workspace: WorkspaceState): string | null {
  const section = workspace.agents?.sections[0];
  return section === undefined ? null : section.heading;
}

function sectionBody(
  sections: readonly ParsedSection[],
  heading: string,
): string {
  return sections.find((s) => s.heading === heading)?.body ?? '';
}

function listItems(body: string): string[] {
  const out: string[] = [];
  for (const line of body.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('-') && !trimmed.startsWith('*')) continue;
    const content = trimmed.replace(/^[-*]\s*/, '').trim();
    if (content.length > 0) out.push(content);
  }
  return out;
}

function countListItems(body: string): number {
  return listItems(body).length;
}

function listFromSection(
  sections: readonly ParsedSection[],
  heading: string,
): string[] {
  return listItems(sectionBody(sections, heading));
}

function classifyKnowledgeHeading(heading: string): KnowledgeSourceEntry['type'] {
  const lower = heading.toLowerCase();
  if (lower.includes('email') || lower.includes('mailbox')) return 'email';
  if (lower.includes('sharepoint')) return 'sharepoint';
  if (lower.includes('channel') || lower.includes('teams')) return 'channels';
  if (lower.includes('table')) return 'tables';
  if (lower.includes('url') || lower.includes('website')) return 'urls';
  return 'files';
}

function inferDataLabel(heading: string, body: string): KnowledgeSourceEntry['dataLabel'] {
  const text = `${heading} ${body}`.toLowerCase();
  if (text.includes('restricted')) return 'RESTRICTED';
  if (text.includes('confidential') || text.includes('sharepoint')) return 'CONFIDENTIAL';
  if (text.includes('public') || text.includes('url') || text.includes('website')) return 'PUBLIC';
  return 'INTERNAL';
}

function firstMatchingLine(
  sections: readonly ParsedSection[],
  pattern: RegExp,
): string | null {
  for (const section of sections) {
    for (const line of section.body.split('\n')) {
      const match = line.match(pattern);
      if (match !== null) return match[1] ?? match[0];
    }
  }
  return null;
}

function inferTrustTier(raw: string | null): TrustData['currentTier'] {
  if (raw === null) return 'T0';
  const m = raw.match(/[LT]([0-4])/i);
  return m === null ? 'T0' : (`T${m[1]}` as TrustData['currentTier']);
}

function inferRecurrence(heading: string): string {
  const lower = heading.toLowerCase();
  if (lower.startsWith('every')) return heading;
  if (lower.includes('daily')) return 'daily';
  if (lower.includes('start')) return 'on-start';
  return 'manual';
}
