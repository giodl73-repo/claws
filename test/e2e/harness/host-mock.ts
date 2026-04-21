/**
 * test/e2e/harness/host-mock — OC plugin-hook interior.
 *
 * Pure governance surface: registers multiple providers, runs each hook's
 * decisions through the OC-7 merger (`deny > review > modify > allow`), and
 * enforces `requireApproval` stickiness across providers. Identity, routing,
 * sink, and response-shape concerns live behind `HostAdapter` (pulse 39) and
 * MUST NOT appear in this module.
 *
 * The canonical invocation hash is computed by the host at the first line of
 * each decision path — BEFORE any provider is awaited (SC-06 F-05, P-01
 * analogue). Providers read `ctx.canonicalInvocationHash` and MUST NOT
 * recompute their own: any approval handle whose `contentHash` diverges from
 * the host-computed hash produces a decision-entry with
 * `invalidReason: 'divergent-content-hash'` (SC-06 F-09).
 *
 * @module test/e2e/harness/host-mock
 */
import { createHash } from 'node:crypto';

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [k: string]: JsonValue };

export type ToolArgs = JsonValue;

export type DecisionAction = 'allow' | 'deny' | 'review' | 'modify';

export interface AuthorizationContext {
  readonly tool: string;
  readonly principal: string;
  readonly snapshotId: string;
  readonly canonicalInvocationHash: string;
}

export interface ProviderApprovalHandle {
  readonly providerId: string;
  readonly contentHash: string;
}

export type ProviderDecision =
  | { action: 'allow'; requireApproval?: boolean; handle?: ProviderApprovalHandle }
  | { action: 'deny'; reason?: string; requireApproval?: boolean }
  | { action: 'review'; reason?: string; requireApproval?: boolean; handle?: ProviderApprovalHandle }
  | {
      action: 'modify';
      modifiedArgs: ToolArgs;
      requireApproval?: boolean;
      handle?: ProviderApprovalHandle;
    };

export interface FileIngestContext {
  readonly path: string;
}

export interface ProviderHooks {
  readonly beforeToolCall?: (
    ctx: AuthorizationContext,
    args: ToolArgs
  ) => Promise<ProviderDecision> | ProviderDecision;
  readonly beforeWorkspaceFileIngest?: (
    ctx: AuthorizationContext,
    file: FileIngestContext,
    bytes: Uint8Array
  ) => Promise<ProviderDecision> | ProviderDecision;
  readonly init?: () => Promise<void> | void;
  readonly onSnapshotPromoted?: (snapshotId: string) => Promise<void> | void;
}

export interface ProviderSpec {
  readonly id: string;
  readonly hooks: ProviderHooks;
}

export type DecisionInvalidReason = 'divergent-content-hash';

export interface DecisionEntry {
  readonly providerId: string;
  readonly action: DecisionAction;
  readonly requireApproval: boolean;
  readonly reason?: string;
  readonly invalidReason?: DecisionInvalidReason;
}

export interface MergedDecision {
  readonly action: DecisionAction;
  readonly requireApproval: boolean;
  readonly modifiedArgs?: ToolArgs;
  readonly contributions: readonly DecisionEntry[];
  readonly canonicalInvocationHash: string;
  readonly reason?: string;
}

export interface HostMockOptions {
  readonly tool?: string;
  readonly principal?: string;
  readonly snapshotId?: string;
}

export interface ToolCallInputs {
  readonly tool: string;
  readonly args: ToolArgs;
  readonly snapshotId: string;
  readonly principal: string;
}

const RANK: Record<DecisionAction, number> = {
  deny: 3,
  review: 2,
  modify: 1,
  allow: 0,
};

export function canonicalize(input: ToolCallInputs | {
  readonly tool: string;
  readonly args: ToolArgs;
  readonly snapshotId: string;
  readonly principal: string;
}): string {
  const normalized = canonicalizeJson({
    tool: input.tool,
    args: input.args,
    snapshotId: input.snapshotId,
    principal: input.principal,
  });
  return 'sha256:' + createHash('sha256').update(normalized).digest('hex');
}

function canonicalizeJson(value: JsonValue): string {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error('host-mock: non-finite numbers are not JSON-canonicalizable');
    }
    return JSON.stringify(value);
  }
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return '[' + value.map(canonicalizeJson).join(',') + ']';
  }
  const keys = Object.keys(value).sort();
  return (
    '{' +
    keys
      .map((k) => JSON.stringify(k) + ':' + canonicalizeJson(value[k] as JsonValue))
      .join(',') +
    '}'
  );
}

export class HostMock {
  private readonly providers: ProviderSpec[] = [];
  private readonly initialized: Set<string> = new Set();

  registerProvider(spec: ProviderSpec): void {
    if (this.providers.some((p) => p.id === spec.id)) {
      throw new Error(`host-mock: provider '${spec.id}' already registered`);
    }
    this.providers.push(spec);
  }

  providerIds(): readonly string[] {
    return this.providers.map((p) => p.id);
  }

