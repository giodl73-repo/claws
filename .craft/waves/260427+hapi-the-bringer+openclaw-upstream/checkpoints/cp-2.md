---
checkpoint: 2
pulse_range: [04, 05]
depends_on_cp: 1
review_panel: [claws:gateway-eng, claws:claws-release-eng, claws:claws-repo-steward, architect, testing]
---

# Checkpoint 2 · Wave A — Workspace Foothold

## Pulse Range

Pulses 04 + 05 (2 pulses).

## Dispatch Plan

Both PRs open simultaneously at upstream (per 2-PRs-open culture). They're conceptually independent — PR-1 is the lossless emit conversion; PR-2 is the URI scheme extension — so reviewers can chew on each in parallel.

- **Batch 1** (parallel, depend on cp-1): pulse 04 (PR-1 workspace + replaceConfigFile lossless conversion + diagnostic-shape extension), pulse 05 (PR-2 oc:// scheme extension to runtime config)

## Pulses

- [ ] Pulse 04 · `pr1-openclaw-workspace` — Open PR-1 at openclaw/openclaw adding `@openclaw/workspace` AND wholesale-converting `src/config/io.ts:replaceConfigFile` from `JSON.stringify` to lossless `parse → mutate → emit`. Diagnostic-emitter accepts `oc://...` URIs as location for workspace files.
- [ ] Pulse 05 · `pr2-oc-uri-scheme-config` — Open PR-2 at openclaw/openclaw extending the `oc://` URI scheme to address runtime config (`oc://config/...`). Doctor's existing config-mutation paths emit URI-cited diagnostics.

## Gate

cp-2 closes when BOTH PRs MERGE at openclaw/openclaw AND post-merge verification (pulse 03 runbook) reports H1 GREEN against trunk:
- Cross-OS canonicalize CI matrix green
- JSONC round-trip with comments preserves byte-for-byte
- Plain-JSON behavior unchanged (backward compat proof)
- `doctor --fix` idempotency on already-clean config = byte-zero diff
- `oc://config/...` URI parser round-trip clean
- Doctor diagnostics cite `oc://` URIs for both workspace files (PR-1) and runtime config (PR-2)

**Critical**:
- PR-1 is the high-blast-radius PR. Reviewers will scrutinize. Strong test coverage of the existing JSON-without-comments case is mandatory.
- PR-2 must not open until PR-1 is at least open (PR-2 builds on PR-1's diagnostic-shape extension).
- Both PRs must reference `docs/upstream/guides/bot-preempt-checklist.md` § 3 in their descriptions.
- The pitch for both: "comments + key ordering + indentation preserved across `openclaw update` cycles" — workspace earns its keep three ways in the same wave.

## Review Panel

Roles: claws:gateway-eng, claws:claws-release-eng, claws:claws-repo-steward, architect, testing
Write to: `panels/cp-2/`

The review (after merge): post-merge verification verdicts, baseline-hash diffs, JSONC round-trip behavior on real config files, doctor diagnostic output samples showing `oc://` URI citations. Reviewers re-read the merged PR descriptions to capture reviewer-feedback patterns to pre-empt in cp-3.
