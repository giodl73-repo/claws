---
pulse: 02
slug: bot-preempt-checklist
plan: claws-openclaw-upstream
checkpoint: cp-1
depends_on: []
governing_roles: [claws:claws-release-eng, claws:ciso, claws:claws-repo-steward]
addresses_findings: [F-01..F-16, BOT-P-001..004, BOT-V-001..004, BOT-A-001..003, BOT-B-001..003, BOT-S-001..002]
addresses_headlines: [H6]
---

# Pulse 02 · Bot-Preempt Checklist Guide

## Objective

Write `docs/upstream/guides/bot-preempt-checklist.md` — operational playbook for the Greptile + Copilot + chatgpt-codex review trio. Translates the 10 normative constraints from `UG-upstream` § 2.1 into per-PR checkboxes with command snippets, regex/keyword scan lists, and citation anchors. Every Hapi PR carries this checklist as a section in its description.

## Deliverables

- [ ] `docs/upstream/guides/bot-preempt-checklist.md` (NEW) — sections:
  - **§1 The reviewer trio** — Greptile, Copilot, chatgpt-codex; what each cares about; PR mechanics (median <4h merge, 1 round)
  - **§2 The 10 operating constraints** — normative anchors back to `UG-upstream` § 2.1 with operational ops per constraint
  - **§3 Per-PR checklist (copy-paste into PR description)**
    - [ ] PR description opens with core-not-extension justification (F-09); paragraph template included
    - [ ] No keywords trigger `r:third-party-extension` / `r:skill` (F-10, F-11); regex/keyword scan list with pre-flight grep command
    - [ ] Every public-API addition: baseline hash refreshed (F-12); command snippet
    - [ ] Every public-API addition: sdk-overview table updated (F-13); column template included
    - [ ] Every gateway protocol change: Swift models regenerated (F-15, F-16); command + paths
    - [ ] Every register*() / pluginPatch / sessions API: `pluginId` taken from authenticated caller, never payload (F-01, F-02); pattern example
    - [ ] Every host-boundary entry: Zod schema validation (F-05, F-06); pattern example
    - [ ] No `__proto__` / prototype-pollution paths in plugin payload reads (F-06)
    - [ ] No JSON size cap bypass (F-07); 1MB default
    - [ ] No generic `try/catch` in hot-path; failure modes distinguished (per upstream review pattern in #72287)
    - [ ] No duplicate helpers; shared utilities live in one module (per #72287)
    - [ ] CHANGELOG entry appended at END of target section, not mid-section (F-12 corollary)
  - **§4 Pre-flight commands** — copy-paste shell that runs locally before pushing the PR:
    ```bash
    # baseline + sdk-overview pre-flight
    npm run gen:baselines        # or upstream's actual script name
    git diff docs/.generated/plugin-sdk-api-baseline.sha256 docs/sdk-overview.md

    # auto-close keyword scan
    grep -iE "(third.?party|extension|skill|clawhub)" PR-DESCRIPTION.md \
      && echo "AUTO-CLOSE RISK — see §3" \
      || echo "PR description clear"
    ```
  - **§5 Reviewer-comment patterns to pre-empt** — top 8 categories from upstream history (plugin-tenancy, memory leaks, untyped input, behavior parity, CHANGELOG drift, generic catch, schema exports, duplicate helpers) — each with anchor PR # for reference
  - **§6 Citation anchors** — link back to spec § 2.1 for each constraint

## TDD Tests

Documentation only. Verification is human review + downstream PR-1 / PR-2 / PR-4 / PR-5 consumption.

## Verification Gate

```bash
test -s "docs/upstream/guides/bot-preempt-checklist.md"
grep -q "10 operating constraints" "docs/upstream/guides/bot-preempt-checklist.md"
grep -q "core-not-extension" "docs/upstream/guides/bot-preempt-checklist.md"
grep -q "baseline hash" "docs/upstream/guides/bot-preempt-checklist.md"
grep -q "Swift models" "docs/upstream/guides/bot-preempt-checklist.md"
```

## Key Constraints

- Each checkbox in §3 is copy-paste-able into a PR body. Reviewers scan PR descriptions for these markers.
- Section numbering must be stable so the spec can cite specific sections (e.g., "see bot-preempt-checklist § 3.2").
- Keep the keyword scan list (§3) updated as upstream's auto-close labels evolve.

## Scenario codes addressed

SC-01 through SC-05 (entire bot-preempt phase).
