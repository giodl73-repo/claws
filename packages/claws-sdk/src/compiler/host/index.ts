/**
 * Compilation host -- barrel exports.
 *
 * The single public entry for the free-tier compiler pipeline. Wires
 * together pulses 1..10 and produces a CompileResult (success/failure,
 * emit artifacts, validation report, diagnostics, content hash).
 *
 * @module claws-sdk/compiler/host
 */

export type {
  CompileDiagnostic,
  CompileOptions,
  CompileResult,
  CompileStage,
  StageName,
  StageTiming,
} from './types.js';

export { compile } from './compile.js';
export { serializeStageTimings } from './stage-timings-serialize.js';
export type { SerializeOptions as StageTimingsSerializeOptions } from './stage-timings-serialize.js';
export { STAGE_CACHE_KEY_SCHEMA_VERSION } from './stage-cache-key.js';
