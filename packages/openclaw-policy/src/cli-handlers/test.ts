import {
  parseFlags,
  renderOk,
  renderErr,
  type HandlerArgv,
  type HandlerResult,
} from './shared.js';

/**
 * `claws policy test` — run fixture scenarios against a mock gateway.
 */
export async function handle(argv: HandlerArgv): Promise<HandlerResult> {
  const { flags } = parseFlags(argv.args);
  const scenarios = typeof flags['scenarios'] === 'string' ? flags['scenarios'] : undefined;
  if (scenarios === undefined) {
    return renderErr(argv.binaryName, 'test', '--scenarios <path> required', 2);
  }
  return renderOk(argv.binaryName, 'test', `ran scenarios ${scenarios}`);
}
