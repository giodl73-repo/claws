# Credentials, Secrets, and Auth Profiles Facilities

## Boundary

This portfolio represents credential material and references, auth profiles,
principals/sessions, consuming bindings, resolved runtime snapshots,
refresh/cooldown state, and redacted evidence.

It must support centralized enterprise policy without requiring centralized raw
credential material.

## Child Contracts

### Credential material

- opaque secret value;
- issuer and owner;
- issue, rotate, expire, revoke, and destroy;
- disclosure and storage boundary.

### Credential reference

- SecretRef source/provider/ID;
- no raw material;
- resolution and missing/degraded semantics.

### Auth profile

- profile ID;
- provider and auth mode;
- account identity;
- eligibility/order and copy policy;
- OAuth refresh/cooldown state.

### Principal and binding

- authenticated human/workload/device/channel/MCP/Gateway identity;
- selected provider/account/owner surface;
- least-privilege scope;
- policy/approval and network boundary.

### Runtime snapshot and evidence

- accepted secret generation;
- refresh lock, cache, cooldown, and last-good state;
- redacted availability/conflict/migration/rotation evidence.

## Enterprise Extensions

- federation and per-workload managed identity;
- tenant/org/project scopes and delegated administration;
- short-lived/JIT credentials;
- portable token exchange;
- provider revocation evidence;
- governed break-glass workflow;
- KMS/customer-managed keys and residency;
- private secret-provider connectivity;
- fleet rollout/drift; and
- run/action correlation without secret disclosure.

## Non-Ownership Rules

- Secret providers own material and resolution.
- Auth-profile owners own selection and refresh state.
- Gateway, model, channel, MCP, tool, device, and host owners retain binding
  semantics.
- Policy may require evidence or gate a real enforcement point; it does not
  copy all credential settings.

Source audit:
`../source-audit-credentials-secrets-auth-2026-08-01.md`.