  async initAll(): Promise<void> {
    for (const p of this.providers) {
      if (this.initialized.has(p.id)) continue;
      if (p.hooks.init !== undefined) {
        await p.hooks.init();
      }
      this.initialized.add(p.id);
    }
  }

  hasInitialized(providerId: string): boolean {
    return this.initialized.has(providerId);
  }

  async onSnapshotPromoted(snapshotId: string): Promise<readonly string[]> {
    const fanout: string[] = [];
    for (const p of this.providers) {
      if (p.hooks.onSnapshotPromoted !== undefined) {
        await p.hooks.onSnapshotPromoted(snapshotId);
        fanout.push(p.id);
      }
    }
    return fanout;
  }

  async beforeToolCall(
    inputs: ToolCallInputs
  ): Promise<MergedDecision> {
    const canonicalInvocationHash = canonicalize(inputs);
    const ctx: AuthorizationContext = {
      tool: inputs.tool,
      principal: inputs.principal,
      snapshotId: inputs.snapshotId,
      canonicalInvocationHash,
    };
    const raw: Array<{ providerId: string; decision: ProviderDecision }> = [];
    for (const p of this.providers) {
      const hook = p.hooks.beforeToolCall;
      if (hook === undefined) continue;
      const decision = await hook(ctx, inputs.args);
      raw.push({ providerId: p.id, decision });
    }
    return mergeOc7(raw, canonicalInvocationHash);
  }

  async beforeWorkspaceFileIngest(
    ctx: { tool: string; principal: string; snapshotId: string; path: string; bytes: Uint8Array }
  ): Promise<MergedDecision> {
    const canonicalInvocationHash = canonicalize({
      tool: ctx.tool,
      args: { path: ctx.path, contentHash: sha256(ctx.bytes) },
      snapshotId: ctx.snapshotId,
      principal: ctx.principal,
    });
    const authCtx: AuthorizationContext = {
      tool: ctx.tool,
      principal: ctx.principal,
      snapshotId: ctx.snapshotId,
      canonicalInvocationHash,
    };
    const file: FileIngestContext = { path: ctx.path };
    const raw: Array<{ providerId: string; decision: ProviderDecision }> = [];
    for (const p of this.providers) {
      const hook = p.hooks.beforeWorkspaceFileIngest;
      if (hook === undefined) continue;
      const decision = await hook(authCtx, file, ctx.bytes);
      raw.push({ providerId: p.id, decision });
    }
    return mergeOc7(raw, canonicalInvocationHash);
  }
}

function sha256(bytes: Uint8Array): string {
  return 'sha256:' + createHash('sha256').update(bytes).digest('hex');
}

function mergeOc7(
  raw: ReadonlyArray<{ providerId: string; decision: ProviderDecision }>,
  canonicalInvocationHash: string
): MergedDecision {
  const contributions: DecisionEntry[] = [];
  let stickyApproval = false;

  for (const r of raw) {
    const d = r.decision;
    const requireApproval = d.requireApproval === true;
    if (requireApproval) stickyApproval = true;

    let invalidReason: DecisionInvalidReason | undefined;
    const handle =
      d.action === 'deny' ? undefined : (d as { handle?: ProviderApprovalHandle }).handle;
    if (handle !== undefined && handle.contentHash !== canonicalInvocationHash) {
      invalidReason = 'divergent-content-hash';
    }

    const entry: DecisionEntry = {
      providerId: r.providerId,
      action: d.action,
      requireApproval,
      ...(d.action === 'deny' || d.action === 'review'
        ? ((d as { reason?: string }).reason !== undefined ? { reason: (d as { reason?: string }).reason as string } : {})
        : {}),
      ...(invalidReason !== undefined ? { invalidReason } : {}),
    };
    contributions.push(entry);
  }

  if (contributions.length === 0) {
    return {
      action: 'allow',
      requireApproval: false,
      contributions,
      canonicalInvocationHash,
    };
  }

  let winnerIdx = -1;
  let winnerRank = -1;
  for (let i = 0; i < contributions.length; i++) {
    const entry = contributions[i]!;
    if (entry.invalidReason !== undefined) continue;
    const rank = RANK[entry.action];
    if (rank > winnerRank) {
      winnerRank = rank;
      winnerIdx = i;
    }
  }

  if (winnerIdx === -1) {
    return {
      action: 'deny',
      requireApproval: stickyApproval,
      contributions,
      canonicalInvocationHash,
      reason: 'all-decisions-invalid',
    };
  }

  const winner = raw[winnerIdx]!;
  const winnerEntry = contributions[winnerIdx]!;
  const action = winner.decision.action;
  const modifiedArgs =
    action === 'modify'
      ? (winner.decision as Extract<ProviderDecision, { action: 'modify' }>).modifiedArgs
      : undefined;

  return {
    action,
    requireApproval: stickyApproval,
    contributions,
    canonicalInvocationHash,
    ...(modifiedArgs !== undefined ? { modifiedArgs } : {}),
    ...(winnerEntry.reason !== undefined ? { reason: winnerEntry.reason } : {}),
  };
}
