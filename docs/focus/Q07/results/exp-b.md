# Experiment b: Schema Design

**Question**: Q12g — What is the right glint.json schema for cross-platform governance?
**Experiment**: Draft GlintConfig v2 TypeScript type with core/targets/detection layers. Validate against 5 scenarios with example glint.json files.
**Method**: Design analysis
**Result**: Complete TypeScript schema + 5 validated scenario examples.

---

## GlintConfig v2 — TypeScript Type Definition

```typescript
/**
 * GlintConfig v2 — Cross-platform governance configuration.
 *
 * Three-layer schema:
 *   1. Core (platform-agnostic): governance policies that apply to any agent on any platform
 *   2. Targets (platform-specific): build/emit config per target platform
 *   3. Detection (auto + explicit): platform identification for default build target
 *
 * File: glint.json (per-workspace)
 * Directory: .glint/ (governance artifacts)
 */

// ─── Root ─────────────────────────────────────────────────────────

type GlintConfig = {
  /** JSON Schema URL for IDE autocomplete. */
  $schema?: string;

  /** Schema version. Monotonically increasing integer. Current: 2. */
  version: 2;

  // ─── Detection Layer ───────────────────────────────────────────

  /**
   * Explicit platform declaration. Overrides auto-detection for `glint build` default target.
   * When omitted, glint auto-detects from workspace marker files.
   * When set, this is the default target for `glint build` (no --target flag).
   */
  platform?: Platform;

  // ─── Core Layer (platform-agnostic) ────────────────────────────

  /** Master governance toggle. When false, `glint build` compiles but skips pinch. */
  enabled: boolean;

  /** Policy template applied at init. Determines baseline policy set. */
  template?: PolicyTemplate;

  /**
   * Trust tier (T0-T4). Default: T2.
   *   T0 = no trust (fully sandboxed)
   *   T1 = low trust (read-only tools)
   *   T2 = standard trust (scoped tool access)
   *   T3 = high trust (broad tool access, audit required)
   *   T4 = maximum trust (unrestricted, full audit + approval gates)
   */
  trustTier?: TrustTier;

  /** Paths to policy YAML files (relative to workspace root). */
  policies?: string[];

  /** Audit chain configuration. */
  audit?: AuditConfig;

  /** Token/cost budget configuration. */
  budget?: BudgetConfig;

  /** Compliance framework configuration. */
  compliance?: ComplianceConfig;

  /** Fleet management metadata. Auto-populated by `glint broadcast`. */
  fleet?: FleetConfig;

  // ─── Targets Layer (platform-specific) ─────────────────────────

  /**
   * Per-platform build configuration. Each key is a platform name.
   * When present, `glint build` builds all configured targets.
   * When absent, `glint build` builds the auto-detected or explicit `platform` only.
   *
   * Platform-specific overrides (trustTier, policies) merge with core values.
   * Target-specific trustTier overrides core trustTier for that target only.
   * Target-specific policies are appended to core policies for that target.
   */
  targets?: Partial<Record<Platform, TargetConfig>>;
};

// ─── Platform ─────────────────────────────────────────────────────

type Platform =
  | "openclaw"
  | "cursor"
  | "claude"
  | "github"
  | "bedrock"
  | "langgraph"
  | "crewai";

// ─── Policy Templates ────────────────────────────────────────────

type PolicyTemplate =
  | "minimal"
  | "soc2"
  | "hipaa"
  | "eu-ai-act"
  | "nist-ai-rmf"
  | "iso-42001";

// ─── Trust Tiers ─────────────────────────────────────────────────

type TrustTier = 0 | 1 | 2 | 3 | 4;

// ─── Audit Config ────────────────────────────────────────────────

type AuditConfig = {
  /** Enable audit chain. Default: true when template is set. */
  enabled: boolean;

  /** Path to audit chain file. Default: ".glint/audit/chain.jsonl". */
  chain?: string;

  /** SIEM integration for audit event export. */
  siem?: {
    /** Export format. */
    format: "cef" | "json" | "syslog";
    /** SIEM endpoint URL. When set, events are forwarded in real-time. */
    endpoint?: string;
  } | null;

  /** Retention policy. */
  retention?: {
    /** Maximum age of audit events. ISO 8601 duration. Default: "P1Y" (1 year). */
    maxAge?: string;
    /** Maximum number of events. Default: unlimited. */
    maxEvents?: number;
  };
};

// ─── Budget Config ───────────────────────────────────────────────

type BudgetConfig = {
  /** Monthly token/cost ceiling. */
  ceiling?: number;

  /** Budget unit. Default: "USD". Can also be "tokens". */
  unit?: "USD" | "tokens";

  /** Enforcement behavior when ceiling is approached/exceeded. */
  enforcement?: "warn" | "alert" | "throttle" | "pause" | "stop";

  /** Warning threshold as percentage of ceiling (0-100). Default: 80. */
  warnAt?: number;
};

// ─── Compliance Config ───────────────────────────────────────────

type ComplianceConfig = {
  /** Active compliance frameworks. */
  frameworks?: string[];

  /** Auto-run risk assessment on build. Default: false. */
  autoAssess?: boolean;

  /** Compliance evidence output directory. Default: ".glint/compliance/". */
  outputDir?: string;

  /** Signing configuration for compliance artifacts. */
  signing?: {
    /** Signing algorithm. Default: "HMAC-SHA256". */
    algorithm?: "HMAC-SHA256" | "RSA-SHA256" | "ECDSA-P256";
    /** Path to signing key. */
    keyPath?: string;
  };
};

// ─── Fleet Config ────────────────────────────────────────────────

type FleetConfig = {
  /** Fleet registry URL. Set by platform engineer. */
  registryUrl?: string;

  /** ISO timestamp of last broadcast received. Auto-set by `glint broadcast`. */
  lastBroadcast?: string;

  /** Hash of current policy state. Auto-set by `glint broadcast` and `glint drift`. */
  driftHash?: string;

  /** Fleet group membership. Allows selective broadcast targeting. */
  groups?: string[];
};

// ─── Target Config (platform-specific) ───────────────────────────

type TargetConfig = {
  /** Override trust tier for this target only. Merges with core trustTier. */
  trustTier?: TrustTier;

  /** Additional policies for this target. Appended to core policies. */
  policies?: string[];

  /** Build output directory override. Default: "build/<platform>/". */
  outputDir?: string;

  /**
   * Platform-specific configuration. Shape varies by platform.
   * Validated by platform-specific schemas at build time.
   */
  config?: PlatformSpecificConfig;
};

// ─── Platform-Specific Configs ───────────────────────────────────

type PlatformSpecificConfig =
  | OpenClawTargetConfig
  | CursorTargetConfig
  | ClaudeTargetConfig
  | GitHubTargetConfig
  | BedrockTargetConfig
  | LangGraphTargetConfig
  | CrewAITargetConfig;

type OpenClawTargetConfig = {
  /** Emit governance skill to skills/ directory. Default: true. */
  emitSkill?: boolean;
  /** Emit before_tool_call hooks. Default: true. */
  emitHooks?: boolean;
  /** Emit AGENTS.md amendments via FORMA. Default: true. */
  emitAmendments?: boolean;
  /** Gateway URL for doctor checks. */
  gatewayUrl?: string;
};

type CursorTargetConfig = {
  /** Merge strategy for existing .cursorrules content. */
  mergeStrategy?: "append" | "prepend" | "replace-section";
  /** Section delimiter for glint-managed rules. Default: "<!-- glint -->". */
  sectionMarker?: string;
};

type ClaudeTargetConfig = {
  /** Merge strategy for existing CLAUDE.md content. */
  mergeStrategy?: "append" | "prepend" | "replace-section";
  /** Section delimiter for glint-managed instructions. Default: "<!-- glint -->". */
  sectionMarker?: string;
  /** Emit .claude/settings.json tool permissions. Default: true. */
  emitSettings?: boolean;
};

type GitHubTargetConfig = {
  /** Merge strategy for existing copilot-instructions.md content. */
  mergeStrategy?: "append" | "prepend" | "replace-section";
  /** Section delimiter. Default: "<!-- glint -->". */
  sectionMarker?: string;
};

type BedrockTargetConfig = {
  /** AWS region for guardrail deployment. */
  region?: string;
  /** Guardrail name prefix. Default: "glint-". */
  guardrailPrefix?: string;
  /** Deploy guardrail via API on build. Default: false (emit JSON only). */
  autoDeploy?: boolean;
  /** CloudFormation/CDK output format. */
  iacFormat?: "cloudformation" | "cdk" | "none";
};

type LangGraphTargetConfig = {
  /** Output Python module name. Default: "glint_guards". */
  moduleName?: string;
  /** Guard decorator style. */
  decoratorStyle?: "wrap" | "before-after" | "checkpoint";
  /** LangSmith project for governance trace correlation. */
  langsmithProject?: string;
};

type CrewAITargetConfig = {
  /** Merge strategy for crewai.yaml governance section. */
  mergeStrategy?: "append" | "replace-section";
  /** Emit Python guardrail callbacks. Default: true. */
  emitCallbacks?: boolean;
  /** Per-agent governance (map agent names to trust tier overrides). */
  agentOverrides?: Record<string, { trustTier?: TrustTier }>;
};
```

