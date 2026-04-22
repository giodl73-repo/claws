# POI — PolicyIR

**Sub-spec of**: [PO-policy.md](./PO-policy.md)

## Types

```ts
interface PolicyIR {
  readonly version: 1;
  readonly snapshotId: string;
  readonly policyArtifactSha256: string;
  readonly tools: ReadonlyMap<string, ToolEntry>;
  readonly governance: GovernanceIR;
  readonly emittedAt: number;
  readonly canonicalizerVersion: 1;
}

interface ToolEntry {
  readonly name: string;
  readonly declaredTier: RiskTier;
  readonly effectiveTier: RiskTier;         // after args_from resolution
  readonly failMode: FailMode<RiskTier>;
  readonly argsSchema: JsonSchema | null;
  readonly argsFromChain: ReadonlyArray<string>;  // ordered parent tool names
}

interface GovernanceIR {
  readonly providers: ReadonlyArray<ProviderRef>;
  readonly trustSetRef: string;
  readonly decisionDefaults: DecisionDefaults;
}
```

## `FailMode<R>`

A tier-keyed discriminated union that expresses which tiers may
fail-open and which are forced fail-closed:

```ts
type FailMode<R extends RiskTier> =
  | (R extends 'R1' | 'R2' ? 'open' : never)
  | (R extends 'R3' | 'R4' ? 'open' | 'closed' : never)
  | (R extends 'R5' ? 'closed' : never);
```

R1 and R2 can be `open` or `closed` (default `open` for availability).
R3 and R4 are host-configurable. R5 is `closed` — unassignable to
`open` in the type system, and the compiler + runtime both enforce
this (defence in depth).

See [../pitfalls/failmode.md](../pitfalls/failmode.md) for the
misconfiguration failure modes this type catches.

## Cross-platform emit contract

The compiler emits PolicyIR as a canonical JSON blob (RFC 8785 JCS,
canonicalizerVersion 1 — see
[workspace/specs/WSC-canonicalize.md](../../workspace/specs/WSC-canonicalize.md)).
The blob is byte-identical across Linux, Windows, macOS. Plugins
downstream hash the blob to confirm they received the expected policy.

`policyArtifactSha256` MUST equal `sha256(canonicalize(policyIR))`
— this is the anchor every downstream audit entry cross-links against.

## Version contract

`version: 1` is the only supported value in Horus. Future upgrades
bump the field; the consumer chooses whether to accept older versions
or fail the load. `canonicalizerVersion: 1` tracks the canonicalizer
implementation separately from the IR schema.
