# CL-01: CLI Surface & Schema

**Status**: Draft
**Source**: Q12a, Q12c, Q12d, Q12g
**Reviewers**: platform-engineer, enterprise-architect, ux-designer

---

## Overview

This spec defines the complete external-facing surface of `claws` -- the cross-platform agent governance compiler. It consolidates four research questions that determined: one CLI (not two), 40 commands across 8 groups, the name `claws`, and the three-layer `claws.json` v2 schema.

The CLI surface is the product's first impression. Every command, flag, and config field reflects the design principle that governance should feel like a developer tool first and an enterprise platform second. Progressive disclosure (4/18/40) ensures a new user sees `claws init` and `claws check`, not `claws kill --fleet --confirm`.

The `claws.json` schema is the workspace-level configuration contract. Its three-layer design (core/targets/detection) scales from a 4-line minimal config to a 33-line fleet-managed enterprise setup without requiring platform-specific knowledge for the common case.

## Scope

**In scope**:
- 40-command surface (8 groups) with SDK mapping
- Progressive disclosure tiers (Maker 4 / Developer 18 / Advanced 40)
- Scope model (workspace-default, `--fleet` escalation, `--confirm` for destructive ops)
- Cross-cutting flags (27 flags across all commands)
- `claws.json` v2 schema (TypeScript types, three-layer architecture)
- Platform detection matrix (7 platforms, marker files, enforcement tiers)
- Workspace layout after `claws init`
- Cross-compile targets and build output
- `CLAWS_BYPASS=1` emergency override
- Bare `claws` invocation behavior (workspace-aware)

**Out of scope**:
- Runtime enforcement mechanics (CL-03)
- Security rules and governance model (CL-02)
- Compilation pipeline internals (CL-04)

**Depends on**: None (foundational spec)

## Design

### Command Surface (40 commands, 8 groups + uninstall)

| Group | Commands | Count | Scope |
|-------|----------|-------|-------|
| **Build** | init, build, build \<target\>, compile, optimize, test, diff, import, inspect, doctor, amend | 11 | Always workspace |
| **Check** | check, check --fix/--watch/--strict/--staged/--fleet | 2 + flags | Scope-sensitive |
| **Comply** | comply, comply \<framework\>, assess | 3 | Scope-sensitive |
| **Audit** | audit, audit verify, audit export, audit history | 4 | Workspace + 1 fleet |
| **Snap** | snap save/restore/diff/promote | 4 | Scope-sensitive |
| **Fleet** | scan, broadcast, drift, report, push, kill | 6 | Always fleet |
| **Protect** | budget, secrets init, secrets set, identity | 4 | Scope-sensitive |
| **Live** | watch, session, amend | 3 | Always workspace |
| **Maker** | new skill, publish, annotate, import | 4 | Always workspace |
| **Meta** | uninstall | 1 | Always workspace |

### Progressive Disclosure

```
Maker (4 commands -- "5 minutes to governed"):
  claws init            Set up governance for your workspace
  claws build           Compile and emit your agent
  claws check           Check against your org's policies
  claws build cursor    Cross-compile to another platform

Developer (18 commands -- full build + governance):
  Build:  init build compile optimize test diff import inspect watch amend doctor
  Govern: check comply assess audit

Advanced (40 commands -- fleet + snapshots + protect + maker + meta):
  + snap [save|restore|diff|promote]
  + scan broadcast drift report push kill
  + budget secrets [init|set] identity session
  + new skill, publish, annotate, import
  + uninstall
```

### Scope Model

6 scope-sensitive commands accept `--fleet`:

| Command | Default | --fleet | --confirm |
|---------|---------|---------|-----------|
| check | workspace | Yes | No |
| comply | workspace | Yes | No |
| snap save/restore/diff | workspace | Yes | No |
| budget | workspace | Yes | No |
| kill | workspace | Yes | **Yes (--fleet)** |

Inherently-fleet commands (scan, broadcast, drift, report, push) do not need `--fleet`. Inherently-workspace commands (build, compile, test) do not accept it.

### Cross-Compile Targets

| Target | Platform | Output |
|--------|----------|--------|
| openclaw | OpenClaw | SOUL.md amendments + governance skill + tool hooks |
| cursor | Cursor | .cursorrules governance section |
| claude | Claude Code | CLAUDE.md section + .claude/settings.json |
| github | GitHub Copilot | .github/copilot-instructions.md section |
| bedrock | AWS Bedrock | Guardrail policy JSON |
| langgraph | LangGraph | Python guard decorators |
| crewai | CrewAI | YAML guard config |
| _(auto)_ | _(detected)_ | _(best match from workspace files)_ |

### claws.json v2 Schema

