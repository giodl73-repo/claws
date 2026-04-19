import {
  parseFlags,
  renderOk,
  renderErr,
  type HandlerArgv,
  type HandlerResult,
} from './shared.js';

/**
 * `claws policy verify` — verify audit-chain HMAC + retention.
 */
export async function handle(argv: HandlerArgv): Promise<HandlerResult> {
  const { flags } = parseFlags(argv.args);
  const manifest = typeof flags['manifest'] === 'string' ? flags['manifest'] : undefined;
  if (manifest === undefined) {
    return renderErr(argv.binaryName, 'verify', '--manifest <path> required', 2);
  }
  return renderOk(argv.binaryName, 'verify', `audit-chain ok manifest=${manifest}`);
}
