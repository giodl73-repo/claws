# Configuration and Activation Source Audit - 2026-08-01

## Source Baseline

- Worktree: `C:\src\openclaw-design-audit`
- Branch: `user/giodl/design-audit-20260801`
- Base: `origin/main`
- Head: `bde1602e6e86fd91dd0bec3aae714e059e556c4d`

## Current Architecture

```text
config file + includes + env
        |
        v
parse / resolve / migrate / validate
        |
        v
source config + materialized runtime config
        |
        v
process-pinned runtime snapshot
        |
        +--> startup overrides + SecretRef activation
        |
        +--> writes / watcher candidates
                  |
                  v
          diff + reload plan
             /          \
       hot transaction   restart debt/target
             \          /
              accepted runtime generation
```

The current system is already more than a file loader. It owns a process-local
accepted runtime snapshot, source/runtime distinction, revision/fingerprint
metadata, managed write ownership, candidate preflight, rollback, hot-reload
transactions, supersession, and recovery restart debt.

It does not yet implement the proposed multi-source host/operator authority
model from `projects/managed-config/`. Current composition is primarily config
file, includes, environment substitution, migrations, defaults, runtime
overlays, plugins, secrets, and owner-specific activation.

## Objects and Lifetimes

| Object | Current owner | Lifetime / renewal |
| ------ | ------------- | ------------------ |
| Config file snapshot | Config IO | One observed file read, with raw hash, parsed/source/runtime views, issues, and warnings. |
| Source config | Config IO | Resolved authored intent after include/env/migration processing; renewed by accepted reread. |
| Runtime config snapshot | Runtime snapshot owner | Process-pinned accepted runtime object; renewed on successful publication. |
| Runtime snapshot revision | Runtime snapshot owner | Monotonic process-local integer renewed for every snapshot publication. |
| Runtime fingerprint | Runtime snapshot owner | Stable hash of the materialized runtime value. |
| Applied source hash | Gateway config owner | Hash of the source revision accepted by the active runtime, independent of runtime fingerprint. |
| Write candidate | Config write flow | From validated/preflighted mutation through commit, canonical reread, activation, or rollback. |
| Reload transaction | Gateway reloader | One candidate generation; can be superseded before commit. |
| Reload plan | Gateway reload policy | Changed paths classified as no-op, hot actions, channel/account restart, or Gateway restart. |
| Prepared secrets snapshot | Secrets runtime owner | Candidate-specific resolved secret generation, published only if current. |
| Restart debt / target | Gateway restart coordinator | Retained until a compatible restart commits or a newer accepted target supersedes it. |

## Current Contracts

### Read and materialize

`src/config/io.load.ts:27` loads dotenv/shell environment, JSON5, includes,
environment references, legacy roster migration, duplicate-agent-dir checks,
plugin metadata, schema validation, defaults, and runtime materialization. A
failed read restores config-owned environment mutation and does not publish a
new runtime snapshot.

### Pin and identify runtime state

`src/config/runtime-snapshot.ts:104-154` stores separate runtime and source
snapshots with revision, runtime fingerprint, source fingerprint, and update
time. `loadConfig()` pins the first successful load unless callers explicitly
request a fresh read (`src/config/io.runtime.ts:69-86`).

### Startup activation

`prepareGatewayStartupConfig` validates the snapshot, applies runtime and auth
overrides, preflights SecretRefs, ensures startup auth, and activates the final
secret-resolved configuration (`src/gateway/server-startup-config.ts:605`).

### Write transaction

`writeConfigFile` performs validation and preflight before commit, supports
managed activation owners, uses base snapshots/CAS-style conflict protection,
canonical reread, runtime refresh, committed-write notification, and
best-effort rollback only if the committed file is still unchanged
(`src/config/io.runtime.ts:194-430`).

Gateway RPC writes add a lock-time hash check and acknowledge the exact
persisted reread hash (`src/gateway/server-methods/config-write-flow.ts:229`).

