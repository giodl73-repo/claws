---
pulse: 5
slug: audit-chain-local
plan: claws-sdk-graduation
depends_on: [4]
governing_roles: [craft:security, claws:platform-eng]
scenario_codes: [crypto/S02, crypto/S03]
stage: implementation
test_tiers:
  L0_unit: 8
  L1_integration: 4
  L2_e2e: 1
  L3_accept: 1
test_scope:
  run:
    - "cd claws-sdk && npx vitest run --project unit --coverage"
    - "cd claws-sdk && npx vitest run --project integration --coverage"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 1
checkpoint_gate: false
---

# Pulse 05: Audit Chain (Local)

## Objective

Rewrite the Ed25519-signed audit chain for local use. ~500 lines. The current implementation depends on agent-sdk's `hash-chain.ts` and `verify.ts`. This pulse creates a standalone audit chain that signs every entry with Ed25519 (using pulse 4 crypto), maintains a tamper-evident hash chain, and supports write-ahead logging (WAL) for crash recovery.

The free tier audit chain is local-only: entries are signed with a local Ed25519 keypair, chained via SHA-256, and stored in a single append-only file. SIEM export (CEF, syslog, NDJSON) and RFC3161 timestamps are paid-tier features -- not included here. Fleet audit aggregation is also paid-only.

## Deliverables

- [ ] `claws-sdk/src/compiler/audit/types.ts` -- AuditEntry (timestamp, action, subject, payload, hash, previousHash, signature), AuditChainMeta (chainId, createdAt, lastEntryHash, entryCount, publicKeyFingerprint), AuditVerifyResult (valid boolean, brokenAt index if invalid, reason)
- [ ] `claws-sdk/src/compiler/audit/chain.ts` -- AuditChain class: append(entry), verify(), getEntry(index), getEntries(range), length, lastHash. Each entry is SHA-256 hashed (payload + previousHash) and Ed25519 signed. Append-only -- no delete, no update
- [ ] `claws-sdk/src/compiler/audit/wal.ts` -- Write-ahead log: buffer entries before commit, flush to chain file, recover uncommitted entries on startup. Prevents data loss on crash. ~150 lines
- [ ] `claws-sdk/src/compiler/audit/verify.ts` -- `verifyChain(chain: AuditChain, publicKey: Ed25519PublicKey): AuditVerifyResult` -- walks the chain, verifies each entry's hash links to previous, verifies each signature, reports first break point if tampered
- [ ] `claws-sdk/src/compiler/audit/storage.ts` -- File-based storage: append entry to NDJSON file, read chain from file, handle file locking for concurrent access. One file per workspace
- [ ] `claws-sdk/src/compiler/audit/index.ts` -- Barrel exports for audit module
- [ ] `claws-sdk/tests/compiler/audit/chain.unit.test.ts` -- L0: append entry increments length (1), entries link via previousHash (1), first entry has null previousHash (1), verify passes on valid chain (1), verify detects tampered entry (1), verify detects broken hash link (1)
- [ ] `claws-sdk/tests/compiler/audit/wal.unit.test.ts` -- L0: WAL buffers entries before flush (1), WAL recovers uncommitted entries (1)
- [ ] `claws-sdk/tests/compiler/audit/audit.integration.test.ts` -- L1: chain create→append→verify→persist→reload round-trip (1), tampered file detected on reload (1), concurrent append serialization (1), WAL recovery after simulated crash (1)
- [ ] `claws-sdk/tests/compiler/audit/audit.e2e.test.ts` -- L2: full lifecycle: generate keypair, create chain, append 100 entries, persist to file, reload from file, verify entire chain, tamper one entry, verify detects tampering (1)
- [ ] `claws-sdk/tests/compiler/audit/audit.accept.test.ts` -- L3: scenario acceptance test verifying crypto findings (2)

## Acceptance Criteria

- [ ] Zero imports from `@craftworks/agent-sdk` -- no hash-chain.ts, no verify.ts
- [ ] Every audit entry is Ed25519 signed (not just HMAC -- per R1 C6)
- [ ] Hash chain is tamper-evident: modifying any entry breaks verification from that point forward
- [ ] WAL prevents data loss: entries survive process crash between append and flush
- [ ] Storage format is NDJSON (one JSON line per entry) for human readability and streaming
- [ ] No SIEM export functionality -- that is paid-tier (agent-sdk retains CEF/syslog/NDJSON export)
- [ ] No RFC3161 timestamps -- that is paid-tier
- [ ] `npx vitest run --project unit --coverage` passes 95/90/95/95 per-file thresholds
- [ ] `npx vitest run --project integration --coverage` passes 85/70/80/85 whole-package thresholds
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/security.md` -- audit chain integrity, Ed25519 signing requirements, tamper detection
- `.craft/roles/claws/platform-eng.md` -- SDK storage patterns, file-based persistence, WAL conventions

## Dependencies

- Pulse 4 (crypto-internalize) -- uses Ed25519 sign/verify and SHA-256 hash from the internalized crypto module

## Test Gates

- [ ] L0 unit (8 tests): append increments (1), hash linking (1), first entry null previous (1), verify valid (1), verify tampered (1), verify broken link (1), WAL buffer (1), WAL recovery (1)
- [ ] L1 integration (4 tests): full round-trip (1), tampered file detection (1), concurrent append (1), WAL crash recovery (1)
- [ ] L2 e2e (1 test): full lifecycle 100-entry chain with tamper detection (1)
- [ ] L3 acceptance (1 test): crypto scenario findings verified (1)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