```typescript
type ClawsConfig = {
  $schema?: string;                    // IDE autocomplete URL
  version: 2;                          // schema version
  platform?: Platform;                 // explicit detection override
  enabled: boolean;                    // master toggle
  template?: PolicyTemplate;           // soc2, hipaa, eu-ai-act, minimal
  trustTier?: TrustTier;              // T0-T4, default T2 (REQUIRED default — omission defaults to T2, never undefined)
  policies?: string[];                 // paths to policy YAML files
  audit?: AuditConfig;                 // chain, SIEM, retention
  budget?: BudgetConfig;               // ceiling, unit, enforcement, warnAt
  compliance?: ComplianceConfig;       // frameworks, autoAssess, signing
  fleet?: FleetConfig;                 // registryUrl, groups, driftHash
  failMode?: FailModeConfig;          // per-tool, per-risk, global overrides
  performance?: PerformanceConfig;    // hookTimeoutMs, budgets
  targets?: Partial<Record<Platform, TargetConfig>>;
};

type FailModeConfig = {
  global?: 'fail-open' | 'fail-closed';      // overrides per-risk defaults (Source: SCV-S12-F01)
  r3r4?: 'fail-open' | 'fail-closed';        // default: 'fail-closed' (Source: SCV-S04-F05)
  perTool?: Record<string, 'fail-open' | 'fail-closed'>; // highest precedence
};

type PerformanceConfig = {
  hookTimeoutMs?: number;              // default: 50, ceiling: 500 (Source: SCV-S15-F01)
};

type Platform = 'openclaw' | 'cursor' | 'claude' | 'github'
  | 'bedrock' | 'langgraph' | 'crewai';

type TrustTier = 0 | 1 | 2 | 3 | 4;

type TargetConfig = {
  trustTier?: TrustTier;              // overrides core (can only raise)
  policies?: string[];                 // appends to core (never weakens)
  config?: PlatformSpecificConfig;     // 3-5 fields per platform
};
```

**Three-layer architecture**:
1. **Core** (platform-agnostic): enabled, trustTier, policies, audit, budget, compliance, fleet
2. **Targets** (platform-specific): per-platform build config and governance overrides
3. **Detection** (auto + explicit): `platform` field overrides auto-detection from workspace files

### Platform Detection Matrix

| Platform | Primary Marker | Confidence | Default Trust | Enforcement |
|----------|---------------|------------|---------------|-------------|
| OpenClaw | SOUL.md | Definitive | T2 | Runtime (Gateway hooks) |
| Cursor | .cursorrules | Definitive | T1 | Advisory (instructions) |
| Claude Code | CLAUDE.md | Definitive | T2 | Semi-enforced |
| GitHub Copilot | .github/copilot-instructions.md | Definitive | T1 | Advisory |
| AWS Bedrock | _(none reliable)_ | Requires explicit | T3 | Runtime (API guardrails) |
| LangGraph | langgraph.json | Definitive | T2 | Runtime (decorators) |
| CrewAI | crewai.yaml | Definitive | T2 | Semi-enforced |

Detection priority: `targets` map > `platform` field > auto-detect from workspace files.

### Workspace Layout

After `claws init --template soc2`:

```
my-agent/
  [platform workspace files]           -- existing
  claws.json                           -- governance config
  .claws/                              -- governance artifacts
    policies/soc2-baseline.yaml        -- from template
    audit/chain.jsonl                  -- hash-chained append-only log
    cache/compile/                     -- compiled IR cache
    cache/boost/                       -- optimization cache
    cache/eval/                        -- evaluation cache
    cache/snapshots/                   -- named snapshots
    secrets/vault.enc                  -- AES-256-GCM encrypted secrets
    compliance/                        -- signed compliance artifacts
  build/                               -- cross-compilation output (gitignored)
```

### SDK Mapping

All commands route through `claws-sdk`, which is a sibling to `craftworks-sdk` built on `compiler-sdk` + `agent-sdk`. `claws-sdk` does NOT import `craftworks-sdk`. Ever. (See CL-04 sibling architecture.)

