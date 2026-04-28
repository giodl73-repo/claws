# Setup-stage Review · UG-upstream v0.2 Amendment · R1

**Reviewer**: claws:claws-repo-steward
**Date**: 2026-04-27
**Verdict**: REQUEST-CHANGES

## Summary

The amendment introduces five major feature areas (trust-set lifecycle, approval audit events, audit attribution, temporal queries, bot-reviewer constraints) but is missing critical delivery artifacts and metadata for deployment. The atom registry is out of sync, CHANGELOG needs a v0.2 entry, and the delegated bot-preempt-checklist guide (H6) does not exist yet — these block apply-back as currently specified. Section numbering is a re-organization, not pure supersession, and needs reader guidance.

## Findings

### HC-BLOCK (3)

1. **Missing deliverable: `docs/upstream/guides/bot-preempt-checklist.md`** — Amendment §2 (line 48) cites this guide as NEW, H6 deliverable, listing "10-PR-per-author cap, 2-PRs-open-at-a-time culture, `plugin-sdk-api-baseline.sha256` refresh obligation, `docs/sdk-overview.md` table refresh obligation, Swift protocol model regen, CHANGELOG end-of-section rule, `CLAUDE.md` authority, `r:third-party-extension` / `r:skill` auto-close labels." The guide does not exist. Upstream review constraints cannot land in this spec amendment without an authoritative reference. **Action**: Either (a) create the guide, or (b) inline the full constraint list in §2 so the spec is self-contained, with the guide as a follow-up deliverable.

2. **Amendment metadata missing** — File lacks YAML frontmatter. Compare existing specs (e.g., `docs/lobster/specs/LBA-architecture.md` lines 1–7: `spec:`, `version:`, `status:`, `owner:`, `co_owner:`). Without `spec: UG`, `version: 0.2`, `applies_to: docs/upstream/specs/UG-upstream.md`, the deploy step is ambiguous. **Action**: Add frontmatter explicitly stating amendment target + version-bump intent.

3. **ATOMS.md out of sync** — Amendment introduces atoms not registered. Current `docs/upstream/ATOMS.md` lists `atom:UG`, `atom:UG/contribution-sequence`, `atom:UG/r5-pre-merge-guard`. Amendment adds material covered by: `atom:UG/trust-set-lifecycle` (§4), `atom:UG/approval-audit-events` (§5), `atom:UG/audit-attribution` (§6), `atom:UG/temporal-queries` (§7), `atom:UG/bot-reviewer-constraints` (§2), `atom:UG/runtime-gated-enforcement` (§3). **Action**: Draft an ATOMS.md update co-located with the amendment, applied at deploy time.

### HC-WARN (3)

1. **CHANGELOG.md missing v0.2 entry** — House convention requires each version bump in `docs/upstream/CHANGELOG.md`. Currently only has v0.1 (Horus wave, 2026-04). **Action**: Add v0.2 entry summarizing the four material changes + enforcement-model shift.

2. **Section numbering is a re-organization, not continuous supersession** — Amendment lines 8–11 say "supersedes the original UG-upstream v0.1 in three material ways" but the scope is actually a re-structure: v0.1 had ~5 sections (Contribution roadmap, Decide/track/enforce, R5 pre-merge guard, PR sequencing, Scope-flip), amendment has §1–§11. Reader needs explicit guidance. **Action**: Clarify preamble: "v0.2 reorganizes the original v0.1 sections into §1, §8 (PR sequencing), §9 (scope-flip), then ADDS §2–§7, §10–§11 as new sections. The R5 pre-merge guard from v0.1 remains in force unchanged."

3. **§11 OC-7 scenario brief conflates PR fix and scenario edge case** — Reads "OC-7 merger conjunctive invariant vulnerable to plugin crash mid-emission" without saying what the test actually does. **Action**: Reword: "OC-7 merger uses array accumulation. Scenario: plugin-A appends `requireApproval`, plugin-B throws before emission — verify conjunctive invariant holds (merger does NOT downgrade to allow); scenario maps to L1 integration test in scenarios stage."

### HC-NOTE (2)

1. **Internal spec extension not restated in amendment frontmatter** — v0.1 has `**Extends**: CL-11` at line 3. Amendment doesn't restate this. Minor but worth preserving for consumers reading the amendment standalone. **Action**: Include in YAML frontmatter or first non-frontmatter line.

2. **Contribution-workflow.md flagging missing** — Amendment introduces enforcement-model shift (§3) and references the adapter-audits guide (§3, §6 multiple times). Existing `docs/upstream/guides/contribution-workflow.md` should be flagged for follow-up update or marked as superseded by the new guides. **Action**: Add to §11 deferred items: "`docs/upstream/guides/contribution-workflow.md` to be amended at H6 deliverable time to point at the new bot-preempt + adapter-audits guides."

## Strengths

- **OC-PR reductions justified (§1)** — Ruthless pruning from 7 to 2 with clear disposition per PR (upstream appetite, separation of concerns). The diff-vs-v0.1 table (§10) is a model way to communicate spec drift.
- **Trust-set lifecycle fully specified (§4)** — Key registry shape, states, rotation policy (quarterly cadence, 24-month grace floor for regulatory retention), key-audit-event taxonomy, verification path with explicit return states (valid / expired / revoked / invalid). This is enough detail for an implementer to ship without further design.
- **Temporal query audit-grounded (§7)** — `snap resolvePolicy --at <timestamp>` walks the audit chain rather than introducing a new index; e-discovery becomes answerable without manual reconstruction. Synchronization invariant (§7.2) is the right primitive.
- **Adversarial-plugin defense in audit attribution (§6.3)** — Plugin-supplied `sourcePluginId` is a hint, not ground truth; registry overrides at `postAudit()` boundary. Correct stance for the bot-reviewer trio's adversarial-input lens.
