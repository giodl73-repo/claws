# Experiment c: Migration Path

**Question**: Q12g — What is the right glint.json schema for cross-platform governance?
**Experiment**: Design the migration from Q12a's ClawsConfig (v1) to GlintConfig v2: field changes, backwards compatibility, init behavior, doctor migration, versioning strategy.
**Method**: Design analysis
**Result**: Complete migration specification with field-by-field mapping, init behavior per platform, doctor auto-migration, and versioning strategy.

---

## V1 to V2 Field Mapping

### Q12a Schema (v1 — implicit)

The Q12a schema had no `version` field. Any glint.json without a `version` field is treated as v1.

```typescript
// Q12a: ClawsConfig (originally in claws.json, now glint.json via Q12d rename)
type V1Config = {
  enabled: boolean;
  template?: string;
  trustTier?: 0 | 1 | 2 | 3 | 4;
  policies?: string[];
  audit?: {
    enabled: boolean;
    chain?: string;
    siem?: { format: "cef" | "json" | "syslog"; endpoint?: string } | null;
  };
  budget?: {
    ceiling?: number;
    currency?: string;
    enforcement?: "warn" | "alert" | "throttle" | "pause" | "stop";
  };
  compliance?: {
    frameworks?: string[];
    autoAssess?: boolean;
  };
  fleet?: {
    registryUrl?: string;
    lastBroadcast?: string;
    driftHash?: string;
  };
};
```

### Field-by-Field Migration

| V1 Field | V2 Field | Change | Migration |
|----------|----------|--------|-----------|
| *(absent)* | `$schema` | **New** | Add `"$schema": "https://glint.dev/schemas/v2.json"` |
| *(absent)* | `version` | **New** | Add `"version": 2` |
| *(absent)* | `platform` | **New** | Auto-detect from workspace files, or omit |
| *(absent)* | `targets` | **New** | Omit for single-platform; add if multi-target needed |
| `enabled` | `enabled` | **Unchanged** | Keep as-is |
| `template` | `template` | **Unchanged** | Keep as-is |
| `trustTier` | `trustTier` | **Unchanged** | Keep as-is |
| `policies` | `policies` | **Unchanged** | Keep as-is |
| `audit.enabled` | `audit.enabled` | **Unchanged** | Keep as-is |
| `audit.chain` | `audit.chain` | **Unchanged** | Keep as-is |
| `audit.siem` | `audit.siem` | **Unchanged** | Keep as-is |
| *(absent)* | `audit.retention` | **New** | Omit (defaults apply) |
| `budget.ceiling` | `budget.ceiling` | **Unchanged** | Keep as-is |
| `budget.currency` | `budget.unit` | **Renamed** | `"currency": "USD"` becomes `"unit": "USD"`. Also accepts `"tokens"`. |
| `budget.enforcement` | `budget.enforcement` | **Unchanged** | Keep as-is |
| *(absent)* | `budget.warnAt` | **New** | Omit (default: 80) |
| `compliance.frameworks` | `compliance.frameworks` | **Unchanged** | Keep as-is |
| `compliance.autoAssess` | `compliance.autoAssess` | **Unchanged** | Keep as-is |
| *(absent)* | `compliance.outputDir` | **New** | Omit (default: ".glint/compliance/") |
| *(absent)* | `compliance.signing` | **New** | Omit (no signing by default) |
| `fleet.registryUrl` | `fleet.registryUrl` | **Unchanged** | Keep as-is |
| `fleet.lastBroadcast` | `fleet.lastBroadcast` | **Unchanged** | Keep as-is |
| `fleet.driftHash` | `fleet.driftHash` | **Unchanged** | Keep as-is |
| *(absent)* | `fleet.groups` | **New** | Omit (no group membership by default) |

### Summary of Changes

| Category | Count |
|----------|-------|
| Unchanged fields | 14 |
| New fields | 9 ($schema, version, platform, targets, audit.retention, budget.warnAt, compliance.outputDir, compliance.signing, fleet.groups) |
| Renamed fields | 1 (budget.currency -> budget.unit) |
| Removed fields | 0 |
| Restructured fields | 0 |

