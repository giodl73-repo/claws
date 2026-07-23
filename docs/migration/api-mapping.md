# API Mapping: Old → New

<!-- atom:claws-api-mapping -->

Symbol-by-symbol migration table for the `@bic/claws-sdk` / `@bic/claws-sdk` split. Every public symbol exported from the pre-split monolith is listed with its old import path and its new path(s).

- **Free tier** symbols live in `@bic/claws-sdk` and are re-exported from `@bic/claws-sdk` (both paths work for enterprise consumers).
- **Enterprise only** symbols live in `@bic/claws-sdk` alone — they are not reachable from `@bic/claws-sdk`.

Every symbol listed here is a semver commitment. The `api-baseline.json` diff check in `@bic/claws-sdk` blocks publishes that break this contract without a matching version bump.

## Main entry — `@bic/claws-sdk`

### Compile host

| Symbol              | Kind     | Old path         | New free-tier path | New enterprise path | Tier |
| ------------------- | -------- | ---------------- | ------------------ | ------------------- | ---- |
| `compile`           | function | `@bic/claws-sdk` | `@bic/claws-sdk`   | `@bic/claws-sdk`    | free |
| `CompileOptions`    | type     | `@bic/claws-sdk` | `@bic/claws-sdk`   | `@bic/claws-sdk`    | free |
| `CompileResult`     | type     | `@bic/claws-sdk` | `@bic/claws-sdk`   | `@bic/claws-sdk`    | free |
| `CompileDiagnostic` | type     | `@bic/claws-sdk` | `@bic/claws-sdk`   | `@bic/claws-sdk`    | free |
| `CompileStage`      | type     | `@bic/claws-sdk` | `@bic/claws-sdk`   | `@bic/claws-sdk`    | free |

### Governance IR (serialization + hashing)

| Symbol        | Kind     | Old path         | New free-tier path | New enterprise path | Tier |
| ------------- | -------- | ---------------- | ------------------ | ------------------- | ---- |
| `serialize`   | function | `@bic/claws-sdk` | `@bic/claws-sdk`   | `@bic/claws-sdk`    | free |
| `deserialize` | function | `@bic/claws-sdk` | `@bic/claws-sdk`   | `@bic/claws-sdk`    | free |
| `hashIR`      | function | `@bic/claws-sdk` | `@bic/claws-sdk`   | `@bic/claws-sdk`    | free |
| `hashRaw`     | function | `@bic/claws-sdk` | `@bic/claws-sdk`   | `@bic/claws-sdk`    | free |

### R5 fail-closed enforcement

| Symbol              | Kind     | Old path         | New free-tier path | New enterprise path | Tier |
| ------------------- | -------- | ---------------- | ------------------ | ------------------- | ---- |
| `OC_POLICY_E001`    | const    | `@bic/claws-sdk` | `@bic/claws-sdk`   | `@bic/claws-sdk`    | free |
| `validateFailModes` | function | `@bic/claws-sdk` | `@bic/claws-sdk`   | `@bic/claws-sdk`    | free |
| `FailMode`          | type     | `@bic/claws-sdk` | `@bic/claws-sdk`   | `@bic/claws-sdk`    | free |
| `RuleLevel`         | type     | `@bic/claws-sdk` | `@bic/claws-sdk`   | `@bic/claws-sdk`    | free |

### Audit chain

| Symbol             | Kind     | Old path         | New free-tier path | New enterprise path | Tier |
| ------------------ | -------- | ---------------- | ------------------ | ------------------- | ---- |
| `signAuditEntry`   | function | `@bic/claws-sdk` | `@bic/claws-sdk`   | `@bic/claws-sdk`    | free |
| `verifyAuditEntry` | function | `@bic/claws-sdk` | `@bic/claws-sdk`   | `@bic/claws-sdk`    | free |
| `appendAuditEvent` | function | `@bic/claws-sdk` | `@bic/claws-sdk`   | `@bic/claws-sdk`    | free |
| `readAuditChain`   | function | `@bic/claws-sdk` | `@bic/claws-sdk`   | `@bic/claws-sdk`    | free |
| `resolveActor`     | function | `@bic/claws-sdk` | `@bic/claws-sdk`   | `@bic/claws-sdk`    | free |
| `AuditChainEntry`  | type     | `@bic/claws-sdk` | `@bic/claws-sdk`   | `@bic/claws-sdk`    | free |
| `AuditEventInput`  | type     | `@bic/claws-sdk` | `@bic/claws-sdk`   | `@bic/claws-sdk`    | free |

