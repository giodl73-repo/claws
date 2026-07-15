# B6b: Hosted Binding Doctor Findings

## Outcome

Add actionable Doctor findings over the B6a inventory and owner evidence.

## Repository And Dependencies

- Repository: `openclaw/openclaw`
- Depends on: B6a and A2/A3

## Change

- Diagnose missing registrations, incompatible versions, and disabled bundles.
- Diagnose missing credentials, policy conflicts, stale carriers, and unknown
  required criteria.
- Point to owner config paths and safe repairs without exposing secrets.

## Proof And Exit

- Every finding has a stable ID, severity, cause, and remediation.
- Doctor never reports success that contradicts owner readiness.
- Findings cover startup and reload failures.

## Implementation Status

- Fork draft PR: https://github.com/giodl73-repo/openclaw/pull/47
- Branch: `user/giodl/hosted-integration-b6b-doctor`
- Head: `d62d1212797`
- Base: B6a head `1dbbe1adfa1`
- Added `core/doctor/host-integration-bindings` through the existing structured
  health contribution pipeline.
- The check reads only B5/B6a published snapshots. It does not probe, activate,
  reload, or repair bindings.
- No bundle and ready bindings emit no findings. Required unavailable bindings
  are errors; other non-ready states are warnings.
- Doctor exposes only a closed set of operational reason codes. Unknown owner
  reasons and all owner messages remain hidden.
- Remediation distinguishes contribution IDs and contract versions from real
  installable package metadata.
- Credential, policy, carrier, and readiness-criterion causes are accepted only
  as owner-produced evidence; B6b does not independently infer them.
- Proof passed 105 focused tests, formatting, focused lint, core TypeScript,
  diff checks, and final Codex review.
