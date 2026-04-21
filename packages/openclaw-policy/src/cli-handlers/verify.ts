import { readFile } from 'node:fs/promises';
import {
  parseFlags,
  renderOk,
  renderErr,
  type HandlerArgv,
  type HandlerResult,
} from './shared.js';
import { verifyAudit } from '../ops/verify-audit.js';
import type { AuditEntry } from '@bic/openclaw-guardrails/audit';

/**
 * `claws policy verify` — verify audit-chain HMAC + retention.
 *
 * Reads a JSON chain file at `--manifest <path>` shaped
 * `{ chain: AuditEntry[]; genesis?: string }`, resolves the HMAC key from
 * `OPENCLAW_AUDIT_HMAC_KEY` (hex), delegates to `verifyAudit`, and maps the
 * result to exit codes per openclaw-upstream-spec §3.
 */
export async function handle(argv: HandlerArgv): Promise<HandlerResult> {
  const { flags } = parseFlags(argv.args);
  const manifest = typeof flags['manifest'] === 'string' ? flags['manifest'] : undefined;
  if (manifest === undefined) {
    return renderErr(argv.binaryName, 'verify', '--manifest <path> required', 2);
  }

  const env = argv.env ?? {};
  const hmacHex = env['OPENCLAW_AUDIT_HMAC_KEY'];
  if (typeof hmacHex !== 'string' || hmacHex.length === 0) {
    return renderErr(
      argv.binaryName,
      'verify',
      'OPENCLAW_AUDIT_HMAC_KEY env var required (hex-encoded)',
      2,
    );
  }

  let hmacKey: Buffer;
  try {
    hmacKey = Buffer.from(hmacHex, 'hex');
    if (hmacKey.length === 0) {
      throw new Error('empty HMAC key after hex decode');
    }
  } catch (err) {
    return renderErr(
      argv.binaryName,
      'verify',
      `OPENCLAW_AUDIT_HMAC_KEY invalid: ${(err as Error).message}`,
      2,
    );
  }

  let parsed: { chain: AuditEntry[]; genesis?: string };
  try {
    const raw = await readFile(manifest, 'utf8');
    parsed = JSON.parse(raw) as { chain: AuditEntry[]; genesis?: string };
  } catch (err) {
    return renderErr(
      argv.binaryName,
      'verify',
      `failed to read manifest ${manifest}: ${(err as Error).message}`,
      1,
    );
  }

  if (!Array.isArray(parsed.chain)) {
    return renderErr(
      argv.binaryName,
      'verify',
      `manifest ${manifest} missing 'chain' array`,
      1,
    );
  }

  const result = verifyAudit({
    chain: parsed.chain,
    hmacKey,
    ...(parsed.genesis !== undefined ? { expectedGenesis: parsed.genesis } : {}),
  });

  if (!result.valid) {
    return renderErr(
      argv.binaryName,
      'verify',
      `chain invalid: brokenAt=${result.brokenAt ?? 'unknown'} length=${result.length}`,
      1,
    );
  }

  return renderOk(argv.binaryName, 'verify', `audit-chain ok entries=${result.length}`);
}
