# MOS3 Shared Skill Publish Slice

## Frame

Thesis: a signed-in Scout user can publish an authored skill to a MOS3 shared
registry without mutating the caller's personal library or implying tenant
approval.

The current workaround is personal publication followed by out-of-band sharing,
which collapses private ownership, shared discovery, and tenant governance into
one ambiguous action.

V1 invariant:

- `personal publish`, `shared publish`, and `tenant approval` are distinct;
- shared publish records MOS3 title/version identity and source provenance;
- a successful response proves the requested revision is visible from the
  shared-registry read surface;
- missing ACL or visibility semantics fail closed.

V1 does not add connector activation, tenant approval UX, named-feed following,
or agent publication.

The slice is disproved if MOS3 has no delegated user-owned shared publish scope
or no read surface that can verify the published revision.

## Audit

Current source facts:

- `Mos3PublishConfig.scope` is an unconstrained string and already documents
  `personal`, `shared`, and `tenant`.
- The MOS3 package API is
  `/builder/v1/users/packages?scope=<scope>&shouldBlock=<bool>&titleFormat=<format>`.
- Scout personal publication packages `SKILL.md`, acquires a delegated MOS3
  token, publishes with `scope=personal`, reloads acquisitions, and verifies
  normalized skill ID, MOS3 title ID, and version.
- The generic Scout CLI already accepts arbitrary `--scope`, so shared publish
  is technically reachable without a product contract or typed safety.
- Marketplace install, personal save, tenant approval, and personal publish are
  separate routes today; the shared route should preserve that separation.

Unknowns requiring MOS3 confirmation:

- canonical shared scope value;
- shared-registry read/query surface;
- ACL representation for all users and explicit users/groups;
- update semantics for an existing title;
- whether MOS3 publish response version is the registry revision to verify.

## Compare

| Analogue | Decision | Reason |
| --- | --- | --- |
| Personal MOS3 publish | Reuse | Packaging, OBO token, outcome handling, normalized identity, and strict readback are proven. |
| Marketplace save/install | Adapt | Keeps discovery/install separate from library mutation. |
| Tenant marketplace approval | Adapt | Preserves promotion as a distinct admin operation. |
| Arbitrary CLI `--scope` | Avoid | Allows unsupported scope strings without a product-level contract. |
| Lobster durable file overlay | Avoid | MOS3 must remain the source of truth for shared publication. |

## Evaluate

- Runtime-owner lens: do not add a route until the MOS3 scope and readback API
  are explicit; unknown visibility must fail closed.
- Operator lens: expose one honest `Publish shared` action with returned status
  and provenance, not a sequence of personal-save and manual-share steps.
- Security lens: tenant visibility is not tenant approval; ACL requests must be
  explicit, auditable, and bounded to the delegated caller.

Blocking proof: obtain one successful delegated shared publish and one denied
or unsupported visibility response from MOS3.

## Slice

### Contract PR

1. Introduce typed `Mos3PublishScope` values supported by confirmed MOS3
   behavior.
2. Define a shared-skill publish request with skill content, version,
   provenance selectors, and explicit visibility.
3. Define structured `Published`, `Pending`, and rejected outcomes.
4. Add route/source diagnostics without enabling the UI action.

Status:

- #4862 completes item 1.
- #4866 completes items 2 and 3 without enabling transport. `allUsers` is the
  only validated visibility; selected users/groups fail closed until MOS3
  confirms the ACL wire contract.
- Item 4 remains open with the shared read/query surface.

### Vertical implementation PR

1. Add one shared publish route behind the existing feeds gate.
2. Reuse package validation and delegated MOS3 token acquisition.
3. Publish one skill with the confirmed shared scope and ACL.
4. Reload the confirmed shared read surface.
5. Require normalized ID, MOS3 title ID, and published version before success.
6. Prove one accepted publish and one fail-closed unsupported-visibility case.

Deletion gate: remove arbitrary shared/tenant scope acceptance from the generic
CLI once typed scopes and the supported route own those operations.
