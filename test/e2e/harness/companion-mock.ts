import { randomBytes } from 'node:crypto';
import { ClockMock } from './clock-mock.ts';
import {
  deriveKey,
  rotateKey,
  sign,
  KeyRegistry,
  type SigningKey,
} from './hmac-signer.ts';

export type CompanionMode = 'cli-stdin' | 'supervisor-http' | 'tenant-admin';
export type VerdictAction = 'allow' | 'deny' | 'never';

export interface Verdict {
  action: VerdictAction;
  delayMs?: number;
  signWithKeyId?: string;
}

export interface ApprovalRequest {
  providerId: string;
  contentHash: string;
  sequenceNumber: number;
  approverPrincipal: string;
  ttlMs: number;
}

export type ApprovalOutcome =
  | {
      status: 'allow' | 'deny';
      providerId: string;
      contentHash: string;
      sequenceNumber: number;
      approverPrincipal: string;
      keyId: string;
      issuedAtMs: number;
      ttlMs: number;
      nonce: string;
      signature: string;
      payload: Uint8Array;
    }
  | { status: 'timeout'; resolvedAtMs: number };

export interface CompanionMockOptions {
  seed: string;
  scenarioId: string;
  clock: ClockMock;
  registry?: KeyRegistry;
  mode?: CompanionMode;
}

export class CompanionMock {
  readonly registry: KeyRegistry;
  readonly trustedKeyIds: Set<string>;
  private activeKey: SigningKey;
  private mode: CompanionMode;
  private verdict: Verdict = { action: 'allow' };
  private readonly clock: ClockMock;
  private readonly scenarioId: string;

  constructor(opts: CompanionMockOptions) {
    this.clock = opts.clock;
    this.scenarioId = opts.scenarioId;
    this.registry = opts.registry ?? new KeyRegistry();
    this.mode = opts.mode ?? 'cli-stdin';
    this.activeKey = deriveKey(opts.seed, opts.scenarioId);
    this.registry.register(this.activeKey);
    this.trustedKeyIds = new Set([this.activeKey.keyId]);
  }

  setMode(mode: CompanionMode): void {
    this.mode = mode;
  }

  getMode(): CompanionMode {
    return this.mode;
  }

  programVerdict(verdict: Verdict): void {
    this.verdict = { ...verdict };
  }

  get signingKeyId(): string {
    return this.activeKey.keyId;
  }

  rotateKey(nextSeed: string): SigningKey {
    const next = rotateKey(this.activeKey, nextSeed);
    this.registry.register(next);
    this.registry.remove(this.activeKey.keyId);
    this.trustedKeyIds.delete(this.activeKey.keyId);
    this.trustedKeyIds.add(next.keyId);
    this.activeKey = next;
    return next;
  }

  trustKey(key: SigningKey): void {
    this.registry.register(key);
    this.trustedKeyIds.add(key.keyId);
  }

  untrustKey(keyId: string): void {
    this.trustedKeyIds.delete(keyId);
  }

  async decide(req: ApprovalRequest): Promise<ApprovalOutcome> {
    const { action, delayMs, signWithKeyId } = this.verdict;
    const wait = delayMs ?? 0;
    if (wait > 0) {
      this.clock.advance(wait);
    }
    if (action === 'never') {
      this.clock.advance(req.ttlMs * 2);
      return { status: 'timeout', resolvedAtMs: this.clock.nowMs() };
    }
    const signer = this.resolveSigner(signWithKeyId);
    const issuedAtMs = this.clock.nowMs();
    const nonce = randomBytes(12).toString('hex');
    const payload = buildPayload({
      providerId: req.providerId,
      contentHash: req.contentHash,
      sequenceNumber: req.sequenceNumber,
      approverPrincipal: req.approverPrincipal,
      keyId: signer.keyId,
      issuedAtMs,
      ttlMs: req.ttlMs,
      nonce,
      action,
      mode: this.mode,
    });
    const signature = sign(payload, signer);
    return {
      status: action,
      providerId: req.providerId,
      contentHash: req.contentHash,
      sequenceNumber: req.sequenceNumber,
      approverPrincipal: req.approverPrincipal,
      keyId: signer.keyId,
      issuedAtMs,
      ttlMs: req.ttlMs,
      nonce,
      signature,
      payload,
    };
  }

  private resolveSigner(keyId: string | undefined): SigningKey {
    if (keyId === undefined || keyId === this.activeKey.keyId) {
      return this.activeKey;
    }
    const material = this.registry.get(keyId);
    if (material === undefined) {
      throw new Error(`companion-mock: signWithKeyId '${keyId}' not in registry`);
    }
    return { keyId, key: material };
  }
}

function buildPayload(fields: {
  providerId: string;
  contentHash: string;
  sequenceNumber: number;
  approverPrincipal: string;
  keyId: string;
  issuedAtMs: number;
  ttlMs: number;
  nonce: string;
  action: Exclude<VerdictAction, 'never'>;
  mode: CompanionMode;
}): Uint8Array {
  const json = JSON.stringify({
    v: 1,
    providerId: fields.providerId,
    contentHash: fields.contentHash,
    sequenceNumber: fields.sequenceNumber,
    approverPrincipal: fields.approverPrincipal,
    keyId: fields.keyId,
    issuedAtMs: fields.issuedAtMs,
    ttlMs: fields.ttlMs,
    nonce: fields.nonce,
    action: fields.action,
    mode: fields.mode,
  });
  return new TextEncoder().encode(json);
}