**Backwards compatibility**: 14 of 15 v1 fields are unchanged. Only `budget.currency` is renamed. A v1 config with `"version": 2` added and `currency` renamed to `unit` is a valid v2 config. This is a non-breaking migration for all practical purposes.

---

## Backwards Compatibility Strategy

### Reading V1 Configs

When glint encounters a config file without a `version` field:

1. Treat as v1
2. Log informational message: `glint.json is v1 format. Run 'glint doctor' to migrate to v2.`
3. Map v1 fields to v2 internal representation at load time:
   - `budget.currency` -> `budget.unit`
   - All other fields pass through unchanged
4. All glint commands work normally -- no functionality is blocked by v1 format
5. `glint build` defaults to OpenClaw auto-detection (preserving v1 assumption)

### Coexistence Rules

| Behavior | V1 config | V2 config |
|----------|-----------|-----------|
| `glint build` | Auto-detect OpenClaw only | Auto-detect any platform, or use `platform`/`targets` |
| `glint build cursor` | Works (cross-compile) | Works (cross-compile) |
| `glint pinch` | Works | Works |
| `glint doctor` | Offers migration to v2 | Full platform-aware checks |
| IDE autocomplete | No (no $schema) | Yes ($schema) |
| Multi-target build | Not supported | Supported via `targets` |

**Key principle**: V1 configs work indefinitely. Migration is encouraged but never forced. `glint doctor` offers migration, `glint init --migrate` performs it, but no command ever fails solely because the config is v1.

---

## `glint init` Behavior Per Platform

### Common Init Flow

```
1. Detect platform from workspace marker files
2. If no platform detected: create platform-agnostic config
3. If platform detected: create config with detected platform
4. If --template specified: add template + corresponding policies
5. If --fleet specified: add fleet section with registryUrl
6. Write glint.json + create .glint/ directory structure
```

### Per-Platform Init

#### `glint init` in an OpenClaw workspace (SOUL.md detected)

```json
{
  "$schema": "https://glint.dev/schemas/v2.json",
  "version": 2,
  "enabled": true,
  "trustTier": 2,
  "audit": {
    "enabled": true
  }
}
```

Additional actions:
- Creates `.glint/` directory structure
- Adds `.glint/cache/` and `build/` to `.gitignore`
- Detects `skills/` directory, logs "OpenClaw skill governance available"

#### `glint init` in a Cursor workspace (.cursorrules detected)

```json
{
  "$schema": "https://glint.dev/schemas/v2.json",
  "version": 2,
  "enabled": true,
  "trustTier": 1,
  "audit": {
    "enabled": false
  }
}
```

Notes:
- Default trustTier is T1 (not T2) because Cursor governance is advisory-only
- Audit disabled by default (Cursor workspaces are typically lightweight dev setups)
- `.cursorrules` not modified until `glint build`

#### `glint init` in a Claude Code workspace (CLAUDE.md detected)

```json
{
  "$schema": "https://glint.dev/schemas/v2.json",
  "version": 2,
  "enabled": true,
  "trustTier": 2,
  "audit": {
    "enabled": true
  }
}
```

Notes:
- Default trustTier T2 (Claude Code has tool permission enforcement)
- Audit enabled by default (Claude Code is often used in production-adjacent contexts)
- `.claude/settings.json` not modified until `glint build`

#### `glint init` in a GitHub Copilot workspace (.github/copilot-instructions.md detected)

```json
{
  "$schema": "https://glint.dev/schemas/v2.json",
  "version": 2,
  "enabled": true,
  "trustTier": 1,
  "audit": {
    "enabled": false
  }
}
```

Notes:
- T1 default (advisory-only, like Cursor)
- Audit disabled by default

#### `glint init` in a Bedrock workspace (no auto-detect, explicit)

```bash
glint init --platform bedrock --template soc2
```

```json
{
  "$schema": "https://glint.dev/schemas/v2.json",
  "version": 2,
  "enabled": true,
  "platform": "bedrock",
  "template": "soc2",
  "trustTier": 3,
  "audit": {
    "enabled": true,
    "siem": {
      "format": "json"
    }
  },
  "targets": {
    "bedrock": {
      "config": {
        "region": "us-east-1"
      }
    }
  }
}
```