### Governance IR (types)

| Symbol                    | Kind | Old path         | New free-tier path | New enterprise path | Tier |
| ------------------------- | ---- | ---------------- | ------------------ | ------------------- | ---- |
| `GovernanceIR`            | type | `@bic/claws-sdk` | `@bic/claws-sdk`   | `@bic/claws-sdk`    | free |
| `DenyIntent`              | type | `@bic/claws-sdk` | `@bic/claws-sdk`   | `@bic/claws-sdk`    | free |
| `ElicitIntent`            | type | `@bic/claws-sdk` | `@bic/claws-sdk`   | `@bic/claws-sdk`    | free |
| `RequireIntent`           | type | `@bic/claws-sdk` | `@bic/claws-sdk`   | `@bic/claws-sdk`    | free |
| `LimitIntent`             | type | `@bic/claws-sdk` | `@bic/claws-sdk`   | `@bic/claws-sdk`    | free |
| `LabelIntent`             | type | `@bic/claws-sdk` | `@bic/claws-sdk`   | `@bic/claws-sdk`    | free |
| `MechanicalIntent`        | type | `@bic/claws-sdk` | `@bic/claws-sdk`   | `@bic/claws-sdk`    | free |
| `IntentBase`              | type | `@bic/claws-sdk` | `@bic/claws-sdk`   | `@bic/claws-sdk`    | free |
| `CapabilityManifest`      | type | `@bic/claws-sdk` | `@bic/claws-sdk`   | `@bic/claws-sdk`    | free |
| `ToolCapability`          | type | `@bic/claws-sdk` | `@bic/claws-sdk`   | `@bic/claws-sdk`    | free |
| `ToolRiskLevel`           | type | `@bic/claws-sdk` | `@bic/claws-sdk`   | `@bic/claws-sdk`    | free |
| `ToolClassification`      | type | `@bic/claws-sdk` | `@bic/claws-sdk`   | `@bic/claws-sdk`    | free |
| `SkillCapability`         | type | `@bic/claws-sdk` | `@bic/claws-sdk`   | `@bic/claws-sdk`    | free |
| `AgentCapability`         | type | `@bic/claws-sdk` | `@bic/claws-sdk`   | `@bic/claws-sdk`    | free |
| `DelegationMapEntry`      | type | `@bic/claws-sdk` | `@bic/claws-sdk`   | `@bic/claws-sdk`    | free |
| `DelegationEntry`         | type | `@bic/claws-sdk` | `@bic/claws-sdk`   | `@bic/claws-sdk`    | free |
| `WorkflowCapability`      | type | `@bic/claws-sdk` | `@bic/claws-sdk`   | `@bic/claws-sdk`    | free |
| `GovAnalysis`             | type | `@bic/claws-sdk` | `@bic/claws-sdk`   | `@bic/claws-sdk`    | free |
| `GovViolation`            | type | `@bic/claws-sdk` | `@bic/claws-sdk`   | `@bic/claws-sdk`    | free |
| `GovWarning`              | type | `@bic/claws-sdk` | `@bic/claws-sdk`   | `@bic/claws-sdk`    | free |
| `EnforcementPlan`         | type | `@bic/claws-sdk` | `@bic/claws-sdk`   | `@bic/claws-sdk`    | free |
| `FixSuggestion`           | type | `@bic/claws-sdk` | `@bic/claws-sdk`   | `@bic/claws-sdk`    | free |
| `ToolFuzzyMatch`          | type | `@bic/claws-sdk` | `@bic/claws-sdk`   | `@bic/claws-sdk`    | free |
| `ChannelRedactionConfig`  | type | `@bic/claws-sdk` | `@bic/claws-sdk`   | `@bic/claws-sdk`    | free |
| `RuleSuppressionMarker`   | type | `@bic/claws-sdk` | `@bic/claws-sdk`   | `@bic/claws-sdk`    | free |
| `ReclassificationEntry`   | type | `@bic/claws-sdk` | `@bic/claws-sdk`   | `@bic/claws-sdk`    | free |
| `EffectiveR5Count`        | type | `@bic/claws-sdk` | `@bic/claws-sdk`   | `@bic/claws-sdk`    | free |
| `ConflictReport`          | type | `@bic/claws-sdk` | `@bic/claws-sdk`   | `@bic/claws-sdk`    | free |
| `OboConflict`             | type | `@bic/claws-sdk` | `@bic/claws-sdk`   | `@bic/claws-sdk`    | free |
| `MultiConstraintConflict` | type | `@bic/claws-sdk` | `@bic/claws-sdk`   | `@bic/claws-sdk`    | free |
| `ConflictSeverity`        | type | `@bic/claws-sdk` | `@bic/claws-sdk`   | `@bic/claws-sdk`    | free |
| `CompilerMeta`            | type | `@bic/claws-sdk` | `@bic/claws-sdk`   | `@bic/claws-sdk`    | free |
| `AuditEvent`              | type | `@bic/claws-sdk` | `@bic/claws-sdk`   | `@bic/claws-sdk`    | free |
| `AuditOutcome`            | type | `@bic/claws-sdk` | `@bic/claws-sdk`   | `@bic/claws-sdk`    | free |
| `AuditAlgorithm`          | type | `@bic/claws-sdk` | `@bic/claws-sdk`   | `@bic/claws-sdk`    | free |

