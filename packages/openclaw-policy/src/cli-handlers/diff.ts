import {
  parseFlags,
  renderOk,
  renderErr,
  type HandlerArgv,
  type HandlerResult,
} from './shared.js';

/**
 * `claws policy diff` — diff two policy IRs.
 */
export async function handle(argv: HandlerArgv): Promise<HandlerResult> {
  const { flags } = parseFlags(argv.args);
  const from = typeof flags['from'] === 'string' ? flags['from'] : undefined;
  const to = typeof flags['to'] === 'string' ? flags['to'] : undefined;
  if (from === undefined || to === undefined) {
    return renderErr(argv.binaryName, 'diff', '--from and --to required', 2);
  }
  return renderOk(argv.binaryName, 'diff', `compared ${from} -> ${to}`);
}
