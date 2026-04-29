---
checkpoint: 2
pulse_range: [04, 04]
depends_on_cp: 1
review_panel: [claws:gateway-eng, claws:claws-release-eng, claws:claws-repo-steward, architect, testing]
---

# Checkpoint 2 · Wave A — Workspace Foothold

## Pulse Range

Pulse 04 only (1 pulse). Single upstream PR after the 2026-04-28 fold of former PR-2 (oc://config URI scheme + doctor migration emit) into PR-1.

## Dispatch Plan

One PR opens at upstream. The dispatch sequence (steps 0a, 0b, 1-6) is captured in `wave.yaml` `cp-2.dispatch_plan`. Briefly:

- **0a** Integration: apply patches in `C:\src\openclaw-core` fork branch; build clean; existing tests pass unchanged
- **0b** Perf bench: 8 fixtures (10K/100K/1MB plain JSON + 10K/100K/1MB JSONC + lint perf); 100 iterations; record p50/p95/p99
- **1-3** Trunk refresh, evidence regen (advisory), `scan-pr-body.sh` exit 0
- **4** `gh pr create --repo openclaw/openclaw` for PR-1
- **5** Watch + respond to bot-trio reviewer comments
- **6** Once merged, run post-merge-verification §3.1 H1 validators against trunk

## Pulses

- [ ] Pulse 04 · `pr1-openclaw-workspace` — Open PR-1 at openclaw/openclaw adding `@openclaw/workspace` (with `/ast/jsonc`, `/lint`, dual-form `/path` URIs, `/canonicalize` subpaths) AND wholesale-converting `src/config/io.ts:replaceConfigFile` from `JSON.stringify` to lossless `parse → mutate → emit` AND migrating doctor's config-mutation diagnostics to emit `oc://config/...` URIs AND landing the 13-code JSONC config lint surface that closes 27+ real openclaw issues.

## Gate

cp-2 closes when PR-1 MERGES at openclaw/openclaw AND post-merge verification (pulse 03 runbook) reports H1 GREEN against trunk:
- Cross-OS canonicalize CI matrix green
- JSONC round-trip with comments preserves byte-for-byte
- Plain-JSON behavior unchanged (backward compat proof)
- `doctor --fix` idempotency on already-clean config = byte-zero diff
- `oc://config/...` URI parser round-trip clean
- `oc://config/...` URIs appear in `openclaw doctor --json` output for migrated diagnostic call sites
- 13-code lint surface runs against canonical config fixture; per-rule positive+negative tests green
- Plain JSON path benchmarked at parity-or-faster vs `JSON.stringify`; JSONC path ≤2× stringify; 50ms hard ceiling on 1MB

**Critical**:
- PR-1 is the high-blast-radius PR. Reviewers will scrutinize. Strong test coverage of the existing JSON-without-comments case is mandatory.
- PR description must reference `docs/upstream/guides/bot-preempt-checklist.md` §3 in its body, lead with the 27-issue stats table, and embed perf bench results.
- The pitch: "comments + key ordering + indentation + secrets all preserved across `openclaw update` cycles, AND a 13-code lint surface flags 27+ existing config-failure patterns, AND `oc://config/...` URI vocabulary lights up everywhere in one shot." Workspace earns its keep four ways in this single PR.

## Review Panel

Roles: claws:gateway-eng, claws:claws-release-eng, claws:claws-repo-steward, architect, testing
Write to: `panels/cp-2/`

The review (after merge): post-merge verification verdicts, baseline-hash diffs, JSONC round-trip behavior on real config files, doctor diagnostic output samples showing `oc://config/...` URI citations, lint findings on representative configs, perf bench numbers. Reviewers re-read the merged PR description to capture reviewer-feedback patterns to pre-empt in cp-3.
