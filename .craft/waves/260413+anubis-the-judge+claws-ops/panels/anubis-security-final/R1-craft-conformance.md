# R1 — craft:conformance — Spec Compliance Review

**Panel**: anubis-security-final
**Wave**: Anubis the Judge (claws-ops)
**Reviewer**: craft:conformance
**Scope**: All Anubis wave source files (claws-sdk/src, claws-cli/src, claws-test/src)
**Date**: 2026-04-13

---

## Lens

> "Spec compliance > developer convenience. If the spec says it, the code does it — no exceptions."

---

## Findings

### C-01 [M] Raise-only risk invariant (merger spec) silently allows LLM gap-fill at any risk level

**File**: `claws-sdk/src/compile/llm/merger.ts:212-226`

The merger spec states: "LLM can only INCREASE risk classification, never decrease below the regex baseline." The `raiseOnlyRisk()` function at line 113 enforces `max(a, b)`.

However, for LLM-only intents (line 212-226, `extractionMethod: 'llm'`), there is no regex baseline — the LLM assigns risk class unilaterally. The `riskClass` from the LLM is accepted without constraint at line 224. This means an LLM gap-fill can assign R1 to a tool that would have been R5 under regex analysis, because there is no regex baseline to raise against.

The raise-only invariant only applies to **overlapping** intents, not gap-fills. This is a semantic loophole: an attacker who prevents the regex engine from detecting a tool (e.g., by obfuscating the TOOLS.md entry) can then rely on the LLM to assign a lower risk class.

**Recommendation**: For LLM-only tool intents, apply a minimum risk floor (e.g., R2) or require that LLM-only tool classifications are flagged for human review before being accepted into the GovernanceIR.

---

### C-02 [M] PBKDF2 iterations hardcoded — no config-driven override for compliance requirements

**File**: `claws-sdk/src/keys/ceremony.ts:381`

The `deriveSingleDevKey` function uses 600,000 iterations, citing "OWASP 2023 minimum for PBKDF2-SHA256". This is correct for the 2023 recommendation, but:

1. OWASP may update the minimum (it has gone from 100k to 310k to 600k).
2. Some compliance frameworks (FIPS 140-3, SOC2) may require different values.
3. The value is hardcoded — there is no claws.json or fleet policy override.

The `DEFAULT_ROTATION_INTERVALS` in `schedule.ts` are configurable via `RotationSchedule`, but the PBKDF2 iteration count has no corresponding configuration surface.

**Recommendation**: Add an optional `pbkdf2Iterations` field to `ClawsConfigSchema` with a minimum floor of 600,000 and a default of 600,000. Document the OWASP reference in the schema.

---

### C-03 [M] Fleet broadcast does not enforce `fleet.requireVerifiedPublish` policy

**File**: `claws-sdk/src/fleet/broadcast.ts:295-452`

The `broadcastPolicy` function checks workspace classification (GOVERNED vs not) and trust compatibility, but does not validate the broadcast against `fleet.requireVerifiedPublish`. This means:

- A fleet admin can broadcast a policy that enables unverified publish to workspaces that previously had it disabled.
- The trust-compat check only looks at `trustTier`, not other policy fields.

The publish pipeline (`fleet-policy.ts:81-128`) correctly evaluates `requireVerifiedPublish`, but the broadcast pipeline can overwrite the workspace's policy file without checking whether the broadcast would loosen publish restrictions.

**Recommendation**: Extend `checkTrustCompat` (or add a parallel `checkPolicyCompat`) to verify that broadcast policy does not relax any security-sensitive policy fields (bypass, publish restrictions) below the workspace's current settings.

---

### C-04 [W] `failMode` defaults allow R3-R4 findings to pass in gated mode without gate definition

**File**: `claws-sdk/src/config/types.ts:72`

The default `failMode` is `{ R1: 'open', R2: 'open', R3: 'gated', R4: 'gated', R5: 'closed' }`. The `gated` mode implies a gate — some approval or review step — but there is no gate mechanism defined in the config schema or referenced in the codebase. Without a concrete gate implementation, `gated` behaves identically to `open` (findings are reported but not blocking).

**Recommendation**: Either document what "gated" means operationally (human approval? CI check? audit event?) and implement the gate, or change the default for R3-R4 to `closed` until the gate mechanism exists.

---

### C-05 [W] `update-policy` amendment allows setting arbitrary config fields

**File**: `claws-sdk/src/amend/apply.ts:113-119`

The `update-policy` amendment handler writes `config[amendment.target] = amendment.value[amendment.target]` to claws.json. While `validateAmendment` in `validate.ts:152-175` checks against a whitelist of valid fields (`trustTier`, `suppressions`, `failMode`, `auditLevel`, `policySet`), the `applyAmendment` function does not re-validate — it trusts that the amendment was validated before calling.

If `applyAmendment` is called without prior validation (a caller mistake), arbitrary fields can be injected into claws.json, including `fleet.allowBypass: true`.