### Platform types

| Symbol               | Kind | Old path         | New free-tier path | New enterprise path | Tier |
| -------------------- | ---- | ---------------- | ------------------ | ------------------- | ---- |
| `Platform`           | type | `@bic/claws-sdk` | `@bic/claws-sdk`   | `@bic/claws-sdk`    | free |
| `EnforcementModel`   | type | `@bic/claws-sdk` | `@bic/claws-sdk`   | `@bic/claws-sdk`    | free |
| `PlatformCapability` | type | `@bic/claws-sdk` | `@bic/claws-sdk`   | `@bic/claws-sdk`    | free |

## Governance subpath — `/governance`

| Symbol                    | Kind     | Old path                    | New free-tier path          | New enterprise path         | Tier |
| ------------------------- | -------- | --------------------------- | --------------------------- | --------------------------- | ---- |
| `createRegistry`          | function | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | free |
| `createDefaultRegistry`   | function | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | free |
| `createGClassRules`       | function | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | free |
| `createGPermRules`        | function | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | free |
| `createGA2ARules`         | function | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | free |
| `createGDataRules`        | function | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | free |
| `createGElicitRules`      | function | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | free |
| `createGInputRules`       | function | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | free |
| `createGContextRules`     | function | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | free |
| `createGOutputRules`      | function | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | free |
| `createGBoundRules`       | function | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | free |
| `createGSupplyRules`      | function | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | free |
| `classifyTool`            | function | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | free |
| `classifyManifest`        | function | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | free |
| `normalizeCapability`     | function | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | free |
| `DEFAULT_FAIL_MODES`      | const    | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | free |
| `getFailMode`             | function | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | free |
| `resolveApprovalGate`     | function | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | free |
| `fromFleetOverride`       | function | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | free |
| `emitRiskChangeEvents`    | function | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | free |
| `GovernanceRule`          | type     | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | free |
| `RuleRegistry`            | type     | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | free |
| `RuleResult`              | type     | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | free |
| `Violation`               | type     | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | free |
| `Severity`                | type     | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | free |
| `FailMode`                | type     | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | free |
| `FailModeConfig`          | type     | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | free |
| `AuthorizationDecision`   | type     | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | free |
| `AllowDecision`           | type     | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | free |
| `DenyDecision`            | type     | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | free |
| `ReviewDecision`          | type     | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | free |
| `ModifyDecision`          | type     | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | free |
| `RiskLevel`               | type     | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | free |
| `FleetApprovalOverride`   | type     | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | free |
| `FleetOverride`           | type     | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | free |
| `FleetOverrideAuditEntry` | type     | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | free |
| `ApprovalGateResult`      | type     | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | free |
| `RiskChangeEvent`         | type     | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | free |
| `RiskChangeAuditResult`   | type     | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | `@bic/claws-sdk/governance` | free |

