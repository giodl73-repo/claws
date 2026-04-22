# @bic/openclaw-workspace

Typed AST for the 9-file OpenClaw workspace (AGENTS.md, TOOLS.md, and
7 siblings), lossless parser, canonical path handling (`oc://` URIs),
and RFC 8785 JCS canonicalizer — the foundation every downstream
package imports.

## Two-letter code

**WS** — package primary. Sub-specs use 3-letter codes with WS as
prefix: **WSP** (path/URI), **WSC** (canonicalize), **WSA** (AST),
**WSE** (emitter).

## Stability and upstream

- **Stability tier**: Alpha
- **Upstream target**: `@openclaw/workspace` (public package after
  contribution-sequence promotion per `upstream/specs/UG-upstream.md`)

## Contents

### Specs

- [WS-workspace.md](./specs/WS-workspace.md) — primary spec
- [WSP-path.md](./specs/WSP-path.md)
- [WSC-canonicalize.md](./specs/WSC-canonicalize.md)
- [WSA-ast.md](./specs/WSA-ast.md)
- [WSE-emitter.md](./specs/WSE-emitter.md)

### Guides

- [getting-started.md](./guides/getting-started.md)
- [uri-handling.md](./guides/uri-handling.md)

### How-tos

- [defence-in-depth.md](./how-tos/defence-in-depth.md)

### Pitfalls

- [path-handling.md](./pitfalls/path-handling.md)
- [canonicalize.md](./pitfalls/canonicalize.md)

### Scenarios

- [WSP/SC-01-traversal.md](./scenarios/WSP/SC-01-traversal.md)
- [WSP/SC-02-drive-letter.md](./scenarios/WSP/SC-02-drive-letter.md)
- [WSP/SC-03-symlink-escape.md](./scenarios/WSP/SC-03-symlink-escape.md)
- [WSC/SC-01-byte-identity.md](./scenarios/WSC/SC-01-byte-identity.md)
- [WSC/SC-02-cross-platform.md](./scenarios/WSC/SC-02-cross-platform.md)
- [WSC/SC-03-version-mismatch.md](./scenarios/WSC/SC-03-version-mismatch.md)

## Quick links

- [ATOMS.md](./ATOMS.md) — atom registry for this package
- [CHANGELOG.md](./CHANGELOG.md) — version history
- [specs/WS-workspace.md](./specs/WS-workspace.md) — primary spec
