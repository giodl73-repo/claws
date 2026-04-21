// Empty barrel for the test/e2e harness package.
// Downstream pulses (34..43) replace these `never` stubs with real exports.
// Do NOT add re-exports here by hand — follow the pulse that introduces the
// module and replace the matching stub below.

export {
  trackPid,
  untrackPid,
  listTracked,
  killTree,
  teardownHttpProcess,
  rmrfWithRetry,
  checkLeaks,
} from './lifecycle.ts';
export type {
  Label,
  TrackMeta,
  Residual,
  LeakReport,
  KillOptions,
  TeardownOptions,
} from './lifecycle.ts';
export { startSnap } from './snap-runner.ts';
export type { SnapHandle, StartSnapOptions } from './snap-runner.ts';
export { reservePort } from './port-allocator.ts';
export type { PortReservation } from './port-allocator.ts';
export {
  copyFixture,
  UncleanSourceError,
  SymlinkEscapeError,
} from './fixture-copier.ts';
export { guardPath, PathGuardError } from './path-guard.ts';
export {
  generatePolicy,
  PolicyGenerateError,
  defaultClawsCommand,
  type GeneratePolicyOpts,
  type GeneratePolicyResult,
  type ResolvedCommand,
} from './policy-runner.ts';
export {
  HostMock,
  canonicalize,
  type JsonValue,
  type ToolArgs,
  type DecisionAction,
  type AuthorizationContext,
  type ProviderApprovalHandle,
  type ProviderDecision,
  type FileIngestContext,
  type ProviderHooks,
  type ProviderSpec,
  type DecisionInvalidReason,
  type DecisionEntry,
  type MergedDecision,
  type HostMockOptions,
  type ToolCallInputs,
} from './host-mock.ts';
export { CompanionMock } from './companion-mock.ts';
export type {
  CompanionMode,
  VerdictAction,
  Verdict,
  ApprovalRequest,
  ApprovalOutcome,
  CompanionMockOptions,
} from './companion-mock.ts';
export {
  deriveKey,
  sign,
  verify,
  rotateKey,
  KeyRegistry,
  type SigningKey,
  type VerifyFailure,
  type VerifyResult,
} from './hmac-signer.ts';
export {
  validateHandle,
  type ApprovalHandle,
  type ApprovalInvalidReason,
  type BindingContext,
  type ValidationResult,
} from './handle-binding-validator.ts';
export { SequenceCounter } from './sequence-counter.ts';
export { ClockMock, type Clock } from './clock-mock.ts';
export {
  InProcessAdapter,
  StubFailingAdapter,
  makeAdapterFromConfig,
  type HostAdapter,
  type AuthorizationContext as AdapterAuthorizationContext,
  type IncomingRequest,
  type OutgoingResponse,
  type PolicyArtifactRef,
  type AuthorizationDecision,
  type ApprovalSink,
  type SinkDecisionEntry,
  type SinkApprovalEntry,
  type SinkEntry,
  type AuditFilter,
  type InProcessAdapterOptions,
  type StubFailingAdapterOptions,
  type AdapterDoubleConfig,
} from './host-adapter-test-doubles.ts';
export { runSinkConformance } from './sink-conformance.ts';
export {
  LifecycleManager,
  AlreadyInitializedError,
  type ProviderLifecycle,
  type StageMode,
  type SnapshotMeta,
} from './provider-lifecycle.ts';
export {
  validateLayerConfig,
  type LayerConfig,
  type LayerConfigValidation,
  type LayerConfigValid,
  type LayerConfigInvalid,
  type LayerConfigInvalidReason,
  type TrackMode,
} from './config-validator.ts';
export {
  buildHostContext,
  createLogger,
  type HostContext,
  type HostContextHandle,
  type BuildHostContextOptions,
  type AuditSink,
  type AuditSinkDecisionInput,
  type AuditSinkApprovalInput,
  type IdentityBridge,
  type ApprovalHandleSigner,
  type Snapshot,
  type Logger,
  type ReadableLogger,
  type LogLevel,
  type LogRecord,
} from './host-context.ts';
export {
  SnapshotSwitch,
  DEFAULT_HOOK_TIMEOUT_MS,
  type PromoteOptions,
  type PromoteResult,
  type InflightHandle,
  type SnapshotSwitchAuditSink,
  type SnapshotSwitchOptions,
} from './snapshot-switch.ts';
export type {
  DrainWindowEntry,
  DrainWindowEntryInput,
  OnSnapshotPromotedTimeoutEntry,
  OnSnapshotPromotedTimeoutEntryInput,
} from './audit-types.ts';
export type Canonicalizer = never;
export type AuditChain = never;
