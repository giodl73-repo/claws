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

---

Add new findings BELOW this line as they surface from real use.
