# CX — @bic/claws (primary spec)

**Status**: Alpha · **Upstream target**: none (internal CLI)

## Package overview

The `claws` CLI binary. The surface operators interact with directly
to init a workspace, run doctor diagnostics, manage snapshots,
validate policies, and drive every other governance operation.

`claws` is a THIN UI adapter. Every operation delegates to a
`claws-sdk` function. No business logic in the CLI — argument
parsing, pretty output, exit codes, and that's it.

## Command structure

The CLI exposes a two-level command structure:

```
claws <group> <command> [args]

Examples:
  claws init
  claws doctor
  claws snap list
  claws snap promote <id>
  claws policy validate
  claws audit verify
```

Four primary groups are always visible; sub-commands progressively
disclose deeper operations (see
[CXS-command-surface.md § Progressive disclosure](./CXS-command-surface.md)).

## Sub-spec index

| Code | File | Authority over |
|------|------|----------------|
| **CXS** | [CXS-command-surface.md](./CXS-command-surface.md) | Command tree, progressive disclosure, `--help` rules |
| **CXJ** | [CXJ-claws-json.md](./CXJ-claws-json.md) | `claws.json` schema + three-layer merge |
| **CXP** | [CXP-platform-detection.md](./CXP-platform-detection.md) | Platform detection, the 7-platform matrix |

## Stability contract

Alpha. The top-level command groups (init, doctor, snap, policy,
audit, fleet, verify, assess) are stable. Sub-commands are append-only
within Alpha.
