# Findings Applied: crypto

**Date**: 2026-04-12
**Scenarios processed**: 4
**Total findings**: 34
**Major/warning applied**: 24
**Note severity skipped**: 10

---

## Summary of Changes

### CL-08 Package Architecture
- **Ed25519 compliance**: must use standard Ed25519 (RFC 8032), not ctx/ph variants; RFC 8032 Section 7.1 test vector validation required
- **Key format**: raw 32-byte seed (private) + 32-byte public, base64 standard RFC 4648 with padding, import accepts seed-only and derives public key
- **API strictness**: sign() and verify() accept Buffer only (not strings), no message normalization in sign/verify (caller responsibility), empty message signing must work per RFC 8032
- **Audit chain**: hash link computation via buffer concat with no separator, canonical JSONL format (sorted keys, LF, no trailing newline), genesis entry prev_hash as 64-byte zero sentinel
- **Chain integrity**: verify checks signature first then hash link, entry position included in hash computation, chain entry index included in signed content
- **Verification**: VerificationResult with forensic detail per failure, verify requires authorized signer set (not just valid signatures), sequential verify from genesis for fail-fast behavior
- **Serialization**: canonical JSON for AuditChain events, ISO 8601 UTC with ms precision timestamps, chain import validates all entries before accepting
- **Key management**: key export uses 32-byte seed (not 64-byte expanded), pre-validation of key length before native API call, plaintext export warning with no built-in secure storage
- **Testing**: permanent cross-verification regression test, bulk sign/verify cycle for crypto regression, streaming verification for large chains

---

## Findings NOT Applied (note severity, skipped per rules)

10 findings with severity "note" were skipped.
