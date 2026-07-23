# Recursive Layer Model Evaluation

## Model

Let `S` be accumulated authority state and `L` one resolved named layer:

```text
fold([], layers) = empty
fold(S, [L, ...rest]) = fold(compose(S, L), rest)
```

`compose` is role-neutral. A layer label identifies provenance only. Layer order
is strongest to weakest.

## Required Algebra

| Case                      | Rule                                                                                                                         |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Missing path              | Identity: the layer contributes no value or claim.                                                                           |
| First declaration         | Establish the value, control mode, and controlling-layer provenance.                                                         |
| Later exact declaration   | Accept only the same canonical value; otherwise emit a conflict naming both layers.                                          |
| Later bounded declaration | Accept only an equal or stricter value and carry the tightened boundary forward.                                             |
| Invalid layer             | Fail the candidate composition; do not skip the layer or partially publish.                                                  |
| Defaults                  | Apply only after every declared layer is composed. Defaults never claim authority.                                           |
| Runtime-derived values    | Apply after composition only when they cannot weaken authority; otherwise classify them as an explicit layer or reject them. |

Exact composition is a partial associative operation over `missing` and equal
canonical values. A bounded comparator must be deterministic, idempotent, and
associative over its supported domain. Order remains relevant to provenance and
conflict explanation.

## Presence-Preserving Canonicalization

Each layer must be validated and canonicalized without adding defaults or
unmentioned siblings. Otherwise independently materializing a sparse layer
would turn defaults into false authority claims.

```text
parse -> source-local resolution -> presence-preserving canonicalization
  -> recursive authority fold -> cross-field validation
  -> defaults/runtime materialization -> runtime snapshot
```

Canonicalization may normalize explicitly present values. It must preserve the
set of declared schema paths.

## Layer Lifecycle

### Removal

Removing or reordering a layer recomputes the complete chain from source
documents. Authority state is derived, not persisted as a second source of
truth. If an earlier exact claim disappears, the next declaring layer becomes
controlling. If no layer declares it, the ordinary default applies.

### Equal claims

Equal exact declarations are accepted. Provenance records every declaring layer
but identifies the earliest remaining declaration as controlling.

### Writable middle layers

A source may be writable at any position. A mutation targets that source and is
validated against the complete candidate chain. It cannot violate earlier
authority, may establish authority over later layers, and cannot commit if the
target source or authority-chain identity changed since preflight.

### Deletion and null

Absence means no declaration. Removing a path from a writable layer relinquishes
that claim on recomposition. `null` is a declared value only where the ordinary
schema accepts null; it is not a generic deletion marker.

Empty objects contain no declared leaves and canonicalize away without a
per-path warning. A complete layer with zero declarations remains valid but
should produce one `NoDeclaredValues` advisory in inspection/status. This keeps
staged empty layers possible while making accidental empty sources visible.

## Provenance State

For each declared path, accumulated state needs:

```text
path
canonicalValue
control
controllingLayer
declaringLayers[]
boundaryHistory[]
```

The authority-chain identity covers ordered layer identities plus normalized
claims and control metadata. The effective-content identity covers the final
redacted runtime configuration.

## Role Evaluation

| Lens                       | Result                                                                                                                           |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Founder                    | One ordinary writable layer remains the default profile; generic layering adds no tax unless configured.                         |
| Gateway engineer           | The fold runs only during activation. Runtime consumers and reload planning remain unchanged.                                    |
| Platform engineer          | Arbitrary named layers support platform/tenant/team shapes without core role semantics; chain identity supports drift detection. |
| Lobster container engineer | Full recomputation and atomic snapshot publication make layer rotation deterministic.                                            |
| CISO                       | Earlier authority cannot be bypassed by writable later layers; runtime overrides must be classified.                             |
| New hire                   | Diagnostics show declared order and name the conflicting earlier layer without requiring host/operator terminology.              |

## Decision

Adopt the recursive role-neutral model. Prototype exact authority first, but
accept `Layer[]` and test zero, one, two, and three layers. Do not add role enums,
a special operator slot, numeric priority, implicit discovery, persisted derived
authority state, or generic deletion markers.