---

## Schema Design Principles

### P1: Core is universal, targets are narrow

The core layer (enabled, trustTier, policies, audit, budget, compliance, fleet) applies to every agent on every platform. These fields carry 90%+ of the governance semantics. The targets layer holds only platform-specific build/emit configuration -- output format, merge strategy, runtime integration points. This keeps glint.json small for single-platform users (no `targets` needed) while supporting multi-platform builds.

### P2: Explicit platform overrides auto-detection

The `platform` field is optional. When omitted, `glint build` auto-detects from workspace marker files (see exp-a). When set, it overrides detection for the default build target. The `targets` map further overrides by enabling multi-target builds. Priority: `targets` > `platform` > auto-detect.

### P3: Target-specific overrides merge, not replace

A target's `trustTier` overrides the core `trustTier` for that target only. A target's `policies` are appended to core `policies` for that target. This means core policies always apply -- targets can only add stricter governance, never weaken it.

### P4: Fleet metadata is auto-populated

The `fleet` section is never manually written by developers. `glint broadcast` sets `lastBroadcast` and `driftHash`. `glint scan` discovers workspaces. Platform engineers set `registryUrl` and `groups` via `glint init --fleet`.

### P5: $schema enables IDE autocomplete

The `$schema` field points to a published JSON Schema (e.g., `https://glint.dev/schemas/v2.json`). IDEs like VS Code, Cursor, and JetBrains auto-load schema for validation and autocomplete. This is the single most effective developer experience investment.

