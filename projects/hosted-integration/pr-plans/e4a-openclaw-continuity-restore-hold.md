# E4a: OpenClaw continuity restore hold

## Outcome

Add the continuity-owned lifecycle transition through Hosted Integration's
existing owner generation and operational surfaces.

## Repository and dependencies

- Repository: `openclaw/openclaw`
- Depends on: Runtime State Continuity owner model, A3, B5, B6a, and B6b

## Change

- Define `runnable -> restore-held -> restore-committed -> one admitted
restored start` for the lifecycle owner.
- Bind hold acquisition to the stable runtime owner, current owner generation,
  and exact restore identity.
- Bind commit to the exact restore receipt rather than deleting the hold.
- Publish language-neutral transition and stale-generation fixtures.
- Register readiness, Status, Doctor, and redacted audit evidence through the
  existing Hosted Integration surfaces.
- Keep Conventional startup unchanged when no hosted lifecycle implementation
  is selected.

## Non-goals

- No continuity-specific lease service or second generation domain.
- No restore materialization, target claim, journal, or Gateway start
  implementation.
- No TTL or success-shaped fallback when lifecycle authority is unavailable.
- No per-request or healthy-runtime hold lookup.

## Proof and exit

- Hold acquisition and ordinary start admission are mutually exclusive.
- Unknown authority and stale owner generations fail closed.
- The hold survives coordinator restart without expiring to `runnable`.
- Pre-publication cancel is allowed; post-publication interruption requires
  same-identity resume or quarantine.
- Only one startup carrying the committed receipt can consume the transition;
  ordinary, mismatched, and replayed starts are rejected.
- Required restore state and failures appear through readiness, Status, Doctor,
  and stable redacted reason codes.
