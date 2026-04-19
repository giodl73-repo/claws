/**
 * @bic/openclaw-snap/cli-handlers — argv→HTTP-client→render stubs for the
 * 11 `openclaw snap` verbs.
 *
 * Handlers are thin: each parses argv, hits the snap HTTP surface, and
 * renders the response. Authoritative behavior lives in ../server/.
 */
export { stage } from './stage.js';
export { status } from './status.js';
export { diffStaged } from './diffStaged.js';
export { discardStage } from './discardStage.js';
export { upload } from './upload.js';
export { list } from './list.js';
export { diff } from './diff.js';
export { checkout } from './checkout.js';
export { promote } from './promote.js';
export { rollback } from './rollback.js';
export { serve } from './serve.js';
export type { CliContext, CliResult, ParsedArgs } from './client.js';
export { parseArgs } from './client.js';
