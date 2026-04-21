# canonicalizer-multi-consumer fixture

Full-shape policy-IR consumed by SC-08 (canonicalizer byte-identical
multi-consumer scenario). The three consumers are:

1. **producer** — `claws policy generate` emits this shape for audit's
   `policyArtifactSha256`.
2. **host-mock** — harness canonicalize implementation serializes this
   tree to drive merger decisions.
3. **companion-mock** — signs an approvalHandle whose `contentHash` is
   derived from the canonicalized bytes.

All three consumers MUST produce the same byte stream when passed this
document; SC-08 asserts that invariant.

## Shape

- `schemaVersion` / `canonicalizerVersion` / `scope` at the top.
- `tools[]` with three entries, one per verb (allow, review-conjunctive,
  modify).
- `trustSet` block mirrors the P-04 seed shape so canonicalizer tests
  cover the same field set that scenario fixtures touch.
- `rules.deny` + `rules.modify` carry the SOUL rule shapes referenced by
  the verb fixtures.
- `audit.policyArtifactSha256Fields` lists the canonicalized field set
  that feeds the ProducerEntry hash.

Bytes are plain UTF-8, LF line endings (no BOM) — the scenarios that
exercise CRLF + BOM survival use `allow-r1-public` instead, because this
fixture is about JCS canonicalization, not byte preservation.