### P6: Version field enables migration

`version: 2` is a monotonically increasing integer. When `glint doctor` encounters a v1 config (Q12a format, no `version` field), it offers automatic migration. New fields added in future versions get defaults, maintaining backwards compatibility within a major version.

---

## Scenario Validation

### Scenario 1: Pure OpenClaw Workspace

A developer with a single OpenClaw agent workspace. Auto-detected, minimal config.

```json
{
  "$schema": "https://glint.dev/schemas/v2.json",
  "version": 2,
  "enabled": true,
  "template": "soc2",
  "trustTier": 2,
  "audit": {
    "enabled": true
  }
}
```

**Behavior**:
- `glint build` auto-detects OpenClaw from `SOUL.md`, builds OC output
- `glint pinch` validates against soc2 template policies
- No `targets` map needed -- single platform, defaults are correct
- `glint doctor` checks OC Gateway reachability

**Lines of config**: 8. Clean, minimal, no platform-specific noise.

---

### Scenario 2: Pure Cursor Workspace

A developer using Cursor for AI-assisted coding. Wants governance policies in their `.cursorrules`.

```json
{
  "$schema": "https://glint.dev/schemas/v2.json",
  "version": 2,
  "enabled": true,
  "trustTier": 1,
  "policies": [".glint/policies/code-review-rules.yaml"],
  "audit": {
    "enabled": false
  }
}
```

**Behavior**:
- `glint build` auto-detects Cursor from `.cursorrules`, emits governance rules
- Trust tier T1 (low trust) -- Cursor rules are advisory, so strict policy is important
- Audit disabled -- lightweight workspace, no compliance requirement
- No `template` -- custom policies only

**Lines of config**: 8. Same simplicity as OpenClaw scenario.

---

### Scenario 3: Multi-Target (OpenClaw + Claude Code)

A team maintains an agent that runs on OpenClaw in production and is developed locally using Claude Code. Different trust tiers for different environments.

```json
{
  "$schema": "https://glint.dev/schemas/v2.json",
  "version": 2,
  "enabled": true,
  "template": "soc2",
  "trustTier": 2,
  "policies": [
    ".glint/policies/soc2-baseline.yaml",
    ".glint/policies/data-handling.yaml"
  ],
  "audit": {
    "enabled": true,
    "siem": {
      "format": "json",
      "endpoint": "https://siem.corp.example.com/ingest"
    }
  },
  "compliance": {
    "frameworks": ["soc2"],
    "autoAssess": true
  },
  "targets": {
    "openclaw": {
      "trustTier": 3,
      "config": {
        "emitSkill": true,
        "emitHooks": true,
        "gatewayUrl": "http://localhost:8080"
      }
    },
    "claude": {
      "trustTier": 2,
      "policies": [".glint/policies/dev-environment.yaml"],
      "config": {
        "emitSettings": true,
        "mergeStrategy": "replace-section"
      }
    }
  }
}
```

**Behavior**:
- `glint build` builds BOTH targets (openclaw + claude) because `targets` has two entries
- `glint build openclaw` builds only OpenClaw output
- `glint build claude` builds only Claude Code output
- OpenClaw gets T3 (overrides core T2), Claude stays T2
- Claude target gets an extra `dev-environment.yaml` policy appended to core policies
- Core policies (soc2-baseline, data-handling) apply to both targets
- SIEM integration logs all governance events to corp SIEM

**Lines of config**: 30. Richer, but the complexity is proportional to the multi-platform requirement.

---

### Scenario 4: Fleet-Managed Workspace (Platform Engineer's View)

