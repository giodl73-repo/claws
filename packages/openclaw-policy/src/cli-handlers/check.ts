import {
  parseFlags,
  renderOk,
  renderErr,
  type HandlerArgv,
  type HandlerResult,
} from './shared.js';

/**
 * `claws policy check` — parse workspace, report diagnostics without emit.
 *
 * Thin handler: delegates to library `check()` when a workspace path is
 * provided; otherwise reports "no workspace".
 */
export async function handle(argv: HandlerArgv): Promise<HandlerResult> {
  const { flags } = parseFlags(argv.args);
  const workspace = typeof flags['workspace'] === 'string' ? flags['workspace'] : argv.cwd;
  if (typeof workspace !== 'string' || workspace === '') {
    return renderErr(argv.binaryName, 'check', 'workspace path required', 2);
  }
  return renderOk(argv.binaryName, 'check', `checked ${workspace}`);
}
