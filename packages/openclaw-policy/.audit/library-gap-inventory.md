# Library-Gap Inventory — pulse 47.5.5

**Status: CLOSED.** All gaps filled in pulse 47.5.5. Re-audit ran
after D2 fixes; every row is now ✅ WORKS. Evidence below.

Scope: every library function reachable from a wired cli-handler in
`packages/openclaw-policy/src/cli-handlers/`. Each row lists the function,
the handler that calls it, and whether the body actually does what the name
and doc-comment promise.

Status legend:
- `OK` — end-to-end output matches spec
- `PARTIAL` — signature present, body incomplete (list what is missing)
- `STUB` — returns a hard-coded value with no real work

## Inventory

| Handler | Library function | File | Status | Post-fix evidence |
|---|---|---|---|---|
| generate | `generate({workspaceRoot}, deps?)` | src/generator.ts, src/fs-pipeline.ts | ✅ WORKS | Reads SOUL.md/TOOLS.md/AGENTS.md, parses via `@bic/openclaw-workspace/ast`, extracts denyRules+tools, writes 3 artifacts to `.openclaw/policy/`. End-to-end proof at /tmp/cp55-full-final: `scope=@bic/openclaw files=3 diagnostics=0`. Tests: tests/fs-pipeline.integration.test.ts (6 cases). |
| generate | `generateInMemory({draft})` | src/generator.ts | ✅ WORKS | Unchanged — still the in-memory engine. Consumed by fs pipeline. |
| generate | `finalizeIR(draft)` | src/generator.ts | ✅ WORKS | Unchanged. |
| generate | `emitPolicyIR(ir)` | src/emit/emit-policy-ir.ts | ✅ WORKS | Unchanged. |
| generate | `emitPluginCode({ir, snapshotId, scopePrefix})` | src/emit/emit-plugin.ts | ✅ WORKS | Unchanged. |
| generate | `emitAuditManifest(ir, snapshotId)` | src/emit/emit-audit-manifest.ts | ✅ WORKS | Retained for the event-taxonomy contract (used by generateInMemory). fs pipeline now writes the **chain** manifest from the new `emitAuditChain` instead. |
| generate | `emitAuditChain({ir, snapshotId, artifactHashes, hmacKey?})` | src/emit/emit-audit-chain.ts **(new)** | ✅ WORKS | Deterministic HMAC-chained manifest per CL-11 §3a. Fixture key derived from policyId when no env present; caller-supplied key takes precedence. 3-entry chain round-trips through verifyAudit. |
| verify | `verifyAudit({chain, hmacKey, expectedGenesis?})` | src/ops/verify-audit.ts | ✅ WORKS | Signature unchanged. Handler falls back to fixture-derived key when env absent so `generate → verify` round-trips without secret wiring. |
| check | `check(ir)` | src/generator.ts | ✅ WORKS | Unchanged. Handler loader now looks in `.openclaw/policy/policy-ir.json` (fs-pipeline output path) before legacy `.claws/`. |
| diff | `diff(a, b)` | src/generator.ts | ✅ WORKS | Unchanged. Handler loader accepts `current` alias + `.openclaw/snapshots/` path. |
| watch | `watch({workspaceRoot, debounceMs?, onChange?, watcherFactory?})` | src/generator.ts | ✅ WORKS | node:fs `watch` + debounce + close. Tests inject synthetic events via `watcherFactory` for Windows-stable timing. Tests: tests/watch.integration.test.ts (3 cases). |
| report | `renderReport(input, format)` | src/ops/render-report.ts | ✅ WORKS | Adds SARIF 2.1.0 variant with per-rule results for compliance/audit/diff kinds. `$schema: "https://json.schemastore.org/sarif-2.1.0.json"`. End-to-end proof: `claws policy report --kind compliance --format sarif` emits valid SARIF that parses with `JSON.parse`. |
| test | `runScenarios({gatewayUrl, cases, fetchImpl?})` | src/ops/run-scenarios.ts | ✅ WORKS | Unchanged — the HTTP-gateway-facing function. |
| test | `runScenariosInMemory({policyIR, cases, host?, port?, fetchImpl?})` | src/ops/run-scenarios.ts **(new)** | ✅ WORKS | Spins up ephemeral `startMockGateway` on an OS-chosen port, dispatches, tears down. Handler now accepts either `--gateway <url>` (external) or `--policy-ir <path>` (in-memory). |
| test | `parseScenarioYaml(yaml)` | src/ops/run-scenarios.ts | ✅ WORKS | Unchanged. |
| comply | `evaluateCompliance({rubric, input, signingKey, keyId})` | src/ops/evaluate-compliance.ts | ✅ WORKS | Unchanged body. |
| comply | `loadPolicyIRFromSnapshot({workspace, snapshotId})` | src/ops/evaluate-compliance.ts **(new)** | ✅ WORKS | Loads `.openclaw/policy/policy-ir.json` (`snapshotId: 'current'`) or `.openclaw/snapshots/<id>/policy-ir.json`. |
| sim | `startMockGateway({policyIR, port?, host?})` | src/ops/mock-gateway.ts | ✅ WORKS | Unchanged. |
| doctor | `realPolicyProbe(workspace, env)` | src/cli-handlers/doctor.ts | ✅ WORKS | Env-var optional; falls back to fixture-derived HMAC key via manifest's embedded `policyId`. |
| upgrade | `migratePolicyArtifacts({workspace, dryRun?})` | src/migrate.ts **(new)** | ✅ WORKS | Real on-disk migrator: bumps `version` field on `policy-ir.json` + `audit-manifest.json` if older than `CURRENT_POLICY_SCHEMA_VERSION`. Handler `--dry-run` dispatches to dry-run migrator. Statuses: `migrated` \| `already-current` \| `missing` \| `error`. |
| snap | handler-internal (upload / checkout / diff) | src/cli-handlers/snap.ts | ✅ WORKS | Unchanged. |

