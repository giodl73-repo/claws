import { readFile } from 'node:fs/promises';

import { startMockGateway } from '../ops/mock-gateway.js';
import type { MockGatewayHandle } from '../ops/types.js';
import type { PolicyIR } from '../types/index.js';

import {
  parseFlags,
  renderErr,
  type HandlerArgv,
  type HandlerResult,
} from './shared.js';

export interface SimHooks {
  // Hook set for tests: when provided, overrides process signal wiring.
  waitForShutdown?: (handle: MockGatewayHandle) => Promise<void>;
}

/**
 * `claws policy sim` — start a local mock gateway bound to a PolicyIR.
 *
 * Flags:
 *   --policy-ir <path>    PolicyIR JSON (required)
 *   --port <n>            port to bind (default: 8443; 0 = ephemeral)
 *   --host <addr>         bind host (default: 127.0.0.1)
 *
 * The handler returns only after the gateway has been closed — either via
 * SIGINT / SIGTERM or by the caller-supplied `waitForShutdown` hook in
 * tests. `handle.close()` is always awaited on shutdown so no orphan
 * listener is left behind.
 *
 * Exit codes:
 *   0  — clean shutdown
 *   1  — library error starting gateway
 *   2  — usage error (missing flags, bad port)
 */
export async function handle(argv: HandlerArgv, hooks: SimHooks = {}): Promise<HandlerResult> {
  const { flags } = parseFlags(argv.args);
  const policyIrPath = typeof flags['policy-ir'] === 'string' ? flags['policy-ir'] : undefined;
  const portRaw = typeof flags['port'] === 'string' ? flags['port'] : undefined;
  const host = typeof flags['host'] === 'string' ? flags['host'] : undefined;

  if (policyIrPath === undefined) {
    return renderErr(argv.binaryName, 'sim', '--policy-ir <path> required', 2);
  }
  const port = portRaw === undefined ? 8443 : Number(portRaw);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    return renderErr(argv.binaryName, 'sim', '--port must be an integer in [0, 65535]', 2);
  }

  let policyIR: PolicyIR;
  try {
    const raw = await readFile(policyIrPath, 'utf8');
    policyIR = JSON.parse(raw) as PolicyIR;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return renderErr(argv.binaryName, 'sim', `failed to read policy-ir: ${message}`, 2);
  }

  let handle: MockGatewayHandle;
  try {
    const options = host !== undefined ? { policyIR, port, host } : { policyIR, port };
    handle = await startMockGateway(options);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return renderErr(argv.binaryName, 'sim', message, 1);
  }

  const stdout = `${argv.binaryName} policy sim: listening on ${handle.url}\n`;

  try {
    if (hooks.waitForShutdown !== undefined) {
      await hooks.waitForShutdown(handle);
    } else {
      await blockOnSignals(handle);
    }
  } finally {
    await handle.close();
  }
  return { exitCode: 0, stdout, stderr: '' };
}

function blockOnSignals(_handle: MockGatewayHandle): Promise<void> {
  return new Promise<void>((resolvePromise) => {
    const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
    const listeners = new Map<NodeJS.Signals, () => void>();
    const onSignal = (sig: NodeJS.Signals): void => {
      for (const s of signals) {
        const l = listeners.get(s);
        if (l !== undefined) process.off(s, l);
      }
      resolvePromise();
      void sig;
    };
    for (const s of signals) {
      const l = (): void => onSignal(s);
      listeners.set(s, l);
      process.once(s, l);
    }
  });
}
