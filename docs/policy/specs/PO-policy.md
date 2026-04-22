# PO — @bic/openclaw-policy (primary spec)

**Status**: Alpha · **Upstream target**: `@openclaw/policy` · **Supersedes**: CL-04 public surface

## Package overview

The policy package is the tool-using-workspace compilation pipeline.
It takes a parsed `WorkspaceAST` (see
[workspace/specs/WSA-ast.md](../../workspace/specs/WSA-ast.md)) and
emits a `PolicyIR` — the compiled governance program the runtime
enforces against.

The package exposes the PUBLIC compiler surface. The compiler
internals (29 G-rule registry, sensitivity propagation, G-CHAIN
compilation) live in `compiler-sdk` and are not part of this package.

## Exported subpaths

| Subpath | Exports |
|---------|---------|
| `/ir` | `PolicyIR` type, `GovernanceIR`, `FailMode<R>` — see [POI-policy-ir.md](./POI-policy-ir.md) |
| `/compile` | `compile(workspace): PolicyIR`, `validate(ir)`, `PolicyCompileError` — see [POC-compiler.md](./POC-compiler.md) |

## Tool-using-workspace pattern

Every OpenClaw workspace is compiled the same way: discover tools
from `TOOLS.md`, classify them by risk tier, resolve `args_from`
chains, emit a policy-IR that captures the full decision table. The
runtime does NOT interpret `TOOLS.md` at request time — it consumes
the pre-compiled IR.

See [../tutorials/first-policy.md](../tutorials/first-policy.md) for
the end-to-end worked example.

## Sub-spec index

| Code | File | Authority over |
|------|------|----------------|
| **POI** | [POI-policy-ir.md](./POI-policy-ir.md) | PolicyIR types, schema, FailMode<R>, version contract |
| **POC** | [POC-compiler.md](./POC-compiler.md) | `compile()` + `validate()` public API, incremental caching |

## Stability contract

Alpha. The `compile()` + `validate()` signatures are stable; the
`PolicyIR` shape is append-only (new fields allowed, no removals)
until v1.0.
