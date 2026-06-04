# `@openclaw/context-budget` Proposal

## One-line

Context Budget explains where tokens and context go, then produces dry-run
recommendations for humans to review. It answers: "Which workspace, skill,
memory, tool, or transcript inputs are consuming budget, and what can we safely
improve?"

## Naming

Use `context-budget`, not `self-improvement`, for the upstream package. The
package should be observational and review-oriented first. It should not
silently rewrite prompts, skills, memories, or policies.

## Top-level pitch

OpenClaw already shows pieces of context usage through `/status`, `/usage`, and
`/context`, but operators do not yet have a durable report that explains which
workspace files, skills, tool schemas, memory snippets, transcripts, and runtime
blocks are consuming context across a workspace.

Context Budget turns those existing signals into a package-level audit loop:

```bash
openclaw budget audit --json
openclaw budget report --format markdown
openclaw budget recommend --dry-run --json
```

The package starts as evidence and recommendations only. It should tell humans
where context is going, which sources look duplicated or stale, and which
changes are likely worth reviewing. It should not apply rewrites, delete memory,
or make quality judgments about prompt content.

## Precedent in OpenClaw

OpenClaw already has:

- skills and plugins that add prompt/context surface;
- memory plugins and workspace files;
- provider/model usage metadata;
- token and context budget UX in several runtime paths;
- oc-path for precise workspace edits;
- policy for conformance checks and human-approved posture.

Context Budget should compose this evidence rather than creating a new runtime
or prompt authoring system.

## Existing OpenClaw signals

Context Budget should build on current OpenClaw surfaces:

- `/context list`, `/context detail`, `/context json`, and `/context map`
  already expose system-prompt, bootstrap-file, skills, tools, and actual cached
  context usage when a run report exists.
- `/status` and `/usage` expose current session context usage, provider usage,
  and cost estimates when provider metadata is available.
- Compaction events expose before/after token counts, compacted counts, and
  summary lengths.
- The context engine `assemble` contract includes `estimatedTokens`.
- Doctor already checks bootstrap file budgets and reports truncation causes.
- Skills commands already list eligible, disabled, filtered, and loaded-but-not
  injected skills.
- Memory is represented by workspace files and memory-search snippets with
  explicit injection budgets.

The first package should reuse these concepts. It should not add a second
context engine, and it should not replace the current chat commands.

## Product boundary

Context Budget owns:

- collecting contribution records from existing workspace and runtime evidence;
- estimating tokens when exact usage is unavailable;
- grouping context by source family;
- flagging obvious budget problems;
- generating dry-run recommendations with stable targets.

Context Budget does not own:

- model/provider billing reconciliation;
- autonomous prompt compression;
- memory deletion;
- context engine replacement;
- policy enforcement;
- fleet dashboards.

This boundary matters because "self improvement" can quickly become a second
agent that edits the first agent. The upstream package should instead be the
boring, reliable report that lets humans and policy decide what to do.

## First package scope

MVP capabilities:

1. Collect context contribution records from available OpenClaw sources.
2. Group budget by source family: system, workspace docs, skills, memory,
   retrieved documents, tool schemas, transcript, channel metadata.
3. Emit a deterministic JSON report.
4. Flag obvious issues: duplicate text, oversized skill docs, unused large
   skills, repeated instructions, high-token tool schemas, stale memory blocks.
5. Produce a dry-run recommendation list with `oc://` targets where possible.

MVP source families:

| Family | First-pass source |
|---|---|
| `bootstrap` | `systemPromptReport.injectedWorkspaceFiles` and static workspace scan |
| `skills` | skills status/list output plus `systemPromptReport.skills` |
| `tools` | `systemPromptReport.tools` and tool schema/list sizes |
| `memory` | `MEMORY.md`, `memory/*.md`, and memory injection budgets |
| `transcript` | session store/transcript usage where available |
| `runtime` | current-turn runtime context and context-engine estimates |
| `providerUsage` | normalized usage/cost fields when available |

Out of scope for MVP:

- autonomous edits;
- model-quality scoring;
- prompt A/B experiments;
- deleting memories;
- provider billing reconciliation;
- fleet dashboard.

## Candidate CLI

```bash
openclaw budget audit --json
openclaw budget explain --source skills --json
openclaw budget recommend --dry-run --json
openclaw budget report --format markdown
```

`budget recommend` should not mutate files. A later `--apply` path would need
oc-path-backed patches, policy checks, and explicit human approval.

## Evidence model

