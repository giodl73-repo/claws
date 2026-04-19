/**
 * `@bic/claws-sdk/compiler/events` — the extension-only hook surface
 * per CL-14 §9 (post-Horus rename: `@bic/claws-sdk/compiler/events`).
 *
 * Intended audience: the Horus wave's hot-reload consumer, observability
 * integrations, and CI reporters. NOT re-exported from the top-level
 * `claws-sdk` barrel — consumers opt in by importing from this subpath
 * explicitly.
 *
 * API stability: additive-only across minor versions. Event payload fields
 * MAY be added in minor versions; consumers MUST treat `CompilerEvent` as
 * an open-set union — switch on `type` and ignore unknown variants rather
 * than failing the listener. No field is removed or renamed within a major
 * version and no event type is removed or renamed within a major version
 * (CL-14 §9.5).
 *
 * @module claws-sdk/compiler/events
 */
export { CompilerEventBus, monotonicNs } from './bus.js';
export type { CompilerEventBusOptions } from './bus.js';

export type {
  CompilerEvent,
  CompilerEventLogger,
  CompileStartEvent,
  ReadStartEvent,
  ReadCompleteEvent,
  ReadFailedEvent,
  EnforceStartEvent,
  EnforceDeniedEvent,
  EnforceCompleteEvent,
  EmitStartEvent,
  EmitCompleteEvent,
  EmitFailedEvent,
  ValidateStartEvent,
  ValidateCompleteEvent,
  ValidateFailedEvent,
  CacheHitEvent,
  CacheMissEvent,
  CacheWriteEvent,
  CacheEvictedEvent,
  CompileCompleteEvent,
  CompileFailedEvent,
  CompileCancelledEvent,
} from './types.js';