## Emit subpath — `/emit`

| Symbol                       | Kind     | Old path              | New free-tier path    | New enterprise path   | Tier |
| ---------------------------- | -------- | --------------------- | --------------------- | --------------------- | ---- |
| `OCEmitter`                  | class    | `@bic/claws-sdk/emit` | `@bic/claws-sdk/emit` | `@bic/claws-sdk/emit` | free |
| `ClaudeCodeEmitter`          | class    | `@bic/claws-sdk/emit` | `@bic/claws-sdk/emit` | `@bic/claws-sdk/emit` | free |
| `BaseEmitter`                | class    | `@bic/claws-sdk/emit` | `@bic/claws-sdk/emit` | `@bic/claws-sdk/emit` | free |
| `EmitterRegistry`            | class    | `@bic/claws-sdk/emit` | `@bic/claws-sdk/emit` | `@bic/claws-sdk/emit` | free |
| `UnsupportedEmitTargetError` | class    | `@bic/claws-sdk/emit` | `@bic/claws-sdk/emit` | `@bic/claws-sdk/emit` | free |
| `createDefaultRegistry`      | function | `@bic/claws-sdk/emit` | `@bic/claws-sdk/emit` | `@bic/claws-sdk/emit` | free |
| `FREE_TIER_TARGETS`          | const    | `@bic/claws-sdk/emit` | `@bic/claws-sdk/emit` | `@bic/claws-sdk/emit` | free |
| `verifyNoCraftworksRefs`     | function | `@bic/claws-sdk/emit` | `@bic/claws-sdk/emit` | `@bic/claws-sdk/emit` | free |
| `formatClaudeMd`             | function | `@bic/claws-sdk/emit` | `@bic/claws-sdk/emit` | `@bic/claws-sdk/emit` | free |
| `formatSettingsJson`         | function | `@bic/claws-sdk/emit` | `@bic/claws-sdk/emit` | `@bic/claws-sdk/emit` | free |
| `formatCommandStub`          | function | `@bic/claws-sdk/emit` | `@bic/claws-sdk/emit` | `@bic/claws-sdk/emit` | free |
| `formatSkillStubs`           | function | `@bic/claws-sdk/emit` | `@bic/claws-sdk/emit` | `@bic/claws-sdk/emit` | free |
| `slugifySkillName`           | function | `@bic/claws-sdk/emit` | `@bic/claws-sdk/emit` | `@bic/claws-sdk/emit` | free |
| `trustToPermission`          | function | `@bic/claws-sdk/emit` | `@bic/claws-sdk/emit` | `@bic/claws-sdk/emit` | free |
| `EmitTarget`                 | type     | `@bic/claws-sdk/emit` | `@bic/claws-sdk/emit` | `@bic/claws-sdk/emit` | free |
| `EmitResult`                 | type     | `@bic/claws-sdk/emit` | `@bic/claws-sdk/emit` | `@bic/claws-sdk/emit` | free |
| `EmittedFile`                | type     | `@bic/claws-sdk/emit` | `@bic/claws-sdk/emit` | `@bic/claws-sdk/emit` | free |
| `EmitDiagnostic`             | type     | `@bic/claws-sdk/emit` | `@bic/claws-sdk/emit` | `@bic/claws-sdk/emit` | free |
| `EmitDiagnosticSeverity`     | type     | `@bic/claws-sdk/emit` | `@bic/claws-sdk/emit` | `@bic/claws-sdk/emit` | free |
| `EmitterOptions`             | type     | `@bic/claws-sdk/emit` | `@bic/claws-sdk/emit` | `@bic/claws-sdk/emit` | free |
| `CCPermission`               | type     | `@bic/claws-sdk/emit` | `@bic/claws-sdk/emit` | `@bic/claws-sdk/emit` | free |
| `CCSettings`                 | type     | `@bic/claws-sdk/emit` | `@bic/claws-sdk/emit` | `@bic/claws-sdk/emit` | free |

