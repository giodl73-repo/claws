# upstream-proposal-pr295 Review · enterprise-it-admin · R1

**Date**: 2026-04-30
**Reviewer**: The Enterprise IT Admin (OC-P07)
**Verdict**: APPROVE-WITH-WARNINGS

---

## Reviewer note (read first)

I am the IT/governance lead at an enterprise running openclaw across thousands of
managed agents. I do not author the agents' work; I author the _policies they
operate inside_. My auditor reviews this every quarter. My CISO has me on
speed-dial when anything in this stack moves. The questions below are exactly
the ones I will be asked when I take this upstream change to my own change-
advisory board, and exactly the questions my downstream auditor will ask me when
I sign the SOC 2 attestation for the next period. I am reading this proposal
through that lens — not as architecture, not as TypeScript, not as an open-
source citizen. As governance.

The reason I do not REJECT is that this proposal _moves my world forward_ on the
two issues that wake me up at night: silent secrets-corruption (PR-1) and silent
approval-drops (PR-3). The reason I do not APPROVE clean is that the migration
cost is non-trivial and three of the four chain-of-custody seams I want closed
are only _partially_ closed in this drop.

I want this in. I want it in with eyes open.

---

## HC-BLOCK findings (governance blockers — must be addressed before I sign)

_None._ The chain-of-custody story holds end-to-end (workspace bytes →
LKGFingerprint → PolicyIR `generatedFrom` → `ctx.lkgFingerprint` →
`evaluate(ctx)` → conjunctive merger → audit). My blockers would be (a) a
silent regression in approval enforcement, (b) a silent regression in secret
hygiene, (c) cross-tenant LKG bleed. None of those is present at the contract
level. The issues that exist are migration costs, audit-trail gaps, and
forward-compat hazards I can plan around — not architectural defects.

## HC-WARN findings (must address before this hits my fleet)

