---
covers: [atom:CXS, atom:CXS/progressive-disclosure]
---

# Command groups

The CLI's four primary command groups and when to reach for each.

## init

`claws init [--fleet=<name>]` — bootstrap a governed workspace.
Writes `claws.json`, creates the `claws/` metadata directory, and
(if `--fleet` is passed) wires the workspace to a fleet binding.
Idempotent: safe to re-run against an existing workspace.

## doctor

`claws doctor` — run the full diagnostic pass over the current
workspace. Checks:

- `claws.json` is valid and parseable
- `snapshotId` resolves to a known snapshot
- Trust set is loaded and has no expired keys
- Policy artifact hash matches the recorded artifact
- No residue from prior migrations (no `craftworks` references)

Exit 0 when everything passes; exit 4 on any WARN; exit 1 on any
BLOCK.

## snap

`claws snap {list,promote,rollback,current,events}` — the snapshot
lifecycle. See `snap/specs/SNP-promote.md` for the non-uplift
semantics these commands rely on.

- `list` — print known snapshots
- `promote <id>` — promote to a named snapshot
- `rollback` — restore the prior snapshot
- `current` — print the currently-active snapshot
- `events` — tail the SSE event stream

## policy

`claws policy {generate,validate,verify,diff}` — compilation and
verification of the policy IR.

- `generate` — compile `workspace/` → `policy-ir.json`
- `validate` — run the 29 G-rule registry against an existing IR
- `verify` — check the policy artifact's SHA matches the expected
- `diff <from> <to>` — show the decision-table diff between two
  policy artifacts

## Progressive disclosure

The 4 groups are what `claws --help` lists. Each group's `--help`
shows its own sub-commands. See
[../specs/CXS-command-surface.md § Progressive disclosure](../specs/CXS-command-surface.md).

The "40 commands" total count in the progressive-disclosure model is
the full flag surface across all sub-commands — most operators never
see it. When you do need it, `claws <group> <cmd> --help` is always
the authoritative reference.
