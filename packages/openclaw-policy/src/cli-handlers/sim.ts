import {
  parseFlags,
  renderOk,
  renderErr,
  type HandlerArgv,
  type HandlerResult,
} from './shared.js';

/**
 * `claws policy sim` — print the mock-gateway endpoint URL for a given IR.
 *
 * Full gateway lifecycle (bind/close) belongs to the library ops; the CLI
 * verb reports intended URL shape in fixture mode.
 */
export async function handle(argv: HandlerArgv): Promise<HandlerResult> {
  const { flags } = parseFlags(argv.args);
  const port = typeof flags['port'] === 'string' ? Number(flags['port']) : 0;
  if (!Number.isFinite(port) || port < 0) {
    return renderErr(argv.binaryName, 'sim', '--port must be a non-negative integer', 2);
  }
  return renderOk(argv.binaryName, 'sim', `would bind 127.0.0.1:${String(port)}`);
}
