# R1 — craft:architect — Architecture & Layer Boundary Review

**Panel**: anubis-security-final
**Wave**: Anubis the Judge (claws-ops)
**Reviewer**: craft:architect
**Scope**: All Anubis wave source files (claws-sdk/src, claws-cli/src, claws-test/src)
**Date**: 2026-04-13

---

## Lens

> "Structural clarity > rapid delivery. SDK owns all business logic. CLI is a thin UI adapter."

---

## Findings

### A-01 [M] `claws-cli/src/commands/publish.ts` contains registry client construction logic

**File**: `claws-cli/src/commands/publish.ts:46-67`

The `createRegistryClient()` function in the CLI layer constructs a `RegistryClient` implementation with HTTP fetch logic, including URL handling, request body serialization, and response status extraction. This is business logic — it decides how artifacts are submitted to the registry.

The SDK defines `RegistryClient` as an interface in `publish/atomicity.ts:52-58`, but the CLI creates the concrete implementation. This violates SDK-owns-logic: the CLI should call an SDK factory function.

**Recommendation**: Move `createRegistryClient` to `claws-sdk/src/publish/registry-client.ts`. The CLI should import and use it, passing only the configuration (URL, dry-run flag).

---

### A-02 [M] Two bypass modules with overlapping responsibility

**Files**: `claws-sdk/src/config/bypass.ts` and `claws-sdk/src/init/bypass.ts`

The SDK has two bypass evaluation modules:

- `config/bypass.ts` — pure evaluator, returns state + audit event
- `init/bypass.ts` — async evaluator, writes audit chain directly

These serve the same purpose with different interfaces. The `config/bypass.ts` types (`FleetPolicy`, `BypassState`, `BypassAuditEvent`) are duplicated in `config/types.ts` as separate interfaces. The CLI adapter (`claws-cli/src/config/bypass.ts`) imports from `config/bypass.ts` but the `init/bypass.ts` is used by the init orchestrator.

This creates a module boundary violation: two SDK modules own the same domain concept with divergent implementations.

**Recommendation**: Designate `config/bypass.ts` as the canonical pure evaluator. Refactor `init/bypass.ts` to call `evaluateBypass()` and handle only the persistence layer. Remove the duplicate types.

---

### A-03 [W] `claws-sdk/src/compile/llm/anthropic-provider.ts` caches SDK import globally

**File**: `claws-sdk/src/compile/llm/anthropic-provider.ts:183-191`

The `cachedSdk` variable at module level caches the `@anthropic-ai/sdk` import forever. This prevents tree-shaking and means the SDK module stays in memory even when LLM features are not used. The `// @ts-expect-error` suppression at line 189 also hides the optional dependency from type checking.

**Recommendation**: Use a lazy singleton pattern within the `AnthropicLLMProvider` class rather than module-level state. Consider a proper optional-peer-dependency declaration in `package.json` with a typed import wrapper.

---

### A-04 [W] Fleet module has 18 files — exceeds single-module cohesion

**Files**: `claws-sdk/src/fleet/*.ts` (18 files)

The fleet module contains: scan, classify, broadcast, broadcast-audit, kill, kill-fleet, kill-audit, double-kill, drift, drift-types, severity, exception, trust-compat, compliance-matrix, report, report-format, runner, baseline, types, index. This is effectively 5 sub-domains packed into one:

1. **Discovery**: scan, classify
2. **Policy distribution**: broadcast, broadcast-audit, trust-compat
3. **Kill switch**: kill, kill-fleet, kill-audit, double-kill
4. **Compliance**: drift, drift-types, severity, exception, baseline, compliance-matrix, report, report-format
5. **Infrastructure**: runner, types

**Recommendation**: Split into `fleet/scan/`, `fleet/broadcast/`, `fleet/kill/`, `fleet/compliance/`, keeping `fleet/runner.ts` and `fleet/types.ts` as shared infrastructure. This improves navigability and makes dependency direction clearer.

---

### A-05 [W] `claws-test/src/security/rules/output.ts` depends on TypeScript compiler API

**File**: `claws-test/src/security/rules/output.ts:1-229`

