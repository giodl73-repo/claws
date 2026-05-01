# upstream-proposal-pr295 Review · compliance-officer · R1

**Date**: 2026-04-30
**Verdict**: APPROVE-WITH-WARNINGS
**Reviewer**: The Compliance Officer (persona OC-P08)
**Frame**: SOC 2 §CC7.2 (logical access controls), SOC 2 §CC6.1 (logical and physical access),
HIPAA §164.312(b) (audit controls), HIPAA §164.312(c)(1) (integrity), EU AI Act Art. 12
(record-keeping), Art. 14 (human oversight), ISO 27001 A.12.4 (logging), FedRAMP AU-family.

---

## TL;DR for the audit committee

The chain delivers something I have wanted since v1: a **content-addressed anchor that
survives a hostile agent edit and emits a recovery audit record**. That's a real
HIPAA §164.312(c)(1) integrity primitive and a real SOC 2 §CC7.2 detective control. The
326 adversarial scenarios is the strongest evidence base I've seen come out of this
contributor wave — that's the kind of artifact I can hand to an external auditor.

**But this is contract-level work for an enterprise with regulatory exposure**, and there
are five gaps where the proposal is either silent, deferred, or explicitly punts to
"operator territory." I can sign off on landing this upstream **conditional** on those
gaps being closed before claws turns it on for any tenant under a HIPAA BAA or an FFIEC
audit. Listed below as HC-WARN.

I do not consider any of these BLOCK-class for the *upstream contract* — most of the gaps
are properly downstream / operator concerns. They become BLOCK-class for *enterprise
deployment*. This distinction matters: I am not vetoing the PR; I am noting the work that
must accompany the PR for me to underwrite the deployment posture.

---

## HC-BLOCK findings (compliance-blockers — must close before regulated deployment)

_None at the contract layer._ The contract is auditable in shape. Blockers are at the
operator-deployment layer, addressed below as HC-WARN with their compliance-clause
mapping.

---

## HC-WARN findings (compliance gaps — must address before regulated tenants)

