# Managed Provider 4: Metering and Attestation

Base: managed-provider step 3
Planned head: managed-provider stack step 4

## Objective

Capture provider/model/source/outcome/token metadata and source-authenticated
managed-provider evidence so Scout can prove which managed capacity handled a
turn without relying on runtime logs or Desktop inference.

## Code Surfaces

- Add a redacted managed-provider attestation shape with provider, provider
  source, model, tenant policy source, outcome, status class, correlation IDs,
  and bounded usage metadata.
- Add metering events for request count, latency, token usage, quota state, and
  fallback/degraded outcomes.
- Thread attestation through managed-provider final events and session audit
  records.
- Ensure audit payloads are redacted and do not include provider credentials,
  raw bearer tokens, Graph tokens, cookies, or prompt/body data beyond existing
  audit policy.
- Align naming with Lobster provider metadata where possible:
  `provider`, `provider_source`, model, outcome, token usage, and correlation.

## Acceptance Criteria

- Scout receives provider attestation from the managed path rather than
  inferring provider identity from local logs.
- Usage and quota metadata are available for billing/support correlation.
- Audit and telemetry payloads remain redacted and bounded.
- Failed, policy-rejected, quota-limited, and fallback turns emit distinct
  outcomes.

## Expected Validation

- Unit tests for attestation validation and sanitization.
- Telemetry/audit tests for success, failure, quota, policy rejection, and
  fallback.
- Snapshot or fixture tests for redacted event shapes.
- Typecheck, focused lint/format, and `git diff --check`.

## Non-goals

- No billing ledger implementation.
- No tenant billing UI.
- No Desktop storage of provider secrets.
