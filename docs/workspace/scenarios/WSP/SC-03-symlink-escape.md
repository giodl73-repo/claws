---
covers: [atom:WSP/rejection-vectors]
---

# SC-03 · WSP symlink escape rejection

**Series**: WSP · **Runner**: security-sim

## Setup

Workspace root at `/tmp/ws/`. A symlink at `/tmp/ws/skills/foo` points
to `/tmp/secrets/`.

## Input

`oc://skills/foo`

## Expected

`parseOcUri` succeeds (syntactically valid). `resolveFsPath(ocPath,
workspaceRoot)` throws `OcPathError { reason: 'symlink-escape' }`
because the resolved absolute path is not under `workspaceRoot`.

## Proves

Runtime layer (Layer 3) catches TOCTOU attacks that the parser
cannot see. The parser alone is not sufficient.
