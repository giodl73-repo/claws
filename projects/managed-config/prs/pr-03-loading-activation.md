# PR 3: Opt-In Loading and Atomic Activation

## Objective

Connect PR 1 to the existing config lifecycle through one explicit opt-in seam
while making the unused feature invisible.

## Dependency

- PR 1 merged or stacked cleanly on its final API.

## Source audit before editing

- `createConfigIO` and current config read/reload entry points.
- Include, environment interpolation, secret resolution, and plugin metadata.
- Runtime snapshot preparation, publication, and failed-reload behavior.
- Existing dependency-injection patterns for optional config inputs.

## Production scope

- One ordered source-descriptor option at the config I/O boundary.
- Generic opaque source resolver callback; core does not know host source types.
- Stable layer ID, access capability, and redacted source identity.
- Source-contract capability/version and optional expected digest.
- Concurrent resolution permitted while result order remains descriptor order.
- PR 1 composition and effective validation.
- Exactly one publication call after every gate succeeds.
- Existing single-config path unchanged when the option is absent.

## Implementation steps

1. Select the narrowest existing config I/O injection point.
2. Add the optional descriptor list and resolver without a new config key.
3. Resolve bytes plus identity/integrity evidence; when a digest is expected,
   verify it before parsing or authority admission.
4. Reject unsupported source-contract versions before source activation.
5. Adapt verified resolved documents to PR 1 inputs.
6. Build one complete source/runtime activation candidate.
7. Invoke the existing snapshot boundary once.
8. Preserve the previous snapshot on reload failure.
9. Fold or delete prototype activation adapters superseded by the real seam.
10. Keep source resolution and publication testable with injected functions.

## Failure-state contract

- **Feature absent:** use the current single-config path exactly.
- **Configured startup failure:** fail startup/readiness; never fall back to the
  single-config path or omit a failed layer.
- **Configured reload failure:** retain the previous complete snapshot, report
  the rejected generation, and remain ready only for that previous generation.
- **Expected digest mismatch:** reject before parse/admission, publish nothing,
  and emit a redacted integrity finding distinct from missing/unverified input.

## Focused proof

- No option follows the exact current path.
- One source is behaviorally equivalent to current config loading.
- Two and three sources preserve declared order despite out-of-order resolution.
- Resolution failure returns no partial layer set and publishes nothing.
- Digest mismatch, unsupported contract version, and source rotation are
  distinguished without exposing source bytes or host paths.
- Authority or effective-validation failure publishes nothing.
- Publisher failure does not return an active candidate.
- Successful activation publishes once with ordinary runtime config.
- Lobster allowed-origins fixture composes without a post-seed writer.
- Startup/readiness and reload/previous-generation behavior are proven through
  the existing Gateway health boundary.

## Non-goals

- No implicit file discovery, priority numbers, or environment convention.
- No ordinary `layers` config property.
- No mutation routing, status UI, or bounded comparators.
- No Lobster production change.

## Exit criteria

- Feature is unobservable unless the option is supplied.
- Existing config/reload tests remain green.
- Focused activation tests cover every failure gate.
- A Crabbox or equivalent real startup proof records the actual provider and ID.
- Configured failure cannot silently select the legacy path.
