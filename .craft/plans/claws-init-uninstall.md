---
slug: claws-init-uninstall
preset: "claws"
plan: "2 headlines: claws init --template soc2 produces a governed OC workspace in <5s, claws uninstall leaves zero traces"
area: claws
status: Draft
phase: anubis
atoms: [atom:claws-init, atom:claws-uninstall, atom:claws-bypass, atom:claws-json]
specs: [CL-01, CL-03, CL-05]
---

# claws-init-uninstall -- Full Init + Clean Removal

## Headlines

1. **H1: `claws init --template soc2` produces a governed OC workspace in <5s** -- `claws init` detects the host platform from workspace marker files (SOUL.md -> OpenClaw, .cursorrules -> Cursor, etc.), creates `claws.json` with the selected template defaults, scaffolds the `.claws/` directory tree (policies/, audit/, cache/, secrets/, compliance/), installs the governance SKILL.md (L1 advisory), registers the governance PLUGIN (L2+L3 enforcement), syncs the exec-approvals bridge (L4 backup), and appends `.claws/` + `build/` to `.gitignore`. Total: 16 files created, 3 files modified. Originals backed up to `~/.claws-backups/<timestamp>/` before modification.
   - Validation: `claws init --template soc2` in a directory with SOUL.md creates 16 files and modifies 3
   - Validation: `.claws/policies/soc2-baseline.yaml` exists and contains valid SOC2 policy rules
   - Validation: `claws init` with no flags defaults to `--template minimal` (4-line claws.json, zero policy files)
   - Validation: `claws init` in a directory with `.cursorrules` detects Cursor platform and sets advisory-only enforcement tier

2. **H2: `claws uninstall` removes all governance artifacts and leaves zero traces in the workspace** -- `claws uninstall` backs up `.claws/` to `~/.claws-backups/<workspace-name>-<timestamp>/` (outside `.claws/` per CB-08), archives the audit chain to `~/.claws-audit-archive/`, removes `claws.json` + `.claws/` + installed governance skill + installed governance plugin, restores original files (openclaw.json, exec-approvals.json, .gitignore) from backup, and prints a summary of what was removed and where the backup lives. `--keep-audit` preserves the audit chain in place. `--keep-secrets` preserves the secrets vault. `--purge` removes backups and archives too (requires `--confirm`). Running `claws uninstall` on an already-uninstalled workspace is a no-op.
   - Validation: After `claws init && claws uninstall`, the workspace directory has zero claws artifacts (no claws.json, no .claws/)
   - Validation: `~/.claws-backups/` contains the backup with all removed files
   - Validation: `claws uninstall --keep-audit` preserves `.claws/audit/chain.jsonl` while removing everything else
   - Validation: `claws uninstall` on a workspace without claws.json exits 0 with "Nothing to uninstall"

3. **H3: `CLAWS_BYPASS=1` disables enforcement but records every action to the audit chain** -- When `CLAWS_BYPASS=1` is set in the environment, all `before_tool_call` handlers return immediately (no block, no approval). The audit chain still records every tool call with `bypassed: true` flag. A prominent terminal warning is emitted: "CLAWS_BYPASS=1 -- governance disabled". `claws pinch` under bypass reports `BYPASS_ACTIVE` as a critical finding. Bypass cannot be set in claws.json -- environment variable only. Fleet policies can prohibit bypass via `fleet.allowBypass: false` in claws.json.
   - Validation: With `CLAWS_BYPASS=1`, `claws build` completes without governance checks
   - Validation: With `CLAWS_BYPASS=1`, `claws pinch` exits 0 but warns "BYPASS active" and logs to audit chain
   - Validation: Fleet config `{ fleet: { allowBypass: false } }` causes bypass to fail with "Fleet policy prohibits bypass"

## Summary

This plan implements the full init/uninstall lifecycle: `claws init` sets up governance in an agent workspace (config, policies, enforcement layers 1-4, directory structure), `claws uninstall` cleanly removes everything with backups preserved outside `.claws/`. The template system supports SOC2, HIPAA, EU AI Act, and minimal templates with platform-specific defaults. The emergency bypass (`CLAWS_BYPASS=1`) is the break-glass escape hatch that disables enforcement while preserving audit. Init reuses the emit pipeline from claws-emit (Phase 1) to generate the governance SKILL.md and Gateway plugin artifacts. Uninstall uses platform detection from claws-base-cli to identify installed artifacts.