| #   | Title                                                                                                  | Where                                                                                               | Action                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| W1  | Merger fix is a behavior change my supervisor UI is not ready for                                      | `pr-drafts/v2-policy-ir.md §"Hook approval-merger fix"`                                             | The widening from `ApprovalDescriptor` → `ApprovalDescriptor \| ApprovalDescriptor[]` at `hook-types.ts:421-433` _is_ the chain-of-custody fix. Good. But every supervisor UI in my fleet — including third-party ones I don't control — assumes the old shape. The proposal documents this ("Codemod for consumers reading `result.requireApproval` as a single object — coerce to array") and I accept that the break is the proof. I need (a) an explicit upstream **deprecation window of at least one minor release** with both shapes accepted on the read side, OR (b) a **policy flag** I can flip in v1 that opts my fleet into conjunctive-AND ahead of the broader cutover, so my pilot tenants surface UI breakage before all 4,000 of my supervisor consoles try to render the array shape on the same Tuesday morning. As written, this is "land it, codemod the world." That is not how I roll out approval-flow changes to a regulated fleet.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| W2  | `__OPENCLAW_REDACTED__` sentinel guard is literal-only — forwards-compat hazard                        | `pr-drafts/PR-1.md §Security Impact`                                                                | This is the right _floor_. I want it. The PR is honest that pattern-matching for resolved secret shapes (`sk-…`, `ghp_…`, `xox[baprs]-…`, PEM, Bearer tokens) is a follow-up. From my seat, the literal-sentinel rejection covers the documented corruption cases (#62281, #44357, #13495, #21573, #13210, #12078) — fine. But the failure mode I actually fear is the _next_ corruption pattern, not the last one. If my SecretRef vocabulary ever rotates (and it will — the redaction substrate is owned by Lobster's identity team and they version it), the new sentinel is silently unguarded until upstream catches up. I want (i) the sentinel string sourced from a registry the redaction module also reads, so substrate and guard rotate together, OR (ii) a documented contract that the guard is "exact-string match against a _list_ you can extend" rather than `=== '__OPENCLAW_REDACTED__'`. As written, my auditor reads "literal-only" and asks me what stops the next pattern from slipping through. The honest answer today is "nothing in this PR — defense lives in a follow-up." That answer ages badly.                                                                                                                                                                                                                                                                                                                                                          |
| W3  | Audit trail when LKG recovery fires mid-session is under-specified                                     | `pr-drafts/v2-lkg-contract.md §Security Impact` + `lkg-pre-rfc.md`                                  | The PR says audit emits on every observe outcome (`promoted \| valid \| recovered \| invalid \| unparseable`) and that the recovery-notice cross-links by `(ts, trackerPath, clobberedPath, restoredFrom.hash)`. Good. What I cannot find: when recovery fires _mid-session_ — e.g., the gateway promotes PolicyIR v2, a plugin caches it, the file is then corrupted by an agent edit, LKG restores v1 _while a tool call is in flight_ — does the audit record carry the **session ID** the policy decision was about to be made under? Does it carry the **agent ID**? Does the recovery-notice for the _next agent turn_ identify _which_ agent's turn was affected? My SIEM correlates on `(tenantId, sessionId, agentId, decisionId)`. If the LKG audit emits in a different correlation namespace ("recovery happened in tracker `foo`") and then the policy-deny audit emits in _another_ namespace ("tool call X denied because policy-ir-missing"), my Sentinel queries cannot reconstruct the chain. I want one of: (i) the LKG `AuditRecord` includes the `(sessionId, agentId, correlationId)` tuple of the request that triggered the observe, (ii) a `recovery-notice` event that carries the same correlation tuple so my SIEM can stitch, or (iii) explicit documentation that LKG audit is intentionally session-agnostic and I bear the join cost downstream. (iii) is acceptable but I need it written down so my compliance officer doesn't think I missed something. |
| W4  | Multi-tenant isolation of LKG state is implicit, not enforced                                          | `pr-drafts/v2-lkg-contract.md §"plugin-pool isolation"` (in the adversarial-findings comment block) | The adversarial waves locked in "each plugin gets its own LKGStore; cross-plugin path lookup returns null; audit hooks are per-store" — good. What's NOT locked in at the contract level is **per-tenant** isolation. In my deployment, one plugin pool may serve multiple tenants (cost optimization), and my isolation boundary is `tenantId`, not "plugin instance." If two tenants share a plugin pool and tenant A's PolicyIR LKG path _normalizes_ to the same string as tenant B's (path collision via `path.normalize`), do their fingerprints collide? The "REG1, REG2" invariants say "equivalent paths COLLIDE" by design — that's the right answer for _intra-tenant_ dedup, but it's the _wrong_ answer for _cross-tenant_ isolation. I need the contract to either (i) require trackers to register a `tenantScope` field that participates in path canonicalization, OR (ii) document explicitly that tenant scoping is the _caller's_ responsibility and the LKG store is tenant-blind. The proposal is silent. Silent on multi-tenant isolation reads as "we didn't think about it" to my auditor.                                                                                                                                                                                                                                                                                                                                                                        |
| W5  | `ctx.lkgFingerprint` thread-through closes TOCTOU at the _plugin_ layer; not at the _supervisor_ layer | `pr-drafts/v2-policy-ir.md §"TOCTOU defense via ctx.lkgFingerprint"`                                | This is the killer step and I love it. A stale plugin replica evicts and reloads when the fingerprint flips — exactly right. What's missing: the _supervisor app_ (the human in the loop on `requireApproval`) does not see `ctx.lkgFingerprint` today. So a supervisor can be presented with an approval request generated under PolicyIR v1, take 90 seconds to read it, hit "approve," and the _enforcement_ runs against PolicyIR v2 because LKG promoted in the meantime. That's a different TOCTOU and the proposal does not close it. The fix is small: include `lkgFingerprint` in the `ApprovalDescriptor` (or in the merged-array entries) so the supervisor's approve carries the fingerprint they decided against, and the runner refuses to enforce if it has rolled forward. I'll accept this as a follow-up but I want it called out as an explicit known gap, not left implicit.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

## HC-NOTE findings (capture for follow-up)

