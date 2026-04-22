/**
 * test/e2e/harness/snap-runner-envelope — stdout envelope parser.
 *
 * Isolated from snap-runner.ts so unit tests can cover the parsing
 * contract (the sole cross-process synchronization point with the
 * shipped CLI) without pulling in the child-process spawning path.
 *
 * The envelope format matches what `runSnapServe` writes in JSON mode:
 * `{"status":"listening","port":N,"host":"…","url":"http://…"}`.
 *
 * @module test/e2e/harness/snap-runner-envelope
 */

export interface ListeningEnvelope {
  readonly port: number;
  readonly url: string;
}

export function parseListeningLine(line: string): ListeningEnvelope | null {
  const trimmed = line.trim();
  if (trimmed === '' || !trimmed.startsWith('{')) return null;
  try {
    const obj = JSON.parse(trimmed) as { status?: unknown; port?: unknown; url?: unknown };
    if (obj.status !== 'listening') return null;
    if (typeof obj.port !== 'number' || typeof obj.url !== 'string') return null;
    return { port: obj.port, url: obj.url };
  } catch {
    return null;
  }
}
