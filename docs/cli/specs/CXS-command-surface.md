# CXS — Command surface

**Sub-spec of**: [CX-cli.md](./CX-cli.md)

## Progressive disclosure: 4 / 18 / 40

The CLI surfaces commands in three layers:

### Layer 1 — Top-level groups (4 visible commands)

`claws --help` shows exactly 4 primary commands:

- `init` — bootstrap a governed workspace
- `doctor` — run health diagnostics
- `snap` — snapshot lifecycle management
- `policy` — compile and validate policies

### Layer 2 — Sub-commands (18 commands)

`claws <group> --help` shows the full sub-command list for that group.
Total across all groups: 18 commands.

Examples:
- `claws snap`: list, promote, rollback, current, events
- `claws policy`: generate, validate, verify, diff
- `claws doctor`: (no sub-commands; runs the full diagnostic pass)

### Layer 3 — Advanced flags (40 commands with flags)

`claws <group> <cmd> --help` shows the full flag surface for the
sub-command. Most operators never see this layer — they use the
documented defaults.

## `--help` rules

- Every command MUST support `--help`, including `claws --help`
- `--help` output is stable across minor versions
- Error messages include the closest-valid command suggestion
  (Levenshtein distance ≤ 2): `claws scn --help` prints "did you mean
  `claws snap`?"

## Exit codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | User error (bad args, missing config) |
| 2 | Runtime error (SDK exception, network failure) |
| 3 | Governance denial (policy blocked the operation) |
| 4 | Partial success with warnings |

`doctor` exits 0 only when ALL checks pass. Any WARN yields 4.

## Output shape

All commands support `--json` for machine-readable output. Without
`--json`, output is TTY-aware: colour + boxes + progress when stdout
is a terminal; plain text when piped.

See [../guides/command-groups.md](../guides/command-groups.md) for
the canonical groups-to-operations mapping.
