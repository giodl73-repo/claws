---
covers: [atom:WSC]
---

# SC-01 · WSC byte-identity across 3 consumers

**Series**: WSC · **Runner**: compile-sim

## Setup

A fixed JSON value:

```json
{"b": 2, "a": [1, 2, 3], "c": {"nested": true}}
```

## Run

- Plugin generator calls `canonicalize(value)` → bytes A
- Snap runtime calls `canonicalize(value)` → bytes B
- Audit verifier calls `canonicalize(value)` → bytes C

## Expected

`A === B === C` at byte level. `sha256(A) === sha256(B) === sha256(C)`.

## Proves

The single canonicalizer implementation is the only source of canonical
bytes. Three consumers see identical output.
