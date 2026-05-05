# Validation findings — running log

The rolling list of bugs / coverage gaps / surprises surfaced by running the substrate train against real workspaces. **This is the test suite.** Pre-baking 100 synthetic edge cases in advance optimizes for hypothetical breakage; this log captures actual breakage from real use.

## Format

One entry per finding:

```md
### F-NNN — <one-line title>  [<status>]

**Date**: 2026-MM-DD
**Fixture**: <slug or "real workspace at <path>">
**Tool**: <openclaw path | pinch | cage | policy | doctor>
**Status**: open | fixed (commit-sha) | wontfix-by-design | duplicate-of-FX

What I expected to see vs what I saw:

> ...

How to reproduce:

```sh
$ openclaw <verb> <args> <fixture>
```

Notes / context / decision:

...
```

Statuses:
- **open** — known issue, not yet fixed
- **fixed** — repaired in claws-hapi or substrate/* branches; cite commit
- **wontfix-by-design** — surfaced behavior is correct as-is; fixture or expectation changes instead
- **duplicate-of-FX** — same root cause as another entry

## Findings log

### F-001 — `openclaw policy check` fails on .jsonc with comments  [open]

**Date**: 2026-05-04
**Fixture**: `policy-jsonc-rich-syntax`
**Tool**: `openclaw policy check`

`openclaw policy check` against a `policy.jsonc` containing comments + trailing commas exits 2 with `Expected property name or '}' in JSON at position 4`. The check command uses `JSON.parse` instead of `parseJsonc`, contradicting the substrate's stated JSONC support. (`generate` does the right thing.)

```sh
$ openclaw policy check fixtures/synthetic/policy-jsonc-rich-syntax
# exit=2; ERR_PARSE
```

### F-002 — three lint starter packs unreachable from CLI bootstrap  [fixed: claws-hapi 9797aeaf, substrate/pinch on fork]

**Date**: 2026-05-04
**Fixture**: any fixture with non-md content (jsonc / jsonl / *.lobster)
**Tool**: `openclaw pinch run`

CLI bootstrap only imported the md starter pack. `jsonc` / `jsonl` / `lobster-yaml` packs existed as code but never registered. `list-rules` reported only 10 rules across 1 pack instead of the 23 across 4 we shipped.

### F-003 — `openclaw pinch run` ignores `CLAUDE.md`  [open]

**Date**: 2026-05-04
**Fixture**: `only-claude-md`
**Tool**: `openclaw pinch run`

CLAUDE.md is not in the canonical-roles registry (`OPENCLAW_WORKSPACE_ROLES` recognizes AGENTS.md but not CLAUDE.md). Many community repos ship CLAUDE.md and nothing else (zod, kitcn, banjo, aztec-editor-android, ...). Decision needed: add CLAUDE.md as an alias for AGENTS.md, or treat as out-of-scope.

### F-004 — `policy generate` extracts 0 tools from `## Tools` markdown table  [open]

**Date**: 2026-05-04
**Fixture**: `kitchen-sink`
**Tool**: `openclaw policy generate`

Generator expects `### name # R<n>, CAPS` heading shape; ignores Markdown tables. Either fixture should match the convention or the extractor should also recognize tables. Confirmed against `tools-canonical-headings` (extracts 5 tools cleanly) — fixture-shape, not extractor bug. But documenting the convention more visibly would help plugin authors.

### F-005 — `secret-as-literal` false-positives on zero-filled placeholder hashes  [open]

**Date**: 2026-05-04
**Fixture**: `policy-jsonc-rich-syntax`
**Tool**: `openclaw pinch run`

`jsonc-starter-v0/config/secret-as-literal` rule's hex-secret regex `/^[a-fA-F0-9]{40,}$/` matches `"0000...0000"` placeholder hashes. Should exclude all-zero / single-digit-repeat sequences from the hex-secret detection.

### F-006 — `SESSION_PREFIX_RE` too narrow for in-the-wild session log naming  [open]

**Date**: 2026-05-05
**Fixture**: `session-no-terminal-event`
**Tool**: `openclaw cage list-trackers` / `openclaw pinch run`

Canonical role regex requires basename matching `^(?:session|audit|events)`. Claude-code-style session logs are uuid-named without that prefix and won't be tracked.

### F-007 — Stub-CLAUDE.md (~9 bytes) is widespread; needs decision  [open]

**Date**: 2026-05-05
**Fixture**: many real-world repos (zod, kitcn, banjo, aztec-editor-android)
**Tool**: `openclaw pinch run`

Common in-the-wild pattern: real AGENTS.md alongside a 9-byte CLAUDE.md stub. Even if F-003 lands (CLAUDE.md as a role), stubs shouldn't produce noisy findings. Decision: lint stub-CLAUDE separately, or treat as noise.

### F-008 — `starter-v0/agents/empty-tools-section` strictness vs delegation pattern  [open]

**Date**: 2026-05-05
**Fixture**: `workspace-typical` (originally; surfaced in 6 of 7 new workspace-* fixtures)
**Tool**: `openclaw pinch run`

The rule fires whenever AGENTS.md has a `## Tools` heading without items underneath. Realistic AGENTS.md files often delegate to TOOLS.md ("See TOOLS.md for canonical declarations") rather than duplicating tool listings. With the rule as written, the delegation pattern is flagged as a problem.

Two reasonable interpretations:
- **Rule is correct**: AGENTS.md shouldn't have a `## Tools` heading at all if it's not declaring tools. Operator should drop the section. (Documented in workspace-typical's AGENTS.md as the workaround.)
- **Rule is too strict**: delegation-by-comment is a legit pattern; rule should detect the explicit "see TOOLS.md" delegation and skip.

For now: workspace-typical demonstrates the workaround (no `## Tools` section). Decision pending; flag for upstream maintainers.

### F-009 — `policy check` real-world drift detection works against typical workspace  [confirmed-working]

**Date**: 2026-05-05
**Fixture**: `workspace-policy-managed`
**Tool**: `openclaw policy check`

`policy check` against a workspace where TOOLS.md adds a tool not in policy.jsonc correctly hits the JSON.parse-on-jsonc bug (F-001) and returns exit=2. The drift detection itself is sound (confirmed via `policy-drifted` synthetic earlier); F-001 blocks it from running on real .jsonc files with comments.

### F-010 — workspace-* fixtures successfully exercise lint+lkg+policy substrates end-to-end  [confirmed-working]

**Date**: 2026-05-05
**Fixtures**: 7 new `workspace-*` fixtures
**Tool**: full substrate train

End-to-end behavior on realistic openclaw workspaces:
- workspace-with-sessions: jsonl `no-terminal-event` rule fires on the unterminated session log (expected)
- workspace-with-workflows: lobster `shell-tool-collision` + `duplicate-id` both fire on `bad-pipeline.lobster` (expected)
- workspace-typical: 9 files tracked + promoted by cage; 5 tools extracted by policy-generate
- workspace-upgrade-recovery: pre-populated `.openclaw/lkg-health.json` with 2 labels — but cage walks 9 files and promotes — labels persistence not yet exercised in the daily-run flow (would need an explicit `cage labels` step)
- workspace-enterprise: workspace.json overrides aren't tested in the run-suite — manifest walker doesn't yet read the lint-section overrides

Improvements to make the daily loop richer: add `cage labels` + `cage promote --label X` invocations to the suite for fixtures with `.openclaw/lkg-health.json`. Add `policy check` invocation when both TOOLS.md and policy.jsonc are present.

---

Add new findings BELOW this line as they surface from real use.
