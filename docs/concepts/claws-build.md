# How do I compile my agent?

<!-- atom:claws-build (C82) -->

You ran `claws init`. Your workspace has a `claws.json` and a `.claws/` directory.
Now you want to compile. `claws build` is the command.

## Run it

```
$ claws build

  Platform: OpenClaw (detected from SOUL.md)
  Compiled: 29 governance rules, 4 tools classified

  Emitted:
    skills/claws-governance/SKILL.md      advisory (L1 prompt, pinch-compressed)
    plugins/claws-governance/index.ts     enforcement (L2+L3 Gateway plugin)
    exec-approvals.json                   OBO elicitation config (L4 host-level backup)
    lobster.compiled.yaml                 governance-injected workflow DAG

  Check (auto):
    15 policy checks passed in 0.3s

  Done in 1.2s
```

Four files. Two matter most:

1. **SKILL.md** -- advisory. The agent reads it. It describes governance
   rules as natural-language instructions in SKILL.md format. This is what the
   agent sees in its prompt context (L1).
2. **index.ts** -- enforcement. The Gateway loads it. It intercepts
   tool calls via `before_tool_call` hooks and blocks violations at runtime (L2+L3).
   Advisory can be ignored. Enforcement cannot.

The other two: `exec-approvals.json` configures which tools require human approval
(the OBO boundary, L4 host-level backup), and `lobster.compiled.yaml` is the
governance-injected workflow DAG. If your workspace has no `lobster.yaml`, the
workflow artifact is skipped -- you get 3 artifacts instead of 4.

## Auto-check

`claws build` auto-triggers a `check` pass after compilation. This is the
H1 handshake -- build always validates. If check finds violations, the build
still succeeds (artifacts are emitted), but you see the violations in the
terminal output.

Skip it if you need a fast build during iteration:

```
$ claws build --skip-check

  Compiled + emitted in 0.4s (check skipped)
```

## Cross-compile

Your teammate uses Cursor. You use OpenClaw. Same governance, different output:

```
$ claws build cursor

  Platform: Cursor (explicit target)
  Compiled: 29 governance rules, 4 tools classified

  Emitted:
    build/cursor/.cursorrules             governance-aware instructions

  Check (auto):
    15 policy checks passed in 0.3s
```

Cross-compile targets: `openclaw`, `cursor`, `claude`, `github`, `bedrock`,
`langgraph`, `crewai`. No target = auto-detect from workspace files.

Cross-compiled output goes to `build/<target>/`. The native platform output
goes alongside your workspace files (`skills/`, `plugins/`, `exec-approvals.json`).

## Build + optimize

Run boost passes during build for quality and cost optimization:

```
$ claws build --optimize

  Compiled: 29 rules, 4 tools
  Optimized: 847 → 712 tokens (-16%)
  Emitted: 4 artifacts
  Checked: 0 violations
```

## What to do next

```bash
claws check           # check anytime without rebuilding
claws watch           # auto-rebuild on every file save
claws build cursor    # cross-compile for a teammate
```

The build is fast (<2s). Run `claws build` after changing SOUL.md, TOOLS.md,
AGENTS.md, or claws.json. Or run `claws watch` and never think about it again.

## Scenario-Driven Additions

### From lossless-roundtrip scenarios (32 findings applied)
- BOM preservation: UTF-8 and UTF-16 BOMs in workspace files are stripped in-memory during parse but never removed from disk; build output is unaffected by source file BOM presence
- CRLF handling: mixed line endings (CRLF/LF/CR) are normalized internally; generated artifacts follow workspace convention or force LF -- source files are never rewritten
- Idempotent builds: deterministic serialization (sorted-key JSON, lexicographic file paths, timestamps excluded from hash) ensures repeated builds produce byte-identical output when sources are unchanged
- Hash-skip optimization depends on deterministic serialization; non-deterministic output would cause unnecessary file rewrites on every build
- Last-known-good artifact preservation: a failed build does not delete previously emitted governance artifacts, so the workspace retains a working enforcement layer while errors are fixed
