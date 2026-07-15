# A3: Owner Readiness Registration

## Outcome

Allow trusted core, Channel, and capability owners to publish readiness
criteria through the Hosting Profiles contract.

## Repository And Dependencies

- Repository: `openclaw/openclaw`
- Depends on: A2

## Change

- Generalize criterion registration beyond plugin-only contributors.
- Require stable names, ownership metadata, timeout, and redaction posture.
- Let owners publish `True`, `False`, or `Unknown` with stable reasons.
- Preserve advisory-by-default behavior until a profile requires a criterion.

## Non-Goals

- No host-written success evidence.
- No readiness-driven dependency injection or activation.

## Proof And Exit

- Core, Channel, and provider fixtures register independent criteria.
- Missing registration becomes required `Unknown`.
- Duplicate or incompatible criterion registration fails explicitly.
