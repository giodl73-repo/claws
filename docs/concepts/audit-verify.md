# Audit Verification

Chain integrity proof for the CGR audit trail.

## Overview

`claws audit verify` walks the entire CGR hash chain and verifies that no record has been tampered with. It checks each record's HMAC seal against the previous record, validates signatures, and reports any integrity violations.

## Verification Process

```
  CGR Chain: [001] → [002] → [003] → ... → [N]
                │       │       │
            verify  verify  verify
            seal₁   seal₂   seal₃
```

For each record:

1. Recompute HMAC from record data + previous seal
2. Compare computed HMAC to stored seal
3. Verify Ed25519 signature (if signed record)
4. Report pass or fail

## Output

```bash
claws audit verify

Audit chain: 1,247 records
  Verified: 1,247 / 1,247
  Status: INTACT
  First record: 2026-01-15T08:00:00Z
  Last record: 2026-04-12T09:14:22Z
  Chain hash: d4e5f6a3b2c1...
```

On failure:

```bash
claws audit verify

Audit chain: 1,247 records
  Verified: 843 / 1,247
  Status: BROKEN at record 844
  Break point: 2026-03-22T14:30:00Z
  Expected seal: a3f1c9d2...
  Actual seal: 7b2e4d8f...
  Recommendation: Records after break point cannot be trusted
```

## Compliance Use

Chain integrity verification is a requirement for SOC2 (CC7.2), HIPAA (164.312(b)), and EU AI Act (Article 12). The verification output can be included directly in compliance evidence packages.

## Related

- [Audit Chain](audit-chain.md) -- how the chain is constructed
- [CGR](../../works/concepts/governance/cgr.md) -- Compile Governance Records
- `design/claws/ATOMS.md` -- C75 `atom:audit-verify`
