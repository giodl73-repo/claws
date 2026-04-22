# WSE — AST → file emitter

**Sub-spec of**: [WS-workspace.md](./WS-workspace.md) · **Absorbs**: CL-14

## Lossless round-trip guarantee

For any workspace `W` that the parser accepts, `emit(parse(W)) === W`
byte-for-byte. This is the strongest promise the package makes. It is
enforced in CI by the property-test suite at
`packages/openclaw-workspace/test/roundtrip.property.test.ts`.

Violating round-trip (even for one byte) is a release-blocking bug. It
means an emitter pass silently corrupts workspaces, which breaks every
downstream guarantee (canonicalizer byte-identity, audit chain
cross-linking, policy-IR reproducibility).

See [../pitfalls/path-handling.md](../pitfalls/path-handling.md) for
the failure modes that round-trip testing catches.

## Add-only architecture

Emitter MUST NOT modify any file the AST did not explicitly change.
Every field of `WorkspaceAST` has a `dirty: boolean` flag set by the
AST mutation API; `emit()` only rewrites files whose node is dirty.
Clean nodes round-trip to their original bytes (including trailing
newlines, line endings, and BOMs, if present).

Consequence: `emit(parse(W))` is a no-op on every file when nothing
mutated. The filesystem sees zero writes. This is the critical
property that makes `claws` tools safe to run repeatedly — no CRLF
churn, no BOM stripping, no whitespace normalisation.

## Platform line-ending contract

The parser detects line endings per file on ingest (CRLF, LF, or
mixed) and stores the detected form as `lineEnding: 'crlf' | 'lf' |
'mixed'` on the node. The emitter writes back in the SAME form.

This is NOT a reformatting tool. A Windows-authored AGENTS.md stays
CRLF; a macOS-authored one stays LF. `claws` never imposes a
repository-wide line-ending convention.

## BOM handling

Files authored with a UTF-8 BOM keep the BOM on round-trip. Files
without a BOM stay without. This matters for some downstream
consumers (Windows Notepad tolerates only UTF-8-BOM, older Unix
tools choke on it) — we never silently flip between the two.