## Coverage Contract

### Specs
- [ ] CL-01 -- `claws init` defaults, `claws.json` v2 schema, `claws uninstall` behavior, `CLAWS_BYPASS=1`
- [ ] CL-03 -- Runtime enforcement installation (L1-L4), backup location (CB-08), bypass audit recording
- [ ] CL-05 -- Template system, platform detection matrix, workspace-aware bare invocation

### Concept Guides
- [ ] docs/claws/getting-started/init.md -- NEW: step-by-step init with template options
- [ ] docs/claws/operations/uninstall.md -- NEW: clean removal, backup locations, keep flags
- [ ] docs/claws/operations/bypass.md -- NEW: emergency bypass usage and fleet prohibition

### Scenario Coverage
- [ ] init/soc2-template-openclaw -- init with SOC2 on OpenClaw workspace (16 files, 3 modified)
- [ ] init/minimal-template -- init with no flags (defaults to minimal)
- [ ] init/cursor-advisory-only -- init on Cursor workspace (advisory enforcement only)
- [ ] init/already-initialized -- init on already-initialized workspace warns and exits
- [ ] init/no-workspace-files -- init with no platform marker files prompts for platform selection
- [ ] uninstall/clean-removal -- init then uninstall, verify zero traces
- [ ] uninstall/keep-audit -- uninstall with --keep-audit preserves chain.jsonl
- [ ] uninstall/keep-secrets -- uninstall with --keep-secrets preserves vault.enc
- [ ] uninstall/idempotent -- uninstall on uninstalled workspace is no-op
- [ ] uninstall/purge-confirm -- --purge without --confirm is rejected
- [ ] bypass/audit-recorded -- bypass records every action with bypassed: true
- [ ] bypass/fleet-prohibition -- fleet.allowBypass: false blocks bypass

### Test Tier Targets
| Tier | Target | Rationale |
|------|--------|-----------|
| L0 unit | 20 | Template rendering (4), platform detection (7), config generation (3), backup path construction (2), bypass detection (2), uninstall manifest (2) |
| L1 integration | 8 | Full init pipeline per template, uninstall with restore, bypass with audit recording |
| L2 e2e | 4 | Full init -> pinch -> uninstall cycle, init -> bypass -> build cycle |
| L3 acceptance | 2 | `claws init --template soc2` on real fixture directory, `claws uninstall` cleanup |

## Scope

- `claws-sdk/src/meta/init.ts` (NEW) -- Init orchestrator: detect platform, select template, scaffold .claws/, generate config, install enforcement layers
- `claws-sdk/src/meta/uninstall.ts` (NEW) -- Uninstall orchestrator: backup, remove artifacts, restore originals, archive audit
- `claws-sdk/src/meta/templates/` (NEW) -- Template directory with per-template config/policy generators
- `claws-sdk/src/meta/templates/minimal.ts` (NEW) -- Minimal template: enabled:true, trustTier:2, zero policies
- `claws-sdk/src/meta/templates/soc2.ts` (NEW) -- SOC2 template: SOC2 baseline policy, compliance config, audit config
- `claws-sdk/src/meta/templates/hipaa.ts` (NEW) -- HIPAA template: HIPAA Security Rule policy, data sensitivity defaults
- `claws-sdk/src/meta/templates/eu-ai-act.ts` (NEW) -- EU AI Act template: assessment config, Article 6/Annex III defaults
- `claws-sdk/src/meta/backup.ts` (NEW) -- Backup manager: copy to ~/.claws-backups/, restore from backup, archive audit chain
- `claws-sdk/src/meta/bypass.ts` (NEW) -- Bypass logic: detect CLAWS_BYPASS env, check fleet prohibition, record bypass event
- `claws-sdk/src/meta/scaffold.ts` (NEW) -- Directory scaffolder: create .claws/ tree, generate .gitignore entries, create policy YAML stubs
- `claws-sdk/src/meta/types.ts` (NEW) -- InitOptions, UninstallOptions, TemplateConfig, BackupManifest types
- `claws-cli/src/commands/build.ts` (EDIT) -- Add `init` and `doctor` command registrations (init is in Build group per COMMAND-MAP)
- `claws-cli/src/commands/meta.ts` (EDIT) -- Add `uninstall` command registration
- `claws-cli/src/hooks/pre-command.ts` (EDIT) -- Add bypass detection to pre-command hook

