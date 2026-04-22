---
covers: [atom:WSC]
---

# SC-02 · WSC cross-platform byte-identity

**Series**: WSC · **Runner**: compile-sim

## Setup

A JSON value exercising number edge cases:

```json
{"n1": 0.1, "n2": 1e20, "n3": -0, "s": "café"}
```

## Run

Execute `canonicalize(value)` on Ubuntu 22.04, Windows 11, macOS 14.

## Expected

Byte-for-byte identical output on all three platforms. Identical
SHA-256 when hashed.

## Proves

No platform-specific number formatting, no Unicode-normalisation
drift. RFC 8785 JCS is implemented consistently.
