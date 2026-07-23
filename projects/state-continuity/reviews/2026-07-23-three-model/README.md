# Three-Model Review

Date: 2026-07-23

This directory records three independent, read-only reviews of RFC PR 46 and
OpenClaw PRs 112385, 112865, and 112896 at these exact heads:

- RFC: `87777dd091007d8e49c12b78afe887caa474d1e6`
- recovery points: `08cec229db97e697c0da102a40681ab88a8505fe`
- final capture: `9c3dedb3afd7df9fb95787d0606303304e14579f`
- restored admission: `eaeb21f0a7db5bdfac3a86464d9b1762f22d8f56`

| Review | Model | Mandate | Result |
| --- | --- | --- | --- |
| Maintainer | GPT-5.6-Sol | Cumulative implementation correctness | Clean |
| Contract | Claude Opus 4.7 | RFC, ownership, identity, and claim coherence | Three accepted findings |
| Adversarial | GPT-5.5 | Crash, replay, tampering, and lifecycle transitions | One accepted finding |

## Accepted Findings

1. **Final-capture post-intent disposition mismatch (medium).** PR 112865
   returns `hold` when SQLite capture or aggregate verification fails after
   durable intent, but replay of that exact operation necessarily returns
   operation-conflict/quarantine. The first response must say quarantine, or
   the implementation must support exact-operation resume.
2. **Restored-admission owner evidence is weaker than the RFC wording
   (medium).** PR 112896 hashes the full mutable cron status and a coarse
   `{ready,failing,suppressed}` projection. This is not the stable,
   owner-authored scheduler and readiness evidence the RFC currently names;
   `nextWakeAtMs` is also time-sensitive. Either introduce stable owner
   receipts or narrow the RFC and PR claim to the bounded evidence actually
   implemented.
3. **Malformed durable records escape the typed protocol (medium).** Truncated
   or malformed `intent.json`, `result.json`, `startup.json`, or `ready.json`
   throws raw `SyntaxError`. Restore/admission replay still fails closed, but
   the hidden host operation loses its structured quarantine disposition.
4. **PR 112896 overstates portability (low).** Its opening calls the accepted
   recovery point portable even though this V1 evidence is explicitly
   `host-protected` until owner portability receipts exist.

## Rejected Concerns

- Re-hashing restored databases immediately before admission would confuse
  legitimate owner startup mutations with restore corruption. Initial
  verification correctly occurs before normal owner startup.
- Rewriting both the private 0700/0600 journal and canonical databases assumes
  authority inside the trusted destination-owner boundary; it is not a shown
  in-scope receipt-substitution attack.
- Partial multi-component restore, changed replay requests, committed-byte
  tampering, ordinary-startup regression, and destruction-authority confusion
  are already fail-closed or out of scope in the reviewed implementation.

## Disposition

PR 112385 is clean. Repair findings 1, 3, and 4 directly. Finding 2 needs one
explicit owner decision: add stable owner-issued receipts now, or narrow the
draft RFC and implementation claims to bounded generation-bound evidence and
leave richer owner receipts to their semantic owners.