## Deliverables

### Specs & Design
- [ ] CL-01 amendment -- init defaults and template system finalized
- [ ] CL-03 amendment -- init installer steps finalized with file counts and modification list

### SDK Logic (claws-sdk)
- [ ] claws-sdk/src/meta/init.ts -- init() orchestrator, reuses claws-emit for L1/L2 artifact generation
- [ ] claws-sdk/src/meta/uninstall.ts -- uninstall() orchestrator with backup, restore, archive
- [ ] claws-sdk/src/meta/templates/minimal.ts -- minimal template generator
- [ ] claws-sdk/src/meta/templates/soc2.ts -- SOC2 template with baseline policy YAML
- [ ] claws-sdk/src/meta/templates/hipaa.ts -- HIPAA template with security rule policy
- [ ] claws-sdk/src/meta/templates/eu-ai-act.ts -- EU AI Act template with assessment config
- [ ] claws-sdk/src/meta/backup.ts -- backup(), restore(), archiveAudit() functions
- [ ] claws-sdk/src/meta/bypass.ts -- isBypassed(), checkFleetBypassPolicy(), recordBypassEvent()
- [ ] claws-sdk/src/meta/scaffold.ts -- scaffoldClawsDir(), appendGitignore(), createPolicyStubs()
- [ ] claws-sdk/src/meta/types.ts -- all meta types
- [ ] claws-sdk/tests/meta/init.unit.test.ts -- template selection, platform detection, config generation
- [ ] claws-sdk/tests/meta/uninstall.unit.test.ts -- backup manifest, restore logic, keep-flags
- [ ] claws-sdk/tests/meta/bypass.unit.test.ts -- env detection, fleet prohibition, audit event
- [ ] claws-sdk/tests/meta/init.integration.test.ts -- full init pipeline on temp directory
- [ ] claws-sdk/tests/meta/uninstall.integration.test.ts -- full init -> uninstall cycle on temp directory
- [ ] claws-sdk/tests/meta/templates/soc2.unit.test.ts -- SOC2 template generates valid policy YAML
- [ ] claws-sdk/tests/fixtures/init-openclaw/ (NEW) -- fixture directory with SOUL.md + TOOLS.md for init testing
- [ ] claws-sdk/tests/fixtures/init-cursor/ (NEW) -- fixture directory with .cursorrules for init testing

### CLI Wiring
- [ ] claws-cli/src/commands/build.ts -- `claws init` command: parse --template flag, call init() from claws-sdk
- [ ] claws-cli/src/commands/meta.ts -- `claws uninstall` command: parse --keep-audit/--keep-secrets/--purge/--confirm flags
- [ ] claws-cli/src/hooks/pre-command.ts -- bypass detection: warn on CLAWS_BYPASS, check fleet policy

### Scenario Findings (added during wave)
*(empty -- populated during implementation)*

## Out of Scope

- Governance rule engine (claws-rules plan -- init calls emit, not analyze)
- OC workspace parsing (claws-parse plan -- init generates files, does not parse existing governance)
- L5 sidecar installation (Phase 3 enterprise -- `claws init --enterprise`)
- Fleet-wide init / fleet broadcast (claws-fleet-ops plan)
- claws.json migration from v1 to v2 (that's claws-three-rings doctor --fix)
- CI/CD pipeline setup (CL-05 CI/CD section -- separate plan)

## Notes

- Init reuses claws-emit for generating the governance SKILL.md and Gateway plugin (L1-L3) -- does NOT duplicate code generation logic
- Platform detection reuses claws-base-cli/src/core/platform-detect.ts for marker file matching
- Backup location is `~/.claws-backups/` (OUTSIDE `.claws/`) per CL-03 CB-08 -- deleting `.claws/` does not destroy restore files
- Template policy YAML files are static assets generated from templates, not compiled from GovernanceIR
- The init flow: detect platform -> select template -> generate claws.json -> scaffold .claws/ -> call emit for L1-L3 -> sync exec-approvals L4 -> update .gitignore
- Depends on claws-cli-foundation (Phase 1 CLI skeleton), claws-emit (generates L1-L3 enforcement artifacts), claws-base-cli (platform detection)
