# Managed Configuration Role Review

## Review Set

Applied founder, Gateway engineer, platform engineer, Lobster container
engineer, CISO, and new-hire lenses from `.craft/roles/claws/`.

## Findings

### Blocking

1. **Operator authority is not durable in Lobster.** The host/operator story is
   incomplete until Lobster owns a governed operator document outside restored
   workspace config files.
2. **Runtime overrides are outside the claimed authority model.** Any override
   applied after admission could invalidate the host guarantee unless it is
   classified and constrained.
3. **Bounded tool and approval examples mix configuration authority with
   policy.** Exact authority must work independently before those fields are
   used to justify the core design.

### Simplifications

1. Reuse `createConfigIO`, runtime snapshots, mutation conflicts, and Gateway
   reload planning. Remove the implied new config engine.
2. State one V1 mental model: the first layer declaring a normalized leaf
   establishes authority; later omission accepts it; the same value is valid;
   a different exact value is a structured conflict.
3. Treat bounded comparators as a closed follow-up within the same RFC contract,
   selected only from proven schema fields.
4. Replace a general generation/OCC narrative with the existing rule: validate
   the complete candidate before publishing a runtime snapshot, and reject a
   write if its captured source or managed boundary is stale.
5. Keep chaining out of the implementation sequence. It is rationale for not
   painting the internals into a corner, not a V1 feature.

## Role-specific Consequences

| Lens | Required consequence |
| --- | --- |
| Founder | Default personal installs remain one ordinary config file; managed mode is explicit and removable. |
| Gateway engineer | No per-request merge or policy hook; runtime receives one existing config shape and existing reload rules. |
| Platform engineer | Expose managed-boundary identity, effective-content identity, conflicts, and readiness status for fleet drift. |
| Lobster container engineer | Invalid composition blocks readiness deterministically; prior snapshot preservation applies only to reload, never unsafe initial startup. |
| CISO | Operator APIs cannot write or force managed fields; conflicts cannot silently fall back to unmanaged config. |
| New hire | Findings say which path is managed, what was requested, and whether to remove or match the operator value. |

## Evaluation Verdict

Proceed with a role-neutral, recursive exact-authority prototype. Prove one- and
two-layer profiles without hard-coding their names, but do not prototype
comparator generalization or new CLI names yet.