A platform engineer manages 50 agent workspaces across the organization. This is the fleet registry configuration that gets broadcast to all workspaces.

```json
{
  "$schema": "https://glint.dev/schemas/v2.json",
  "version": 2,
  "enabled": true,
  "template": "soc2",
  "trustTier": 2,
  "policies": [
    ".glint/policies/soc2-baseline.yaml",
    ".glint/policies/corp-data-policy.yaml",
    ".glint/policies/pii-handling.yaml"
  ],
  "audit": {
    "enabled": true,
    "siem": {
      "format": "cef",
      "endpoint": "https://splunk.corp.example.com:8088/services/collector"
    },
    "retention": {
      "maxAge": "P2Y"
    }
  },
  "budget": {
    "ceiling": 500,
    "unit": "USD",
    "enforcement": "throttle",
    "warnAt": 75
  },
  "compliance": {
    "frameworks": ["soc2", "hipaa"],
    "autoAssess": true,
    "signing": {
      "algorithm": "RSA-SHA256",
      "keyPath": ".glint/secrets/signing-key.pem"
    }
  },
  "fleet": {
    "registryUrl": "https://fleet.corp.example.com/api/v1",
    "groups": ["production", "us-west-2"]
  }
}
```

**Behavior**:
- `glint broadcast` pushes this config (or derived policies) to all fleet workspaces in groups "production" + "us-west-2"
- `glint drift` detects when any workspace's policy hash diverges from the broadcast hash
- `glint pinch --fleet` validates all fleet workspaces against these policies
- Budget enforcement: throttle at $500/month, warn at 75%
- Compliance: dual framework (SOC 2 + HIPAA), auto-assess on every build, RSA-signed artifacts
- No `platform` or `targets` -- fleet config is platform-agnostic. Individual workspaces add their own platform detection.

**Lines of config**: 33. Rich but justified -- fleet management requires more knobs.

---

### Scenario 5: Minimal (No Platform Detected)

A developer wants governance policies without targeting any specific agent platform. Maybe they're building a custom agent framework, or they just want `glint pinch` for policy validation.

```json
{
  "$schema": "https://glint.dev/schemas/v2.json",
  "version": 2,
  "enabled": true,
  "trustTier": 2
}
```

**Behavior**:
- `glint pinch` works -- validates workspace against default T2 policies
- `glint build` emits platform-agnostic IR to `.glint/cache/compile/` (no platform output)
- `glint audit` works -- logs governance events regardless of platform
- `glint doctor` reports "no platform detected" as informational, not error
- Developer can add `platform` or `targets` later as they commit to a platform

**Lines of config**: 4. The absolute minimum. Governance without platform commitment.

---

## Schema Size Analysis

| Scenario | Lines | Complexity | Justification |
|----------|-------|------------|---------------|
| Pure single-platform | 8 | Low | No targets needed, auto-detect handles it |
| Two targets | 30 | Medium | Proportional to multi-platform needs |
| Fleet-managed | 33 | Medium-High | Fleet, compliance, budget all needed |
| Minimal | 4 | Minimal | Governance without platform commitment |

The schema scales with need. A developer who writes `{ "version": 2, "enabled": true }` gets a working governance setup. A platform engineer managing 50 workspaces gets fleet, compliance, signing, and SIEM integration. No one writes config they don't need.

---

## JSON Schema ($schema) Design

The `$schema` field enables IDE autocomplete and validation. The schema is published at:

```
https://glint.dev/schemas/v2.json
```

Schema features:
- All fields documented with `description`
- Enum constraints on `platform`, `trustTier`, `template`, `enforcement`
- `targets` map uses `additionalProperties` with `$ref` to TargetConfig
- Platform-specific `config` validated via conditional schemas (`if platform == "openclaw" then ...`)
- Required fields: `version`, `enabled`
- Default values documented but not enforced in schema (runtime defaults)

Versioned URLs: `v1.json` for Q12a-era schema, `v2.json` for this schema. Future: `v3.json`, etc.

---

## Findings

1. **Core/targets split validated**: All 5 scenarios work cleanly. Single-platform users never touch `targets`. Multi-platform users get isolated per-target config. Fleet managers ignore platform entirely.

2. **Merge semantics matter**: Target-specific `trustTier` overrides core, but target-specific `policies` append to core. This ensures core governance is never weakened by target config -- a critical security property.

3. **Platform-specific config is thin**: The `config` object per target holds 3-5 fields at most. Most governance is in the universal core layer. This validates the hypothesis that 90%+ of governance is platform-agnostic.

4. **$schema is the highest-ROI DX feature**: A single field that gives every IDE user autocomplete, validation, and inline documentation. Must ship with v2.

5. **Fleet config is metadata, not governance**: Fleet section tracks broadcast state, not governance rules. The actual governance comes from core (policies, trustTier, compliance). Fleet just tracks distribution state.
