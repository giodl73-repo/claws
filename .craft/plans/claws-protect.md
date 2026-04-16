---
slug: claws-protect
preset: "claws"
plan: "2 headlines: claws budget --fleet shows token spend across workspaces, claws secrets init creates AES-256-GCM vault"
area: claws
status: Implemented
phase: thoth
atoms: [atom:kill-switch, atom:key-management, atom:fleet-broadcast, atom:latency-budget]
specs: [CL-02, CL-01, CL-05]
---

# claws-protect — Budget, Secrets, Identity

## Headlines

1. **H1: `claws budget --fleet` shows token spend across 47 workspaces with threshold alerts** — The budget command reads token usage from the audit chain and governance host, displays per-workspace and aggregate spend against configured limits, and reports threshold breaches (80%/95%/100%). In workspace mode, `claws budget` shows current session spend with remaining allocation. In fleet mode, `claws budget --fleet` aggregates across all discovered workspaces (via `claws scan`), sorted by spend percentage. `claws budget set --daily 50000 --monthly 1000000` configures workspace limits in `claws.json`. Budget enforcement at runtime is handled by the generated Gateway plugin (G-BOUND budget rule from claws-rules).
   - Validation: `claws budget` on a workspace with 10,000 tokens used of 50,000 daily limit shows "20% of daily budget used"
   - Validation: `claws budget --fleet` across 3 fixture workspaces shows aggregated spend with per-workspace breakdown
   - Validation: `claws budget set --daily 50000` updates `claws.json` and is picked up by subsequent `claws pinch`

2. **H2: `claws secrets init` creates an AES-256-GCM encrypted vault with Argon2id key derivation (scrypt fallback)** — The secrets command manages an encrypted vault at `.claws/secrets/vault.enc` for storing API keys, signing keys, and sensitive configuration. `claws secrets init` derives an encryption key from a passphrase using Argon2id (or scrypt fallback), creates the vault with an empty key-value store, and writes the salt to `.claws/secrets/vault.salt`. `claws secrets set <key>` encrypts a value and stores it. `claws identity` configures SSO/RBAC mappings in `claws.json` for enterprise SSO (OIDC/SAML) integration, mapping identity provider roles to claws trust tiers.
   - Validation: `claws secrets init` creates `.claws/secrets/vault.enc` that is not readable as plaintext
   - Validation: `claws secrets set audit-key` followed by `claws secrets get audit-key` round-trips the value
   - Validation: `claws identity` writes SSO configuration to `claws.json` that `claws pinch` reads for role-based rule overrides

## Summary

The PROTECT group provides budget management, secret storage, and identity configuration for claws workspaces. Budget tracking reuses agent-sdk's `suite/budget.ts` and `suite/budget-tracker.ts` infrastructure, extending it with fleet aggregation and CLI display. Secret management reuses compiler-sdk's `integrity/` for AES-256-GCM encryption, adding a vault abstraction with passphrase-derived keys. Identity configuration writes SSO/RBAC mappings that the governance rule engine and generated plugins consume. All three commands are workspace-scoped by default, with `--fleet` escalation for budget.

## Coverage Contract

### Specs
- [ ] CL-02 -- Key management (CB-03): vault encryption, key derivation, storage tiers (file/env/KMS)
- [ ] CL-01 -- PROTECT command group in CLI surface: budget, secrets, identity
- [ ] CL-05 -- Fleet budget visibility as part of outer ring operations

### Concept Guides
- [ ] docs/claws/protect/budget.md -- NEW: token budget management, thresholds, fleet aggregation
- [ ] docs/claws/protect/secrets.md -- NEW: vault lifecycle, passphrase derivation, KMS integration

### Scenario Coverage
- [ ] protect/budget-workspace-show -- display current workspace budget usage
- [ ] protect/budget-fleet-aggregate -- aggregate budget across multiple workspaces
- [ ] protect/budget-threshold-alert -- 80/95/100% threshold breach reporting
- [ ] protect/budget-set-limits -- configure daily/monthly limits in claws.json
- [ ] protect/secrets-init-create -- create new vault from passphrase
- [ ] protect/secrets-set-get-roundtrip -- store and retrieve encrypted value
- [ ] protect/secrets-wrong-passphrase -- vault decryption fails with wrong passphrase
- [ ] protect/identity-sso-config -- write OIDC/SAML configuration
- [ ] protect/identity-role-mapping -- map IdP roles to claws trust tiers

### Test Tier Targets
| Tier | Target | Rationale |
|------|--------|-----------|
| L0 unit | 16 | Budget calculation (4), threshold detection (3), vault encrypt/decrypt (4), key derivation (2), identity config validation (3) |
| L1 integration | 5 | Budget + audit chain read, vault lifecycle (init/set/get), fleet aggregation, identity + rule engine |
| L2 e2e | 3 | Full `budget` + `secrets init/set` + `identity` on fixture workspaces |
| L3 acceptance | 0 | CLI acceptance deferred to claws-cli plan |

