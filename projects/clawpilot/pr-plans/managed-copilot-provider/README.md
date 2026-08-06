# Managed Copilot Provider Plan

These plans describe the fourth ClawPilot implementation lane: a managed model
provider for Microsoft 365 Copilot or internal managed capacity.

The lane depends on #3953 provider routing so the managed provider is an
eligible runtime path, not a replacement for the current Desktop provider. It
can then compose with #3955 provider-neutral Desktop capabilities when a
managed-provider turn needs local browser, clipboard, local app, workspace,
filesystem, shell, or M365 draft work.

## Review Shape

| Step | Plan                                                                         | Review focus                                                                                       |
| ---- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 1    | [01-provider-contract-readiness.md](01-provider-contract-readiness.md)       | Provider identity, entitlement, readiness, capacity, and degraded states.                          |
| 2    | [02-managed-chat-adapter.md](02-managed-chat-adapter.md)                     | Managed-provider chat adapter, event normalization, abort/cancel, and errors.                      |
| 3    | [03-routing-fallback.md](03-routing-fallback.md)                             | Explicit managed-provider session binding plus Desktop-provider fallback.                          |
| 4    | [04-metering-attestation.md](04-metering-attestation.md)                     | Provider/model/source/outcome/token metadata and source-authenticated evidence.                    |
| 5    | [05-desktop-capability-composition.md](05-desktop-capability-composition.md) | #3955 capability requests from managed-provider turns through Desktop policy, approval, and audit. |
| 6    | [06-dogfood-gates.md](06-dogfood-gates.md)                                   | Flagged dogfood proof, quota/degraded behavior, no token leakage, and no Desktop regression.       |

## Stack Boundary

This stack should not fork or rewrite GitHub Copilot SDK internals. It adds a
new provider path beside the current Desktop provider:

```text
Scout Desktop
  -> #3953 runtime routing
       -> current Desktop Copilot SDK path
       -> managed model provider
            -> Scout Cloud / Lobster entitlement, auth, metering
            -> M365 Copilot / CAPI / Substrate / internal capacity
            -> optional #3955 Desktop capability requests
```

Desktop keeps local authority. Scout Cloud/Lobster owns managed provider
credentials, model selection, quota, metering, and provider attestation.
