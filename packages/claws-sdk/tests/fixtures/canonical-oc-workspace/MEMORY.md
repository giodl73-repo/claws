# Memory

## Index

Canonical memory entries for the incremental benchmark workspace. Each
entry names an event, date, and resolution so downstream renderers have
non-trivial markdown to walk. These are fictional — the fixture is
bench-sized, not a real incident log.

## Incident 2026-01-14

A misconfigured tool permission allowed unapproved bash execution on a
staging cluster. Resolution: every bash-capable tool now runs through the
R5 fail-closed gate and a `requiresElicitation` check.

## Policy Update 2026-02-03

R5 rules were tightened to require dual approval for any production
deployment that transitively invokes `VaultWrite`.

## Rotation Drill 2026-02-20

Scheduled audit-chain signing-key rotation. Validated that emit output
bytes changed across the rotation boundary and that stage caches
invalidated uniformly.

## Retrospective 2026-03-02

Confirmed that the compile-level cache short-circuit continues to
synthesize `stageTimings` with `cacheHit:true, durationMs:0` per §IS.4
after the rotation event.

## Incident 2026-03-15

Network egress rule drift caused three workspaces to fail validation
check 10. Resolution: tightened `NetworkAudit` coverage and added a
heartbeat schedule to re-validate drift hourly.

## Policy Update 2026-04-05

Expanded the `blockedTools` default set to include `SessionRevoke` unless
explicitly OBO-approved.
