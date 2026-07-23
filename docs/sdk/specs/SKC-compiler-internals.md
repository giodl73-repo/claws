# SKC — Compiler internals

**Sub-spec of**: [SK-sdk.md](./SK-sdk.md) · **Internal** (not part of `/api`)

## GovernanceIR

The compiler's primary data structure. `GovernanceIR` is the
intermediate representation that captures an entire workspace's
governance decision table:

```ts
interface GovernanceIR {
  readonly workspaceHash: string; // sha256(canonical workspace bytes)
  readonly tools: ReadonlyMap<string, ToolEntry>;
  readonly sensitivity: ReadonlyMap<string, SensitivityLabel>;
  readonly providers: ReadonlyArray<ProviderConfig>;
  readonly rules: RuleFindings; // findings from 29 G-rules
  readonly canonicalBytes: Uint8Array; // RFC 8785 JCS canonicalized
  readonly emittedAt: number;
  readonly canonicalizerVersion: 1;
}
```

GovernanceIR is the superset of PolicyIR (see
`policy/specs/POI-policy-ir.md`). PolicyIR is what the runtime sees;
GovernanceIR includes additional compile-time context (findings,
workspace hash, sensitivity labels).

## 29 G-rule registry

The compiler runs 29 governance rules during validation. The
registry is in three groups:

- **G-01 through G-10**: tier classification rules
- **G-11 through G-20**: args_from chain rules (G-CHAIN family)
- **G-21 through G-29**: sensitivity propagation + clamping

Every rule has a canonical code (G-NN), a severity (BLOCK or WARN),
and a message template. The registry is exported at
`@bic/claws-sdk/compile` as `GRuleRegistry` — internal consumers
can reference rule-by-code.

See [../guides/pass-ordering.md](../guides/pass-ordering.md) for
which pass each rule runs in.

## Incremental cache

```ts
interface CompilerCache {
  get(key: string): GovernanceIR | undefined;
  put(key: string, ir: GovernanceIR): void;
}
```

Cache key = `sha256(workspaceHash + claws-sdk-version + canonicalizer-version)`.
A hit returns the cached IR directly; a miss triggers full
compilation.

See [../pitfalls/cache.md](../pitfalls/cache.md) for the cache-key
failure modes.

## Lossless round-trip

`canonicalBytes` is the RFC 8785 JCS canonicalization of the IR
itself. Every consumer that hashes the IR MUST feed `canonicalBytes`
to `sha256()` with no intervening transformation. See
[`workspace/specs/WSC-canonicalize.md`](../../workspace/specs/WSC-canonicalize.md).

A production bug here would mean plugin and snap disagree on what
the active IR is — chain cross-linking breaks silently. The
round-trip property test at
`packages/claws-sdk/test/compile/roundtrip.property.test.ts` is
the last line of defence.

## Not a standalone package

SKC is an SDK-internal atom. There is NO `@bic/claws-compiler`
package. Consumers access the compiler through `@bic/claws-sdk/compile`.
