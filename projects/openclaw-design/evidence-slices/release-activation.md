# Release Activation Evidence Slice

## Status

- Phase: Frame from completed source audit
- Priority: 3
- Enterprise movement: install/update/release `E4/C3` toward a portable
  per-target activation proof
- Audited OpenClaw worktree:
  `C:\src\openclaw-design-audit`
- Audited commit:
  `bde1602e6e86fd91dd0bec3aae714e059e556c4d`

## Thesis

The local updater can compose owner-native results into one portable bundle
that proves exact target, compatibility, migration, activation, service
handoff, and readiness without becoming a fleet manager.

## Current Source Facts

The source audit in
`../source-audit-install-update-release-compatibility-2026-08-01.md` establishes:

- channels, selectors, versions, source commits, package roots, service roots,
  and running processes are distinct identities;
- npm candidates can be staged and verified before live swap;
- failed package swaps restore the prior package and command shims;
- failed git updates restore prior branch/SHA and rebuild the old runtime;
- running managed Gateways use detached service handoff rather than in-process
  package replacement;
- only positively owned service roots may be rewritten;
- the target Doctor owns migration and repair;
- newer or indeterminate database schemas are refused before mutation;
- plugin convergence produces structured post-update results;
- restart verification checks active version and health;
- release workflows retain candidate, publication, readback, provenance, and
  upgrade-survivor evidence; and
- code rollback does not imply state rollback.

The missing seam is composition: structured facts exist across updater,
package/git, Doctor, plugin, service, readiness, and release owners, but no one
portable per-target bundle binds their identities and certainty.

## Working Owners

| Fact | Owner |
| ---- | ----- |
| Exact package/source candidate | Package manager, git, release workflow |
| Compatibility decision | Database, plugin, protocol, and host owners |
| Package/source mutation | Local updater plus package/git owner |
| Migration result | Target Doctor/state owner |
| Plugin convergence | Plugin lifecycle owner |
| Service incarnation | Service manager/Gateway handoff owner |
| Active version | Running target |
| Readiness | Readiness owner |
| Recovery certainty | Each affected owner |
| Bundle composition | Local updater evidence projection |

## Bounded V1 Slice

### Included

- one published package baseline;
- one candidate package;
- one managed Gateway;
- one managed plugin;
- one schema-compatible state fixture;
- one newer-schema downgrade fixture;
- one exact update-plan identity;
- one successful activation/readiness bundle; and
- one blocked-before-mutation bundle.

### Excluded

- fleet rollout/rings;
- automatic promotion;
- universal package-manager transactions;
- automatic state downgrade;
- claims about external effects;
- one version across all components; and
- replacing release-workflow attestations.

## Accepted Result

```json
{
  "schemaVersion": 1,
  "evidenceType": "release.activation",
  "operationId": "update-attempt-...",
  "subject": {
    "owner": "openclaw-local-updater",
    "id": "installation-...",
    "generation": "plan-sha256:..."
  },
  "result": "ready",
  "certainty": "confirmed",
  "release": {
    "prior": { "version": "2026.7.1", "artifactDigest": "sha256:..." },
    "target": { "version": "2026.8.1", "artifactDigest": "sha256:..." }
  },
  "compatibility": {
    "stateSchema": "compatible",
    "plugins": "compatible"
  },
  "phases": [
    { "owner": "package", "phase": "activate", "result": "complete" },
    { "owner": "doctor", "phase": "migrate", "result": "complete" },
    { "owner": "plugins", "phase": "converge", "result": "complete" },
    { "owner": "service", "phase": "restart", "result": "complete" },
    { "owner": "readiness", "phase": "prove", "result": "ready" }
  ],
  "active": {
    "version": "2026.8.1",
    "serviceIncarnation": "sha256:..."
  },
  "recovery": {
    "code": "not_required",
    "state": "not_required"
  }
}
```

The bundle links release proof by digest/reference; it does not copy workflow
logs or attestations into the local result.

## Structured Failure

The candidate supports an older database schema than the existing state.

```json
{
  "result": "blocked",
  "reason": "state_schema_newer_than_target",
  "certainty": "confirmed",
  "compatibility": {
    "currentStateSchema": 7,
    "targetSupportedSchema": 6
  },
  "mutation": {
    "package": "not_started",
    "state": "not_changed",
    "service": "not_stopped"
  }
}
```

The proof must show the refusal occurred before package/source mutation. An
indeterminate database inspection produces a different blocked reason and must
not be reported compatible.

## Role Findings

### Updater/service owner

Compose existing results; do not bypass package, Doctor, plugin, service, or
readiness owners. Keep detached handoff and single-flight mutation.

### CISO/compliance

Bind exact immutable bytes and release-proof references. Retain target,
approval/authority generation when present, compatibility refusal, and
recovery certainty independently from mutable channel aliases.

### Platform/operator

Expose phase-specific outcomes and active version. Never collapse
`activated`, `ready`, `recovered`, and `state_restore_required`.

### Founder/new hire

Preserve `openclaw update`, `--dry-run`, channels, and Doctor as the default
experience. The bundle should be JSON output behind the same local owner, not a
required deployment service.

## Deletion Target

Remove or prohibit:

- rollout scripts parsing updater prose;
- guessing active version from selected channel;
- treating process health as readiness;
- reporting undifferentiated `rolled_back`; and
- claiming package rollback restored migrated state.

## Disproof Conditions

Stop or narrow the slice if:

- composition requires the bundle writer to mutate owner state;
- exact artifact identity cannot be retained without a mutable alias;
- a successful result cannot distinguish installed from active and ready;
- rollback certainty cannot be stated per layer; or
- the bundle implies local cancellation stopped an owner migration already in
  progress.

## Cheapest Proof

1. Run one compatible published-baseline-to-candidate package update.
2. Capture plan, candidate digest, schema preflight, target Doctor, plugin,
   service, active version, and readiness outputs.
3. Emit one hash-bound JSON bundle.
4. Run the newer-schema downgrade fixture.
5. Emit a blocked bundle and prove package, state, and service remain
   unchanged.
6. Verify console rendering is derived from the same structured facts.
