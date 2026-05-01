/**
 * @bic/openclaw-lkg/fingerprint — sha256 + stat-shape fingerprint
 * helpers, mirroring `createConfigHealthFingerprint` in upstream's
 * `openclaw-core/src/config/io.observe-recovery.ts:285`.
 *
 * @module @bic/openclaw-lkg/fingerprint
 */

import * as crypto from 'node:crypto';
import type { Stats } from 'node:fs';
import type { LKGFingerprint } from '@bic/v2-prototype';

export function hashRaw(raw: string | Uint8Array): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export function makeFingerprint(args: {
  raw: string | Uint8Array;
  stat: Stats | null;
  observedAt?: string;
}): LKGFingerprint {
  const stat = args.stat;
  const bytes =
    typeof args.raw === 'string' ? Buffer.byteLength(args.raw, 'utf-8') : args.raw.byteLength;
  return {
    hash: hashRaw(args.raw),
    bytes,
    mtimeMs: stat?.mtimeMs ?? null,
    ctimeMs: stat?.ctimeMs ?? null,
    dev:
      stat && (typeof stat.dev === 'number' || typeof stat.dev === 'bigint')
        ? String(stat.dev)
        : null,
    ino:
      stat && (typeof stat.ino === 'number' || typeof stat.ino === 'bigint')
        ? String(stat.ino)
        : null,
    mode: stat && typeof stat.mode === 'number' ? stat.mode : null,
    nlink: stat && typeof stat.nlink === 'number' ? stat.nlink : null,
    uid: stat && typeof stat.uid === 'number' ? stat.uid : null,
    gid: stat && typeof stat.gid === 'number' ? stat.gid : null,
    observedAt: args.observedAt ?? new Date().toISOString(),
  };
}
