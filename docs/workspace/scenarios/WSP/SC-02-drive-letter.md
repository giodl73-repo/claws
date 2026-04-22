---
covers: [atom:WSP/rejection-vectors]
---

# SC-02 · WSP drive letter rejection

**Series**: WSP · **Runner**: security-sim

## Input

`oc://C:/Users/admin/secrets`

## Expected

`parseOcUri` throws `OcPathError { reason: 'drive-letter' }`.

## Proves

Windows absolute-path form cannot smuggle an escape past the parser.
