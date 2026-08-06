# EnterpriseClaw Meeting Deck Role Review

Date: 2026-08-04

Reviewed artifact:
`enterpriseclaw-meeting-2026-08-05.pptx`

Review set: all 18 roles under `.craft/roles/claws/`, grouped into six
independent panels.

## Executive Verdict

The deck is ready to drive a decision discussion, but it is not yet ready to
serve as an architecture or production-readiness approval record.

## Resolution

The revised 24-slide deck addresses every material panel finding:

- reframes the meeting as a Microsoft adopter report and contribution proposal,
  not an enterprise backlog for Peter and Vincent;
- shows Lobster as evidence while making Microsoft accountable for Lobster,
  hosting, migration, release, and deletion;
- reconciles the 27 original, 24 image-queue, and 22 applied-baseline patch
  counts;
- replaces the sequential ownership diagram with parallel disposition lanes
  and separates temporary forks from durable plugins/adopters;
- names CAPI provider dispatch and ProxyPipe tags 1-5 as the first exact
  migration and deletion slice;
- makes fail-closed protected-action enforcement, artifact verification,
  promotion, recovery, policy evidence, operator UX, and extension portability
  explicit;
- moves detailed role contracts into five appendix slides so the main meeting
  story remains usable.

These fixes make the deck suitable for alignment and contribution review.
Production approval still requires the implementation evidence named in the
deck.

The role panel strongly supports the central direction:

- OpenClaw remains complete and owns portable runtime semantics.
- Lobster owns enterprise identity, tenancy, policy distribution, fleet
  operation, Microsoft integration, assurance, and administration.
- Runtime cells remain isolated owner-native failure domains.
- Private buses, permanent patches, duplicate writers, and duplicate runtime
  owners require expiry and deletion.
- Shipped capability, fork evidence, and target architecture remain distinct.

Eight roles blocked formal approval because the deck does not yet make
enforcement failure behavior, artifact integrity, release evidence, policy
attestation, and the first ProxyPipe migration mechanically testable.

## Role Verdicts

| Role | Verdict | Primary concern |
| --- | --- | --- |
| Founder | Approve with changes | Preserve community completeness and enterprise-layer removability |
| Gateway engineer | Block | Hook isolation, latency, degradation, and fail-open/fail-closed behavior |
| Skill author | Approve with changes | Durable plugins must not be conflated with temporary forks |
| CISO | Block | Fail-closed protected actions, cell containment, kill switch, audit integrity |
| Platform engineer | Approve with changes | Partial-fleet convergence, drift, repair, and measurable profile gates |
| Compliance | Block | Verifiable evidence chain, control mapping, retention, and recovery package |
| Policy steward | Block | Coherent requirement-to-evidence-to-attestation-to-gate policy loop |
| Power user | Approve with changes | Actionable operator workflows and a concrete debt-removing first migration |
| New hire | Approve with changes | Primer, glossary, and a visible first-five-minute journey |
| Aether runtime engineer | Block | Production enforcement point and complete authorization decision contract |
| Aether adapter engineer | Block | Pre-parse signature/hash verification and boot attestation |
| Lobster container engineer | Approve with changes | Sidecar readiness, reconnect, drain, and recovery evidence |
| Cowork UX engineer | Approve with changes | Lock provenance, dry-run impact, rejection, and recovery actions |
| M365 connector engineer | Approve with changes | Synchronous owner validation, idempotency, replay, and Graph rejection mapping |
| ClawPilot product | Approve with changes | Scope-neutral contracts that do not hard-code workspace or Cowork assumptions |
| Claws repository steward | Approve with changes | Authoritative contract homes and parallel disposition lanes |
| Claws release engineer | Block | Signed tuples, fresh-install/upgrade/rollback proof, atomic promotion |
| Lorant reviewer | Block | Current-head baseline, evidence references, failure-path proof, named migration |

## Verified Must-Fix Items

### 1. Disambiguate the patch baseline on slides 3 and 17

The deck says `22 current replay patch artifacts` and `22-patch final
disposition`. Current project state contains several different, valid counts:

- 27 original physical Lobster PR #6839 patch inputs;
- a 24-file Docker queue: one upstream evidence base plus 23 residual Lobster
  patches;
- a live #5402 baseline reporting 22 patches applying cleanly.

The slide must state which set the number represents. Do not replace one number
with another without its counting definition, source identity, and date.

Recommended compact wording:

