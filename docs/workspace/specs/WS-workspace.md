# WS — @bic/openclaw-workspace (primary spec)

**Status**: Alpha · **Upstream target**: `@openclaw/workspace` · **Absorbs**: CL-09 (oc-workspace format)

## Package overview

The workspace package is the typed-AST foundation for every OpenClaw
tool. It defines how the 9-file workspace boots, how paths are named,
how canonical bytes are computed, and how an AST survives a write
round-trip without drift.

Every other package in the repo (`guardrails`, `policy`, `snap`) imports
workspace types. Nothing imports from them — `workspace` sits strictly
downstream of `security` (for threat model) and no other package.

## Exported modules

Subpath exports from `@bic/openclaw-workspace`:

| Subpath | What it exports |
|---------|-----------------|
| `/ast` | `WorkspaceAST`, 9 bootstrap file-node types, traversal API — see [WSA-ast.md](./WSA-ast.md) |
| `/path` | `OcPath` parser, `parseOcUri`, `normalizeOcPath` — see [WSP-path.md](./WSP-path.md) |
| `/canonicalize` | RFC 8785 JCS — see [WSC-canonicalize.md](./WSC-canonicalize.md) |
| `/emit` | `emit(ast): Record<string, Uint8Array>` — see [WSE-emitter.md](./WSE-emitter.md) |
| `/parse` | `parse(files): WorkspaceAST` |

## Sub-spec index

| Code | File | Authority over |
|------|------|----------------|
| **WSP** | [WSP-path.md](./WSP-path.md) | `oc://` URI grammar, 12 rejection vectors, byte-equality |
| **WSC** | [WSC-canonicalize.md](./WSC-canonicalize.md) | RFC 8785 JCS, algorithm version, cross-platform byte-identity |
| **WSA** | [WSA-ast.md](./WSA-ast.md) | 9 bootstrap file node types, traversal API |
| **WSE** | [WSE-emitter.md](./WSE-emitter.md) | Lossless round-trip, add-only architecture |

## Stability contract

Alpha. The 5 subpath exports above are the stable surface. Field
additions follow semver-minor; field removals or renames follow
semver-major. Any change to canonicalizer behaviour bumps
`WSC.algorithmVersion` (never silently) — see WSC § Algorithm version.

## Spec changelog

- **v0.1** (Horus wave) — absorbs CL-09; 4 sub-specs seeded.
