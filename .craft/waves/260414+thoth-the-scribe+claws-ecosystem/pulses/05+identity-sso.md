---
pulse: 5
slug: identity-sso
plan: claws-protect
depends_on: [1]
governing_roles: [craft:architect, claws:platform-eng, claws:ciso]
scenario_codes: [identity-bridge/S02]
stage: implementation
test_tiers:
  L0_unit: 6
  L1_integration: 3
  L2_e2e: 1
  L3_accept: 2
test_scope:
  run:
    - "cd claws-sdk && npx vitest run"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 1
checkpoint_gate: false
---

# Pulse 05: Identity SSO

## Objective

Implement SSO/RBAC configuration for enterprise identity integration. This pulse creates the identity module that handles OIDC and SAML provider registration, role-to-trust-tier mapping, and config persistence in claws.json.

Enterprise customers need to map their existing identity providers to claws's trust tier model. An OIDC provider returns claims (roles, groups); the identity module maps those claims to claws trust tiers (T1-T5) so that governance rules can vary by authenticated role. A security-admin mapped to T4 can run R4 tools; a read-only-user mapped to T1 can only run R1 tools.

The identity config is persisted in claws.json under the `identity` key and consumed by the pinch rule engine for role-based rule overrides. This means the identity module must validate configs against the IdentityConfig schema from Pulse 01 types and write them in a format that pinch can read without transformation.

## Deliverables

- [ ] `claws-sdk/src/protect/identity.ts` — SSO config: OIDC provider schema validation (issuer, clientId, redirectUri, scopes), SAML provider schema validation (entityId, ssoUrl, certificate), role-to-tier mapping (role string to TrustTier enum), claws.json persistence under `identity` key. PKCE (code_challenge + code_verifier) for all OIDC flows, nonce verification, JWT signature verification against JWKS endpoint, audience (aud) claim validation, issuer (iss) claim validation, token expiry (exp) with clock skew tolerance, SAML certificate chain validation (not just presence). Exports `configureIdentity(config: IdentityConfig): Promise<void>`, `getIdentity(workspacePath: string): Promise<IdentityConfig | null>`, `mapRoleToTier(role: string, mapping: RoleMapping): TrustTier`.
- [ ] `claws-sdk/tests/protect/identity.unit.test.ts` — L0: OIDC config validation accepts valid issuer/clientId/redirectUri (1 test), SAML config validation accepts valid entityId/ssoUrl/certificate (1 test), role-to-tier mapping returns correct tier for mapped roles (1 test), PKCE code_challenge required for OIDC flows (1 test), JWT signature verification against JWKS (1 test), SAML cert chain validation rejects self-signed (1 test)
- [ ] `claws-sdk/tests/protect/identity.integration.test.ts` — L1: identity config persistence to claws.json and re-read (1 test), identity config consumed by pinch rule engine for role-based overrides (1 test), full OIDC flow with PKCE + nonce + JWT verify (1 test)
- [ ] `claws-sdk/tests/protect/identity.e2e.test.ts` — L2: full identity configuration lifecycle — OIDC provider registration, role-to-tier mapping, config persistence, and pinch rule engine consumption on fixture workspace
- [ ] `claws-sdk/tests/protect/identity.accept.test.ts` — L3: SDK acceptance — consumer calls configureIdentity/getIdentity/mapRoleToTier and validates OIDC+SAML config round-trip, role mapping correctness, and claws.json persistence
- [ ] `claws-cli/tests/protect/identity.accept.test.ts` — L3: CLI acceptance — `claws protect identity` configure/show subcommands produce correct output for OIDC and SAML providers and exit 0

## Acceptance Criteria

- [ ] OIDC config with valid issuer, clientId, redirectUri passes validation
- [ ] SAML config with valid entityId, ssoUrl, certificate passes validation
- [ ] Invalid configs (missing required fields, malformed URLs) throw descriptive errors
- [ ] Role-to-tier mapping correctly translates "security-admin" to T4, "read-only-user" to T1
- [ ] Identity config written to claws.json under `identity` key
- [ ] Config written by identity module is consumed by pinch for role-based rule overrides
- [ ] OIDC flows require PKCE
- [ ] JWT signature verified against provider JWKS
- [ ] aud and iss claims validated
- [ ] SAML certificate chain validated, self-signed rejected
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:
- `.craft/roles/craft/architect.md` — monorepo structure, claws.json schema extension patterns
- `.craft/roles/claws/platform-eng.md` — identity provider integration, trust tier model, pinch rule engine consumption

## Dependencies

- Pulse 01 (protect-types): IdentityConfig type

## Test Gates

- [ ] L0 unit (6 tests): OIDC config validation (1), SAML config validation (1), role-to-tier mapping (1), PKCE code_challenge required (1), JWT signature verification against JWKS (1), SAML cert chain validation rejects self-signed (1)
- [ ] L1 integration (3 tests): identity config persistence to claws.json (1), identity + rule engine consumption (1), full OIDC flow with PKCE + nonce + JWT verify (1)
- [ ] L2 e2e (1 test): full identity configuration lifecycle on fixture workspace
- [ ] L3 accept (2 tests): SDK acceptance — identity config round-trip and role mapping validation (1), CLI acceptance — `claws protect identity` output and exit codes (1)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
