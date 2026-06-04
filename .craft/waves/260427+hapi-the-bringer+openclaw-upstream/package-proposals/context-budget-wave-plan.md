# Context Budget Wave Plan

## Top-level pitch

OpenClaw already exposes context usage through `/status`, `/usage`, and
`/context`, but operators do not yet have a durable workspace-level report that
explains which files, skills, memory, tool schemas, transcripts, and runtime
blocks are consuming context.

The proposal is Context Budget: an audit-first package that collects existing
OpenClaw context signals, estimates missing values, groups them by source
family, and produces reviewable recommendations without mutating the workspace.

The first loop is intentionally small:

```bash
openclaw budget audit --json
openclaw budget report --format markdown
openclaw budget recommend --dry-run --json
```

This is not a "self-improvement" agent. It does not rewrite prompts, delete
memory, tune policy, or score content quality. It gives humans and policy a
stable evidence report: what is taking context, where it came from, whether the
number is exact or estimated, and which targets deserve review.

## Role review

Founder and upstream maintainer: Context Budget is upstream-friendly if it helps
all users understand context growth and stays optional. It must not turn simple
agents into governance projects.

Gateway and platform: the first implementation should be CLI/report only. No
mandatory per-turn overhead, no blocking runtime hook, and no context engine
replacement.

Skill author and consumer: findings should identify large or duplicated skills
without changing the skill format or creating a new publishing requirement.

CISO, compliance, and policy steward: the report needs stable finding IDs,
provenance, timestamps, estimate markers, and evidence hashes before it becomes
policy-readable.

Power user and new hire: the package should replace manual context debugging.
The first successful experience should be one command plus a readable report.

## Existing OpenClaw signals to reuse

- `/context list`, `/context detail`, `/context json`, and `/context map`.
- `/status` and `/usage` normalized usage/cost fields.
- `systemPromptReport` sections for bootstrap files, skills, tools, and current
  runtime context.
- Context engine `assemble(...).estimatedTokens`.
- Compaction before/after token counts and summary lengths.
- Doctor bootstrap truncation checks.
- Skills status/list reports.
- Memory files and memory injection budgets.
- Session store and transcript usage logs.

## PR order

### PR 1: Report schema and static collectors

Add `@openclaw/context-budget` package skeleton, report types, deterministic
JSON schema, token-estimation utility, workspace file collector, skills
collector, and fixture tests.

Do not add runtime hooks or mutation commands.

### PR 2: Existing runtime evidence adapter

Read existing `systemPromptReport`, session store usage, `/context`-style
breakdowns, compaction metrics, and provider usage when available. Mark stale,
missing, exact, and estimated values explicitly.

Do not change context engine behavior.

### PR 3: CLI audit/report commands

Add:

```bash
openclaw budget audit --json
openclaw budget report --format markdown
openclaw budget explain --source skills --json
```

Output should be deterministic for fixture workspaces and useful without a
configured model provider.

### PR 4: Dry-run recommendations

Add:

```bash
openclaw budget recommend --dry-run --json
```

Support conservative recommendation classes: `review`, `split`, `dedupe`,
`tune-limit`, and `archive`. No file edits.

### PR 5: oc-path patch preview

Once recommendation IDs stabilize, add optional oc-path-backed patch previews
for narrow cases such as limit tuning or duplicate local skill copies. Keep
apply separate and explicit.

### PR 6: Policy evidence

Expose policy-readable evidence for recent budget reports, thresholds, and
attestation hashes. Policy consumes the report; it does not own the source
inventory or rewrite rules.

### PR 7: Enterprise Feeds integration

Let Enterprise Feeds entries declare expected context ranges and owners. Context
Budget can flag installed feed entries whose observed context footprint exceeds
the declared range.

## Acceptance bar

- Runs without a model provider.
- No MVP command mutates files, memory, or policy.
- Every token number is marked exact, estimated, stale, or missing.
- Findings have stable IDs and precise targets where possible.
- Fixture output is deterministic.
- Runtime evidence is optional input, not a hard dependency.
