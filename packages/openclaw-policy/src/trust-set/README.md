# `@bic/openclaw-policy/trust-set`

Reloader for `.openclaw/policy/trust-set.json` — the HMAC key ring that
authorizes approval handles issued by the companion. Land site for pulse 50
(P-04 mitigation).

## Contract

- Initial `readFileSync` at construction. Malformed input throws — the caller
  never receives an empty trust-set by accident.
- `fs.watch` fires on file change → debounced 50 ms → re-read.
- On parse success: atomic in-memory swap.
- On parse failure: **previous snapshot retained** + `TrustSetReloadFailedEntry`
  emitted to the injected audit sink.
- After 30 s of consecutive failures, `get().stale === true` — callers are
  expected to fail closed.

## Decoupled from `onSnapshotPromoted`

Trust-set reload and snapshot promotion are independent signals. Either one
triggers a reload; they do not gate each other. A rotation that lands between
two snapshot promotes is still picked up by `fs.watch` within the debounce
window — the P-04 scenario that motivated this pulse.

## Clock injection

The loader takes a full `Clock` interface — both `now()` and `setTimeout()`.
Under tests the `fakeClock` collapses a 50 ms debounce burst into a single
reload on `clock.advance(51)`. Under production wiring the adapter uses
`Date.now` and native `setTimeout`.

## Cross-worker isolation

`fs.watch` is per-process. When the harness runs multiple parallel workers
each has its own watcher, and a `trust-set.json` rotation writes a single
file all watchers observe independently. There is no cross-process
coordination — deliberate, because a trust-set rotation is small and idempotent.

## Windows notes

`fs.watch` fires differently on atomic-rename vs. in-place write on Windows
(`fs.rename` may surface as a `rename` event rather than `change`). The
loader tolerates both by always re-reading the target path on any event.
