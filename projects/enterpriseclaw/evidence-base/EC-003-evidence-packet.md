# EC-003 Credential Runtime Binding Evidence Packet

## Evidence Baseline

- Current OpenClaw source worktree: `C:\src\openclaw-design-audit`.
- Audited revision:
  `bde1602e6e86fd91dd0bec3aae714e059e556c4d`.
- Current source audit:
  `projects/openclaw-design/source-audit-credentials-secrets-auth-2026-08-01.md`.
- Current facility model:
  `projects/openclaw-design/specs/credentials-secrets-auth.md`.
- Primary implementation:
  `src/agents/execution-auth-binding.ts`,
  `src/agents/cli-auth-epoch.ts`,
  `src/agents/auth-profiles/runtime-snapshots.ts`, and
  `src/secrets/runtime-degraded-state.ts`.
- Representative tests:
  `src/agents/execution-auth-binding.test.ts`,
  `src/agents/cli-auth-epoch.test.ts`,
  `src/agents/auth-profile-runtime-contract.test.ts`,
  `src/agents/embedded-agent-runner.run-embedded-agent.auth-profile-rotation.e2e.test.ts`,
  and `src/agents/prepared-model-runtime.lifecycle.test.ts`.
- Evidence grade: A.

## Current Owner Findings

Current source distinguishes:

- credential material from SecretRef/profile identity;
- persisted auth-profile state from process-local runtime snapshots;
- reusable CLI session epochs from stricter per-execution credential binding;
- identity-bearing OAuth refresh from principal/grant replacement;
- resolved static-secret values from unresolved references;
- credential owner identity from executable/plugin runtime owner identity; and
- unavailable/degraded owners from healthy active surfaces.

`AgentExecutionAuthBinding` records the successful profile, model/harness,
runtime artifact, and non-reversible credential or opaque-owner fingerprint.
The HMAC key is process-local, so the fingerprint intentionally becomes
invalid after restart.

## Current Accepted and Failure Evidence

| Case | Current result |
| --- | --- |
| Static secret value rotates | Execution fingerprint changes |
| SecretRef materializes to a replacement value | Resolved binding fingerprint changes |
| OAuth token refresh preserves a known account/principal | Binding remains stable |
| Identity-less OAuth grant changes | Binding changes |
| Selected profile is missing or resolves as another profile | Binding fails closed |
| Opaque CLI/plugin owner lacks executable artifact identity | Binding fails closed |
| AWS profile name lacks resolved principal proof | Binding fails closed |
| Embedded provider retries with another eligible profile | New attempt uses the replacement profile and retains prior failure bookkeeping |
| Prepared runtime owner is superseded | Stale lease cannot authorize the replacement generation |

## Target Contribution

The missing shared contribution is not another secret manager. It is a durable
non-secret relationship:

```text
credential/profile owner generation
  + runtime consumer
  + operation/attempt identity
  + accepted config/policy generation
  -> resolved binding
  -> active / stale / revoked / expired / unavailable / unknown settlement
```

The relationship must be adopted at actual model, CLI, channel, MCP, tool,
node, and host effect boundaries without centralizing provider-specific auth
semantics.

## Role Evaluation

- **Runtime owner:** preserve the current prepared-runtime and auth-profile
  owners. Binding checks must not add synchronous secret resolution to every
  tool or model frame.
- **Credential/adapter owner:** verify owner identity before use and distinguish
  same-principal refresh from replacement. Verify before dispatch, not after
  an effect.
- **Policy steward:** policy may require profile class, freshness, or evidence,
  but cannot copy credential settings or become the selection owner.
- **CISO:** protected actions fail closed when the principal or generation
  cannot be proven. Evidence contains hashes/references, never reusable
  tokens, keys, or raw SecretRef identifiers.
- **Founder/simplicity:** local environment and file credentials remain valid
  owners. The binding is internal correlation, not mandatory enterprise
  infrastructure.

## Remaining Proof Plan

The protected-effect fork simulation now proves that a changed credential
generation can fence a human-approved message before fake dispatch while
preserving approved and observed non-secret binding facts. This is
owner-neutral composition evidence, not current runtime adoption.

1. Accept one real test-only operation binding using a static SecretRef-backed
   profile through an existing message-tool/channel seam.
2. Persist only profile/reference, owner generation, consumer, operation,
   config/policy generations, and redacted evidence references.
3. Restart and re-resolve the same owner generation without persisting the
   process-local fingerprint.
4. Refresh an identity-bearing OAuth token and preserve the binding.
5. Replace the static secret or identity-less OAuth grant and settle the prior
   attempt as stale.
6. Attempt replay and prove the runtime reconciles the prior binding instead
   of looking up the current credential implicitly.
7. Repeat one case outside model execution, preferably an authorized external
   effect, to prove owner-neutral adoption.

## Migration, Deletion, and Disproof

- Reuse current SecretRef, auth-profile, runtime-snapshot, degradation, and
  execution-binding seams.
- Do not persist process-local HMAC fingerprints or secret material.
- Delete execution-time ambient/current credential lookup once every protected
  path consumes an accepted binding.
- Disprove a separate shared relationship if current owner-native bindings can
  provide durable operation identity, restart reconciliation, and stale
  fencing across unlike consumers without it.

## Evidence-Ready Disposition

EC-003 moves to A and remains not evidence-ready. Current source is audited and
representative accepted/failure proofs cover exact resolved credentials,
stable-principal refresh, identity replacement, missing owners, runtime
artifact identity, retry rotation, and stale prepared-runtime leases. The
target binding is still process-local, not restart-recoverable, and not
consistently consumed by channel, MCP, tool, node, host, or external-effect
owners.
