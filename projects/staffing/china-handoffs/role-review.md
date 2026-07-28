# Role Review of the China-Team Opportunity Briefs

Reviewed 2026-07-27 using the repository's `.craft/roles/claws` stakeholder
lenses. The roles are written for OpenClaw governance and integration work, so
their principles were applied to these Lobster/MOS3 opportunity briefs without
importing product-specific assumptions that the briefs do not claim.

## Review scope

- `extensibility-feeds.md`
- `admin-governance.md`
- `policy-compliance.md`

## Roles used

| Role | Tension represented | Primary question applied |
| --- | --- | --- |
| Founder | Community trust over enterprise capture | Does Microsoft-specific governance preserve an independently useful OpenClaw and ClawHub ecosystem? |
| Gateway engineer | Runtime stability over governance overhead | Are lookups bounded, cached, cancellable, and isolated so governance cannot crash or starve the runtime? |
| Platform engineer | Fleet consistency over workspace autonomy | Can this be rolled out, observed, retried, and recovered across many instances without hiding partial failure? |
| Lorant reviewer | Current-head correctness over optimistic narrative | Are PR claims explicitly dated, are authority paths singular, and are fail-closed guarantees precise? |
| CISO | Security assurance over capability | Are mandatory gates fail-closed, incidents containable, events exportable, and emergency controls governed? |
| Compliance officer | Evidence completeness over speed | Is evidence attributable, timestamped, tamper-evident, retained, and exportable? |
| Cowork UX engineer | Governance transparency over UI minimalism | Can a user see who made a decision, why, its impact, and the next action before committing a change? |
| New hire | Approachability over completeness | Can a recipient without repository context understand the acronyms, choose a starting seam, and avoid reading the document as an all-or-nothing assignment? |

## Findings and resulting changes

### 1. External readers lacked an orientation layer

**Finding:** The briefs were self-contained but still assumed familiarity with
MOS3, MAC, OBO, ECS, FirstRelease, Lobster, Scout, and the distinction between
AppId and title ID. Their density could make a prospective partner interpret
the whole portfolio as one assignment.

**Change:** Added a short engagement-orientation paragraph and an inline terms
section to every brief. Retained the requested sequence of vision, areas,
partners, completed work, remaining work, and possible ownership slices.

### 2. Authority boundaries needed stronger negative guarantees

**Finding:** The documents described owner systems but did not state strongly
enough what must not happen. That left room for a parallel Lobster catalog,
duplicated allowlists, Microsoft-only forks of OpenClaw semantics, or following
being mistaken for trust.

**Change:** Added guardrails and non-goals: one source of truth per decision,
no Lobster catalog fork, no follow-as-trust behavior, no Microsoft dependency
for community OpenClaw/ClawHub, and reuse of generic OpenClaw policy semantics.

### 3. PR narratives could age into false confidence

**Finding:** Exact PR heads and check states are useful context, but recipients
could mistake a 2026-07-27 snapshot for current truth.

**Change:** Added explicit dated-snapshot warnings requiring current-head,
review, required-check, and current-main verification before adoption.

### 4. Fleet and partial-failure behavior was underdeveloped

**Finding:** The briefs covered individual E2E and previous-good behavior but
not ring/fleet rollout, partial success, targeted retry, tenant isolation, or
recovery without disrupting healthy instances.

**Change:** Added explicit ring/fleet rollout, visible partial failure,
targeted retry, isolation, rollback, and no-access-widening expectations.

### 5. Security posture lacked incident and enterprise event requirements

**Finding:** Auth and fail-closed behavior were present, but emergency disable,
non-overridable floors, break-glass attribution, incident response, and SIEM
export were not explicit.

**Change:** Added emergency-disable/kill-path decisions, governed break-glass,
non-overridable security floors, stable event schemas, correlation, SIEM
export, and trust-zone-safe diagnostics.

### 6. Compliance evidence was informative but not auditor-grade

**Finding:** Policy evidence had identity, revision, hash, and freshness, but
the brief did not explicitly require tamper-evident, timestamped, retained,
exportable evidence suitable for investigation or external audit.

**Change:** Added evidence integrity, chronology, retention, export, and audit
usability requirements. Missing or invalid evidence continues to be forbidden
from appearing green.

### 7. Governance UX needed an actionable human contract

**Finding:** Preview, explain, and audit were present, but the admin brief did
not state the minimum user-facing explanation or accessibility bar.

**Change:** Required decision source, owner, reason, impact, and next action;
added actionable error behavior and M365 accessibility/design-system coverage
for locks, warnings, previews, exceptions, and errors.

### 8. Security guarantees needed a runtime-cost boundary

**Finding:** Strong fail-closed language could be read as requiring every
reporting or control-plane dependency to synchronously block the Gateway. The
briefs did not explicitly address latency, cancellation, crash isolation, or
severity-based failure behavior.

**Change:** Required cached/bounded control-plane lookups, measured latency,
timeouts, cancellation, retry/backoff, and runtime failure isolation. Clarified
that mandatory high-risk gates fail closed while low-risk reporting failures
degrade visibly without taking down otherwise safe runtime work.

## Remaining discussion questions

These are product decisions rather than defects in the briefs:

1. Which team should be the coordinating DRI when implementation spans MOS3,
   Lobster, OpenClaw, Security, and Frontend?
2. Which security floors are truly non-overridable, and which allow a bounded,
   expiring exception?
3. Which system owns the durable compliance record and tamper-evident export?
4. What fleet/ring unit is used for feed, availability, and policy rollout?
5. What is the minimum externally shareable terminology and architecture
   context for China-team recipients?

## Review conclusion

No blocking contradiction remains in the briefs as collaboration documents.
They now present selectable seams rather than a monolithic transfer, preserve
owner-system boundaries, and make the missing fleet, security, evidence, and
UX expectations explicit. The remaining questions should be closed with the
prospective partner teams rather than preassigned in the handoff.
