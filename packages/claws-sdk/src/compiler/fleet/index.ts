/**
 * Fleet compile barrel — parallel workspace compilation with bounded
 * concurrency and per-workspace failure isolation.
 *
 * @module claws-sdk/compiler/fleet
 */

export { Semaphore } from './semaphore.js';
export { discoverWorkspaces } from './discover.js';
export type { DiscoveredWorkspace } from './discover.js';
export {
  makeDiagnostic,
  diagnosticFromError,
} from './diagnostic.js';
export type {
  CompileDiagnostic,
  CompileDiagnosticKind,
  CompileDiagnosticStage,
} from './diagnostic.js';
export { fleetCompile } from './fleet-compile.js';
export type {
  FleetCompileOptions,
  FleetCompileResult,
  FleetSummary,
  FleetWorkspaceResult,
} from './types.js';
