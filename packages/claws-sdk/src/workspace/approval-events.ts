/**
 * Approval event contracts for the CL-12 schema.
 *
 * When `GuardrailProvider.preAuthorize()` returns
 * `{ decision: 'allow', requiresExternalApproval: true }` the host emits an
 * `ApprovalRequestEvent` so that a human approver can gate the call. Today
 * the event identifies the calling agent but not which session triggered the
 * request. Approval UX has no way to distinguish "Daily Triage (cron)" from
 * "Main Session" and collapses every event to a generic "Agent wants to …"
 * prompt.
 *
 * This module fills that gap by adding optional `sessionId` and `sessionType`
 * fields to the CL-12 context envelope per the CL-12 session-context
 * amendment, and by giving the host a standalone `formatApprovalLabel()`
 * helper that renders a friendly identifier for the approval UI. The helper
 * is deliberately separate from the event shape — the event carries raw
 * identifiers so downstream SIEM and audit consumers see the canonical data;
 * presentation is a pure transformation layered on top.
 *
 * Extraction seam: the `SessionType` union is declared INLINE in this file
 * rather than imported from `session-types.ts`. The upstream `@openclaw/
 * approval-events` (and its internal mirror `@bic/approval-events`) ships
 * standalone, with no `@craftworks`-scoped or `claws-sdk` runtime dependencies.
 * Keeping the literal union local preserves that contract — do not add an
 * import from `session-types.ts` or any other claws-sdk module below.
 *
 * @module claws-sdk/workspace/approval-events
 */

/**
 * Schema version literal for the CL-12 approval event envelope.
 * Pinned at `1` — additive changes go in `extensions`; shape changes bump
 * this number and require a migration path for SIEM consumers.
 */
export type ApprovalSchemaVersion = 1;

/**
 * The five risk levels a guardrail provider may assign. R5 (transact) is
 * the strictest and is always fail-closed on timeout per CL-12 invariant.
 */
export type ApprovalRiskLevel = 1 | 2 | 3 | 4 | 5;

/**
 * Discriminated union pairing each risk level with its capability name,
 * mirroring CL-12 §RiskClassification. Declared inline to preserve the
 * extraction contract (no import from `chunk-types.ts`).
 */
export type ApprovalRiskClassification =
  | { readonly level: 1; readonly capability: 'read' }
  | { readonly level: 2; readonly capability: 'write' }
  | { readonly level: 3; readonly capability: 'communicate' }
  | { readonly level: 4; readonly capability: 'execute' }
  | { readonly level: 5; readonly capability: 'transact' };

/**
 * Session kinds recognized by the approval UX. Declared inline and kept in
 * sync with `SessionType` in `session-types.ts` by convention — this module
 * MUST NOT import from `session-types.ts` (see extraction seam above).
 */
export type ApprovalSessionType = 'main' | 'cron' | 'channel' | 'agent';

/**
 * The tool call that triggered the approval request. Mirrors CL-12
 * §ApprovalRequestEvent.toolCall. Arguments are OPTIONAL because redaction
 * is a host-level policy decision (see CL-12 "Argument redaction" open
 * question).
 */
export interface ApprovalToolCall {
  readonly server: string;
  readonly tool: string;
  readonly arguments?: Readonly<Record<string, unknown>>;
}

/**
 * Risk assessment attached to an approval request, mirroring CL-12
 * §ApprovalRequestEvent.risk. The `reason` field is free-text because
 * CL-12 §"Open Questions" notes that machine-readable reason codes are
 * deferred to a later schema version.
 */
export type ApprovalRiskAssessment = ApprovalRiskClassification & {
  readonly reason: string;
};

/**
 * Governance metadata attached to an approval request, mirroring CL-12
 * §ApprovalRequestEvent.governance.
 */
export interface ApprovalGovernance {
  readonly provider: string;
  readonly ruleId?: string;
  readonly fleetPolicyApplied: boolean;
}

/**
 * Contextual identifiers for correlation and audit. `sessionId` and
 * `sessionType` are the new fields added by the CL-12 session-context
 * amendment; both are OPTIONAL so legacy providers that do not supply
 * session context continue to emit valid events.
 *
 * `sessionName` is a host-level display hint ("Daily Triage",
 * "#ops-channel") that the approval UX surfaces. It is not mandated by
 * CL-12 but flows through the envelope so `formatApprovalLabel()` can
 * render it without a second lookup.
 */
export interface ApprovalContext {
  readonly conversationId: string;
  readonly workspaceId?: string;
  readonly agentId?: string;
  readonly sessionId?: string;
  readonly sessionType?: ApprovalSessionType;
  readonly sessionName?: string;
}