> 27 original inputs | 23 residual + 1 evidence base in the image queue |
> 22 applied in the current #5402 baseline

### 2. Make protected-action enforcement and failure behavior explicit

Slides 9, 10, 12, and 14 name identity, policy, approvals, and enforcement but
do not identify the production enforcement point or unavailable-path behavior.

The deck should state:

- OpenClaw owns portable action and runtime semantics plus owner-defined hooks.
- Lobster distributes tenant policy, controls fleet admission, and projects
  conformance.
- Each protected action family names its actual enforcement owner.
- Missing, stale, malformed, or unmappable identity, policy, or approval state
  fails closed for protected effects.
- Degraded, blocked, and unavailable behavior is explicit; no component infers
  success from transport completion.

Do not insert an arbitrary latency target. Assign the owner and require a
profile-specific measured budget.

### 3. Correct the four-track architecture on slide 7

The arrows currently read as a sequential `A -> B -> C -> R` migration.
These are parallel disposition choices.

Split the current combined fork/plugin track:

- temporary controlled-fork incubation or compatibility carry: must exit;
- bounded portable plugin/adopter: may remain when it owns no core semantics.

OpenClaw should be visibly the default home for portable behavior, not merely
the first stage in a pipeline.

### 4. Name the first ProxyPipe migration before approving it

Slide 18 asks for a ProxyPipe family but leaves the unit of work untestable.
The selected family must include:

- exact current source identity and file inventory;
- durable semantic owner and remaining physical carrier;
- authority and validation path;
- cancellation, timeout, retry, idempotency, duplicate-effect, and lost-ack
  behavior where applicable;
- canary, mismatch, rollback, expiry, and deletion proof;
- the operator work, patch, or recurring incident removed.

The meeting may select the family, but architecture approval should not imply
that an unnamed family is implementation-ready.

### 5. Turn hosting profiles into production promotion contracts

Slides 10 through 13 need a compact statement that every production profile
defines and proves:

- signed artifact/digest and compatibility tuple;
- provenance and SBOM where required;
- integrity verification before parsing or activation;
- startup, readiness, serving, drain, and shutdown behavior;
- partial-fleet failure, fencing, idempotent repair, and mixed-version support;
- upgrade, rollback, restore, and roll-forward criteria;
- measured capacity, convergence, recovery, and cost thresholds owned by the
  profile rather than invented in the architecture deck.

### 6. Make evidence and operator UX actionable

The deck should connect architecture states to visible operator actions:

- governed settings show effective value, authority, lock provenance, risk,
  and escalation path;
- changes support dry-run impact and actionable rejection;
- `RESTORED`, `RECOVERY BLOCKED`, `DEGRADED`, and `UNKNOWN` show cause,
  evidence freshness, responsible owner, and next permitted action;
- a documented break-glass path preserves raw OpenClaw diagnosis without
  bypassing protected-action enforcement;
- evidence receipts identify subject, actor, target, policy/artifact
  generations, result, exception, timestamp, retention class, and verifier.

## Strong Improvements That Need Not Block Tomorrow's Discussion

- Add a one-line primer defining OpenClaw, Lobster, contracts, and runtime
  replacement owners.
- State explicitly that removing Lobster leaves a complete local OpenClaw
  experience and no proprietary workspace residue.
- Add skills, provenance, compatibility, and diagnostics to the OpenClaw UX
  side; existing `SKILL.md` artifacts should remain usable without a
  proprietary SDK.
- Keep workspace/session scope explicit in shared contracts so future surfaces
  do not require parallel clients or protocols.
- Separate region, rollout cohort, tenant/workload, and quarantine state in the
  placement model.
- Add regulatory mappings and external-auditor evidence packaging to the
  detailed assurance plan rather than crowding the meeting deck.

## Recommended Meeting Decisions

1. Approve the owner boundary and local-completeness rule.
2. Approve parallel disposition lanes, with temporary forks separated from
   durable plugins/adopters.
3. Assign the protected-action enforcement contract and unavailable-path
   behavior.
4. Select one exact ProxyPipe family and its deletion acceptance criteria.
5. Assign owners for the production hosting profile, promotion evidence, and
   policy/evidence contract.

## Bottom Line

The role panel does not challenge the destination. It challenges whether the
transition is concrete enough to approve.

The strongest meeting narrative is:

> Keep the architecture decision. Tighten the execution decision: name the
> enforcement point, name the first ProxyPipe family, reconcile the patch
> baseline, define promotion evidence, and require deletion proof.