### Reload transaction

The reload planner maps exact changed paths to owner actions and defaults
unknown paths to Gateway restart (`src/gateway/config-reload-plan.ts:65-145`,
`366-438`). Plugins and channels contribute bounded reload metadata, but broad
owner fallbacks remain Gateway policy.

The managed reloader prepares candidate config/secrets, rejects superseded
transactions, applies hot changes at one synchronous commit edge, publishes
accepted restart targets, and retains recovery debt where post-commit work
fails (`src/gateway/server-reload-managed.ts:43`,
`src/gateway/server-reload-hot.ts:48`).

### Evidence

- Runtime snapshot pinning, revision, source/runtime matching, write
  notification, managed owner scoping, and deferred activation:
  `src/config/runtime-snapshot.test.ts:30-416`.
- Changed-path planning, external edits, same-hash effective changes,
  supersession, and invalid SecretRefs:
  `src/gateway/config-reload.test.ts:87-1775`.
- Hot reload cancellation, channel/plugin rollback, restart recovery, and
  shutdown interaction:
  `src/gateway/server-reload-handlers.test.ts`.

## What Is Covered Well

- Source config and runtime config are explicitly different objects.
- The runtime snapshot has real revision and fingerprint identity.
- Last-known-good runtime state remains active while a candidate is prepared.
- Writes can fail before commit or roll back after commit if activation fails.
- Candidate supersession is explicit rather than silently racing.
- Hot reload and restart are selected by owner-shaped path metadata.
- Plugin/channel replacement coordinates with active work and recovery restart.
- Secret activation has its own revision ownership and stale-candidate checks.
- Restart-required work is retained as debt instead of being forgotten.

## What Remains Weak

- The current source model has one principal config document plus includes; it
  does not expose generic ordered sources, field authority, or provenance.
- Runtime revision is process-local and is not a portable deployment
  generation.
- `sourceFingerprint`, persisted raw hash, resolved source hash, runtime
  fingerprint, applied source hash, secrets revision, auth generation, and
  plugin registry versions are individually useful but not presented as one
  operator-readable activation identity.
- Reload implementation is distributed across config IO, runtime snapshots,
  secrets, plugin runtime, channel lifecycle, terminal policy, and restart
  coordination. The contracts are stronger than their discoverability.
- Several config paths are classified as dynamic/no-op because consumers read
  the pinned snapshot later; this is safe only while every consumer follows the
  same snapshot-selection rules.

## Separation Decision

Preserve one **Configuration Activation** owner, but document these child
contracts separately:

1. source resolution and validation;
2. runtime materialization;
3. accepted snapshot identity;
4. transactional write and rollback;
5. hot-reload/restart planning;
6. owner-specific activation transactions; and
7. operator status and provenance.

Do not split those into independent frameworks. They are phases of one accepted
runtime-generation contract.

## Revised Rubric

| Dimension | Score | Reason |
| --------- | ----- | ------ |
| Ownership | 4 | Config IO and Gateway activation ownership are explicit. |
| Object model | 4 | Source/runtime snapshots, revisions, fingerprints, candidates, and debt are concrete. |
| Contract completeness | 4 | Read, validate, write, rollback, reload, supersession, and recovery are covered. |
| Separation/cohesion | 3 | Coherent owner, but implementation and operator vocabulary are highly distributed. |
| Evidence | 4 | Extensive focused tests cover failure and concurrency paths. |
| Evolution/operations | 4 | Compatibility, migration, restart, stale candidates, and recovery debt are explicit. |

**Total: 23/24 (A), high confidence for current source.**

## Design Consequence

The Managed Configuration proposal should extend this current owner rather than
replace it. Its missing contribution is ordered external sources, authority,
provenance, and a portable effective generation. Current runtime snapshot,
write preflight, canonical reread, reload transaction, and rollback machinery
are reuse candidates.