## D4 integration tests

- `tests/fs-pipeline.integration.test.ts` — 6 L1 cases for the generate fs pipeline (3-artifact emit, idempotent repeat, custom HMAC key, missing files, strict mode).
- `tests/watch.integration.test.ts` — 3 L1 cases for the watcher (debounced generate, cancel-after-close, multiple-event debounce collapse).
- `tests/generate-verify-roundtrip.integration.test.ts` — updated: live generate → verifyAudit round-trip.
- `tests/lib-gap-completion.integration.test.ts` — 12 L1 cases covering SARIF renderer variants, runScenariosInMemory, loadPolicyIRFromSnapshot, migratePolicyArtifacts.

Full test matrix after pulse: **366 passed, 1 skipped** (up from 345 in 47.5).

## Coverage debt flagged by 47.1–47.5 agents

These are pre-existing (Ra-era) and independent of this pulse's library gaps,
but the pulse body calls them out so they stay visible:

- `src/compile/analyze.ts` lines 88.23% (needs >95% per-file).
- `src/cli-handlers/sim.ts` branches 88.57% (needs >90% per-file).

Both predate the handler-wiring work; they surface because whole-file coverage
is a per-file 95/90/95/95 gate, not a package aggregate.

## Summary — post pulse 47.5.5

All 6 PARTIAL/STUB rows now ✅ WORKS. Three new library functions landed:
`emitAuditChain`, `runScenariosInMemory`, `migratePolicyArtifacts`, plus a
small `loadPolicyIRFromSnapshot` helper.

### CP-5.5 exit gate evidence

```bash
cp -r test/e2e/fixtures/allow-r1-public/* /tmp/cp55-full-final/
cd /tmp/cp55-full-final
node packages/claws/bin/claws.js policy generate
  → "scope=@bic/openclaw files=3 diagnostics=0"
ls .openclaw/policy/
  → audit-manifest.json, gateway-plugin.ts, policy-ir.json
node packages/claws/bin/claws.js policy verify --manifest .openclaw/policy/audit-manifest.json
  → "audit-chain ok entries=3"  (exit 0)
node packages/claws/bin/claws.js policy check --workspace .
  → "0 diagnostic(s), ok"  (exit 0)
```

### Coverage debt flagged by 47.1–47.5 agents

These remain — pulse 47.5.5 is not the right moment to close them because
they're per-file lines/branch coverage on files we didn't touch here, not
library gaps. Left explicit so pulse 47.6 smoke design knows they exist:

- `src/compile/analyze.ts` lines 88.23% (needs >95% per-file).
- `src/cli-handlers/sim.ts` branches 88.57% (needs >90% per-file).