## Scope

- `claws-sdk/src/protect/budget.ts` (NEW) -- Budget read/set/aggregate. Wraps agent-sdk `suite/budget.ts` + `suite/budget-tracker.ts` with claws config
- `claws-sdk/src/protect/budget-fleet.ts` (NEW) -- Fleet budget aggregation: scan workspaces, collect budget data, produce fleet report
- `claws-sdk/src/protect/secrets.ts` (NEW) -- Vault lifecycle: init (passphrase derivation), set, get, list, delete. AES-256-GCM via compiler-sdk integrity/
- `claws-sdk/src/protect/identity.ts` (NEW) -- SSO/RBAC config: OIDC/SAML provider registration, role-to-tier mapping, config persistence
- `claws-sdk/src/protect/types.ts` (NEW) -- BudgetReport, VaultConfig, IdentityConfig, ThresholdAlert types
- `claws-sdk/src/protect/index.ts` (NEW) -- Barrel exports

## Deliverables

### Specs & Design
- [ ] CL-02 amendment -- key management vault spec finalized (CB-03 concrete implementation)
- [ ] CL-01 amendment -- PROTECT command group behavior documented

### SDK Logic (claws-sdk)
- [ ] claws-sdk/src/protect/budget.ts -- workspace budget: read from audit chain + config, compute usage, check thresholds
- [ ] claws-sdk/src/protect/budget-fleet.ts -- fleet budget: discover workspaces, aggregate, sort by spend percentage
- [ ] claws-sdk/src/protect/secrets.ts -- vault: Argon2id key derivation, AES-256-GCM encrypt/decrypt, salt management
- [ ] claws-sdk/src/protect/identity.ts -- SSO config: provider schema validation, role mapping, claws.json persistence
- [ ] claws-sdk/src/protect/types.ts -- BudgetReport, BudgetFleetReport, VaultConfig, IdentityConfig, ThresholdAlert
- [ ] claws-sdk/src/protect/index.ts -- barrel exports
- [ ] claws-sdk/tests/protect/budget.unit.test.ts -- usage calculation, threshold detection (80/95/100%), daily/monthly limits
- [ ] claws-sdk/tests/protect/budget-fleet.unit.test.ts -- aggregation, sorting, per-workspace breakdown
- [ ] claws-sdk/tests/protect/secrets.unit.test.ts -- key derivation, encrypt/decrypt roundtrip, wrong passphrase rejection
- [ ] claws-sdk/tests/protect/identity.unit.test.ts -- OIDC/SAML config validation, role-to-tier mapping
- [ ] claws-sdk/tests/protect/budget.integration.test.ts -- budget read from fixture audit chain
- [ ] claws-sdk/tests/protect/secrets.integration.test.ts -- full vault lifecycle (init, set, get, list)
- [ ] claws-sdk/tests/protect/identity.integration.test.ts -- identity config persistence and rule engine consumption

### CLI Wiring
- None in this plan (protect is SDK only -- CLI `claws budget`/`claws secrets`/`claws identity` come in claws-cli plan)

### Scenario Findings (added during wave)
*(empty -- populated during implementation)*

## Out of Scope

- Key generation and rotation commands (`claws keys generate/rotate/revoke`) -- separate key-lifecycle plan
- Key ceremony (M-of-N split-key) -- enterprise feature, Phase 3+
- Budget ENFORCEMENT at runtime (G-BOUND budget rule) -- that's claws-rules plan
- Fleet workspace discovery (`claws scan`) -- fleet operations plan
- KMS integration (AWS KMS, Azure Key Vault, HashiCorp) -- Phase 3 enterprise
- CLI formatting and table output for budget/secrets -- claws-cli plan
- Environment variable key storage tier -- documented but implemented via simple `process.env` read

## Notes

- Budget calculation REUSES agent-sdk `suite/budget.ts` for token counting and `suite/budget-tracker.ts` for threshold tracking
- Budget thresholds (80%/95%/100%) follow the same pattern as agent-sdk govern/GovernanceManager thresholds
- Secrets vault REUSES compiler-sdk `integrity/` for AES-256-GCM operations -- extends with Argon2id key derivation
- Argon2id is the preferred KDF via the `argon2` npm package (WASM-based, no native addon required); Node.js does NOT have native Argon2 support — native alternatives are scrypt/PBKDF2 from `node:crypto`. Fallback to scrypt (`crypto.scrypt`) for environments where the argon2 package cannot be installed
- Identity SSO bridge REUSES the pattern from `@openclaw/identity-bridge` (CL-06 Tier 1 package)
- `claws budget --fleet` depends on fleet workspace discovery -- uses the same scan logic as `claws scan`
- Depends on claws-governance-ir (ClawsConfig for budget/identity config schema) and claws-fleet-ops (fleet scan for budget aggregation, soft dependency -- fleet budget can be implemented after single-workspace budget)
