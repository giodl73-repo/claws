---
covers: [atom:WSP/rejection-vectors, atom:WSE/lossless-roundtrip]
---

# Pitfalls: path handling + round-trip

The failure modes the WSP 12-rejection-vector table and the WSE
lossless round-trip guarantee protect against. Each entry names the
pitfall, the consequence if it reaches production, and the mitigation
layer that catches it.

## P-01 · Path traversal via `..`

**Input**: `oc://workspace/../../../etc/passwd`
**Consequence**: escape the workspace root, read arbitrary files.
**Caught by**: parser (Layer 1), `OcPathError { reason: 'traversal' }`.

## P-02 · Windows drive letters

**Input**: `oc://C:/Users/admin/secrets`
**Consequence**: bypass workspace root by naming an absolute drive.
**Caught by**: parser (Layer 1), `OcPathError { reason: 'drive-letter' }`.

## P-03 · NTFS junction / symlink escape (TOCTOU)

**Input**: `oc://skills/foo` where `foo` is a symlink to `C:\Windows`.
**Consequence**: parser accepts (syntactically valid), but the target
escapes the workspace at resolution time.
**Caught by**: runtime (Layer 3), `OcPathError { reason: 'symlink-escape' }`.

This is the TOCTOU hardening in `resolveFsPath`. The parser cannot
catch it — the symlink target is a runtime property. Re-resolve on
every use.

## P-04 · Homoglyph bypass

**Input**: `oc://skills/аdmin` (Cyrillic а, Latin dmin)
**Consequence**: two URIs that look identical point at different
files; attacker adds a shadow skill the UI cannot distinguish.
**Caught by**: parser (Layer 1), `OcPathError { reason: 'non-ascii' }` —
we reject all non-ASCII in segments. The homoglyph attack assumes
Unicode normalisation tolerance; we don't tolerate it.

## P-05 · BOM in segment

**Input**: `oc://skills/﻿foo`
**Consequence**: hash comparison diverges between plugin and snap
(one strips BOM, the other doesn't); byte-identity breaks.
**Caught by**: parser (Layer 1), `OcPathError { reason: 'bom' }`.

## P-06 · Emitter reformat

**Input**: Parse a CRLF AGENTS.md, emit, diff shows LF.
**Consequence**: round-trip is NOT byte-identical. Downstream
canonicalizer produces different hash, audit chain breaks.
**Caught by**: `test/roundtrip.property.test.ts` in CI. ANY mismatch
blocks merge.

Emitter MUST preserve `lineEnding` per file. Never use string
`.replace(/\r\n/g, '\n')` inside emitter code.

## P-07 · BOM stripping on round-trip

**Input**: Parse a UTF-8-BOM AGENTS.md, emit, BOM missing.
**Consequence**: Windows consumers that require BOM stop reading the
file.
**Caught by**: round-trip property test. Emitter preserves `bom: boolean`
on the node.

## P-08 · Dirty flag bypass

**Input**: Mutation API forgotten, node stays `dirty: false`, emitter
skips the file, change is lost silently.
**Consequence**: data loss that looks like emitter success.
**Caught by**: every mutation API sets `dirty` internally. Direct
mutation of AST fields is NOT supported — API calls only. See
[../specs/WSE-emitter.md § Add-only architecture](../specs/WSE-emitter.md).
