# Credentials, Secrets, and Auth Profiles Source Audit - 2026-08-01

## Source Baseline

- Worktree: `C:\src\openclaw-design-audit`
- Head: `bde1602e6e86fd91dd0bec3aae714e059e556c4d`

## Finding

OpenClaw has a substantial credential and secret architecture. Its strongest
contracts are:

- typed SecretRefs;
- runtime secret snapshots and degraded-state handling;
- Gateway active-surface auth resolution;
- provider auth-profile selection and cooldown/refresh state;
- channel/MCP/provider bindings; and
- redacted diagnostics and migration receipts.

The main design problem is that credential material, references, profiles,
principals, bindings, runtime snapshots, caches, and evidence are spread across
large overlapping managers. Enterprise identity and secret management should
bind to these existing owners rather than create one central raw-secret store.

## Current Architecture

```text
raw credential material
   env / file / local store / OAuth / external provider
        |
        v
CredentialRef / SecretRef
        |
        v
auth profile + provider/account/owner binding
        |
        v
resolution + refresh/cooldown/availability
        |
        v
redacted resolved runtime snapshot
        |
        +--> Gateway auth surfaces
        +--> model/provider runtime
        +--> channel account runtime
        +--> MCP/tool/host bindings
        |
        v
warnings + diagnostics + migration receipts + audit facts
```

## Objects and Lifetimes

| Object | Owner | Identity / renewal |
| ------ | ----- | ------------------ |
| Credential material | Secret/provider/OAuth owner | Opaque token, key, password, refresh token, or external credential; renewed by issuance or rotation. |
| Credential reference | Config/secrets owner | SecretRef source/provider/ID tuple; renewed when selection or backing entry changes. |
| Auth profile | Auth-profile owner | Profile ID plus provider, mode, and account identity; renewed by edit, migration, or account replacement. |
| Principal/session | Gateway/device/channel/MCP/provider owner | Authenticated caller or workload session; renewed by login, pairing, token exchange, or expiry. |
| Binding | Consuming owner | Relationship among profile/reference, provider/account, owner kind, and runtime surface. |
| Resolved secret snapshot | Secrets runtime owner | In-memory redacted/sentinelized accepted generation; renewed on activation or refresh. |
| Credential cache/lease | Auth runtime | Warm snapshot, refresh lock, cooldown, and last-good state; renewed by lookup, refresh, failure, or expiry. |
| Credential status/evidence | Diagnostics/migration owner | Availability, configured-but-unavailable state, warnings, receipts, and redacted proof. |

## SecretRef and Runtime Resolution

SecretRef typing separates a config reference from raw credential material
(`src/config/types.secrets.ts:6-15`, `147-180`, `290-355`).

Secret resolution and runtime publication:

- resolve configured secret sources;
- produce an accepted in-memory snapshot;
- retain redacted/sentinelized config projections;
- preserve last-known-good behavior where defined; and
- expose degraded runtime state instead of silently treating missing secrets as
  healthy.

See:

- `src/secrets/resolve.ts:836-865`;
- `src/secrets/runtime-shared.ts:99-218`; and
- `src/secrets/runtime-degraded-state.ts:129-239`.

## Gateway Authentication

Gateway auth resolves configured modes, token/password sources, active
surfaces, and source conflicts:

- `src/gateway/auth-resolve.ts:34-120`;
- `src/gateway/auth-config-utils.ts:29-214`;
- `src/gateway/auth-surface-resolution.ts:52-185`;
- `src/gateway/auth-token-resolution.ts:17-83`; and
- `src/gateway/auth-token-source-conflict.ts:21-74`.

An auth source is not automatically active on every Gateway surface. Surface
selection and conflicts are explicit.

## Provider and Auth-Profile Binding

Model/provider auth resolves:

- provider configuration;
- eligible profile order;
- provider/model compatibility;
- account identity;
- auth mode;
- environment/SecretRef/local-store sources; and
- runtime availability.

See:

- `src/agents/model-auth-provider.ts:63-237`;
- `src/agents/model-provider-auth.ts:123-237`;
- `src/agents/model-auth-model.ts:48-209`; and
- `src/agents/model-auth-provider-config.ts:73-454`.

Auth-profile state owns eligibility, ordering, persistence, OAuth refresh,
cooldown, and runtime snapshots:

- `src/agents/auth-profiles/credential-state.ts:26-132`;
- `src/agents/auth-profiles/order.ts:88-435`;
- `src/agents/auth-profiles/oauth.ts:217-377`;
- `src/agents/auth-profiles/oauth-manager.ts:60-305`;
- `src/agents/auth-profiles/store.ts:1048-1623`; and
- `src/agents/auth-profiles/runtime-snapshots.ts:219-482`.

## Channel, MCP, Tool, Device, and Host Bindings