Notes:
- Bedrock cannot be auto-detected reliably -- `--platform bedrock` is required
- Default trustTier T3 (Bedrock has runtime enforcement, enterprise context)
- SIEM pre-configured (enterprise users expect it)
- Explicit `targets.bedrock.config` with region prompt
- Audit enabled (Bedrock deployments are production)

#### `glint init` in a LangGraph workspace (langgraph.json detected)

```json
{
  "$schema": "https://glint.dev/schemas/v2.json",
  "version": 2,
  "enabled": true,
  "trustTier": 2,
  "audit": {
    "enabled": true
  }
}
```

Notes:
- T2 default (LangGraph has programmatic enforcement via decorators)
- Audit enabled (LangGraph apps are often production)

#### `glint init` in a CrewAI workspace (crewai.yaml detected)

```json
{
  "$schema": "https://glint.dev/schemas/v2.json",
  "version": 2,
  "enabled": true,
  "trustTier": 2,
  "audit": {
    "enabled": true
  }
}
```

Notes:
- T2 default (CrewAI has config-level enforcement)
- Audit enabled

#### `glint init` with no platform detected

```json
{
  "$schema": "https://glint.dev/schemas/v2.json",
  "version": 2,
  "enabled": true,
  "trustTier": 2
}
```

Notes:
- No `platform` field (nothing detected)
- No audit section (no reason to audit without a platform)
- `glint pinch` still works for policy validation
- `glint build` emits IR only

---

## `glint doctor` Migration Behavior

### Detection

```
1. Read glint.json
2. If no `version` field: identify as v1
3. If `version: 1`: identify as v1 (future-proofing)
4. If `version: 2`: current, no migration needed
5. If `version` > 2: warn "newer schema version, update glint CLI"
```

### Migration Offer

When `glint doctor` detects v1:

```
$ glint doctor

  Diagnostics:
    [i] glint.json is v1 format (no version field)
    [i] Detected platform: openclaw (SOUL.md found)
    [!] budget.currency is deprecated — use budget.unit

  Migration available:
    Run 'glint doctor --fix' to migrate glint.json to v2

  Changes:
    + Add "$schema": "https://glint.dev/schemas/v2.json"
    + Add "version": 2
    ~ Rename budget.currency -> budget.unit
    (no fields removed, no values changed)
```

### Migration Execution

`glint doctor --fix` performs:

1. Read existing glint.json
2. Add `$schema` field
3. Add `version: 2`
4. Rename `budget.currency` to `budget.unit` if present
5. Preserve all other fields, ordering, and formatting
6. Write updated glint.json
7. Log all changes made
8. Verify the result parses as valid v2

**Non-destructive**: The original file is backed up to `.glint/cache/glint.json.v1.bak` before migration.

### Doctor Platform Checks (V2 only)

When running with v2 config, `glint doctor` also performs platform-specific checks:

| Platform | Doctor checks |
|----------|--------------|
| OpenClaw | Gateway reachable, skill directory valid, provider config present |
| Cursor | `.cursorrules` exists, glint section intact |
| Claude Code | `CLAUDE.md` exists, `.claude/settings.json` consistent with trustTier |
| GitHub Copilot | `.github/copilot-instructions.md` exists |
| Bedrock | AWS credentials valid, Bedrock API reachable, IAM permissions sufficient |
| LangGraph | `langgraph.json` valid, Python environment has langgraph, guard module importable |
| CrewAI | `crewai.yaml` valid, Python environment has crewai |

---

## Versioning Strategy

### Schema Version Semantics

```
version: N (integer, monotonically increasing)

N=1: Q12a era (ClawsConfig). Implicit — no version field means v1.
N=2: Q12g (GlintConfig v2). Cross-platform, targets, $schema, detection.
N=3: Future — reserved for next breaking change.
```

### Version Increment Rules