| # | Title | Where | Framework | Action |
|---|---|---|---|---|
| W1 | "Two anchors" reads as defense-in-depth in the marketing pitch but as **two separate failure points** in the audit envelope | `upstream-pr3-policyir.md` §"Defense in depth — two anchors"; `pr-strategy.md:107-111` | SOC 2 §CC7.2; ISO 27001 A.12.4.1 | The proposal claims `policyId = sha256(jcs(body))` and `LKGFingerprint.hash = sha256(rawBytes)` are defense-in-depth. From an audit perspective they are **not redundant** — they protect different threat models (canonical-form tampering vs. on-disk byte tampering) and they fail in **different** ways. That's *complementary*, not *defense-in-depth*. **Required**: rename to "two-axis integrity" or "complementary anchors" in the contract docs; specify in the failure-semantics table that an evaluator MUST check **both** at decision time, and that disagreement between the two MUST emit an audit event distinct from a single-anchor mismatch. Today an operator who only checks `policyId` (because PolicyIR is already loaded into memory) will silently miss bytes-on-disk tampering. The contract needs to make checking-both the contractual default. |
| W2 | Audit envelope on recovery is underspecified for forensic reconstruction | `upstream-pr2-lkg.md` §Failure semantics, §Reference plugin | HIPAA §164.312(b); SOC 2 §CC7.2; EU AI Act Art. 12; FedRAMP AU-2, AU-3 | The `LKGObservation.outcome === 'recovered'` shape carries `reason`, `clobberedPath`, and `restoredFrom`. **What it doesn't carry**: `replacedFingerprint` (the hash of the bytes we just rejected), `actor` (which agent identity wrote the bad bytes — `agentId` from the gateway), `correlation.eventId` chaining this recovery to the write event that triggered it, `clobberedHash` (sha256 of the .clobbered file so an investigator can prove what they're looking at), and `policyDecisionContext` if the bad bytes were a PolicyIR (which `ctx.lkgFingerprint` was active at the time the bad write was attempted). Without these fields, an auditor reconstructing "what did the agent do at 14:32:07 UTC" cannot link the recovery to the write. **Required**: extend `LKGObservation` (the recovered variant) to be the audit-shaped record, with the fields above. The contract docs should explicitly state which fields are NORMATIVE for HIPAA §164.312(b) audit-control compliance and which are advisory. |
| W3 | The three [GAP]s are real audit findings, not "acceptable known limits" — and they need compensating-control documentation | `upstream-pr2-lkg.md` (referenced via package evidence: 326 scenarios, 1 bug, 3 [GAP]s) | SOC 2 §CC7.2; HIPAA §164.312(c)(1); FedRAMP RA-3 (risk assessment) | Per the entry doc, the three documented [GAP]s are: (a) FS tamper detect-on-recover-only, (b) clobbered-collision-under-frozen-clock, (c) `readLastKnownGood` no-hash-check. From a compliance posture: **(a)** means a tampered LKG file is only detected at the moment of recovery, not at promote-time or at periodic-scan time. That's a window where corrupted bytes can be served as authoritative. SOC 2 detective-control standard wants "as soon as practicable, not when the next failure happens to surface it." **(b)** clock-frozen → `.clobbered.<ts>` collision means an evidence file is silently overwritten. That's a destruction-of-evidence vector and it would fail a forensic-readiness audit. **(c)** `readLastKnownGood` returning bytes without a fresh hash check is exactly the integrity gap that makes the "two anchors" story (W1) load-bearing — and the second anchor isn't required by contract. **Required**: each [GAP] needs an explicit compensating-control note: who detects, how often, what triggers an alert, what the remediation runbook is. "Documented as `[GAP]` with mitigation paths" is a development-process disposition; what compliance needs is a **runtime** disposition. Without that, these are R-class audit findings, not green-lights. |
| W4 | Signing is punted to "operator territory" with no normative API hook for chain-of-custody | `pr-strategy.md:84` ("signing is operator-territory layered on top — gateway can sign `(lkgFingerprint, capturedAt, gatewayKeyId)` for chain-of-custody"); `upstream-pr3-policyir.md` §"What's NOT in the contract" | SOC 2 §CC6.1, §CC7.2; HIPAA §164.312(d) (person-or-entity authentication); EU AI Act Art. 12; FedRAMP AU-10 (non-repudiation) | I understand the architectural argument: signing is a deployment concern and forcing a key-management posture upstream is wrong. I accept that. **What I cannot accept** is that the contract has no *hook* for an operator to bind a signature to an LKG observation in a way every consumer must respect. Today an operator can sign whatever they want and store it wherever they want, and a downstream guardrail has no contractual obligation to verify it. That's not chain-of-custody; that's chain-of-good-intent. **Required**: add an optional `attestation?: { signature: string; keyId: string; algorithm: string }` field on `LKGFingerprint` (or on `LKGObservation`), with the contract stating: *if* present, consumers MUST verify it before treating the fingerprint as authoritative; *if* absent, consumers MAY proceed but MUST emit an audit event tagged `attestation.absent`. This gives me the upstream contractual ground to stand on when I tell our CISO "yes, every policy decision in production carries a verified signature back to the gateway key." Without it, I'm taking that on operator-trust, which the auditor will not accept under SOC 2 §CC6.1. |
| W5 | Multi-tenant LKG fingerprint isolation is not specified | All three pre-RFCs; `LKGStore` contract has no tenant axis | HIPAA §164.308(a)(4) (information access management); FedRAMP AC-4 (information flow); SOC 2 §CC6.1 | The `LKGStore` contract is keyed by absolute filesystem path. In a multi-tenant deployment (which is the M365 / Aether reality, not a hypothetical), two tenants' workspaces sit at different paths but share an `LKGStore` instance per gateway process. Nothing in the contract prevents tenant-A's `LKGTracker<T>` registration from observing tenant-B's path if a misconfiguration or a hostile plugin issues `lkgStore.observe('/tenants/B/workspace/...')`. The fingerprint cache is process-global. **Required**: contract MUST specify the isolation boundary. Either (a) `LKGStore` is per-tenant (one store per tenant root, enforced by the gateway), or (b) the contract carries a `tenantId` field on every method and consumers MUST scope their registrations. Today the proposal is silent, which means operators will pick one of these by accident, and which one they picked will only surface during an external pen-test or an incident. Per persona OC-P08 decision rule: *fail closed on policy outage; failure mode IS policy*. Multi-tenant isolation MUST be specified in the contract. |

---

## HC-NOTE findings (capture for follow-up; not blocking)

