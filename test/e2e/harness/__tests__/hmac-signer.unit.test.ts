import { describe, it, expect } from 'vitest';
import {
  deriveKey,
  sign,
  verify,
  rotateKey,
  KeyRegistry,
} from '#harness/hmac-signer.ts';

describe('hmac-signer', () => {
  it('signs and verifies a payload under the signing key', () => {
    const reg = new KeyRegistry();
    const k = deriveKey('seed-a', 'scenario-1');
    reg.register(k);
    const payload = new TextEncoder().encode('hello-payload');
    const sig = sign(payload, k);
    const res = verify(payload, sig, new Set([k.keyId]), reg);
    expect(res.ok).toBe(true);
  });

  it('rejects tampered payload with signature-mismatch', () => {
    const reg = new KeyRegistry();
    const k = deriveKey('seed-b', 'scenario-1');
    reg.register(k);
    const payload = new TextEncoder().encode('original');
    const sig = sign(payload, k);
    const tampered = new TextEncoder().encode('tampered');
    const res = verify(tampered, sig, new Set([k.keyId]), reg);
    expect(res).toEqual({ ok: false, reason: 'signature-mismatch' });
  });

  it('rejects keyId missing from trusted set with unknown-keyId', () => {
    const reg = new KeyRegistry();
    const k = deriveKey('seed-c', 'scenario-1');
    reg.register(k);
    const payload = new TextEncoder().encode('payload');
    const sig = sign(payload, k);
    const res = verify(payload, sig, new Set(['k_other']), reg);
    expect(res).toEqual({ ok: false, reason: 'unknown-keyId' });
  });

  it('rotate-and-sign: rotated key verifies under new trust set', () => {
    const reg = new KeyRegistry();
    const k1 = deriveKey('seed-d', 'scenario-1');
    reg.register(k1);
    const k2 = rotateKey(k1, 'rotation-1');
    reg.register(k2);
    expect(k2.keyId).not.toBe(k1.keyId);
    const payload = new TextEncoder().encode('post-rotation');
    const sig = sign(payload, k2);
    const underNew = verify(payload, sig, new Set([k2.keyId]), reg);
    expect(underNew.ok).toBe(true);
    const underOld = verify(payload, sig, new Set([k1.keyId]), reg);
    expect(underOld).toEqual({ ok: false, reason: 'unknown-keyId' });
  });

  it('rejects malformed signature with signature-mismatch', () => {
    const reg = new KeyRegistry();
    const k = deriveKey('seed-e', 'scenario-1');
    reg.register(k);
    const payload = new TextEncoder().encode('x');
    const res = verify(payload, 'nosepratorhere', new Set([k.keyId]), reg);
    expect(res).toEqual({ ok: false, reason: 'signature-mismatch' });
  });

  it('rejects signature with unregistered keyId as unknown-keyId', () => {
    const reg = new KeyRegistry();
    const payload = new TextEncoder().encode('x');
    const res = verify(
      payload,
      'k_ghost.aa',
      new Set(['k_ghost']),
      reg
    );
    expect(res).toEqual({ ok: false, reason: 'unknown-keyId' });
  });

  it('rejects non-hex mac bytes as signature-mismatch', () => {
    const reg = new KeyRegistry();
    const k = deriveKey('seed-f', 'scenario-1');
    reg.register(k);
    const payload = new TextEncoder().encode('x');
    const res = verify(payload, `${k.keyId}.zz`, new Set([k.keyId]), reg);
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('signature-mismatch');
  });

  it('deriveKey rejects empty seed and empty scenarioId', () => {
    expect(() => deriveKey('', 's')).toThrow(/seed/);
    expect(() => deriveKey('seed', '')).toThrow(/scenarioId/);
  });

  it('rotateKey rejects empty nextSeed', () => {
    const k = deriveKey('seed-g', 'scenario-1');
    expect(() => rotateKey(k, '')).toThrow(/nextSeed/);
  });

  it('KeyRegistry has/get/remove behave consistently', () => {
    const reg = new KeyRegistry();
    const k = deriveKey('seed-h', 'scenario-1');
    expect(reg.has(k.keyId)).toBe(false);
    expect(reg.get(k.keyId)).toBeUndefined();
    reg.register(k);
    expect(reg.has(k.keyId)).toBe(true);
    expect(reg.get(k.keyId)).toBeDefined();
    reg.remove(k.keyId);
    expect(reg.has(k.keyId)).toBe(false);
  });
});
