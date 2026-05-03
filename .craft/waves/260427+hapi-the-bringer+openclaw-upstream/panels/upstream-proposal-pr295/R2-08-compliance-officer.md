# R2 review — 08 the compliance officer

**Verdict**: APPROVE-WITH-WARNINGS
**R1 verdict was**: APPROVE-WITH-WARNINGS
**Delta vs R1**: Materially improved — three of my five HC-WARNs are structurally addressed at the contract layer; verdict stays APPROVE-WITH-WARNINGS only because the attestation slot lands as optional and W1/W3 still need prose.

## R1 concerns — status check

### Multi-tenant LKG isolation (top priority, R1-W5) — CLOSED

Best-shape resolution available. PR-2's "Multi-tenant isolation" section makes the boundary **structural, not parameter-based**: per-tenant `LKGStore` instances; `LKGStoreOptions.root` + `forbidPathsOutsideRoot: true` default; `LKG_TRACKER_PATH_INVALID` rejection at registration; per-store state-file and audit-stream scoping. PR-3 inherits the same posture — per-tenant policy plugin instances, cache keyed `(sessionKey, fingerprint.hash)` inside a tenant-scoped instance. The R1 phrasing I asked for ("structurally impossible to forget") is now literally in the docs ("no `tenantId` argument that could be forgotten"). For HIPAA §164.308(a)(4) and FedRAMP AC-4 this is the right shape: I can attest to information-flow control without depending on operator discipline. Sign-off condition #3 cleared.

### Contract-level signing slot for SOC 2 / FedRAMP (R1-W4) — PARTIAL → effectively CLOSED at contract layer, OPEN at enforcement

`LKGFingerprint.attestation?: string | null` is in the universal core. Backend-agnostic (Sigstore, gpg detached, ed25519, JWS) is correct — forcing a single algorithm upstream would have been wrong. The signature is over `hash` + `observedAt`, which gives me the "policy-version-X was in force at decision-time-T" anchor I need for FedRAMP AU-10 non-repudiation. Sign-off condition #2 cleared **at the contract layer**. See R2 concern below for the residual.

### Audit forensics on recovery (R1-W2) — CLOSED

All four R1-asked fields landed on `LKGObservation`-recovered: `replacedFingerprint`, `clobberedFileHash`, `actor` (with `kind: 'plugin' | 'hook' | 'agent-session' | 'host'`, `id`, `pid?`), `correlationEventId`. The actor-kind enum is better than I asked for — it disambiguates "which subsystem wrote the bad bytes" at the type level, which is exactly what an external HIPAA §164.312(b) auditor wants when reconstructing "what did the agent do at 14:32:07 UTC." The `clobberedFileHash` closes the cryptographic chain-of-custody on the `.clobbered.<ts>` artifact (R1 complaint: "they're in the same directory at the same timestamp" → now hash-bound). Sign-off condition #1 cleared.

## New R2 concerns

**C1 — `attestation?` is optional; compliance-grade deployments need a contract-stable way to require non-empty.** The PR-2 doc says "compliance-grade deployments can require the slot non-empty; default impls leave it null" — good intent, but the contract surface I'd want is one of: (a) an `LKGStoreOptions.requireAttestation: boolean` flag that makes empty-attestation observations reject at promote time with a typed error code (`LKG_ATTESTATION_REQUIRED`), or (b) a normative MUST in the contract docs that consumers in compliance-mode emit `attestation.absent` audit events. Without one of these, "require attestation" devolves to operator-side wrapper code, which fails SOC 2 §CC6.1 the same way W4 originally did. Soft ask for PR-2; can also land as a follow-up PR if it slows the train.

**C2 — R1-W1 (rename "defense in depth" → "two-axis integrity"; normative MUST-check-both)** isn't called out in the Option C summary. If the rename + normative rule landed, great; if not, this is still the highest-leverage prose change for the contract docs and should be confirmed before #clawtributors. Pure documentation; no contract-shape impact.

**C3 — R1-W3 [GAP] compensating-control runbooks** are downstream-of-claws work and aren't expected in the upstream PR. Still tracking for the claws operator guide.

## Recommendation for the channel

**Ready for #clawtributors conditional on C2 (W1 rename) being verified in `upstream-pr3-policyir.md` before posting.** C1 (mandatory-attestation hook) is a soft ask I can take as a follow-up — the slot exists, which is the contract-shape commitment that matters. The four-PR restructure made the breaking-change isolation story dramatically stronger for audit defensibility (PR-4's `gateway.approvalsMerger` flag plus its own release-notes surface is exactly what an auditor wants when asking "when did the merger semantics change and who was notified"). Compliance-clause coverage matrix from R1: SOC 2 §CC6.1 moves PARTIAL → STRONG (W4+W5 closed); FedRAMP AU-10 moves NEEDS → STRONG-pending-C1; HIPAA §164.312(b) moves to STRONG. This is the first upstream substrate I can sign without conditional language since the hash-chained audit landed.

---

🤖 R2 review by general-purpose agent reading as persona 08