The security scanning rules import `typescript` (the full TS compiler) and walk AST nodes. This is a heavyweight dependency for a test utility package. The rules themselves (`no-unredacted-pii`, `no-unvalidated-urls`, `no-format-injection`, `no-chain-bypass`) are static analysis rules that belong in a linting/scanning tool, not in the test harness.

**Recommendation**: Consider whether these rules should live in a separate `claws-scan` package or be integrated with the existing `claws check` command in the SDK. The test harness should provide matchers and fixtures, not static analysis tooling.

---

### A-06 [W] Snapshot module spans 9 files with mixed abstraction levels

**Files**: `claws-sdk/src/snapshot/*.ts`

The snapshot module contains: manifest types, integrity verification, diff computation, diff rendering, fleet registry integration, promotion, provenance, restore, save, storage, index. The `diff-renderer.ts` (UI concern) sits alongside `integrity.ts` (crypto concern) and `fleet-registry.ts` (fleet integration).

**Recommendation**: Separate pure integrity operations (manifest, integrity, provenance) from stateful operations (save, restore, promote) and rendering (diff-renderer).

---

### A-07 [W] `compile/llm/` sub-tree imports from `compile/types.ts` creating bidirectional awareness

**Files**: `claws-sdk/src/compile/llm/*.ts` and `claws-sdk/src/compile/types.ts`

The `compile/llm/` modules import types from `compile/types.ts` (e.g., `ParseDiagnostic`, `ToolRiskClass`, `GovernanceAST`). Meanwhile, the parent `compile/` module must import from `compile/llm/` to use the extractor and merger. This creates a circular awareness pattern where the sub-module knows about parent types and the parent knows about sub-module implementations.

**Recommendation**: Extract shared types (`ParseDiagnostic`, `ToolRiskClass`) into `compile/shared-types.ts` that both `compile/` and `compile/llm/` import, establishing a clear dependency tree.

---

### A-08 [N] `emit/emit-workflow.ts` is a single file sub-module

**File**: `claws-sdk/src/emit/emit-workflow.ts`

The `emit/` directory contains a single file. This suggests the module boundary was drawn prematurely. Either more files will follow (in which case the directory is justified) or the file should live in `compile/` where the emit workflow logically belongs.

---

### A-09 [N] Index barrel files re-export everything — no public API curation

**Files**: `claws-sdk/src/index.ts`, `claws-sdk/src/fleet/index.ts`, `claws-sdk/src/keys/index.ts`

The barrel `index.ts` files re-export all symbols from all sub-modules without curation. This means every internal type, helper, and implementation detail is part of the public API surface. Consumers import `from '@bic/claws-sdk/fleet'` and get `sleep()`, `isTransientError()`, `isPermanentError()`, and `RenameFn` alongside the actual public API.

**Recommendation**: Curate exports — only re-export public-facing types and functions. Keep helpers unexported or mark them with `@internal`.

---

### A-10 [N] `claws-cli/src/commands/index.ts` re-exports but adds no value

**File**: `claws-cli/src/commands/index.ts`

The commands barrel file simply re-exports from each command module. Since CLI commands are typically wired individually in `cli.ts`, this barrel file may not serve a useful purpose and just adds a level of indirection.

---

### A-11 [W] Doctor module mixes health checks with migration logic

**Files**: `claws-sdk/src/doctor/checks/*.ts` and `claws-sdk/src/doctor/migrate/*.ts`

The `doctor/` module contains both diagnostic health checks (`checks/`) and schema migration logic (`migrate/`). These have different triggering conditions and risk profiles — health checks are read-only and safe to run at any time, while migrations modify the workspace. Combining them in one module makes it easy to accidentally run migrations when only diagnostics were intended.

**Recommendation**: Separate `doctor/checks/` (pure diagnostics) from `doctor/migrate/` as distinct sub-modules with separate entry points.

---

## Summary

| Severity     | Count |
| ------------ | ----- |
| M (Must fix) | 2     |
| W (Warning)  | 6     |
| N (Note)     | 3     |

**Key architectural concerns**: The CLI contains business logic for registry client construction (A-01), and the dual bypass modules (A-02) create a maintenance and divergence risk. The fleet module's 18-file size (A-04) and un-curated barrel exports (A-09) are structural debt that will compound as the codebase grows.