| # | Title | Where |
|---|---|---|
| N1 | `LKGFingerprint.observedAt` is ISO-8601 string, not a hash-chained timestamp. For SOC 2 §CC7.2 detective controls and HIPAA audit-control reconstruction, monotonic-clock-with-chain is preferred over wall-clock; consider a `chainedAt?: string` companion field that pulls from the gateway's existing audit-chain nonce. | `upstream-pr2-lkg.md:95` (`observedAt`) |
| N2 | The `policyId` canonicalization rule (RFC 8785 JCS) is excellent for content-canonical identity but the contract should explicitly note that **operator-side policy-version pinning** (e.g., "tenant T is locked to `policyId=abc...` until 2027-01-01") is a downstream concern; the contract surface should not let a runtime auto-upgrade past a pinned `policyId` without an audit event. Probably already true given the LKG promote semantics, but worth making normative. | `upstream-pr3-policyir.md` §Canonicalization |
| N3 | EU AI Act Art. 14 (human oversight) implies that recovery events on PolicyIR (a "high-risk AI system" component under the Act for many of our deployments) MUST be **surfaced to the supervisor** before the next agent turn. The proposal mentions a "recovery notice queued for next agent turn" — confirm that for EU-tenant deployments this notice path is operator-configurable to require *human acknowledgment* before resume, not just *agent acknowledgment*. | `upstream-pr2-lkg.md` §Reference plugin |
| N4 | Data residency: `LKGStore` reference impl writes `.lkg` and `.clobbered.<ts>` files alongside the protected file. For Aether (OneDrive/SharePoint-backed FUSE per our memory note on Ryan Gregg's stack), this means the `.clobbered.<ts>` files inherit the tenant's geographic boundary by virtue of being colocated. That's good. The git-backed impl has different residency semantics. The contract should note that `LKGStore` impls MUST preserve geographic-boundary parity with the protected file. | `upstream-pr2-lkg.md` §Implementation status |
| N5 | The `clobberedPath` content is documented as "preserved indefinitely (host-policy decision; reference plugin keeps until manual cleanup)." For HIPAA §164.530(j) (6-year retention) and SOX (7-year retention for financial-services tenants), the contract should expose a normative retention-policy hook so operators can configure compliant retention windows. Today silent indefinite retention may *itself* breach data-minimization principles under GDPR Art. 5(1)(e). | `upstream-pr2-lkg.md` §"Cross-cutting compounding"/forensics |
| N6 | The merger conjunctive-AND fix in PR-3 is the *right* compliance posture (chain-of-custody at enforcement is exactly what we need). Note for the audit envelope: when plugin-A's approval requirement is preserved alongside plugin-B's approval requirement, the audit MUST record **both** as separate `requires-approval` records with their respective `rule` IDs, not a merged one. Otherwise SOC 2 §CC7.2 reconstruction can't tell which control fired. | `upstream-pr3-policyir.md` ; `pr-strategy.md` PR-3 |

---

## Strengths (recognized for the audit record)

- **The 326 adversarial scenarios is genuinely strong.** That's the kind of evidence base
  I can put in front of an external auditor and have them treat as substantive testing,
  not "we ran the happy path and it passed." The dual-backend `describe.each([fs, git])`
  is exactly the right shape for "the abstraction holds across implementations" —
  auditors love that, because it means the contract isn't accidentally tied to one
  implementation's quirks.
- **One real bug found in-session and fixed.** That's a healthy ratio for a 326-scenario
  campaign. A campaign that finds zero bugs is suspicious; this one is credible.
- **Three known limits documented as `[GAP]`s** — *the practice* of documenting limits
  rather than hiding them is exactly what I need from an upstream contributor. The
  *content* of those gaps still needs compensating-control disposition (W3) but the
  posture of disclosing them is the right one.
- **Fail-closed semantics are explicit** at every documented failure path in
  `upstream-pr3-policyir.md` §"Failure semantics." The table that says "PolicyIR missing
  → deny", "PolicyIR malformed → deny", "policyId mismatch → tampered, deny",
  "generatedFrom mismatch → deny" is precisely what persona OC-P08 decision rule
  requires: *outage must equal denial; never silent bypass*. This is correct.
- **PR-1's `OcEmitSentinelError` is a real compliance win**. The
  `__OPENCLAW_REDACTED__` corruption class would have been a finding in any HIPAA or
  PCI assessment of the v1 substrate. PR-1 closes it at the substrate, not the consumer.
  That's the right architectural disposition, and it removes a class of secret-disclosure
  vector that was previously latent. Concretely: I can stop worrying about whether
  redacted views accidentally make it to disk for our regulated tenants. I do not have
  HC-WARN concerns on PR-1 beyond standard "verify the sentinel rejection covers
  *every* write path" assurance, which the 409-test suite addresses.
- **No daemon, no new ports, no new RBAC surface.** Every additional process or port is
  another thing the security team has to threat-model and the operations team has to
  monitor. The contract-only, types-only, no-daemon shape (PR-3 explicitly) means
  there's nothing for me to add to the corporate risk register. That's a bigger
  compliance win than the proposal text explains.
- **Content-addressed `policyId` via RFC 8785 JCS** is the right canonicalization
  primitive. JCS is published, stable, and reproducible across implementations. Two
  generators producing semantically-identical PolicyIR producing identical `policyId`
  is *exactly* what I need to give an auditor "policy-version-X was in force at
  decision-time-T" with cryptographic proof.

---

## Per-question probe responses (the asks in the review brief)

### "Two anchors" — defense in depth or two separate failure points?

**Both, and the proposal conflates them.** They are complementary because they protect
different threat models: `policyId` catches body tampering after re-serialization (which
LKG bytes-hash would miss because it sees only on-disk bytes); `LKGFingerprint.hash`
catches on-disk byte tampering (which `policyId` would miss if a hostile process
replaced the file but the in-memory PolicyIR was already loaded). They are *separate
failure points* in the sense that an evaluator who only checks one will silently miss
the other class.

This is genuinely useful — when both are checked, the system is robust against both
threat models. But it is *not* defense-in-depth in the classical sense (two layers of
the same control). It's two-axis integrity. Calling it defense-in-depth in marketing
copy is fine; calling it defense-in-depth in the contract docs misleads operators into
thinking checking one suffices. **See W1.**

### Audit emission on recovery — is the shape adequate?

**Insufficient for HIPAA §164.312(b) and SOC 2 §CC7.2 forensic-reconstruction.** The
recovered observation carries `reason`, `clobberedPath`, and `restoredFrom.hash`
(the hash we recovered to). It does NOT carry: the hash of the rejected bytes, the
agent identity that wrote them, the correlation eventId chaining to the write event,
the hash of the `.clobbered.<ts>` file as preserved on disk (so chain-of-custody on the
forensic artifact), or the `lkgFingerprint` that was active in the policy decision
context if the recovery is on PolicyIR. **See W2.** The `clobberedPath` content is
preserved (good — that's the forensic artifact), but the link between the artifact and
the audit record is informal. An auditor will ask "prove this `.clobbered.20260430-143207`
file is the same one that triggered audit event X" and today the answer is "they're in
the same directory at the same timestamp." That's circumstantial, not cryptographic.

### Three [GAP]s — acceptable known limits or audit findings?

**They're audit findings until they have compensating-control documentation.** A `[GAP]`
labeled in dev docs is an *engineering* disposition; what compliance needs is a
*runtime* disposition (who detects, how often, what alerts, what's the runbook). **See
W3.** The development-side disclosure is appreciated — far better than hidden bugs —
but the gap-to-control gap is still open.

### Signing — operator-side acceptable, or contract-level needed?

**Operator-side execution is fine; contract-level *hook* is required.** Forcing a
specific signing API upstream would be wrong (key management is a deployment concern).
But the contract MUST give consumers a normative slot for "if a signature is present,
verify it; if absent, audit the absence." Without that hook, downstream guardrails have
no contractual obligation to verify operator signatures, and the chain-of-custody story
collapses to "trust the operator did the right thing." That fails SOC 2 §CC6.1 review.
**See W4.**

### Multi-tenant key isolation — per-tenant or shared?

**Unspecified, which means whichever way operators interpret it.** The contract is silent
on whether `LKGStore` instances are per-tenant or process-global; the fingerprint cache
is process-global by default in the reference impl. For our deployment (which is
multi-tenant by definition under M365 + Aether), the contract MUST specify the isolation
boundary. **See W5.** This is the single highest-priority HC-WARN — it is the difference
between a compliance posture I can sign and one I can't.

---

## Verdict reasoning

**APPROVE-WITH-WARNINGS** is the right disposition because:

1. **The contract shape is correct.** Content-addressing, fail-closed semantics, dual-anchor
   integrity, no-daemon disposition, explicit canonicalization rule, audit emission on
   recovery — these are all the primitives a compliance officer wants in the substrate.
   Nothing in the contract shape needs to be architecturally redone for me to sign off.
   The architecture is right.
2. **The evidence base is strong.** 326 adversarial scenarios, dual-backend conformance,
   one real bug found, three documented gaps, byte-stable back-compat proof on PR-1.
   This is the kind of evidence I can hand to an external auditor without flinching.
3. **The gaps are bounded and addressable.** Every HC-WARN above is a *contract amendment*
   or a *documentation amendment*, not a redesign. W1 is renaming and a normative MUST.
   W2 is field additions to `LKGObservation`. W3 is compensating-control runbook prose.
   W4 is one optional field on the contract. W5 is a normative isolation paragraph.
   None require re-architecting the substrate.
4. **The compliance posture is honest.** The proposal explicitly enumerates what's NOT in
   scope (signing, audit format, generator implementation, evaluation logic) and gives
   reasons. I prefer an honest "not in scope" to a hand-wave "we handle that." The work
   to bring the upstream contract into a compliance-acceptable posture is bounded.

I would **REQUEST-CHANGES** if any of the following were true: (a) the contract had a
fail-open default anywhere; (b) the audit record on recovery was non-existent rather than
underspecified; (c) signing were declared "out of scope, won't take a hook"; (d) the
`policyId` canonicalization rule were nonstandard or unspecified. None of those are true.

I would **APPROVE** outright if the five HC-WARNs were addressed in the same PR chain.
They aren't required to be in the contract amendments themselves — most can be addressed
in claws-side compensating controls and operator runbooks — but they MUST exist somewhere
before the substrate is enabled for a regulated tenant.

**Specific compliance-clause coverage at the time of this review** (assuming HC-WARNs
addressed):

| Clause | Disposition |
|---|---|
| SOC 2 §CC6.1 (logical access) | PARTIAL — needs W4 (signing hook) and W5 (tenant isolation) |
| SOC 2 §CC7.2 (detective controls / monitoring) | STRONG with W2 (audit envelope) closed |
| HIPAA §164.312(b) (audit controls) | STRONG with W2 closed |
| HIPAA §164.312(c)(1) (integrity) | STRONG — content-addressing + LKG recovery is exactly the primitive this clause anticipates |
| HIPAA §164.312(d) (authentication / non-repudiation) | NEEDS W4 (signing) |
| HIPAA §164.308(a)(4) (information access mgmt — multi-tenant) | NEEDS W5 |
| HIPAA §164.530(j) (6-year retention) | NEEDS N5 (retention-policy hook) |
| EU AI Act Art. 12 (record-keeping) | STRONG with W2 closed |
| EU AI Act Art. 14 (human oversight on recovery) | NEEDS N3 (operator-configurable supervisor ack) |
| ISO 27001 A.12.4 (logging and monitoring) | STRONG with W2 closed |
| FedRAMP AU-2/AU-3 (audit content) | STRONG with W2 closed |
| FedRAMP AU-10 (non-repudiation) | NEEDS W4 (signing) |
| GDPR Art. 5(1)(e) (data minimization on `.clobbered` retention) | NEEDS N5 |

---

## Sign-off conditional

I (this persona) will sign off on enabling this substrate for any tenant under a HIPAA
BAA, an FFIEC examination scope, an EU AI Act Annex III deployment, or a FedRAMP-Moderate
boundary **conditional on**:

1. W2 (audit envelope) closed at the contract layer, with the recovered-observation
   shape carrying replaced-fingerprint, actor identity, correlation eventId, and
   clobbered-file hash.
2. W4 (signing hook) closed at the contract layer, with an optional `attestation` field
   and the normative MUST-verify-or-audit-absent rule.
3. W5 (multi-tenant isolation) closed at the contract layer, with explicit
   per-tenant-store or tenantId-on-every-method semantics.
4. W1 renamed (two-axis integrity) and the normative MUST-check-both rule added to the
   PolicyIR contract docs.
5. W3 [GAP]s each have a documented compensating-control runbook in the operator
   guide. The runbook does not need to live upstream; it needs to exist before claws
   turns this on.
6. N3 (EU AI Act Art. 14 human-ack on PolicyIR recovery) addressed in the operator
   guide.
7. N5 (retention-policy hook for `.clobbered.<ts>`) addressed either in the contract or
   in the reference impl with operator configurability.

Conditions 1, 2, 3, 4 are **upstream-contract** changes. Conditions 5, 6, 7 are
**downstream / operator-guide** changes and can land in claws. I would prefer condition
4 to land in the upstream PR rather than as a follow-up because the
"defense-in-depth-vs-two-axis" framing affects what every consumer's `evaluate()`
implementation must check — landing it as a follow-up means we have a window of time
where consumers think one anchor suffices.

**This is good work.** The 326 scenarios buys substantial credibility, the contract shape
is right, the failure semantics table is the kind of artifact compliance teams beg for
and rarely get. The gaps are real but bounded. Take the WARNs seriously and this is the
first piece of upstream substrate I can underwrite without reservation since the
hash-chained audit landed.

---

🤖 Compliance officer review (persona OC-P08). Audit posture: SOC 2 / HIPAA / EU AI Act /
FedRAMP / ISO 27001. Reviewed against persona decision rule: *fail closed on policy
outage; failure mode IS policy.* Approved-with-warnings; conditional sign-off enumerated
above. AI-assisted drafting per upstream PR rules.
