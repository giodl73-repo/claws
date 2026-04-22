# p04-trust-set-reload fixture — SOUL

Pitfall P-04: the trust-set must reload within a 30s staleness budget when
the file under `.openclaw/policy/trust-set.json` is atomically rewritten
(CL-11 §3a atomic-write rule). The policy runtime watches the file via
`fs.watch`; the reload cycle closes the staleness window.

Scenario SC-07 uses `write-atomic.ts` to flip `trust-set.v1.json` →
`trust-set.v2.json` (rename on same drive) and asserts the next decision
sees v2's ruleset.

## Policy

- Baseline: allow-everything for the single R2 tool in TOOLS.md.
- Trust-set v1 (initial seed): grants the tool's tier (allow).
- Trust-set v2 (post-flip seed): revokes the tool's tier (deny).

The scenario seeds `trust-set.v1.json` via `write-atomic.ts` (to
`.openclaw/policy/trust-set.json`), dispatches a call (expect allow),
flips to v2 via the same helper, dispatches a second call (expect deny).

## Note on fixture-copier cleanliness

This source tree does NOT contain `.openclaw/policy/` — fixture-copier
refuses dirty sources (see pulse 36 contract). The trust-set JSON seeds
live under `seed/` and are copied into `.openclaw/policy/` at scenario
runtime by `write-atomic.ts`.
