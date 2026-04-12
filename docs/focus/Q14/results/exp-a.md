# Experiment A: Developer Toolchain

**Unit**: coding-agents-and-ides (1,160), web-and-frontend (902), cli-utilities (179)
**Total skills**: 2,241

---

## Governance Angle

### Risk Classification Defaults

| Sub-category | Default Risk | Rationale |
|---|---|---|
| Coding agents & IDEs | **R4 EXECUTE** | Code generation, file system writes, dependency installation, process execution |
| Web & frontend | **R3 TRANSFORM** | Template generation, asset creation, config modification; lower than full exec |
| CLI utilities | **R2-R4 (mixed)** | Wide range: from pure-read utilities (R2) to cmd-executor (R4), financial tools (R5) |

### OBO Boundary Census

OBO actions are rare in this unit. Skills operate on the user's own codebase, not on behalf of others. Exceptions:

- `gmail-sender`, `gmail-inbox-zero-triage`, `gmail-label-manager` -- **OBO-EMAIL** (send/read email on user's behalf)
- `ez-google` -- **OBO-EMAIL + OBO-CALENDAR** (combined Google Workspace OBO)
- `shopify-admin` -- **OBO-COMMERCE** (manage store on user's behalf)
- `quickbooks-direct` -- **OBO-FINANCE** (accounting operations)

Estimated OBO-crossing skills: ~15 of 179 CLI utilities (8%), near 0% for coding-agents and web-frontend.

### Key Governance Risks

1. **Dependency injection**: Skills like `dependency-audit`, `depguard` audit deps but could be vectors themselves
2. **Code execution**: `cmd-executor` ("Runs any Windows command locally") = unrestricted R4
3. **Secret exposure**: `audit-code` scans for secrets but must not leak them; `totp` handles OTP codes
4. **Supply chain**: `agents-skill-security-audit`, `agents-skill-tdd-helper` are meta-skills that audit other skills
5. **Financial data**: Several trading/crypto skills (`a-share-short-decision`, `plusefin-analysis`, `stock-watcher`) buried in CLI utilities need R5 classification

### Replace / Complement / Enable Matrix

| Skill | Relationship | Notes |
|---|---|---|
| `agents-skill-security-audit` | **COMPLEMENT** | Audits skill supply chain; claws G-SUPPLY does this from policy |
| `agent-hardening` | **COMPLEMENT** | Tests input sanitization; claws generates sanitization rules |
| `audit-code` | **REPLACE** | claws `pinch` generates security review from policy IR |
| `dependency-audit` | **COMPLEMENT** | Dep health check; claws G-SUPPLY covers CVE scanning |
| `totp` | **ENABLE** | OTP verification for sensitive ops; uses @claws/security for auth flow |
| `messageguard` | **REPLACE** | Filters outgoing text for secrets; claws data-label policy does this |
| `error-guard` | **COMPLEMENT** | Prevents agent deadlocks; orthogonal to claws governance |
| `behavioral-invariant-monitor` | **ENABLE** | Verifies behavioral invariants; could use @bic/claws-test framework |
| `trust-velocity-calculator` | **ENABLE** | Trust decay calculation; feeds into claws trust model |

---

## Maker Angle

### @bic/claws-test for Skill Authors

The largest skill category (2,241) has **zero standardized testing**. Most skills are SKILL.md files with instructions. Opportunity:

- `claws build --skill` scaffolds a new TypeScript skill with test harness
- `@bic/claws-test` provides assertion primitives: `assertNoSecretLeak()`, `assertOBOBoundary()`, `assertRiskLevel()`
- Skills like `agents-skill-tdd-helper` and `clean-pytest` show demand for TDD in skill development

### @claws/schema for Config Validation

- Developer tools have complex configs (API keys, endpoints, credentials)
- `@claws/schema` validates skill.yaml against governance schema
- Auto-generates risk classification from declared capabilities (file_write, network, exec)

### Templates and Scaffolds

| Template | Description | Target sub-category |
|---|---|---|
| `skill-ide-extension` | IDE integration skill with sandboxed file access | Coding agents |
| `skill-web-generator` | Web asset generation with output validation | Web & frontend |
| `skill-cli-tool` | CLI wrapper with exec boundary enforcement | CLI utilities |
| `skill-financial-reader` | Read-only financial data with R5 annotations | CLI utilities (finance) |

### Key Maker Recommendations

1. **Exec sandboxing library**: `@claws/sandbox` wraps process execution with policy-checked boundaries
2. **Secret management**: `@claws/secrets` provides env-var access without hardcoding; replaces `credential-manager` pattern
3. **Skill testing CLI**: `claws test --skill ./my-skill/` runs governance + functional tests
4. **Risk auto-classifier**: Scans SKILL.md for capability keywords, suggests R-level

---

## Summary Statistics

- Total skills analyzed: 2,241
- OBO-crossing skills: ~15 (0.7%)
- R4+ skills (execute/transact): ~1,200 (54%) -- coding agents inherently execute
- R5 skills (financial): ~25 (1.1%) -- trading/crypto skills in CLI utilities
- Existing governance skills: 8 identifiable
- claws REPLACE: 2 | COMPLEMENT: 4 | ENABLE: 3