/**
 * CL-12 approval-request envelope, extended with session context. Consumers
 * should treat unknown keys on `extensions` as opaque and forward them
 * unchanged — this preserves vendor extensibility without schema drift.
 */
export interface ApprovalRequestEvent {
  readonly schemaVersion: ApprovalSchemaVersion;
  readonly type: 'approval_request';
  readonly requestId: string;
  readonly timestamp: string;
  readonly toolCall: ApprovalToolCall;
  readonly risk: ApprovalRiskAssessment;
  readonly governance: ApprovalGovernance;
  readonly context: ApprovalContext;
  readonly extensions?: Readonly<Record<string, unknown>>;
}

/**
 * Optional session descriptor threaded through `createApprovalRequest`
 * options. `id` and `type` populate the event context directly; `name` is
 * an optional display hint that `formatApprovalLabel()` prefers over the
 * generic "{Type} Session" fallback.
 */
export interface ApprovalSessionDescriptor {
  readonly id: string;
  readonly type: ApprovalSessionType;
  readonly name?: string;
}

/**
 * Options accepted by `createApprovalRequest`. Everything except the core
 * identity (`requestId`, `timestamp`, `toolCall`, `risk`, `governance`,
 * `context.conversationId`) is optional — callers that do not yet supply
 * session context continue to compile and run unchanged (backward
 * compatible per CL-12 amendment).
 */
export interface CreateApprovalRequestOptions {
  readonly requestId: string;
  readonly timestamp: string;
  readonly risk: ApprovalRiskAssessment;
  readonly governance: ApprovalGovernance;
  readonly conversationId: string;
  readonly workspaceId?: string;
  readonly agentId?: string;
  readonly session?: ApprovalSessionDescriptor;
  readonly extensions?: Readonly<Record<string, unknown>>;
}

/**
 * Build a CL-12 `ApprovalRequestEvent` from a tool call plus options. The
 * `session` option is OPTIONAL; when present, its `id` and `type` populate
 * `context.sessionId` and `context.sessionType`. When absent, the event
 * still validates — legacy providers remain conformant.
 *
 * The helper is a pure projection: no clocks, no IDs, no side-effects.
 * Callers supply `requestId` and `timestamp` explicitly so the returned
 * event is deterministic and trivially testable.
 */
export function createApprovalRequest(
  tool: ApprovalToolCall,
  options: CreateApprovalRequestOptions,
): ApprovalRequestEvent {
  const context: ApprovalContext = buildContext(options);
  const event: ApprovalRequestEvent = {
    schemaVersion: 1,
    type: 'approval_request',
    requestId: options.requestId,
    timestamp: options.timestamp,
    toolCall: tool,
    risk: options.risk,
    governance: options.governance,
    context,
    ...(options.extensions !== undefined && { extensions: options.extensions }),
  };
  return event;
}

function buildContext(options: CreateApprovalRequestOptions): ApprovalContext {
  const base: ApprovalContext = { conversationId: options.conversationId };
  const withWorkspace =
    options.workspaceId !== undefined
      ? { ...base, workspaceId: options.workspaceId }
      : base;
  const withAgent =
    options.agentId !== undefined
      ? { ...withWorkspace, agentId: options.agentId }
      : withWorkspace;
  const session = options.session;
  if (session === undefined) return withAgent;
  const withSession: ApprovalContext = {
    ...withAgent,
    sessionId: session.id,
    sessionType: session.type,
  };
  return session.name !== undefined
    ? { ...withSession, sessionName: session.name }
    : withSession;
}

/**
 * Render an approval-UX label for an `ApprovalRequestEvent`.
 *
 * Precedence:
 *   1. `context.sessionName` + `context.sessionType` → "Daily Triage (cron)"
 *   2. `context.sessionType` alone → "Main Session" / "Cron Session" / …
 *   3. No session context → "Agent Session" (legacy fallback)
 *
 * displayLabel is INTENTIONALLY not a property on the event — it is a
 * projection. Storing it on the envelope would bake the UX layer into the
 * audit record and force SIEM consumers to carry locale-specific strings.
 */
export function formatApprovalLabel(event: ApprovalRequestEvent): string {
  const { sessionName, sessionType } = event.context;
  if (sessionType === undefined) return 'Agent Session';
  if (sessionName !== undefined && sessionName.length > 0) {
    return `${sessionName} (${sessionType})`;
  }
  return `${titleCase(sessionType)} Session`;
}

function titleCase(type: ApprovalSessionType): string {
  switch (type) {
    case 'main':
      return 'Main';
    case 'cron':
      return 'Cron';
    case 'channel':
      return 'Channel';
    case 'agent':
      return 'Agent';
    /* c8 ignore start -- exhaustiveness guard; unreachable while SessionType stays a 4-member union. */
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
    /* c8 ignore stop */
  }
}
