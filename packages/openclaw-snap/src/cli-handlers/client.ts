/**
 * @bic/openclaw-snap/cli-handlers/client — shared HTTP client + argv parser
 * helpers used by all 11 snap verbs.
 *
 * CLI handlers are intentionally thin: argv → HTTP-client → render. The
 * server-side logic lives in ../server/; clients hit it over the wire so
 * the same handlers work against a local daemon or a remote snap server.
 *
 * @module @bic/openclaw-snap/cli-handlers/client
 */

export interface CliContext {
  readonly argv: readonly string[];
  readonly endpoint: string;
  readonly fetch?: typeof fetch;
  readonly stdout?: (line: string) => void;
  readonly stderr?: (line: string) => void;
}

export interface CliResult {
  readonly exitCode: number;
}

export interface ParsedArgs {
  readonly positional: readonly string[];
  readonly flags: Readonly<Record<string, string | boolean>>;
}

export function parseArgs(argv: readonly string[]): ParsedArgs {
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i] as string;
    if (token.startsWith('--')) {
      const eq = token.indexOf('=');
      if (eq !== -1) {
        flags[token.slice(2, eq)] = token.slice(eq + 1);
      } else {
        const next = argv[i + 1];
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

export function writeLine(ctx: CliContext, line: string, stream: 'out' | 'err' = 'out'): void {
  if (stream === 'out' && ctx.stdout !== undefined) ctx.stdout(line);
  else if (stream === 'err' && ctx.stderr !== undefined) ctx.stderr(line);
}

export async function httpCall(
  ctx: CliContext,
  method: string,
  path: string,
  opts: { body?: unknown; idempotencyKey?: string } = {},
): Promise<{ status: number; body: unknown }> {
  const url = `${ctx.endpoint}${path}`;
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (opts.idempotencyKey !== undefined) headers['idempotency-key'] = opts.idempotencyKey;
  const fetchImpl = ctx.fetch ?? fetch;
  const init: RequestInit = { method, headers };
  if (opts.body !== undefined) init.body = JSON.stringify(opts.body);
  const res = await fetchImpl(url, init);
  const text = await res.text();
  const body: unknown = text === '' ? undefined : JSON.parse(text);
  return { status: res.status, body };
}
