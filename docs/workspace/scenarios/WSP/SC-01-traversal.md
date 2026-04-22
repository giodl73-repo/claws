---
covers: [atom:WSP/rejection-vectors]
---

# SC-01 · WSP traversal rejection

**Series**: WSP · **Runner**: security-sim

## Input

`oc://workspace/../../../etc/passwd`

## Expected

`parseOcUri` throws `OcPathError { reason: 'traversal' }`. No
filesystem syscall is issued.

## Proves

Parser layer catches absolute path traversal before construction.
Runtime layer (symlink check) is NOT reached because parser rejected
the input first.
