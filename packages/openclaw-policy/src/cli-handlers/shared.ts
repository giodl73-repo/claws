/**
 * Shared helpers for policy CLI handlers (architect W1 closure).
 *
 * Handlers are deliberately thin: argv → library call → render. Business
 * logic belongs to the library surfaces exported from @bic/openclaw-policy.
 */

export interface HandlerArgv {
  binaryName: string;
  args: string[];
  cwd: string;
  env?: Record<string, string | undefined>;
}

export interface HandlerResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export function renderInfo(
  binaryName: string,
  verb: string,
  note: string,
): HandlerResult {
  return {
    exitCode: 0,
    stdout: `${binaryName} policy ${verb}: ${note}\n`,
    stderr: '',
  };
}

/**
 * @deprecated P58 replaced stub handlers with thin adapters; kept for any
 * straggler callers. Use `renderOk` / `renderErr` instead.
 */
export function renderPending(binaryName: string, verb: string): HandlerResult {
  return {
    exitCode: 0,
    stdout: `${binaryName} policy ${verb}: pending\n`,
    stderr: '',
  };
}

export function renderOk(
  binaryName: string,
  verb: string,
  detail: string,
): HandlerResult {
  return {
    exitCode: 0,
    stdout: `${binaryName} policy ${verb}: ${detail}\n`,
    stderr: '',
  };
}

export function renderErr(
  binaryName: string,
  verb: string,
  message: string,
  exitCode: number = 1,
): HandlerResult {
  return {
    exitCode,
    stdout: '',
    stderr: `${binaryName} policy ${verb}: ${message}\n`,
  };
}

export function parseFlags(
  args: readonly string[],
): { positional: string[]; flags: Record<string, string | boolean> } {
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < args.length; i += 1) {
    const token = args[i] as string;
    if (token.startsWith('--')) {
      const eq = token.indexOf('=');
      if (eq !== -1) {
        flags[token.slice(2, eq)] = token.slice(eq + 1);
      } else {
        const next = args[i + 1];
        if (next !== undefined && !next.startsWith('--')) {
          flags[token.slice(2)] = next;
          i += 1;
        } else {
          flags[token.slice(2)] = true;
        }
      }
    } else {
      positional.push(token);
    }
  }
  return { positional, flags };
}
