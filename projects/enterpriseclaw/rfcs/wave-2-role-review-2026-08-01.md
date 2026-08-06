# Wave 2 Contract Role Review - 2026-08-01

## Scope

Wave 2 reviewed:

- EC-003, EC-004, EC-008, EC-009;
- EC-011, EC-012, EC-013, EC-016; and
- EC-027, EC-028, EC-032.

Panels applied CISO, compliance, policy, Aether runtime, Gateway, founder,
new-hire, power-user, platform, Microsoft 365 connector, skill-author, release,
and Lobster-container lenses.

## Portfolio Decision

All eleven contracts remain separate. The role review found dependency and
ownership seams to repair, not scopes to merge.

## Accepted Findings

### Identity and runtime

- EC-003 consumes accepted configuration generation from EC-006; EC-006 does
  not require credentials for its base generation model.
- EC-004 maps allow, deny, review, and modify to explicit runtime behavior.
  Malformed or unmappable protected decisions deny.
- EC-008 records generation references, not secret material, and consumes
  authorization rather than re-evaluating it.
- EC-009 consumes revocation from EC-005 and emits durable lineage,
  cancellation, cleanup, and settlement evidence.

### Providers, capability surfaces, and delivery

- EC-011 owns candidate-to-call identity; EC-012 owns derived usage
  reconciliation.
- EC-012 no longer depends on EC-031, removing a cycle. EC-031 consumes
  reconciled usage.
- EC-013 exposes authorization requirements but does not own authorized
  invocation/effect behavior.
- EC-013 requires a bounded source/evidence slice before promotion.
- EC-016 consumes EC-023 replay/settlement rules and adds channel-native
  delivery identity and idempotency.

### Extensions, artifacts, and hosting

- EC-027 declares trust requirements; EC-028 evaluates them.
- Skill metadata remains optional and additive; a bare SKILL.md folder remains
  valid.
- EC-028 defines portable cross-source revocation identity and removes its
  circular dependency on EC-029.
- EC-032 declares deployment budgets while EC-031 owns admission and usage.
- EC-032 adds transition evidence, reconnect/idempotency, resource accounting,
  and operational budget requirements.

## Cross-Wave Corrections

- EC-006 dependency direction was revised to support EC-003.
- EC-031 remains downstream of EC-012 for usage facts.
- EC-029 remains downstream of EC-028 for artifact trust.

## Deferred Questions

- Exact mapping of `modify` into current OpenClaw tool-policy surfaces.
- Exact degraded credential behavior for each risk class.
- Whether scheduling requires a distinct owner or remains an agent-runtime
  relationship.
- The first EC-013 capability-negotiation evidence fixture.
- Portable artifact revocation statement format and signing authority.
- Scout sidecar and supervisor cold-start/resource budgets.

## Result

Wave 2 is ready for a naming and dependency-order pass. Wave 3 should now be
reviewed against the ownership directions established here.
