/**
 * claws-cli entry point.
 *
 * Wires the Commander.js program and handles uncaught errors
 * with the shared error contract format.
 *
 * @module claws-cli
 */

export { createProgram } from './cli.js';
export type { GlobalOpts } from './cli.js';
export { runCompile } from './commands/compile.js';
export { runCheck } from './commands/check.js';
export { preCommand } from './hooks/pre-command.js';
export type { PlatformContext, ClawsJsonConfig } from './hooks/pre-command.js';
export { createTimer, postCommand } from './hooks/post-command.js';
export type { CommandTiming } from './hooks/post-command.js';
export { formatError, formatErrorJson, noWorkspaceError, compileFailedError, noSourceFilesError } from './output/errors.js';
export type { ClawsError } from './output/errors.js';
export { createPalette, isColorDisabled, severityColor, severityLabel } from './output/color.js';
export type { Palette } from './output/color.js';
export { renderCheckOutput, formatViolation, formatSummary, countBySeverity } from './output/format-default.js';
export type { RenderableViolation, CheckResult } from './output/format-default.js';
export { renderCheckJson } from './output/format-json.js';
export type { JsonViolation, JsonCheckResult } from './output/format-json.js';