## Audit subpath — `/audit`

| Symbol                      | Kind     | Old path               | New free-tier path     | New enterprise path    | Tier |
| --------------------------- | -------- | ---------------------- | ---------------------- | ---------------------- | ---- |
| `AuditChain`                | class    | `@bic/claws-sdk/audit` | `@bic/claws-sdk/audit` | `@bic/claws-sdk/audit` | free |
| `AuditChainCorruptionError` | class    | `@bic/claws-sdk/audit` | `@bic/claws-sdk/audit` | `@bic/claws-sdk/audit` | free |
| `AuditEntryValidationError` | class    | `@bic/claws-sdk/audit` | `@bic/claws-sdk/audit` | `@bic/claws-sdk/audit` | free |
| `AuditWal`                  | class    | `@bic/claws-sdk/audit` | `@bic/claws-sdk/audit` | `@bic/claws-sdk/audit` | free |
| `saveChain`                 | function | `@bic/claws-sdk/audit` | `@bic/claws-sdk/audit` | `@bic/claws-sdk/audit` | free |
| `loadChain`                 | function | `@bic/claws-sdk/audit` | `@bic/claws-sdk/audit` | `@bic/claws-sdk/audit` | free |
| `appendEntry`               | function | `@bic/claws-sdk/audit` | `@bic/claws-sdk/audit` | `@bic/claws-sdk/audit` | free |
| `updateChainMeta`           | function | `@bic/claws-sdk/audit` | `@bic/claws-sdk/audit` | `@bic/claws-sdk/audit` | free |
| `chainFilePath`             | function | `@bic/claws-sdk/audit` | `@bic/claws-sdk/audit` | `@bic/claws-sdk/audit` | free |
| `walFilePath`               | function | `@bic/claws-sdk/audit` | `@bic/claws-sdk/audit` | `@bic/claws-sdk/audit` | free |
| `computeEntryHash`          | function | `@bic/claws-sdk/audit` | `@bic/claws-sdk/audit` | `@bic/claws-sdk/audit` | free |
| `verifyChain`               | function | `@bic/claws-sdk/audit` | `@bic/claws-sdk/audit` | `@bic/claws-sdk/audit` | free |
| `validateAuditEntry`        | function | `@bic/claws-sdk/audit` | `@bic/claws-sdk/audit` | `@bic/claws-sdk/audit` | free |
| `validateChainFileHeader`   | function | `@bic/claws-sdk/audit` | `@bic/claws-sdk/audit` | `@bic/claws-sdk/audit` | free |
| `AuditEntry`                | type     | `@bic/claws-sdk/audit` | `@bic/claws-sdk/audit` | `@bic/claws-sdk/audit` | free |
| `AuditEntryInput`           | type     | `@bic/claws-sdk/audit` | `@bic/claws-sdk/audit` | `@bic/claws-sdk/audit` | free |
| `AuditChainMeta`            | type     | `@bic/claws-sdk/audit` | `@bic/claws-sdk/audit` | `@bic/claws-sdk/audit` | free |
| `AuditVerifyResult`         | type     | `@bic/claws-sdk/audit` | `@bic/claws-sdk/audit` | `@bic/claws-sdk/audit` | free |
| `ChainFileHeader`           | type     | `@bic/claws-sdk/audit` | `@bic/claws-sdk/audit` | `@bic/claws-sdk/audit` | free |

## Test subpath — `/test`

