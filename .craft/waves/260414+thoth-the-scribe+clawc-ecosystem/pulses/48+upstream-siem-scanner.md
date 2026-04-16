---
pulse: 48
slug: upstream-siem-scanner
plan: claws-upstream-contrib
depends_on: [46]
governing_roles: [craft:architect, claws:founder]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 9
  L1_integration: 3
  L2_e2e: 2
  L3_accept: 2
test_scope:
  run:
    - "cd packages/siem-emitter && npx vitest run"
    - "cd packages/secret-scanner && npx vitest run"
  typecheck:
    - "cd packages/siem-emitter && npx tsc --noEmit && cd ../secret-scanner && npx tsc --noEmit"
checkpoint: 5
checkpoint_gate: false
---

# Pulse 48: @openclaw/siem-emitter and @openclaw/secret-scanner

## Objective
**Execution context**: This pulse executes within the `craftworks/openclaw-governance` standalone monorepo (https://github.com/gim-home/openclaw-governance), NOT the claws repo. The test_scope paths (packages/...) are relative to that repo root. During wave execution, the openclaw-governance repo must be cloned and set up before these pulses can run.

Two standalone packages: @openclaw/siem-emitter (~5KB) and @openclaw/secret-scanner (~4KB).

SIEM-emitter provides multi-format event emission in CEF, NDJSON, syslog RFC 5424, and SARIF 2.1.0. A single event can be serialized to any format via a dispatcher, enabling integration with diverse SIEM platforms (Splunk, Sentinel, Elastic, etc.).

Secret-scanner provides credential leak detection with regex patterns for API keys, tokens, and passwords, plus Shannon entropy analysis to catch high-entropy strings that may be secrets. It scans workspace files and reports findings with file:line locations.

Both packages have zero `@craftworks/*` imports and are publishable standalone under the `@openclaw` scope with MIT licenses.

## Deliverables
- [ ] `packages/siem-emitter/package.json` — MIT license
- [ ] `packages/siem-emitter/src/emitter.ts` — multi-format event emission dispatcher
- [ ] `packages/siem-emitter/src/formats/cef.ts` — CEF format serializer
- [ ] `packages/siem-emitter/src/formats/ndjson.ts` — NDJSON format serializer
- [ ] `packages/siem-emitter/src/formats/syslog.ts` — syslog RFC 5424 format
- [ ] `packages/siem-emitter/src/formats/sarif.ts` — SARIF 2.1.0 format
- [ ] `packages/secret-scanner/package.json` — MIT license
- [ ] `packages/secret-scanner/src/scanner.ts` — workspace file scanning orchestrator
- [ ] `packages/secret-scanner/src/patterns.ts` — regex patterns for API keys, tokens, passwords
- [ ] `packages/secret-scanner/src/entropy.ts` — Shannon entropy analysis
- [ ] MUST: Never include matched secret values in scan results. Report only: file path, line number, pattern type, and masked preview (first 4 chars + '***').
- [ ] `packages/siem-emitter/tests/emitter.unit.test.ts` — L0: dispatch to correct format (2)
- [ ] `packages/siem-emitter/tests/formats.unit.test.ts` — L0: CEF (1), NDJSON (1), syslog (1), SARIF (1)
- [ ] `packages/secret-scanner/tests/scanner.unit.test.ts` — L0: pattern detection (1), entropy threshold (1), scan result masks secret values (first 4 chars + ***) (1)
- [ ] `packages/secret-scanner/tests/entropy.unit.test.ts` — L0: high entropy flagged (1)
- [ ] L1 integration (3 tests): siem-emitter same event in 4 formats (1), audit-chain + siem-emitter pipeline (1), secret-scanner on fixture workspace (1)
- [ ] L2 e2e (2 tests): standalone install + usage for each package
- [ ] `claws-sdk/tests/upstream/upstream-siem-scanner.accept.test.ts` — L3: SDK acceptance — consumer imports @openclaw/siem-emitter and @openclaw/secret-scanner as standalone packages, emits events in all 4 formats and scans fixture workspace for secrets with masked output
- [ ] `claws-cli/tests/upstream/upstream-siem-scanner.accept.test.ts` — L3: CLI acceptance — runs siem-emitter and secret-scanner CLI entry points on fixture workspace, verifies NDJSON/CEF/syslog/SARIF output and scan report with masked secrets

## Acceptance Criteria
- [ ] Both packages have zero `@craftworks/*` and zero `@claws/*` imports
- [ ] SIEM-emitter produces valid CEF, NDJSON, syslog RFC 5424, and SARIF 2.1.0 output
- [ ] Same event serialized to all 4 formats produces correct output for each
- [ ] Secret-scanner detects API keys, tokens, and passwords via regex patterns
- [ ] Shannon entropy analysis flags high-entropy strings above the configurable threshold
- [ ] Both packages compile standalone with `npx tsc --noEmit`
- [ ] Scan results never contain full secret values — only masked previews

## Governing Roles
Load these role files before starting:
- `.craft/roles/craft/architect.md` — system-wide architecture constraints
- `.craft/roles/claws/founder.md` — OpenClaw upstream contribution standards

## Dependencies
- Pulse 46 (upstream-audit-chain) — audit-chain export formats inform siem-emitter serializers

## Test Gates
- [ ] L0 unit (9 tests): dispatch to correct format (2), CEF format, NDJSON format, syslog format, SARIF format, pattern detection, entropy threshold, high entropy flagged, scan result masks secret values (first 4 chars + ***)
- [ ] L1 integration (3 tests): siem-emitter same event in 4 formats, audit-chain + siem-emitter pipeline, secret-scanner on fixture workspace
- [ ] L2 e2e (2 tests): standalone install + usage for each package
- [ ] L3 accept (2 tests): SDK acceptance — standalone package import + usage; CLI acceptance — CLI entry points on fixture workspace
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