Credential resolution is consumed by owner-specific bindings:

- channel secret activation:
  `src/secrets/channel-secret-basic-runtime.ts:99-265`;
- channel account snapshots:
  `src/channels/account-snapshot-fields.ts:86-173`;
- MCP auth profiles and OAuth:
  `src/agents/mcp-auth-profile.ts:35-244`,
  `src/agents/mcp-oauth.ts:122-364`;
- plugin/provider auth runtime:
  `src/plugin-sdk/provider-auth-runtime.ts:46-181`;
- worker tool authority:
  `src/worker/tool-authority.ts:14-19`,
  `src/gateway/worker-environments/worker-tool-authority.ts:72-89`; and
- device authentication:
  `src/shared/device-auth.ts:2-22`.

These bindings retain their own principal, account, target, and activation
semantics.

## Migration, Audit, and Redaction

Doctor and secret commands support migration and explicit apply flows:

- `src/commands/doctor-auth.ts:145-564`;
- `src/commands/doctor-auth-migration-receipts.ts:51-427`;
- `src/secrets/apply.ts:123-832`; and
- `src/secrets/audit.ts:302-715`.

Redaction is a runtime contract, not only a UI convention:

- `src/logging/secret-redaction-registry.ts:30-88`; and
- `src/config/redact-snapshot.secret-ref.ts:1-23`.

Diagnostics can report configured, unavailable, migrated, conflicted, or
degraded state without reproducing raw credential material.

## Enterprise Validation

### Covered

- Central source policy through configured secret providers and SecretRefs
  without requiring one raw-secret store.
- Local/agent-scoped auth-profile stores and runtime snapshots.
- Active-surface filtering and explicit auth precedence.
- OAuth refresh, locking, cooldown, and last-good state.
- Rotation-aware Gateway and provider activation.
- Redacted diagnostics, migration receipts, and configured-but-unavailable
  status.
- External/exec provider seams that can integrate host-native secret systems.

### Partial or missing

- first-class federated human and workload identity across all owners;
- tenant/org/project scopes and delegated secret administration;
- managed identity/token exchange as a portable binding contract;
- provider-side revocation and proof of revocation;
- short-lived/JIT credential policy;
- governed break-glass identity, approval, expiry, and evidence;
- customer-managed keys and explicit residency;
- private-network requirements for secret retrieval;
- fleet rollout, drift, and partial-failure semantics;
- uniform credential-to-action/run evidence correlation; and
- separation of local raw material in environment, files, and SQLite stores.

Operator recovery commands are not by themselves an enterprise break-glass
contract.

## Monolithic Overlaps

- `src/secrets/resolve.ts` is an acknowledged oversized resolution hub.
- `src/agents/auth-profiles/store.ts` mixes storage, discovery, migration, and
  persistence snapshots.
- `src/agents/auth-profiles/oauth-manager.ts` mixes adoption, redaction,
  bootstrap, locking, refresh, and policy.

## Separation Decision

Document eight child contracts:

1. **Credential material**: opaque value, issuer, rotation, revocation, and
   disclosure boundary.
2. **Credential reference**: source/provider/ID without material.
3. **Auth profile**: provider, mode, account identity, ordering, and copy
   policy.
4. **Principal/session**: human, workload, device, channel, MCP, or Gateway
   caller identity.
5. **Binding**: reference/profile to provider/account/owner surface.
6. **Resolved secret snapshot**: accepted runtime generation and degraded
   state.
7. **Lease/cache**: refresh lock, cooldown, warm/last-good snapshot, and expiry.
8. **Status/evidence**: redacted availability, conflict, migration, rotation,
   and audit facts.

Enterprise hosts may supply federation, managed identity, KMS, and fleet
policy. They must not become the semantic owner of every consuming binding.

## Revised Rubric

| Dimension | Score | Reason |
| --------- | ----- | ------ |
| Ownership | 3 | Secret, profile, Gateway, provider, channel, MCP, and device owners exist but overlap. |
| Object model | 3 | References, profiles, snapshots, cooldowns, and evidence are concrete; principal/binding vocabulary is inconsistent. |
| Contract completeness | 4 | Resolution, refresh, activation, degraded state, migration, and redaction are substantial. |
| Separation/cohesion | 2 | Large resolver/store/manager modules combine several lifecycles. |
| Evidence | 4 | Broad tests and redacted diagnostic/migration surfaces support current behavior. |
| Evolution/operations | 3 | Rotation, migration, cooldown, and restart behavior are explicit; fleet/federation are incomplete. |

**Total: 19/24 (B), high confidence for the audited paths.**

Enterprise contract coverage is **C3**: strong owner contracts exist, but
federation, tenant administration, KMS/residency, governed break-glass, and
fleet semantics remain incomplete.