| Symbol                   | Kind     | Old path              | New free-tier path    | New enterprise path   | Tier |
| ------------------------ | -------- | --------------------- | --------------------- | --------------------- | ---- |
| `validate`               | function | `@bic/claws-sdk/test` | `@bic/claws-sdk/test` | `@bic/claws-sdk/test` | free |
| `ALL_CHECKS`             | const    | `@bic/claws-sdk/test` | `@bic/claws-sdk/test` | `@bic/claws-sdk/test` | free |
| `checkAuditChain`        | function | `@bic/claws-sdk/test` | `@bic/claws-sdk/test` | `@bic/claws-sdk/test` | free |
| `checkCircularDeps`      | function | `@bic/claws-sdk/test` | `@bic/claws-sdk/test` | `@bic/claws-sdk/test` | free |
| `checkEmitTarget`        | function | `@bic/claws-sdk/test` | `@bic/claws-sdk/test` | `@bic/claws-sdk/test` | free |
| `checkHandlerTypes`      | function | `@bic/claws-sdk/test` | `@bic/claws-sdk/test` | `@bic/claws-sdk/test` | free |
| `checkOutputHash`        | function | `@bic/claws-sdk/test` | `@bic/claws-sdk/test` | `@bic/claws-sdk/test` | free |
| `checkPlatformAlignment` | function | `@bic/claws-sdk/test` | `@bic/claws-sdk/test` | `@bic/claws-sdk/test` | free |
| `checkR5FailClosed`      | function | `@bic/claws-sdk/test` | `@bic/claws-sdk/test` | `@bic/claws-sdk/test` | free |
| `checkRequiredFields`    | function | `@bic/claws-sdk/test` | `@bic/claws-sdk/test` | `@bic/claws-sdk/test` | free |
| `checkRuleCoverage`      | function | `@bic/claws-sdk/test` | `@bic/claws-sdk/test` | `@bic/claws-sdk/test` | free |
| `checkSchemaConformance` | function | `@bic/claws-sdk/test` | `@bic/claws-sdk/test` | `@bic/claws-sdk/test` | free |
| `checkSidecarVersion`    | function | `@bic/claws-sdk/test` | `@bic/claws-sdk/test` | `@bic/claws-sdk/test` | free |
| `checkTrustLevels`       | function | `@bic/claws-sdk/test` | `@bic/claws-sdk/test` | `@bic/claws-sdk/test` | free |
| `formatReportJson`       | function | `@bic/claws-sdk/test` | `@bic/claws-sdk/test` | `@bic/claws-sdk/test` | free |
| `formatReportText`       | function | `@bic/claws-sdk/test` | `@bic/claws-sdk/test` | `@bic/claws-sdk/test` | free |
| `CheckId`                | type     | `@bic/claws-sdk/test` | `@bic/claws-sdk/test` | `@bic/claws-sdk/test` | free |
| `CheckResult`            | type     | `@bic/claws-sdk/test` | `@bic/claws-sdk/test` | `@bic/claws-sdk/test` | free |
| `CheckSeverity`          | type     | `@bic/claws-sdk/test` | `@bic/claws-sdk/test` | `@bic/claws-sdk/test` | free |
| `EmitResultShape`        | type     | `@bic/claws-sdk/test` | `@bic/claws-sdk/test` | `@bic/claws-sdk/test` | free |
| `ValidationCheck`        | type     | `@bic/claws-sdk/test` | `@bic/claws-sdk/test` | `@bic/claws-sdk/test` | free |
| `ValidationReport`       | type     | `@bic/claws-sdk/test` | `@bic/claws-sdk/test` | `@bic/claws-sdk/test` | free |

## Cache subpath — `/cache`

| Symbol                   | Kind     | Old path               | New free-tier path     | New enterprise path    | Tier |
| ------------------------ | -------- | ---------------------- | ---------------------- | ---------------------- | ---- |
| `CompilationCache`       | class    | `@bic/claws-sdk/cache` | `@bic/claws-sdk/cache` | `@bic/claws-sdk/cache` | free |
| `contentHash`            | function | `@bic/claws-sdk/cache` | `@bic/claws-sdk/cache` | `@bic/claws-sdk/cache` | free |
| `resolveCacheDir`        | function | `@bic/claws-sdk/cache` | `@bic/claws-sdk/cache` | `@bic/claws-sdk/cache` | free |
| `CACHE_MANIFEST_VERSION` | const    | `@bic/claws-sdk/cache` | `@bic/claws-sdk/cache` | `@bic/claws-sdk/cache` | free |
| `CacheEntry`             | type     | `@bic/claws-sdk/cache` | `@bic/claws-sdk/cache` | `@bic/claws-sdk/cache` | free |
| `CacheEntryInfo`         | type     | `@bic/claws-sdk/cache` | `@bic/claws-sdk/cache` | `@bic/claws-sdk/cache` | free |
| `CacheManifest`          | type     | `@bic/claws-sdk/cache` | `@bic/claws-sdk/cache` | `@bic/claws-sdk/cache` | free |
| `CacheManifestEntry`     | type     | `@bic/claws-sdk/cache` | `@bic/claws-sdk/cache` | `@bic/claws-sdk/cache` | free |
| `CacheOptions`           | type     | `@bic/claws-sdk/cache` | `@bic/claws-sdk/cache` | `@bic/claws-sdk/cache` | free |
| `CacheStats`             | type     | `@bic/claws-sdk/cache` | `@bic/claws-sdk/cache` | `@bic/claws-sdk/cache` | free |
| `PruneResult`            | type     | `@bic/claws-sdk/cache` | `@bic/claws-sdk/cache` | `@bic/claws-sdk/cache` | free |
| `StageName`              | type     | `@bic/claws-sdk/cache` | `@bic/claws-sdk/cache` | `@bic/claws-sdk/cache` | free |

