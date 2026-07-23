# Managed Configuration Comparison Matrix

## Purpose

Validate Managed Configuration against OpenClaw's existing composition patterns
and external systems that model ownership, precedence, or managed settings. Use
the comparison to reuse native concepts where they fit and avoid importing a
general-purpose layering engine.

## 3a: Existing OpenClaw Patterns

| Pattern                                    | Current behavior                                                                                                                                                                                              | Reuse                                                                                                                                                                            | Avoid or change                                                                                                                                                                                                     |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `$include` composition                     | `src/config/includes.ts` resolves one or more files, recursively deep-merges objects, concatenates arrays, lets later primitive values win, bounds depth and file size, and confines reads to approved roots. | Reuse parsing guards, source-boundary checks, raw-source hashing, and one resolution session with an immutable root snapshot.                                                    | Do not express managed authority as another `$include`. Include precedence is silent, arrays concatenate, and it has no field ownership or conflict model. Resolve includes within each authority before admission. |
| Source-to-runtime materialization          | `src/config/materialize.ts` applies schema-owned defaults, normalization, path resolution, and provider defaults through named materialization profiles.                                                      | Insert authority admission between per-source parsing/schema validation and final runtime materialization. Keep one runtime config type and one defaults/normalization pipeline. | Do not make runtime consumers aware of managed and operator documents. Do not normalize the sources differently unless a source-specific restriction is explicit.                                                   |
| Runtime overrides                          | `src/config/runtime-overrides.ts` carries process-local overrides separately from persisted source config.                                                                                                    | Preserve the distinction between persisted source documents and runtime-derived values, and define their authority explicitly.                                                   | Do not silently place runtime overrides above managed authority. Existing runtime-derived values need classification before the RFC claims a complete precedence order.                                             |
| Runtime snapshot                           | `src/config/runtime-snapshot.ts` represents a materialized runtime configuration separately from source configuration.                                                                                        | Extend the snapshot boundary with effective identity and redacted provenance rather than creating a second runtime config graph.                                                 | Do not expose mutable source objects to Gateway, plugin, tool, or session consumers.                                                                                                                                |
| Mutation and conflicts                     | `src/config/mutate.ts` and `src/config/mutation-conflict.ts` already separate source mutation from conflict detection.                                                                                        | Adapt the existing mutation-conflict surface so operator writes validate against the managed boundary before persistence.                                                        | Do not invent an independent OCC protocol in V1. Managed-boundary rotation can use existing source snapshot/conflict concepts first.                                                                                |
| Agent defaults and per-agent settings      | Agent resolution applies `agents.defaults` and then more specific agent settings.                                                                                                                             | Follow the familiar default-then-specific mental model for ordinary value resolution and documentation.                                                                          | This is precedence, not authority. A specific agent value is normally allowed to replace a default, so it cannot define managed conflict semantics.                                                                 |
| Channel, account, group, and sender policy | `src/config/group-policy.ts` resolves root channel settings, account-specific settings, group entries, wildcard defaults, sender-specific policy, and runtime overrides with specialized fallback rules.      | Reuse normalized path matching, closed policy modes, immutable compiled snapshots, and explicit tests for wildcard/specific behavior.                                            | Do not copy its implicit fallback ladder into core managed config. Empty-object exceptions and per-call override ordering demonstrate how layered precedence becomes difficult to explain.                          |
| Provider-owned normalization               | `src/config/provider-policy.ts` lets the owning provider contribute bounded normalization/default behavior while preserving object identity when unchanged.                                                   | Comparator metadata and normalization should be owned by the schema or field owner, not supplied by the host.                                                                    | Do not let plugins or hosts attach arbitrary comparator functions to unrelated core fields.                                                                                                                         |
| Plugin preference and auto-enable          | Plugin metadata can prefer one configured plugin over another while deny and explicit-disable state remain authoritative.                                                                                     | This is evidence that OpenClaw already accepts closed, owner-defined ordering semantics where the domain owner can test them.                                                    | Do not generalize plugin preference into numeric layer priority or managed-config precedence.                                                                                                                       |

## Internal Design Conclusions

1. Managed Configuration is not a replacement for `$include`; each source may
   use existing parsing features, then authority admission composes the resolved
   documents.
2. The narrow implementation seam is between source resolution/schema
   validation and runtime materialization.
3. Effective config should extend the existing runtime snapshot boundary, not
   introduce a parallel configuration type consumed across the runtime.
4. Exact authority can adapt existing mutation conflict concepts. The RFC
   should not require a new general concurrency protocol before that fit is
   proven.
5. Bounded comparators should follow provider-owned normalization: closed,
   field-owned, deterministic, and testable.
6. Existing account/group precedence is a warning: use one recursive operation
   over an explicitly ordered layer list, with no role-specific fallback,
   numeric priority, or contextual override order.

## External Comparators

| System                       | Relevant model                                                                                                                                                                                  | Lesson for Managed Configuration                                                                                                                                                                                                                                                           |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Kubernetes Server-Side Apply | Tracks field managers, rejects changes to fields owned by another manager, exposes managed fields, and supports explicit ownership transfer or forced conflicts.                                | Strong validation of sparse field ownership, omission as non-ownership, same-value shared intent, structured conflicts, and provenance. OpenClaw should not copy force-conflicts or dynamic ownership transfer into V1 because host authority is intentionally immutable to operator APIs. |
| VS Code enterprise policies  | Registered policy keys override default, user, and workspace settings; machine policy outranks user policy; diagnostics report applied and non-applied policies, sources, and effective values. | Strong validation of schema-registered managed fields, visible lock state, cross-platform delivery with one semantic model, and a diagnostics surface. Its silent policy-wins behavior is weaker than the RFC's reject-on-conflict model and should not be copied.                         |
| Chrome enterprise policy     | Multiple machine, cloud, OS-user, cloud-user, and user/default sources follow a documented precedence order and expose effective sources through `chrome://policy`.                             | Useful future-chain and inspection precedent. Also demonstrates why V1 should avoid a configurable precedence lattice: delivery-source ordering becomes product complexity of its own.                                                                                                     |
| Terraform override files     | Loads specially named override files after ordinary files and applies construct-specific replacement rules; official guidance warns that heavy use hurts readability.                           | Negative comparator for generated overlays. It validates the RFC motivation that precedence and construct-specific merge rules are hard to explain and do not establish authority.                                                                                                         |

## RFC Implications

- Describe the implementation seam as `resolve each source -> validate each
source -> authority admission -> effective config -> runtime materialization`.
- State that `$include`, environment substitution, and secret references resolve
  independently inside each source and cannot cross authority boundaries.
- Reframe effective identity as two values initially: an effective-content hash
  and a managed-boundary identity. Source delivery identities are diagnostic
  metadata, not part of semantic equality.
- Base operator-write rejection on the existing config mutation conflict model
  before promising broader generation/OCC semantics.
- Require an inspection result for both applied and unapplied managed fields,
  including unknown or unsupported fields, following the useful part of VS
  Code policy diagnostics.
- Keep exact authority in the first prototype. Select bounded comparators only
  from classified Lobster leaves and schema-owner evidence.

## Next Evidence

1. Trace `createConfigIO` from parse through include resolution, validation,
   materialization, snapshot publication, reload classification, and writes.
2. Classify runtime overrides relative to managed authority.
3. Identify one exact scalar, one exact object child, and one whole-array
   Lobster fixture.
4. Map existing mutation conflict data to a proposed `ControlledByHost`
   finding.
5. Run founder, Gateway, platform, Lobster container, CISO, and new-hire review
   against the revised model.
