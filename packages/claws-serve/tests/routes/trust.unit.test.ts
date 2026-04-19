/**
 * L0 unit test — statusForTrustError (Pulse 39).
 *
 * Exercises every branch of the error-code → HTTP-status table so the
 * CISO mapping is pinned against regression.
 */

import { describe, expect, it } from 'vitest';
import { statusForTrustError } from '../../src/routes/trust.js';

describe('statusForTrustError (Pulse 39)', () => {
  it('maps every TrustError code to the pulse-spec status', () => {
    expect(statusForTrustError('JWT_MISSING')).toBe(403);
    expect(statusForTrustError('JWT_BAD_AUDIENCE')).toBe(403);
    expect(statusForTrustError('JWT_BAD_SUBJECT')).toBe(403);

    expect(statusForTrustError('JWT_MALFORMED')).toBe(401);
    expect(statusForTrustError('JWT_BAD_SIGNATURE')).toBe(401);
    expect(statusForTrustError('JWT_EXPIRED')).toBe(401);

    expect(statusForTrustError('JWT_REPLAYED')).toBe(409);

    expect(statusForTrustError('TIER_INVALID')).toBe(400);
    expect(statusForTrustError('TIER_NOT_PROMOTION')).toBe(400);
  });
});