## Enterprise-only modules (no free-tier path)

These symbols live in `@bic/claws-sdk` alone. They are not re-exported from `@bic/claws-sdk` and are not part of the free-tier API contract.

### Fleet — `@bic/claws-sdk/fleet`

| Symbol             | Kind  | Tier       |
| ------------------ | ----- | ---------- |
| `FleetScanner`     | class | enterprise |
| `FleetBroadcaster` | class | enterprise |
| `DriftDetector`    | class | enterprise |

### Compliance — `@bic/claws-sdk/compliance`

| Symbol                     | Kind  | Tier       |
| -------------------------- | ----- | ---------- |
| `SOC2EvidenceBuilder`      | class | enterprise |
| `HIPAAEvidenceBuilder`     | class | enterprise |
| `EUAIActAssessmentBuilder` | class | enterprise |
| `SOC2Evidence`             | type  | enterprise |
| `HIPAAEvidence`            | type  | enterprise |
| `EUAIActAssessment`        | type  | enterprise |

### SIEM — `@bic/claws-sdk/siem`

| Symbol          | Kind  | Tier       |
| --------------- | ----- | ---------- |
| `CEFEmitter`    | class | enterprise |
| `SyslogEmitter` | class | enterprise |
| `NDJSONEmitter` | class | enterprise |

### PRESS / RELAX / identity / budget — `@bic/claws-sdk/{press,relax,identity,budget}`

| Symbol                  | Kind  | Subpath     | Tier       |
| ----------------------- | ----- | ----------- | ---------- |
| `PRESSCompressor`       | class | `/press`    | enterprise |
| `RELAXEvaluator`        | class | `/relax`    | enterprise |
| `IdentityBridge`        | class | `/identity` | enterprise |
| `RBACResolver`          | class | `/identity` | enterprise |
| `BudgetTracker`         | class | `/budget`   | enterprise |
| `FleetBudgetAggregator` | class | `/budget`   | enterprise |

### LSP / snapshot / context / serve — `@bic/claws-sdk/{lsp,snapshot,context,serve}`

| Symbol                | Kind  | Subpath     | Tier       |
| --------------------- | ----- | ----------- | ---------- |
| `ClawsLanguageServer` | class | `/lsp`      | enterprise |
| `SnapshotManager`     | class | `/snapshot` | enterprise |
| `ContextDAG`          | class | `/context`  | enterprise |
| `ClawsServer`         | class | `/serve`    | enterprise |

## Source of truth

The free-tier symbol inventory in this document is enforced by the publish-time contract:

- `packages/@bic/claws-sdk/src/index.ts` and the five subpath barrels are the machine-readable source of truth
- `packages/@bic/claws-sdk/api-baseline.json` is a snapshot of the curated surface
- `packages/@bic/claws-sdk/scripts/check-api-diff.ts` blocks any publish where the baseline drifts without a matching version bump
- `packages/@bic/claws-sdk/tests/exports.unit.test.ts` fails the test suite if an undocumented symbol leaks through the main entry

If this mapping document falls out of sync with `src/index.ts`, the unit test `tests/migration-docs.unit.test.ts` fails.
