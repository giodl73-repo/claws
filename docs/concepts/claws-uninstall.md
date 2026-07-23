# claws uninstall

Clean removal of governance artifacts from a workspace, restoring the original OC configuration.

## Overview

`claws uninstall` removes all governance artifacts that `claws init` and `claws build` added to a workspace. It leaves the original OpenClaw files untouched -- consistent with the lossless guarantee. Uninstall does not modify, delete, or rewrite any OC-authored file.

## What Gets Removed

| Artifact               | Location             | Removed   |
| ---------------------- | -------------------- | --------- |
| claws.json             | Workspace root       | Yes       |
| .claws/ directory      | Governance artifacts | Yes       |
| OC configuration files | Workspace root       | **Never** |
| User-authored skills   | skills/              | **Never** |

## Uninstall Process

1. Verify workspace has claws artifacts (fail if not initialized)
2. Remove `.claws/` directory and all contents
3. Remove `claws.json` configuration file
4. Emit a final CGR entry recording the uninstall event
5. Exit with code 0

## Safety

Uninstall is idempotent -- running it on an already-uninstalled workspace is a no-op. It never touches files outside the `.claws/` directory and `claws.json`.

## Related

- [claws init](claws-init.md) -- the inverse operation
- [Lossless Guarantee](lossless-guarantee.md) -- OC files are never modified
- `design/claws/ATOMS.md` -- C33 `atom:claws-uninstall`