```jsonc
{
  "schemaVersion": 1,
  "workspace": {
    "root": "oc://workspace",
    "openclawVersion": "2026.x"
  },
  "summary": {
    "estimatedTokens": 48210,
    "exactTokens": null,
    "estimateMethod": "chars-div-4",
    "largestFamilies": [
      { "family": "skills", "estimatedTokens": 18120 },
      { "family": "memory", "estimatedTokens": 9900 }
    ]
  },
  "contributions": [
    {
      "id": "skill:email-drafter/SKILL.md",
      "family": "skills",
      "target": "oc://skills/email-drafter/SKILL.md",
      "estimatedTokens": 4200,
      "exactTokens": null,
      "confidence": "medium",
      "source": "static-scan",
      "usage": {
        "lastUsedAt": "2026-05-25T10:00:00Z",
        "runs30d": 2
      },
      "signals": ["large", "low-recent-use"]
    }
  ],
  "recommendations": [
    {
      "id": "budget/large-low-use-skill",
      "severity": "warning",
      "target": "oc://skills/email-drafter/SKILL.md",
      "message": "Skill is large and rarely used in the last 30 days.",
      "estimatedSavingsTokens": 2800,
      "action": "review"
    }
  ]
}
```

Token counts are estimates unless the provider supplies exact usage. The report
must identify which numbers are estimated.

Each contribution should preserve provenance:

- source: `run-report`, `session-store`, `static-scan`, `skill-status`,
  `memory-scan`, `provider-usage`, or `context-engine`;
- collection time;
- workspace or agent id when known;
- target URI when resolvable;
- whether the value is exact, estimated, stale, or missing.

## Finding IDs

Initial IDs:

- `budget/source-too-large`
- `budget/duplicate-instructions`
- `budget/conflicting-instructions`
- `budget/large-low-use-skill`
- `budget/stale-memory-block`
- `budget/tool-schema-too-large`
- `budget/transcript-dominates-context`
- `budget/missing-usage-metadata`
- `budget/bootstrap-truncated`
- `budget/provider-usage-overstates-context`
- `budget/context-report-stale`

Findings should be recommendations unless the user or policy defines a hard
budget threshold.

## Recommendation classes

Recommendations should be deliberately conservative:

- `review`: human should inspect the target.
- `split`: source is large enough that splitting may improve retrieval or skill
  loading.
- `dedupe`: two sources appear to repeat the same instructions.
- `tune-limit`: a config budget appears too low or too high for the observed
  source.
- `archive`: source appears stale and unused, but the package should not remove
  it.

No MVP recommendation should include an automatic mutation. A later patch
preview can use oc-path-backed diffs, but applying those diffs should be a
separate explicit action.

## Policy integration

Context Budget can later expose evidence for policy, but it should not become
policy itself. Useful future policy rules:

- require a maximum context estimate for specific agents;
- require budget reports in CI;
- require human approval before applying budget recommendations;
- deny autonomous prompt/skill rewrites.

The key is to make budget findings target precise sources so policy and humans
can make reviewable decisions.

Policy should consume Context Budget as evidence, not as source of truth. For
example, policy may require that a budget report was generated recently or that
estimated context stays below a threshold for an agent. Policy should not
duplicate the source inventory or define rewriting rules.

## Role review

Founder/upstream maintainer: the package is acceptable if it improves
debuggability for everyone and remains optional. It should not make simple
agents harder to understand.

Gateway/platform: avoid runtime hot-path overhead. The first PR should be a CLI
report and fixture tests. Runtime hooks should be passive inputs, not mandatory
blocking work.

Skill author/consumer: findings should explain which skill content is large,
duplicated, or rarely used without shaming authors or changing the skill format.

CISO/compliance: reports need provenance, stable IDs, timestamps, and evidence
hashes before policy or audit workflows depend on them.

New hire/power user: the command should be obvious and useful without a long
setup. `openclaw budget audit --json` and a readable markdown report are enough
for the first loop.

## Enterprise Feeds integration

Enterprise Feeds and Context Budget should reinforce each other:

- feed entries can declare expected context cost ranges;
- budget can flag installed feed entries that exceed their declared range;
- feed metadata can identify owners for budget recommendations;
- budget can suggest replacing a local copied skill with a feed-maintained
  version when the content appears duplicated.

This is evidence sharing, not tight package coupling. Each package should work
without the other.

## M365/Lobster fit

For M365 scenarios, Context Budget helps answer:

- which Office/Teams/Outlook skills are dominating context;
- which meeting transcripts or retrieved documents are too large;
- whether a workspace is carrying stale onboarding or policy docs;
- which skills should be split, compressed, or feed-managed.

M365-specific optimization logic should remain downstream. The upstream package
should provide generic reports and recommendation mechanics.

## PR plan

1. Package skeleton and report schema.
2. Static collectors for workspace docs and installed skills.
3. Runtime usage input hook for optional usage metadata.
4. `budget audit --json` and `budget report --format markdown`.
5. `budget recommend --dry-run --json` with non-mutating recommendations.
6. Optional oc-path-backed patch preview once recommendations stabilize.

## Acceptance criteria

- Budget audit runs on a workspace without requiring a model provider.
- Report output is deterministic for fixture workspaces.
- Large files and duplicate instruction fixtures produce stable findings.
- Recommendations include precise targets when oc-path can resolve them.
- No MVP command mutates workspace files or memories.
- Missing usage metadata degrades to static analysis rather than failure.
