# Library-Gap Inventory — pulse 47.5.5

Scope: every library function reachable from a wired cli-handler in
`packages/openclaw-policy/src/cli-handlers/`. Each row lists the function,
the handler that calls it, and whether the body actually does what the name
and doc-comment promise.

Status legend:
- `OK` — end-to-end output matches spec
- `PARTIAL` — signature present, body incomplete (list what is missing)
- `STUB` — returns a hard-coded value with no real work

## Inventory

| Handler | Library function | File | Status | Gap |
|---|---|---|---|---|
| generate | `generate({workspaceRoot})` | src/generator.ts:66 | **STUB** | Returns `writtenFiles: []` + info diagnostic; does not read SOUL.md / TOOLS.md / AGENTS.md from the workspace, does not run Parse/Extract/Analyze, does not write any artifact to disk. |
| generate | `generateInMemory({draft})` | src/generator.ts:55 | OK | Pure in-memory assembly; used by tests and as the engine inside the real fs pipeline once wired. |
| generate | `finalizeIR(draft)` | src/generator.ts:42 | OK | Computes canonical policyId and stamps canonicalizerVersion. |
| generate | `emitPolicyIR(ir)` | src/emit/emit-policy-ir.ts | OK | Deterministic JCS-canonical IR JSON. |
| generate | `emitPluginCode({ir, snapshotId, scopePrefix})` | src/emit/emit-plugin.ts | OK | Deterministic TS plugin source with scope-prefixed imports. |
| generate | `emitAuditManifest(ir, snapshotId)` | src/emit/emit-audit-manifest.ts | **PARTIAL** | Returns the CL-11 event-taxonomy JSON (event / trigger / severity triples). Does NOT emit a hash-chain `{chain: [...entries]}` document that `verifyAudit` can consume. Pulse gate requires `claws policy verify --manifest audit-manifest.json` to exit 0 round-trip; today the emitted shape fails JSON.parse->chain.Array check in verify. |
| verify | `verifyAudit({chain, hmacKey, expectedGenesis?})` | src/ops/verify-audit.ts | OK | Thin wrapper over guardrails `verifyChain`; walks HMAC linkage, returns `{valid, length, genesis, latest, brokenAt}`. Signature matches what the handler passes after loading the file. |
| check | `check(ir)` | src/generator.ts:81 | OK | Runs analyze, returns diagnostics. |
| diff | `diff(a, b)` | src/generator.ts:90 | OK | Structural delta (added / removed / modified tool names) + canonical comparison for `changed`. |
| watch | `watch({workspaceRoot, debounceMs})` | src/generator.ts:86 | **STUB** | Returns `{async close(){}}` — does not spawn chokidar, does not emit check results on file change, does not track debounce. Handler's `--once` flag masks the stub because the close completes immediately. |
| report | `renderReport(input, format)` | src/ops/render-report.ts | **PARTIAL** | Supports markdown/html/json/pdf for compliance + audit + diff. Does NOT support `sarif`. Handler rejects `--format sarif` with exit 2 and a comment pointing at this gap. Report spec requires SARIF 2.1.0 for GitHub code scanning integration. |
| test | `runScenarios({gatewayUrl, cases, fetchImpl?})` | src/ops/run-scenarios.ts | **PARTIAL** | Requires an external gateway URL. No in-memory mode — cannot run `claws policy test` without first running `claws policy sim` in a second process. Handler surface requires `--gateway <url>` flag which is awkward; specifically pulse 47.3 mars flagged this. Better: allow `{policyIR, cases}` (library spins up an internal startMockGateway + issues the HTTP calls). |
| test | `parseScenarioYaml(yaml)` | src/ops/run-scenarios.ts:121 | OK | Minimal YAML subset parser matching the scenario shape in policy.md §Behaviour tests. |
| comply | `evaluateCompliance({rubric, input, signingKey, keyId})` | src/ops/evaluate-compliance.ts | **PARTIAL** | Works correctly when passed an in-memory `{policyIR, ...}`. Handler has to pre-load the IR from disk — no library helper like `evaluateComplianceFromSnapshot({workspace, snapshotId, rubric})` that loads `.openclaw/policy/snapshots/<id>/policy-ir.json` and the audit-manifest. Everything the handler does today is correct, but `comply --snapshot <id>` alone is not enough — user must also pass `--policy-ir <path>`. |
| sim | `startMockGateway({policyIR, port?, host?})` | src/ops/mock-gateway.ts | OK | Real HTTP server on 127.0.0.1, handles `/v1/before_tool_call` + `/v1/before_file_ingest` + `/v1/health`. Returns `MockGatewayHandle` with `.close()`. |
| doctor | `realPolicyProbe(workspace, env)` | src/cli-handlers/doctor.ts:147 | OK (47.5) | Real fs stat + verify. |
| upgrade | `defaultMigrator(workspace)` | src/cli-handlers/upgrade.ts:95 | **PARTIAL** | Real on-disk version inspector (47.5). Does not migrate — `migratePolicyArtifacts` function does not exist in the library (saturn registered `atom:policy-artifact-migration` for this pulse). Handler surfaces "needs-migration" and exits 1, telling the user migration library is not yet available. |
| snap | handler-internal (upload / checkout / diff) | src/cli-handlers/snap.ts | OK (47.4) | Uploads to endpoint-configurable snap server; no library layer dependency beyond fetch. |

## Coverage debt flagged by 47.1–47.5 agents

These are pre-existing (Ra-era) and independent of this pulse's library gaps,
but the pulse body calls them out so they stay visible:

- `src/compile/analyze.ts` lines 88.23% (needs >95% per-file).
- `src/cli-handlers/sim.ts` branches 88.57% (needs >90% per-file).

Both predate the handler-wiring work; they surface because whole-file coverage
is a per-file 95/90/95/95 gate, not a package aggregate.

## Summary

- **STUB (2)**: `generate`, `watch`.
- **PARTIAL (4)**: `emitAuditManifest` (wrong shape for verify round-trip), `renderReport` (no sarif), `runScenarios` (no in-memory mode), `defaultMigrator` (no real migration).
- **OK (12)**: everything else.

Two of the six (generate + emitAuditManifest) directly gate pulse 47.6's
end-to-end smoke (generate-then-verify). Watch, sarif, in-memory scenarios,
and migration gate individual verb-level smoke assertions in 47.6 but do not
block the generate→verify round-trip.
