---
checkpoint: 4
name: "Keys + Makers + Publish"
pulse_range: [28, 35]
depends_on_cp: 3
review_panel: [claws:gateway-eng, claws:ciso, craft:architect, claws:skill-author, claws:founder]
---

# CP-4: Keys + Makers + Publish

## Dispatch Plan

### Batch 1 (parallel)
- Pulse 28: key-generate-list — Ed25519/HMAC generation, storage tier abstraction, list display
- Pulse 29: scaffold-core — trust tier → risk cap mapping, dependency check, pinch-clean output

### Batch 2 (depends on batch 1)
- Pulse 30: key-rotate-revoke — rotation schedule, re-sign artifacts, revocation with audit event
- Pulse 31: annotate-heuristics — keyword-anchored risk/OBO inference, confidence scoring
- Pulse 32: scaffold-tiers — DECLARED/TYPED/VERIFIED tier flags, OBO auto-suggestion

### Batch 3 (depends on batch 2)
- Pulse 33: key-ceremony — M-of-N Shamir split/reconstruct, participant tracking, threshold enforcement
- Pulse 34: annotate-accuracy — test corpus (20 skills), accuracy bounds validation, YAML edge cases

### Batch 4 (depends on batch 3)
- Pulse 35: publish-pipeline — manifest state dispatch, atomicity, fleet policy, badge freshness, key resolution

## Exit Criteria
- [ ] `claws keys generate --algorithm ed25519` creates keypair in .claws/keys/
- [ ] `claws keys rotate` generates new version, re-signs pending artifacts, archives old
- [ ] M-of-N ceremony: reconstruct succeeds with M shares, fails with M-1
- [ ] `claws new skill` on T2 workspace caps risk at R3, dependency check emits version
- [ ] DECLARED/TYPED/VERIFIED tiers produce correct scaffold output
- [ ] `claws annotate` achieves >=85% accuracy within 1 R-level on 20-skill corpus
- [ ] OBO false-negative <3%, false-positive <15% on R4/R5
- [ ] YAML None/null disambiguation correct (P-229)
- [ ] `claws publish` distinguishes unsigned/valid-signed/invalid-signed/stale-signed
- [ ] Publish atomicity: simulated network failure → no local state mutation
- [ ] Fleet policy `requireVerifiedPublish: true` blocks DECLARED-tier publish
- [ ] L0: 52+ unit tests, L1: 17+ integration, L2: 12+ e2e, L3: 7+ accept
