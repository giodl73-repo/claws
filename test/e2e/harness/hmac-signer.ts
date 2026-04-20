import { createHmac, createHash, timingSafeEqual } from 'node:crypto';

export interface SigningKey {
  keyId: string;
  key: Buffer;
}

export type VerifyFailure = 'unknown-keyId' | 'signature-mismatch';

export interface VerifyResult {
  ok: boolean;
  reason?: VerifyFailure;
}

const SIG_SEP = '.';

export class KeyRegistry {
  private readonly keys = new Map<string, Buffer>();

  register(k: SigningKey): void {
    this.keys.set(k.keyId, k.key);
  }

  remove(keyId: string): void {
    this.keys.delete(keyId);
  }

  get(keyId: string): Buffer | undefined {
    return this.keys.get(keyId);
  }

  has(keyId: string): boolean {
    return this.keys.has(keyId);
  }
}

export function deriveKey(seed: string, scenarioId: string): SigningKey {
  if (seed.length === 0) {
    throw new Error('hmac-signer: seed must be non-empty');
  }
  if (scenarioId.length === 0) {
    throw new Error('hmac-signer: scenarioId must be non-empty');
  }
  const material = createHmac('sha256', seed).update(scenarioId).digest();
  const keyId = createHash('sha256')
    .update(seed)
    .update('\x00')
    .update(scenarioId)
    .digest('hex')
    .slice(0, 16);
  return { keyId: `k_${keyId}`, key: material };
}

export function sign(payload: Uint8Array, signingKey: SigningKey): string {
  const mac = createHmac('sha256', signingKey.key).update(payload).digest('hex');
  return `${signingKey.keyId}${SIG_SEP}${mac}`;
}

export function verify(
  payload: Uint8Array,
  signature: string,
  trustedKeyIds: Set<string>,
  registry: KeyRegistry
): VerifyResult {
  const sep = signature.indexOf(SIG_SEP);
  if (sep <= 0 || sep === signature.length - 1) {
    return { ok: false, reason: 'signature-mismatch' };
  }
  const keyId = signature.slice(0, sep);
  const macHex = signature.slice(sep + 1);
  if (!trustedKeyIds.has(keyId)) {
    return { ok: false, reason: 'unknown-keyId' };
  }
  const trusted = registry.get(keyId);
  if (trusted === undefined) {
    return { ok: false, reason: 'unknown-keyId' };
  }
  const expected = createHmac('sha256', trusted).update(payload).digest();
  const candidate = Buffer.from(macHex, 'hex');
  if (candidate.length !== expected.length) {
    return { ok: false, reason: 'signature-mismatch' };
  }
  return timingSafeEqual(candidate, expected)
    ? { ok: true }
    : { ok: false, reason: 'signature-mismatch' };
}

export function rotateKey(current: SigningKey, nextSeed: string): SigningKey {
  if (nextSeed.length === 0) {
    throw new Error('hmac-signer: nextSeed must be non-empty');
  }
  const material = createHmac('sha256', nextSeed).update(current.keyId).digest();
  const nextId = createHash('sha256')
    .update(current.keyId)
    .update('\x00')
    .update(nextSeed)
    .digest('hex')
    .slice(0, 16);
  return { keyId: `k_${nextId}`, key: material };
}