| #   | Title                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Where                                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| N1  | The "first reference consumer" for the LKG abstraction (i.e., migrating `io.observe-recovery.ts` itself onto `LKGStore`) is deferred to a follow-up. Until that lands, two LKG implementations exist in the tree (the existing config-LKG and the new abstraction) and my "what does my fleet rely on" question has two answers. Acceptable as a transitional state if the follow-up lands within one minor release.                                                                                                                                          | `pr-drafts/v2-lkg-contract.md §"What did NOT change (scope boundary)"`                |
| N2  | `policyId = sha256(jcs(body))` is good. RFC 8785 JCS is the right canonicalization. But the PR notes "haven't tested with a non-Node generator" — I have OPA users in my fleet who will ship a `.rego → PolicyIR` shim. Cross-language JCS parity is the difference between "decision is anchored" and "decision _appears_ anchored, but the OPA shim's hash differs from the Node validator's hash by a stray Unicode normalization." I want an upstream-published JCS conformance corpus before my OPA-shim author swears to my CISO that the hashes match. | `pr-drafts/v2-policy-ir.md §"What I did NOT verify"`                                  |
| N3  | Genesis case for the audit hash chain (per `R1-architect.md` N5 in cp-1) — `"sha256:0000…0000"` zero-hash convention. Same applies here: when a brand-new tenant onboards, the _first_ LKG audit record's `previousHash` should be a known sentinel my SIEM can verify, not absent or null.                                                                                                                                                                                                                                                                   | `pr-drafts/v2-lkg-contract.md §"audit and recovery-notice hooks"`                     |
| N4  | The "pollutedSecretPlaceholder" safeguard mentioned for tracker authors is a documented obligation, not an enforced contract. From a fleet operator's seat, "tracker authors MUST NOT register paths containing plaintext secrets without a validator that detects pollutedSecretPlaceholder" is a footgun, not a guarantee. Either the SDK refuses to register without a validator that opts in, or my plugin-vetting checklist grows by one line and I assume the cost. The latter is fine but should be explicit.                                          | `pr-drafts/v2-lkg-contract.md §Security Impact`                                       |
| N5  | Kill-switch story for PolicyIR is implicit. If I need to force every tool call to deny RIGHT NOW (CISO incident response), do I (a) write a deny-all PolicyIR and promote it, (b) flip a gateway-side env var, or (c) some combination? Promotion through LKG has latency (observe cycle); a kill-switch should be synchronous. The proposal does not address this. Today my downstream `claws-guardrails` adapter handles this; if I'm migrating to PolicyIR-driven evaluation, I need parity.                                                               | `pr-drafts/v2-policy-ir.md §"What did NOT change"`                                    |
| N6  | The proposal touches the Swift protocol model (`apps/macos/Sources/OpenClawProtocol/GatewayModels.swift` and `apps/shared/OpenClawKit/...`). My macOS supervisor app is third-party and ships on a different release cadence than upstream. Pinning both upstream and the third-party Swift consumer to the same widening cutover is operationally awkward. A version-flagged accept-both-shapes window on the Swift decoder side would help. (See W1.)                                                                                                       | `pr-drafts/v2-policy-ir.md §"Hook approval-merger fix"`                               |
| N7  | LKG recovery semantics on a tracker whose validator is itself loaded from PolicyIR (i.e., a circular dep — PolicyIR's validator wants to consult PolicyIR) — the proposal's "validator MUST be exception-safe; thrown validator surfaces as `LKGError`, never silently masked as recovery" is the right answer, but I want a worked example of the cycle-breaking story before I deploy this on a hot upgrade.                                                                                                                                                | `pr-drafts/v2-lkg-contract.md §"Contract invariants the adversarial waves locked in"` |

## Strengths (what made me move from REQUEST-CHANGES to APPROVE-WITH-WARNINGS)

- **The conjunctive-AND merger fix is the right governance call.** The first-wins
  `??` merger at `hooks.ts:1008-1013` is a chain-of-custody bug — plugin-A's
  `requireApproval` is silently dropped by plugin-B's nullish return. I have been
  bitten by exactly this pattern in production: a CISO-required approval flow
  was masked because a benign secondary plugin returned no approval. The
  proposal calls it what it is ("**chain-of-custody bug**"), fixes it with a
  shared `mergeApprovals` helper at _both_ call sites (`hooks.ts` AND
  `trusted-tool-policy.ts:43-45` — second site critical, first site alone would
  leave the regression in place), and the crash-safety wrapper ("plugin-A's
  approval cannot be downgraded by plugin-B's exception") is exactly what my
  threat model requires. The widening is breaking and that is correct.

- **The `__OPENCLAW_REDACTED__` substrate guard is the _floor_ of secret hygiene
  done right.** I have spent two years asking for a substrate-level guard rather
  than per-call-site reject rules (which is how #31251 happened — the plugin-
  install path was outside the rule). Moving the rejection into the emit API
  itself means _any_ future call site that accidentally hands a redacted view
  to `replaceConfigFile` throws at write time rather than silently corrupting
  user secrets. This is the right place for the guard. (See W2 for the
  forwards-compat ask.)

- **Two-anchor defense in depth on PolicyIR is a real chain-of-custody story.**
  `policyId = sha256(jcs(body))` (content-canonical) AND
  `LKGFingerprint.hash = sha256(rawBytes)` (bytes-on-disk). A doctored
  PolicyIR either changes its `policyId` (caught by `validatePolicyIR`'s
  round-trip) or changes its bytes (caught by LKG observe). My auditor reads
  "two independent canonicalizations, each catching a different tamper class"
  and signs. That is the answer I need.

- **`ctx.lkgFingerprint` thread-through is the killer step.** Without this,
  every plugin invents its own answer to "which PolicyIR am I evaluating?" —
  and the answers drift across plugin replicas, across tenants, and across
  promote/observe windows. Anchoring at hook-invocation time is the only
  shape that works. The TOCTOU-defense test (`policy-ir-toctou-defense.test.ts`)
  proves the eviction-on-mismatch behavior. (See W5 — same idea needs to
  extend to the supervisor.)

- **Frontmatter raw-preserve in `stripFrontMatter()` is a quietly important
  governance primitive.** Every consumer that needs byte-identical
  round-trip on `.md` workspace files (audit, signing, content-addressing)
  was previously paying double I/O and racing against fs writes. Adding a
  sibling `raw` field on the existing return type is strictly additive,
  which means I can adopt it on my schedule without a coordinated cutover.

- **The "fail-closed at every PolicyIR failure path" enumeration is exhaustive.**
  Generator throws / PolicyIR missing / malformed / `policyId` mismatch /
  `generatedFrom` mismatch / evaluator throws — every failure mode lands in a
  documented deny. This persona's decision rule is "fail closed every time"
  and the proposal does that without an asterisk. Ask §5 ("is the runner
  fail-closed on evaluator throws today?") is the right question to confirm.

- **Conformance test for LKG wire-parity pins drift.** The new abstraction is
  byte-identical in audit shape, on-disk shape, and recovery-notice payload to
  the existing `io.observe-recovery.ts`. This means when my fleet's existing
  config-LKG monitoring tooling encounters audit records from PolicyIR-LKG,
  the queries don't fork. That's the kind of detail my SOC engineer will
  thank me for in six months.

## Verdict reasoning

This proposal is the right shape. The contracts (workspace bytes, LKG carrier,
PolicyIR + `ctx.lkgFingerprint`, conjunctive merger) compose into the chain-
of-custody story I have been asking for, in the layering that lets each piece
be reviewed and adopted independently. The PR-1 + PR-2 pair is essentially
strict-additive for my fleet (I can land them with no operational change beyond
turning on the new lint surface in `doctor`), and PR-3 carries the breaking
behavior change I both want and need to roll out carefully.

What stops a clean APPROVE:

1. **The merger break is the right break, but the rollout shape is wrong** (W1).
   "Codemod the world on land day" is not how regulated fleets adopt approval-
   flow changes. I need a deprecation window or a feature flag.

2. **The redaction guard is right but narrow** (W2). I want the next sentinel
   pattern covered without an upstream PR.

3. **The audit-correlation story across LKG recovery and the in-flight policy
   decision is not written down** (W3). I cannot stitch in my SIEM today
   without that contract.

4. **Multi-tenant isolation is silent** (W4). Silent reads as "didn't think
   about it" to my auditor.

5. **TOCTOU is closed at the plugin layer but not at the supervisor layer**
   (W5). Worth following up.

W1, W3, W4 should be addressed before this hits production fleets. W2 and W5
are acceptable as documented follow-ups _in the same release train_. With
those addressed, this is the substrate I want my next 18 months of governance
work to ride on.

I am voting **APPROVE-WITH-WARNINGS** because the proposal moves the world
forward on every chain-of-custody seam I care about — and because the warnings
above are well within the proposal's existing review surface. None require a
redesign; they require honest scope notes and (in W1's case) a release-train
discipline upstream is already capable of.

Net: I want this in. With my warnings on the record.

---

**Reviewer disclosure**: This review was conducted in the persona of OC-P07
(The Enterprise IT Admin) per `Tech/OpenClaw/guides/personas/07-the-enterprise-it-admin.md`.
Tone, priorities, and decision rule (fail-closed for the fleet, audit-completeness > raw speed,
contracts upstreamable / integration surface stays in Lobster's layer) reflect the persona's
documented "Decision rule" and "Specific tests."
