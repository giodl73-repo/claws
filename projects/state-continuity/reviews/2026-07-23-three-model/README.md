# Three-Model Review

Date: 2026-07-23

This directory records three independent, read-only reviews of RFC PR 46 and
OpenClaw PRs 112385, 112865, and 112896 at these exact heads:

- RFC: `87777dd091007d8e49c12b78afe887caa474d1e6`
- recovery points: `08cec229db97e697c0da102a40681ab88a8505fe`
- final capture: `9c3dedb3afd7df9fb95787d0606303304e14579f`
- restored admission: `eaeb21f0a7db5bdfac3a86464d9b1762f22d8f56`

| Review      | Model           | Mandate                                             | Result                  |
| ----------- | --------------- | --------------------------------------------------- | ----------------------- |
| Maintainer  | GPT-5.6-Sol     | Cumulative implementation correctness               | Clean                   |
| Contract    | Claude Opus 4.7 | RFC, ownership, identity, and claim coherence       | Three accepted findings |
| Adversarial | GPT-5.5         | Crash, replay, tampering, and lifecycle transitions | One accepted finding    |

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

PR 112385 was clean. Findings 1, 3, and 4 required direct repairs. For finding
2, the implementation direction is the bounded option: stable,
generation-bound reconciliation/readiness evidence now, with richer
owner-authored receipts left to their semantic owners.

## 2026-07-26 resolution

All four accepted findings are resolved on the rebased stack:

- post-intent capture and verification failures quarantine;
- durable JSON parse failures become typed quarantine conflicts;
- scheduler/readiness identities bind versioned normalized outcomes, the exact
  restore receipt, recovery point, acceptance set, and destination generation;
- the RFC and PR bodies consistently call ordinary output `host-protected`.

Current heads are RFC `d03c85097f0`, recovery points `ad5c177c782`, final
capture `7ed3c77c1d8`, and restored admission `c3637461bb7`. A real
source-CLI/Gateway lifecycle proof on runtime head `a71c2d3a244` captured and
restored two current-schema SQLite owners, observed admission held, committed
one readiness record, and observed admission release. The final child head
differs only by deleting a forbidden max-lines suppression and passes the
max-lines ratchet.
