import {
  parseFlags,
  renderOk,
  renderErr,
  type HandlerArgv,
  type HandlerResult,
} from './shared.js';

/**
 * `claws policy watch` — arm single-shot ack (watcher lives in library).
 */
export async function handle(argv: HandlerArgv): Promise<HandlerResult> {
  const { flags } = parseFlags(argv.args);
  const workspace = typeof flags['workspace'] === 'string' ? flags['workspace'] : argv.cwd;
  if (typeof workspace !== 'string' || workspace === '') {
    return renderErr(argv.binaryName, 'watch', 'workspace path required', 2);
  }
  return renderOk(argv.binaryName, 'watch', `armed on ${workspace}`);
}