| Change type | Version bump? | Example |
|-------------|---------------|---------|
| New optional field | No | Adding `audit.retention` (v2 feature) |
| New platform in `Platform` union | No | Adding `"windsurf"` as a target |
| New policy template | No | Adding `"iso-42001"` template |
| Renamed field | Yes (minor: N+1) | `budget.currency` -> `budget.unit` |
| Removed field | Yes (minor: N+1) | Removing a deprecated field |
| Restructured section | Yes (minor: N+1) | Moving `audit` under a `governance` parent |
| Changed field type | Yes (minor: N+1) | `trustTier` from number to string |

### Additive Evolution (No Version Bump)

New platforms, new templates, new optional fields within existing sections -- all additive. They don't change the schema version. The runtime ignores unknown fields gracefully (forward compatibility). This means:

- Adding `"windsurf"` as a build target: no schema change
- Adding `audit.retention.minEvents`: no schema change
- Adding a new `ComplianceConfig` field: no schema change

### Breaking Evolution (Version Bump)

Field renames, removals, type changes, or structural reorganization require a version bump. `glint doctor` bridges the gap with automated migration.

### Multi-Version Support Window

Glint supports the **current version and one prior version**:
- When v2 is current: v1 configs work (auto-mapped at load time)
- When v3 is current: v2 configs work (auto-mapped), v1 requires explicit migration
- Migration path is always stepwise: v1 -> v2 -> v3 (never v1 -> v3 directly)

### JSON Schema Publishing

Each version gets a published JSON Schema:

```
https://glint.dev/schemas/v1.json    ← Q12a era (preserved for reference)
https://glint.dev/schemas/v2.json    ← current
https://glint.dev/schemas/latest.json ← redirect to v2.json
```

The `latest.json` redirect is useful for `$schema` in configs that should always validate against the newest version. Specific version URLs are for configs that need stability.

---

## Directory Migration

### Q12a Era Directory Names

| Era | Config | Directory |
|-----|--------|-----------|
| Q12 | `clawsc.json` | `.clawsc/` |
| Q12a-Q12c | `claws.json` | `.claws/` |
| Q12d+ | `glint.json` | `.glint/` |

### Legacy Directory Detection

`glint doctor` detects legacy directories and offers migration:

```
$ glint doctor

  [!] Found legacy directory: .claws/ (Q12a-Q12c era)
      Current directory should be: .glint/
      Run 'glint doctor --fix' to migrate

  Migration:
    .claws/ -> .glint/ (move all contents)
    claws.json -> glint.json (rename + upgrade to v2)
```

### Migration Execution

1. Copy `.claws/` to `.glint/` (not move -- safe)
2. Rename `claws.json` to `glint.json` (with v2 upgrade)
3. Update `.gitignore` references
4. Log: "Migration complete. Verify and remove .claws/ manually."
5. Does NOT delete `.claws/` -- user must confirm removal

---

## Findings

1. **V1-to-V2 is nearly non-breaking**: Only one field rename (`budget.currency` -> `budget.unit`) and the addition of new optional fields. Every v1 config works with v2 by adding `version: 2`. This is the gentlest possible migration path.

2. **Auto-detection makes migration invisible**: V1 configs assumed OpenClaw. V2 auto-detects OpenClaw from `SOUL.md`. A v1 user who upgrades to the v2 CLI gets the same behavior without touching their config -- auto-detection fills the gap.

3. **`glint doctor` is the migration tool**: No separate migration command needed. `glint doctor` detects v1, explains changes, and `glint doctor --fix` applies them. This is consistent with `glint doctor`'s role as the workspace diagnostic tool.

4. **Additive versioning is sustainable**: Most schema evolution (new platforms, new templates, new optional fields) requires no version bump. Only structural changes require N+1. This means v2 can serve for a long time before v3 is needed.

5. **Directory migration has historical debt**: Three directory names across the Q12 design evolution. `glint doctor` must detect all three and migrate to `.glint/`. This is a one-time cost that prevents user confusion.

6. **Platform defaults vary at init time**: The right `trustTier` and `audit.enabled` defaults differ by platform (T1/no-audit for advisory-only platforms, T2-T3/audit-on for runtime-enforced platforms). `glint init` must be platform-aware even though the schema is platform-agnostic.