**Recommendation**: Re-check the `validFields` whitelist inside `applyAmendment` as a defense-in-depth measure, or use a branded type to prove validation occurred.

---

### C-06 [W] Manifest state detection treats unsigned manifests as `absent`

**File**: `claws-sdk/src/publish/manifest-state.ts:162-170`

When a `skill.yaml` exists but has no `signature` field, `detectManifestState` returns `state: 'absent'`. This conflates "no manifest file" with "manifest exists but is unsigned." The distinction matters for compliance:

- `absent`: skill has never been prepared for publish
- `unsigned`: skill was prepared but not signed (possibly a draft)

By treating both as `absent`, the publish pipeline may re-sign a manifest that was intentionally left unsigned (e.g., a work-in-progress).

**Recommendation**: Add a fourth state `unsigned` for manifests that exist but lack a signature.

---

### C-07 [W] `readPolicyVersion` falls back to 'unknown' — compliance reports may lack version

**File**: `claws-sdk/src/compliance/audit-chain.ts:103-111`

When `claws.json` is missing or doesn't have a `compilerVersion` or `version` field, `readPolicyVersion` returns `'unknown'`. Every audit event will carry `policyVersion: 'unknown'`. Compliance auditors need to know which policy version was active when an event occurred — `'unknown'` is not acceptable in regulated environments.

**Recommendation**: In enterprise/fleet mode, require that `claws.json` has a `version` field and fail hard (with a `doctor` check) rather than silently degrading to `'unknown'`.

---

### C-08 [W] Verifier fuzzy match accepts case-insensitive substring — overly permissive

**File**: `claws-sdk/src/compile/llm/verifier.ts:93-98`

The verifier's fuzzy match checks `line.toLowerCase().includes(trimmedSource.toLowerCase())`. This means if the LLM reports `sourceText: "never"` and the actual line is `"This should NEVER happen"`, it's a fuzzy match with halved confidence.

This is overly permissive: `"never"` would match any line containing that substring, including `"whenever"`, `"forever"`, `"nevermore"`. A short sourceText can fuzzy-match many irrelevant lines.

**Recommendation**: Require a minimum sourceText length (e.g., 8 characters) for fuzzy matching, or require word-boundary matching (`\bnever\b`).

---

### C-09 [W] `computeGovernanceHash` includes compiled IR — hash changes on recompile without source change

**File**: `claws-sdk/src/fleet/drift.ts:53`

The governance hash includes `.claws/compiled/governance-ir.json`. If the compiler version changes (producing different IR formatting or field ordering) but the source files don't change, the hash will change, triggering a false drift alert.

**Recommendation**: Either normalize the IR JSON before hashing (sorted keys, no whitespace) or exclude the compiled IR from the drift hash and rely only on source files.

---

### C-10 [N] `validateCiKeyFormat` accepts uppercase hex — no normalization

**File**: `claws-sdk/src/publish/key-resolution.ts:56-77`

The `HEX_PATTERN` at line 56 is `/^[0-9a-fA-F]+$/`, accepting mixed-case hex. The key material is then used as-is without lowercasing. If the CI env var contains `AABB` and the registry expects `aabb`, HMAC signatures will differ. Node.js `Buffer.from(hex, 'hex')` is case-insensitive, so the actual key bytes will be the same — but log entries and cache keys may differ.

**Recommendation**: Normalize CI key material to lowercase after validation.

---

### C-11 [N] Badge and version in publish pipeline use timestamp-based versioning

**File**: `claws-cli/src/commands/publish.ts:131`

The version is generated as `1.0.0-${Date.now()}`. This is not SemVer-compliant (the prerelease segment contains only digits, which is valid but unconventional) and does not correlate to any source change. Two publishes of identical content will get different versions.

**Recommendation**: Consider content-based versioning (hash of manifest content) or require explicit version in the manifest.

---

### C-12 [N] Suppression list in config is just `string[]` with no validation

**File**: `claws-sdk/src/config/types.ts:61`

The `suppressions` field is `z.array(z.string())` with no format validation. Suppression strings presumably reference rule IDs (e.g., `CLAWS-LLM-001`), but the schema accepts any string including empty strings and strings with spaces. Invalid suppressions will silently have no effect.

**Recommendation**: Add a regex pattern validation for suppression strings (e.g., `/^[A-Z0-9-]+$/`).

---

## Summary

| Severity     | Count |
| ------------ | ----- |
| M (Must fix) | 3     |
| W (Warning)  | 6     |
| N (Note)     | 3     |

**Key compliance gaps**: The raise-only invariant has a semantic loophole for LLM gap-fills (C-01), PBKDF2 iterations are not configurable for varying compliance requirements (C-02), and broadcast can silently loosen publish restrictions (C-03). The gated fail-mode has no gate implementation (C-04), and amendments lack defense-in-depth validation (C-05).
