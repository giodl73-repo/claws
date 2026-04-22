# SVI — Workspace introspect

**Sub-spec of**: [SV-serve.md](./SV-serve.md)

## Read-only endpoints

The 8 `/workspace/*` endpoints let authorized clients inspect the
workspace WITHOUT performing policy operations. Editors, skill
tools, and companion apps use these to render workspace views.

## AST serialization

`GET /workspace/ast` returns the `WorkspaceAST` as JSON. Serialization
follows a stable shape:

```json
{
  "version": 1,
  "agentsMd": { "bom": false, "lineEnding": "lf", "sections": [...] },
  "toolsMd": { ... },
  "claudeMd": null,
  "claws": { ... },
  "skills": { ... },
  "hooks": null,
  "commands": null,
  "scripts": null,
  "readme": { ... },
  "unknownFiles": []
}
```

Unknown files include their raw bytes as base64 so clients can
round-trip them.

## Source range preservation

Every AST node includes a `sourceRange: { file, startByte, endByte }`
field. Editors use these to point at exact byte offsets in the
source files. Source ranges are stable across parse+emit
round-trips.

## No-mutation guarantee

`/workspace/*` endpoints are READ-ONLY. There is no
`PUT /workspace/ast` or `POST /workspace/mutate`. Workspace
mutations happen by editing source files (through the normal
filesystem) and re-reading.

Rationale: the workspace IS the source of truth. A "mutate via
API" endpoint would create race conditions between API writes and
filesystem writes. Editors write files and re-read.

## Content negotiation

`GET /workspace/file/{path}` returns raw bytes by default. With
`Accept: application/vnd.oc-workspace+json`, returns the AST node
for that file instead.
