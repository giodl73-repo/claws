# Continuity Reconstruction Obligations

## Decision

The stable state-surface inventory is an operator model. It is not executable
restore input.

Activation must consume a closed, artifact-specific obligation record emitted
by the owners that omitted, sanitized, or deferred state. It must not derive
actions from the broad `derived-state` descriptor.

## Audit Result

### Captured owner state

The following are already captured in current core SQLite and do not need a
generic activation rebuild:

- current outbound and session delivery queues;
- installed plugin index;
- shared scheduler state;
- agent sessions and transcript events; and
- current memory index tables.

Supported owner schema migration may still transform these after restore.
That is normal owner startup, not an artifact-declared reconstruction step.

### Reconstructed state

| Obligation | Current evidence | Safe treatment | Readiness |
| --- | --- | --- | --- |
| Auth-profile runtime order, last-good, cooldown, failure, and usage state | Exact removed `auth_profile_state` row count from sanitation | Start from the empty safe default; owners repopulate only from resolved destination profiles and new runtime observations | Non-blocking; external profile availability is evaluated separately |
| Installed plugin dependency trees | `extensions/**/node_modules` is deliberately omitted while plugin source, manifest, and SQLite index are captured | Existing plugin owner reinstalls or repairs dependencies | Owner-required when a configured plugin cannot load without the omitted tree |

Supported schema owners may also drop and rebuild a legacy memory index shape
during normal migration. That decision is derived from the opened database
structure and remains owner migration, not an artifact obligation.

### Ephemeral state

| Surface | Current evidence | Safe treatment | Readiness |
| --- | --- | --- | --- |
| Process-local caches | No durable authority; recreated by module/runtime use | Empty on process start | Never continuity-blocking |
| Runtime transients | Sockets, PIDs, locks, temporary reindex databases | Recreate through normal startup; stale transient artifacts remain excluded | Owner startup failures use existing readiness |

### External dependencies

| Obligation | Current evidence | Resolution owner |
| --- | --- | --- |
| Config SecretRefs | Exact path-free counts by `env`, `file`, and `exec` source | Existing secrets runtime |
| Environment placeholders | Preserved authored config bytes | Launcher/config owner |
| OAuth and auth-profile credential bytes | OAuth exclusion plus zero credential rows in every packaged SQLite database | Existing auth/profile/host credential owner |
| Host placement/publication dependencies | Not part of local Archived artifacts | Hosted Integration at Portable/Elastic |

An external dependency is not automatically required merely because its class
exists. The owner evaluates the restored effective config and selected runtime
profile. Continuity carries the requirement and consumes owner readiness; it
does not probe providers or credentials itself.

## Manifest Shape

Illustrative closed V1 shape:

```json
{
  "continuityObligations": {
    "schemaVersion": 1,
    "reconstructed": [
      {
        "id": "auth-profile-runtime-state",
        "owner": "auth-profiles",
        "treatment": "safe-empty-default",
        "removedRowCount": 4,
        "readiness": "non-blocking"
      },
      {
        "id": "plugin-runtime-dependencies",
        "owner": "plugins",
        "treatment": "owner-reinstall",
        "omittedTreeCount": 2,
        "readiness": "owner-required"
      }
    ],
    "external": [
      {
        "id": "config-secret-references",
        "owner": "secrets",
        "referenceCounts": {
          "env": 2,
          "file": 1,
          "exec": 0
        },
        "readiness": "owner-required"
      },
      {
        "id": "auth-profile-credentials",
        "owner": "auth-profiles",
        "credentialRows": 0,
        "oauthCaptured": false,
        "readiness": "owner-required"
      }
    ],
    "ephemeral": [
      {
        "id": "runtime-transients",
        "owner": "runtime",
        "treatment": "normal-startup",
        "readiness": "owner-owned"
      }
    ]
  }
}
```

The exact field names remain illustrative. Normative properties:

- closed schema, versioned and fail-closed;
- the V1 reconstructed IDs are exactly `auth-profile-runtime-state` and
  `plugin-runtime-dependencies`;
- the V1 external IDs are exactly `config-secret-references` and
  `auth-profile-credentials`;
- the V1 ephemeral ID is exactly `runtime-transients`;
- the V1 owners are exactly `auth-profiles`, `plugins`, `secrets`, and
  `runtime`, paired only with their declared IDs;
- the V1 treatments are exactly `safe-empty-default`, `owner-reinstall`, and
  `normal-startup`, paired only with their declared categories;
- the V1 readiness values are:
  - `non-blocking`: capture already established a safe default;
  - `owner-required`: the owner evaluates applicability from restored effective
    config and must report satisfied or not-required before continuity ready;
  - `owner-owned`: normal startup/readiness owns the outcome;
- stable path-free IDs and owner names;
- exact counts already proven by capture;
- no secret values, profile IDs, agent IDs, raw paths, or host identifiers;
- no arbitrary command, hook, script, or extension action;
- no generic obligation registration in V1; and
- verification rejects missing, duplicate, unknown, or success-shaped records.

Removal counts and omitted-tree counts are capture attestations bound into the
immutable manifest. Activation verifies their structure and identity but cannot
re-derive pre-sanitation or pre-omission values from the artifact.

## Materialization Projection

Materialization may report:

- captured obligation evidence preserved;
- safe-empty reconstruction already established by sanitation;
- owner-evaluated external requirements pending;
- owner startup obligations pending; and
- `activationReady: false`.

It must not convert every broad non-captured state-surface descriptor into an
activation action.

## Legacy Delivery Queue Closure

Current shared SQLite is authoritative for outbound and session delivery
queues. Legacy JSON queue files are migration inputs, not volatile scratch.

Continuity capture must:

1. inspect `delivery-queue/` and `session-delivery-queue/` without mutation;
2. reject pending, failed, or delivered-marker legacy files;
3. use a stable blocker such as
   `continuity.capture.legacy_delivery_queue`;
4. direct the operator to existing Doctor/startup migration before retry; and
5. recheck immediately before staging so a newly appearing legacy entry cannot
   race into a successful artifact.

Capture must not run the migration itself. Once no legacy files remain, current
queue rows are covered by the sanitized shared SQLite snapshot.

## Rejected Generalization

Do not add:

- a reconstruction provider registry;
- artifact-supplied commands;
- plugin restore hooks;
- arbitrary dependency expressions;
- a generic DAG beyond the existing component graph; or
- cache warmup as a universal readiness requirement.

If a future plugin owns required external state, it must first prove a concrete
owner contract. V1 remains core-only.

## Cheapest Proof

Before activation work:

1. one capture with sanitized auth-profile state and typed obligations;
2. one capture with omitted installed-plugin dependency trees and an exact
   owner-reinstall obligation;
3. one capture with only process-local caches omitted;
4. one blocked capture for each legacy queue directory;
5. one race where a legacy queue entry appears after planning;
6. manifest verification rejects unknown owner/ID/treatment/readiness pairs and
   success-shaped obligations; and
7. materialization reports safe-empty versus owner-pending evidence without
   claiming reconstruction execution.
