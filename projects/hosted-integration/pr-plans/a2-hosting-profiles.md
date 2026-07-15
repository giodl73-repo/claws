# A2: Hosting Profiles Foundation

## Outcome

Land or rebase the Hosting Profiles stack used to gate hosted workloads.

## Repository And Dependencies

- Repository: `openclaw/openclaw`
- Depends on: existing Hosting Profiles work

## Change

- Support built-in and namespaced profiles.
- Support required and advisory criteria.
- Preserve fail-closed `Unknown` for missing required evidence.
- Project aggregate readiness into `/ready`, `/readyz`, health, and status.
- Keep criteria bounded, cached, timed out, and non-mutating.

## Non-Goals

- Profiles do not select implementations or activate bindings.
- Profiles do not define provider, Channel, or Gateway semantics.

## Proof And Exit

- Required `False` or `Unknown` blocks readiness.
- Advisory failures remain visible without blocking admission.
- Existing non-hosted profiles retain current behavior.