| claws group | SDK package | Module | Underlying SDK |
|-------------|-----------|--------|----------------|
| Build | claws-sdk | build/* | compiler-sdk (astro/*) |
| Pinch | claws-sdk | guard/* | agent-sdk (GovernanceManager) |
| Comply | claws-sdk | guard/comply | agent-sdk (compliance) |
| Audit | claws-sdk | audit/* | agent-sdk (audit chain) |
| Snap | claws-sdk | cache/snapshot | compiler-sdk (cache) |
| Fleet | claws-sdk | fleet/* | agent-sdk (fleet) |
| Protect | claws-sdk | guard/budget, guard/secrets, identity | agent-sdk (budget, secrets, identity) |
| Live | claws-sdk | session/* | compiler-sdk (astro/session) |
| Maker | claws-sdk | maker/* | compiler-sdk (skill compilation) |
| Meta | claws-sdk | meta/* | (self-contained) |

### Bare `claws` Invocation (Workspace-Aware)

Running `claws` with no arguments is workspace-aware. It detects the current state and guides the user to the next action:

```
$ claws                                    # No claws.json found
  claws — governance for every agent

  No governance config found. Get started:
    claws init                   Set up governance (creates claws.json)

  Run 'claws --help' for all commands.

$ claws                                    # claws.json exists, never built
  claws — governance for every agent

  Workspace: my-agent/ (OpenClaw detected, T2)
  Status: configured but never built

  Next steps:
    claws build                  Compile and emit your agent
    claws check                  Check against your org's policies

$ claws                                    # claws.json exists, built, 2 violations
  claws — governance for every agent

  Workspace: my-agent/ (OpenClaw, T2)
  Last build: 2026-04-11 09:15 (847 tokens)
  Last check: 2 violations (1 high, 1 medium)

  Next steps:
    claws check --fix            Auto-fix 1 of 2 violations
    claws check                  Re-check after manual fix
```

### `claws init` Defaults

`claws init` with no flags defaults to `--template minimal`. It is not an error:

```bash
claws init                     # equivalent to: claws init --template minimal
claws init --template soc2     # explicit template selection
claws init --template hipaa    # HIPAA-specific governance defaults
```

The `minimal` template creates a `claws.json` with `enabled: true`, `trustTier: 2`, and zero policy files. It is the simplest valid governance configuration.

### `claws check` Output Format

`claws check` is the primary terminal interface. Its output format is designed for human readability:

```
$ claws check
  ✓ G-CLASS    Tool risk classification          PASS
  ✓ G-ELICIT   OBO elicitation gates             PASS
  ✗ G-A2A-TRUST  Inter-agent trust boundaries    FAIL  [HIGH]
      → agents.yaml:14 — agent "research" trusts "drafting" but no trust group defined
        Fix: add trust-group declaration in agents.yaml or claws.json
        Docs: https://claws.dev/rules/G-A2A-TRUST
  ✗ G-INPUT    Input sanitization                FAIL  [MEDIUM]
      → TOOLS.md:47 — tool "web-fetch" has no input sanitizer
        Fix: run `claws check --fix` to add @claws/security sanitizer stub
        Docs: https://claws.dev/rules/G-INPUT

  2 violations (1 high, 1 medium) in 0.3s
  1 auto-fixable — run `claws check --fix`
```

**Output contract**:
- Each rule shows: check mark or cross, rule ID, description, PASS/FAIL
- Failures show: severity in brackets `[HIGH]`, colored (red=critical/high, yellow=medium, dim=low)
- Each violation shows: `file:line` location, what is wrong, how to fix it, where to learn more
- Summary line: total violations, severity breakdown, elapsed time
- Auto-fix hint when applicable

**Color coding** (respects `NO_COLOR` and `--no-color`):
- Green: PASS
- Red: FAIL (critical/high)
- Yellow: FAIL (medium)
- Dim: FAIL (low)

### `claws uninstall`

Clean removal of all claws artifacts from a workspace:

```bash
claws uninstall                  # Remove claws.json + .claws/ from workspace
claws uninstall --keep-audit     # Preserve .claws/audit/ (hash chain)
claws uninstall --keep-secrets   # Preserve .claws/secrets/
claws uninstall --global         # Remove ~/.claws/ global config
```

**Behavior**:
- Backs up `.claws/` to `~/.claws-backups/<workspace-name>-<timestamp>/` before deletion
- Removes `claws.json` and `.claws/` directory
- Does NOT modify platform workspace files (SOUL.md, .cursorrules, etc.)
- Does NOT remove `build/` output (gitignored, harmless)
- Prints what was removed and where the backup lives
- `--keep-audit` and `--keep-secrets` can be combined

### `CLAWS_BYPASS=1` Emergency Override

Setting `CLAWS_BYPASS=1` in the environment disables all claws governance enforcement. This is the emergency escape hatch.

```bash
CLAWS_BYPASS=1 claws build      # Build without governance checks
CLAWS_BYPASS=1 claws check      # Check exits 0 with warning: "BYPASS active"
```

**Behavior**:
- All governance rules are skipped
- Audit chain records a `BYPASS` event (the bypass itself is audited)
- Terminal prints a prominent warning: `⚠ CLAWS_BYPASS=1 — governance disabled`
- Cannot be set in `claws.json` — environment variable only, for emergency use
- Fleet policies can prohibit bypass via `fleet.allowBypass: false`

## Constraints

- **One CLI**: Two CLIs (claws + clawops) were evaluated and rejected. `--fleet` scope flag replaces the second CLI.
- **Product-native naming**: `claws.json` + `.claws/` are per-workspace. The name `claws` signals cross-platform governance, not OpenClaw-specific tooling.
- **Schema backwards-compatibility**: V1 configs (from Q12a era) work indefinitely. `claws doctor --fix` migrates automatically.
- **V2 schema versioning is additive**: New fields are optional. No removals. At most one rename per version.
- **Target trustTier can only raise**: Per-target trustTier overrides core but cannot weaken governance. Per-target policies append, never replace.
- **Auto-detection must not require config**: A workspace with SOUL.md and no claws.json can still be detected and governed.
- **trustTier defaults to T2**: If `trustTier` is omitted from claws.json, the pipeline uses T2 as the default. The field must never be undefined at compile time -- downstream G-CLASS evaluation depends on it. *(Source: CP-S01-F02)*
- **claws.json parse error handling**: If claws.json contains invalid JSON, the pipeline must produce a distinct parse error (not a SOUL.md parse error). The required config file being unparseable is a critical path with dedicated diagnostics. *(Source: CP-S05-F04)*
- **Trust tier to risk level mapping (authoritative)**: T0=R1-max, T1=R2-max, T2=R3-max, T3=R4-max, T4=R5-max. This mapping must be defined in both CL-01 and CL-02 and kept consistent. *(Source: CFC-S02-F01)*
- **Strict mode in claws.json**: The strict/advisory mode flag belongs in claws.json configuration (`strict: boolean`), not as a CLI-only flag. This ensures strictness is part of the workspace configuration, not a per-invocation choice. *(Source: CFC-S03-F04)*
- **Per-target trust tier in ceiling check**: Per-target `trustTier` overrides in `targets.<platform>.trustTier` must be used when evaluating trust-ceiling violations for platform-specific artifacts. If the core trustTier is T2 but the OpenClaw target has trustTier: T4, R5 tools are allowed for OpenClaw but not for other platforms. *(Source: SCV-S11-F02)*
- **Default trustTier in ceiling error message**: When trustTier is omitted from claws.json and the default T2 produces a ceiling violation, the error message must explain the default: "trustTier not set -- defaulting to T2 (R3-max). Set trustTier: T4 in claws.json to allow R5 tools." *(Source: SCV-S11-F05)*
- **failMode schema fields**: The `failMode` section in claws.json v2 schema must define the full precedence hierarchy: `failMode.perTool: Record<string, "fail-open" | "fail-closed">`, `failMode.r3r4: "fail-open" | "fail-closed"`, `failMode.global: "fail-open" | "fail-closed"`. The schema must document the default value for r3r4 as "fail-closed". *(Source: SCV-S04-F05)*
- **hookTimeoutMs in performance config**: `claws.json#performance.hookTimeoutMs` must be in the schema with type number, default 50, minimum 1, maximum 500. Values above 500 are clamped at config load time with a warning. *(Source: SCV-S15-F01)*

## Anubis-Thoth Amendments

### Platform Detection (from platform-detection scenarios)

**Structural validation of marker file content** *(Source: PD-S01-F01)*: SOUL.md is also a common filename for non-OC projects (mission statements, philosophy documents). The detection logic must look for structural markers inside SOUL.md (frontmatter, constraint keywords like "never", "always", "must") to distinguish an OC governance file from an arbitrary SOUL.md. Without structural validation, false-positive detection is possible.

**Cross-platform precedence when targets map and marker file disagree** *(Source: PD-S01-F02)*: If `claws.json` has `targets: { cursor: { ... } }` but no `platform` field, and SOUL.md is present, the targets map takes precedence per the detection priority (targets map > platform field > auto-detect). The workspace is treated as Cursor despite SOUL.md being present. This cross-platform workspace scenario must be explicitly documented.

**Platform detection result must be available throughout pipeline** *(Source: PD-S01-F03)*: The detection result must propagate from PARSE to EMIT to configure the correct artifact set. If detection happens in PARSE but is not available in EMIT, the emit phase defaults to a generic artifact set that may miss platform-specific features (e.g., exec-approvals.json is OC-specific).

**Trust tier default source hierarchy** *(Source: PD-S01-F04)*: The default trust tier T2 is applied when `trustTier` is omitted from claws.json, but platform detection also sets a per-platform default (OpenClaw=T2, Cursor=T1). When these diverge, the trust tier must come from exactly one source: the claws.json default (T2), overridden by the platform-specific default only if explicitly specified in the platform detection table.

**Zero-config mode with synthetic defaults** *(Source: PD-S01-F05)*: A workspace with SOUL.md and no claws.json can be detected and governed. Without claws.json the pipeline must synthesize a minimal effective configuration: `platform=openclaw`, `trustTier=T2`, `enabled=true`, `policies=[]`. This synthetic config must be documented as the "zero-config governance" mode.

**Multi-platform detection and primary selection** *(Source: PD-S01-F06)*: Multiple marker files may coexist (e.g., SOUL.md and CLAUDE.md). The detection logic must detect all platforms, not just the first match. The primary platform (for default trust tier and enforcement) should be the one with the highest enforcement capability -- OpenClaw (runtime) over Claude Code (semi-enforced) over Cursor (advisory).

**Enforcement capability vs detection are independent** *(Source: PD-S01-F08)*: Detecting a platform (SOUL.md present) does not guarantee the enforcement runtime is available (OC Gateway may not be installed). A warning should be emitted if the generated governance plugin cannot be loaded by the current installation. Detection identifies the platform; enforcement depends on the runtime.

**Case-sensitive marker file matching on Linux** *(Source: PD-S01-F10)*: On Windows and macOS (case-insensitive FS), "soul.md" and "SOUL.md" are the same file. On Linux (case-sensitive FS), only "SOUL.md" matches. The detection logic must use the canonical filename with exact case on Linux and case-insensitive comparison on Windows/macOS. A Linux workspace with "soul.md" (lowercase) should not be detected as OpenClaw.

**T1 ceiling violation messaging for advisory platforms** *(Source: PD-S02-F02)*: The T1 default trust tier (R2-max) means any R3+ tools produce G-CLASS violations on Cursor. The error message for T1 ceiling violations must explain that advisory platforms default to T1 and suggest raising the trust tier explicitly in claws.json if the developer accepts unenforceable governance for higher-risk tools.

**Cursor marker forward-compatibility** *(Source: PD-S02-F04)*: Cursor may update its workspace file format (e.g., from `.cursorrules` to `.cursor/config.json`). The detection should also check for alternative Cursor markers (e.g., `.cursor/` directory structures) as a forward-compatibility measure.

**Delimiter-based section management for .cursorrules injection** *(Source: PD-S02-F03)*: The `.cursorrules` file has no formal schema -- it is plain text read as system prompt instructions. The governance section injected by claws must be clearly delimited (e.g., `<!-- claws governance start -->` ... `<!-- claws governance end -->`) so that re-compilation can replace the section without affecting user-authored content.

**Multi-platform ambiguity resolution** *(Source: PD-S02-F07)*: A workspace with both `.cursorrules` and `CLAUDE.md` is a multi-platform workspace. `claws build` must warn about multiple detected platforms and require explicit target selection rather than silently choosing one based on detection priority.

**Claude Code dual-surface emission** *(Source: PD-S03-F01)*: Claude Code has a dual enforcement model: CLAUDE.md is advisory (LLM instructions) while `.claude/settings.json` provides machine-enforced tool restrictions (allow/deny lists). The compiler must emit to both surfaces. If only CLAUDE.md is emitted, enforcement degrades to advisory-only.

**Delimiter safety for CLAUDE.md section injection** *(Source: PD-S03-F02)*: CLAUDE.md is both a source file for detection and a target for emission. Unlike `.cursorrules`, CLAUDE.md often contains extensive project-specific instructions. The emission must use delimiter-based section management with particular care since CLAUDE.md files tend to be larger and more structured (headings, code blocks).

**settings.json merge strategy with governance-first conflict resolution** *(Source: PD-S03-F03)*: `.claude/settings.json` already exists in many Claude Code workspaces with user-configured tool restrictions. The emit phase must merge claws-generated restrictions with existing user restrictions, not overwrite the file. When user settings and governance disagree, governance-first priority applies (deny wins over allow).

**Claude Code settings.json schema version tracking** *(Source: PD-S03-F04)*: Claude Code `settings.json` has a specific schema controlled by Anthropic. The emit phase must validate generated settings.json entries against the known schema version and warn if the schema version is unrecognized.

**Root-only marker file scanning** *(Source: PD-S03-F06)*: The detection logic must scan for marker files at the workspace root only, not recursively. A CLAUDE.md in a subdirectory (e.g., `docs/CLAUDE.md`) should not trigger Claude Code detection. The OC workspace concept is rooted at a specific directory.

**Nested path support in marker file scanning** *(Source: PD-S04-F01)*: The marker file `.github/copilot-instructions.md` is nested in a subdirectory. The detection logic must check subdirectory paths, not just root-level files. The scan must be path-aware, not just filename-aware.

**Copilot directory-form marker detection** *(Source: PD-S04-F03)*: GitHub Copilot supports `.github/copilot-instructions/` (directory with multiple `.md` files) as an alternative to the single file. The detection logic must handle both the single-file form (`.github/copilot-instructions.md`) and the directory form (`.github/copilot-instructions/`).

**Proportional governance injection for Copilot** *(Source: PD-S04-F04)*: Copilot instructions files are typically shorter than CLAUDE.md files. The governance section must be proportional -- a 50-line governance section in a 10-line instructions file overwhelms the original content. The injection must be calibrated to the file size context.

**No-platform-detected warning and guidance** *(Source: PD-S05-F01)*: Bedrock is the only platform that requires explicit configuration, creating an asymmetry (6 platforms auto-detect, 1 requires config). When no platform is detected and no explicit platform field exists, the pipeline must compile the IR but warn that no emission target is configured and suggest adding a `platform` field or creating a marker file.

**Bedrock guardrail API version targeting** *(Source: PD-S05-F02)*: Bedrock guardrail policies have a specific JSON schema defined by AWS. The emit phase must target a specific Bedrock API version and warn when emitting for an unknown version. If AWS updates the guardrail API, claws's Bedrock emission must degrade gracefully.

**LangGraph JS vs Python distinction from config content** *(Source: PD-S06-F08)*: LangGraph supports both Python and JavaScript (`langgraph.js`). If the workspace uses `langgraph.js` (with a `langgraph.json` that references JS files), the emit phase must generate JavaScript/TypeScript decorators instead of Python. The `langgraph.json` content (not just its presence) determines the output language.

**CrewAI config filename variants** *(Source: PD-S07-F05)*: CrewAI may use alternative config filenames: `crew.yaml`, `crew_config.yaml`, or `pyproject.toml` with CrewAI sections. The detection should check a list of known CrewAI config filenames and be configurable for custom names via claws.json.

**Enforcement capability versioned per framework release** *(Source: PD-S07-F06)*: CrewAI's semi-enforced model depends on the guard API capabilities available in the installed CrewAI version. If CrewAI adds new guard APIs (e.g., budget guards, output validators), claws's emission should evolve to use them. The enforcement capability must be versioned per framework release.

**targets.bedrock.guardrailId for update workflow** *(Source: PD-S05-F08)*: Bedrock guardrail policies support versioning. The emitted guardrail JSON should support both "create new guardrail" and "update existing guardrail" workflows. The `targets.bedrock.guardrailId` field in claws.json enables the update path.

**targets.crewai.version for version-targeted emission** *(Source: PD-S07-F08)*: CrewAI is actively maintained with frequent API changes. A generated guard config that works with CrewAI 0.28 may break with 0.30. The `targets.crewai.version` field in claws.json enables version-targeted emission.

### OBO Elicitation (from obo-elicitation scenarios)

**Standing approval condition validation in claws.json schema** *(Source: OE-S05-F01)*: The compiler must validate standing approval conditions at compile time: time window format (24h, valid range), day list (enum), recipient format (email regex). Invalid conditions (e.g., `timeWindow: "25:00-09:00"`) must produce a parse error, not silently pass through to runtime where they would either always-match or never-match.

**USER.md structured OBO scope format** *(Source: OE-S04-F09)*: For enterprise deployments, structured YAML frontmatter in USER.md is more reliable than free-text pre-authorization: `obo_scope: [{tool: send-email, scope: internal-only, expires: 2026-12-31}]`. Free-text parsing is best-effort; structured format is machine-verifiable. The compiler should support both and prefer structured when available.

### Lossless Round-Trip (from lossless-roundtrip scenarios)

**Accept JSON with BOM on Windows for claws.json** *(Source: LR-S02-F06)*: JSON with BOM is technically invalid per RFC 8259 (which says JSON text shall be encoded in UTF-8 without BOM). However, many Windows tools produce JSON with BOM. The claws.json parser must accept and preserve BOM silently rather than rejecting the file as invalid JSON. Strict RFC compliance would break Windows workflows.

## Pitfall Scenario Amendments (P-162 through P-249)

**P-174: Partial broadcast exit code** *(Sources: PA-S13-F04)*: The CLI surface must document a formal exit code contract for all fleet commands. Broadcast operations must return exit 0 only for full success, exit 2 for partial success (some workspaces failed), and exit 1 for total failure. Exit code semantics are part of the automation API -- CI pipelines and monitoring tools depend on consistent exit codes to gate deployments and detect fleet drift. Undocumented exit codes lead to inconsistent interpretation across organizations.

**P-177: Kill switch disable vs halt** *(Sources: PA-S16-F07)*: The CLI must not offer a "disable governance" command -- only `kill` (deny-all) and `unkill` (resume enforcement). Operators who confuse disable (remove governance, leaving agents ungoverned) with kill (deny all tool calls) may inadvertently make a security incident worse. The CLI help text must prominently explain that kill activates deny-all mode, not governance removal, and no separate disable verb should exist in the command surface.

**P-243: False-positive OpenClaw detection** *(Sources: PT2-S18-F01, PT2-S18-F02, PT2-S18-F03, PT2-S18-F04, PT2-S18-F06)*: Platform detection must use structural content validation, not filename-only matching. SOUL.md is a common filename outside the OC ecosystem (mission statements, philosophy documents), so the detector must check for OC-specific keywords (deny:, allow:, tool:, OC frontmatter) within the first 50 lines of each marker file. Detection should require a quorum of 2+ marker files from the OC file set (SOUL.md AND at least one of TOOLS.md, RULES.md, or claws.json) to reduce false-positive probability. The presence of claws.json must be weighted as the strongest detection signal -- a project with SOUL.md but no claws.json should be classified as "uncertain" and require explicit `claws init` before compilation. The detection phase must produce a confidence score (high/medium/low) rather than a binary result, and the compiler must refuse to compile low-confidence workspaces without `--force`. Structural validation must be fast, reading only the first 50 lines of each candidate marker file to avoid latency on frequent detection runs.

**P-244: Advisory R5 silently unenforced** *(Sources: PT2-S19-F01, PT2-S19-F05, PT2-S19-F06)*: The CLI surface must expose a platform enforcement capability matrix that classifies each target platform as mandatory-enforcement (Claude Code with tool use control), semi-enforced (CrewAI, LangGraph), or advisory-only (Cursor, Copilot). R5 tools require mandatory enforcement -- if the target platform is advisory-only, the compiler must emit a hard error, not a warning. Multi-platform compilations must evaluate enforcement capability per platform independently; a tool that is R5-enforced on Claude Code may be advisory-only on Cursor, and the output must clearly present the per-platform enforcement matrix. The platform capability database must be versioned and updatable via claws.json (`platform-capabilities-version`) so compilations remain reproducible as platforms evolve their enforcement features.

**P-248: LangGraph Python/TS language mismatch** *(Sources: PT2-S23-F02)*: The detection phase must perform an early language compatibility check before entering the compilation pipeline. Each target platform maps to required output language(s) -- LangGraph and CrewAI require Python, Claude Code requires TypeScript. If the target language has no available code generator, the compiler must report an error at the detection/validation stage (before PARSE), not after full IR construction. Failing late wastes compilation time and gives developers a misleading sense that their configuration is valid.

**P-249: CrewAI config format evolution** *(Sources: PT2-S24-F01, PT2-S24-F02, PT2-S24-F03, PT2-S24-F04, PT2-S24-F05, PT2-S24-F06, PT2-S24-F08)*: Platform detection must maintain a list of known config filenames per framework rather than hardcoding a single name. For CrewAI the list is [crewai.yaml, crew.yaml, pyproject.toml], ordered by recency so the most current format is checked first. For pyproject.toml, the detector must parse TOML and verify the [tool.crewai] or [tool.crew] section exists -- pyproject.toml alone must not trigger CrewAI detection. The detected config format must be recorded in the detection result so downstream phases dispatch to the correct schema reader. When multiple config files coexist (e.g., both crewai.yaml and crew.yaml during a migration), the most recent format takes precedence with a warning guiding the developer to clean up. The config filename list must be updatable without a full claws release via a platform-signatures registry that `claws update` can refresh. The detector should extract the CrewAI framework version from the config or dependency files and warn if it falls below the minimum supported by claws. The detection test suite must include fixtures for every known config format, including transition states and edge cases, with each new format accompanied by a corresponding test fixture.

## Praetor Integration Amendments

**InputResolver in claws.json** *(CL-07 §1)*: The `inputs` section in claws.json uses the InputResolver source format to declare governance input files. The default 9 workspace files (SOUL.md, TOOLS.md, etc.) are represented as `file` sources. Additional source types (`package`, `url`) extend governance to external input resolution, enabling enterprise registries and remote policy distribution. The claws.json schema must validate source type, path format, and optional SRI hashes for each input entry.

**Package output in claws.json** *(CL-07 §2)*: The `packages` section in claws.json declares publishable governance artifacts produced by `claws build`. Each package entry specifies name, scope (@openclaw/* or @claws/*), output format, and distribution target. The schema must validate package names against npm naming rules and prevent @craftworks/* scope in output declarations.

**Loss-aware --strict-loss flag** *(CL-07 §5)*: `claws build --strict-loss` blocks emission for any platform classified as advisory-only when the workspace contains R5 tools. Without this flag, advisory-only platforms (Cursor, Copilot) emit with a warning. With `--strict-loss`, advisory-only emission for R5 tools is a hard error. This flag complements the existing `strict: boolean` in claws.json by specifically targeting loss-aware governance fidelity.

**Loss report flag** *(CL-07 §5)*: `claws build --loss-report` generates a per-platform governance fidelity report showing which rules are fully enforced, semi-enforced, or advisory-only on each target platform. The report format follows the Spec 108 loss matrix structure. The flag can be combined with `--strict-loss` to both report and block lossy emission.

**Ontology input flag** *(CL-07 §3)*: `claws compile --ontology path.onto.yaml` accepts ontology files that define compliance domain models (SOC2, HIPAA, EU AI Act). The ontology file is compiled into OntologyIR and merged with the governance IR during the FUSE phase. Multiple `--ontology` flags can be specified. The flag supplements the `inputs` section in claws.json for ad-hoc ontology loading.

**Fleet context scan flag** *(CL-07 §4)*: `claws fleet scan --context` uses compiled context collections to perform structural fleet scanning. Instead of scanning raw workspace files, the scan operates on pre-compiled context IR, enabling faster fleet-wide governance assessments and consistent cross-workspace comparison.

**Fleet context diff** *(CL-07 §4)*: `claws fleet diff` uses context diff for structural comparison between workspaces or between fleet snapshots. The diff operates on compiled context IR rather than raw files, producing governance-aware structural differences (trust tier changes, policy additions, rule modifications) instead of textual diffs.

**claws.json schema extension** *(CL-07 §1,2)*: Two new top-level keys in the claws.json v2 schema: `inputs` (InputResolver source declarations) and `packages` (publishable artifact declarations). Both keys are optional and additive -- existing claws.json files without these keys remain valid. The `inputs` key defaults to the standard 9 workspace file sources when omitted. The `packages` key defaults to empty (no package output).

## Integration Scenario Amendments

**URL policy SRI validation** *(INT-IR-S01)*: When `inputs` entries use `url` source type, the InputResolver must validate Subresource Integrity (SRI) hashes before accepting remote policy files. Missing or mismatched SRI hashes produce CLAWS-E301 diagnostics. The SRI algorithm must support SHA-256 and SHA-384. Expired or unreachable URLs fall back to cached versions with a staleness warning.

**INPUT-RESOLVE diagnostics** *(INT-IR-S02)*: Input resolution failures must produce structured diagnostics with source type, attempted path/URL, resolution strategy, and suggested fixes. The diagnostic code namespace CLAWS-E3xx is reserved for InputResolver errors. Each diagnostic must include the claws.json line number where the failing input was declared.

**Package manifest format** *(INT-PO-S01)*: The `packages` output section must generate a `.claws-manifest.json` for each declared package containing build provenance (source hash, compiler version, build timestamp, signer identity). The manifest format must be stable across claws versions for registry verification.

**Loss-aware flag interaction** *(INT-LA-S01)*: The `--strict-loss` and `--loss-report` flags must interact correctly with per-target trust tier overrides. A workspace with core trustTier T2 but a Bedrock target at T4 must evaluate loss separately per platform. The loss report must show per-platform rows even when `--strict-loss` blocks only some platforms.

**Platform versioning in loss matrix** *(INT-LA-S02)*: The loss matrix must include platform version information so that governance fidelity assessments are reproducible. As platforms evolve enforcement capabilities, the same workspace may have different loss profiles across platform versions. The `--loss-report` output must include the platform-capabilities-version used for assessment.

**claws.json validation ordering** *(INT-IR-S03)*: Schema validation for the new `inputs` and `packages` keys must run before InputResolver execution. A malformed `inputs` entry must produce a schema validation error (CLAWS-E101 namespace), not an InputResolver runtime error (CLAWS-E3xx namespace). This ordering ensures consistent diagnostic experiences.

## Open Questions

1. Should `claws.json` support custom platform plugins via a `"custom"` target type for proprietary agent frameworks?
2. Should the `$schema` URL support version ranges or pinning? `latest.json` vs `v2.json` as the default for `claws init`?
3. How should `claws.json` interact with monorepo structures where multiple agent workspaces share a root config?
4. Should `claws --help` adapt to workspace context (graying out fleet commands when no fleet config exists)?
5. Should `claws` support custom verb aliases, or is one verb per action the correct approach?
6. ~~Should claws.json gain a `strict: boolean` field to control advisory-vs-strict mode at the config level?~~ **Resolved**: Yes, `strict: boolean` belongs in claws.json. Note: OBO-WITHOUT-ELICIT is immune to advisory mode -- it remains error severity regardless of strict/advisory setting. *(Source: CFC-S03-F04, SCV-S03-F06)*

## Research References

| Source | What it contributed |
|--------|-------------------|
| Q12a | One CLI decision, product-native naming (.claws/), workspace layout, config schema v1 |
| Q12c | 35-command verb surface, progressive disclosure (4/18/35), crustacean naming rule (check + snap) |
| Q12d | Name change from `claws` to `claws`, cross-platform positioning, collision analysis |
| Q12g | Three-layer schema (core/targets/detection), platform detection matrix, v1-to-v2 migration |
