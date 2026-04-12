# Experiment c: Config Schema and Directory Layout

**Method**: design analysis
**Date**: 2026-04-11

---

## openclaw.json Governance Extension

### Current OpenClaw Config (before claws)

```json
{
  "name": "my-research-agent",
  "version": "1.0.0",
  "model": "claude-sonnet-4-5-20250514",
  "modelProvider": "anthropic",
  "maxTokens": 4096,
  "temperature": 0.7,
  "tools": ["web_search", "file_read", "file_write"],
  "memory": {
    "enabled": true,
    "maxEntries": 100
  }
}
```

### After `claws init --template soc2`

```json
{
  "name": "my-research-agent",
  "version": "1.0.0",
  "model": "claude-sonnet-4-5-20250514",
  "modelProvider": "anthropic",
  "maxTokens": 4096,
  "temperature": 0.7,
  "tools": ["web_search", "file_read", "file_write"],
  "memory": {
    "enabled": true,
    "maxEntries": 100
  },
  "governance": {
    "enabled": true,
    "template": "soc2",
    "trustTier": 2,
    "policies": [
      ".openclaw/governance/policies/soc2-baseline.yaml"
    ],
    "audit": {
      "enabled": true,
      "chain": ".openclaw/governance/audit/chain.jsonl",
      "siem": null
    },
    "budget": {
      "ceiling": 50,
      "currency": "USD",
      "enforcement": "warn"
    },
    "compliance": {
      "frameworks": ["soc2"],
      "autoAssess": false
    }
  }
}
```

### Schema Definition

```typescript
type GovernanceConfig = {
  enabled: boolean;                          // master toggle
  template?: string;                         // "soc2" | "hipaa" | "eu-ai-act" | "minimal"
  trustTier?: 0 | 1 | 2 | 3 | 4;          // T0-T4, default T2
  policies?: string[];                       // paths to policy YAML files
  audit?: {
    enabled: boolean;
    chain?: string;                          // audit chain file path
    siem?: {                                 // SIEM export config
      format: "cef" | "json" | "syslog";
      endpoint?: string;                     // remote SIEM endpoint
    } | null;
  };
  budget?: {
    ceiling?: number;                        // max cost per compilation
    currency?: string;                       // "USD" default
    enforcement?: "warn" | "alert" | "throttle" | "pause" | "stop";
  };
  compliance?: {
    frameworks?: string[];                   // ["soc2", "hipaa", "eu-ai-act", "nist-ai-rmf"]
    autoAssess?: boolean;                    // auto-run risk classification on build
  };
  fleet?: {                                  // only present in fleet-managed workspaces
    registryUrl?: string;                    // fleet policy registry location
    lastBroadcast?: string;                  // ISO timestamp of last policy sync
    driftHash?: string;                      // hash for drift detection
  };
};
```

### Design Decisions

1. **`governance.enabled`**: Master toggle. `false` means claws build works but skips all governance. Lets developers try claws for compilation without committing to policies.

2. **`governance.template`**: Records which template was used at init. Not prescriptive — user can modify policies after init.

3. **`governance.fleet`**: Only populated by `claws broadcast`. Developer never writes this manually. Presence indicates "this workspace is fleet-managed."

4. **Backward compatible**: All fields are optional. An existing openclaw.json without `governance` is a valid workspace — claws auto-detects and offers to add governance.

---

## Directory Layout

### After `claws init --template soc2`

```
my-agent/
  SOUL.md                              ← existing OC file
  AGENTS.md                            ← existing OC file
  USER.md                              ← existing OC file
  TOOLS.md                             ← existing OC file
  IDENTITY.md                          ← existing OC file
  MEMORY.md                            ← existing OC file
  memory/                              ← existing OC directory
  skills/                              ← existing OC directory
  openclaw.json                        ← extended with governance section
  .openclaw/                           
    governance/                        ← NEW: governance artifacts
      policies/                        ← policy YAML files
        soc2-baseline.yaml             ← from template
      audit/                           ← audit trail
        chain.jsonl                    ← hash-chained append-only log
      cache/                           ← three-tier compilation cache
        compile/                       ← compiled IR cache
        boost/                         ← optimization cache
        eval/                          ← evaluation cache
        snapshots/                     ← named snapshots
          v1/
            manifest.json
            compile/
            boost/
            eval/
      secrets/                         ← encrypted credential vault
        vault.enc                      ← AES-256-GCM encrypted secrets
      compliance/                      ← generated evidence packages
        soc2-2026-04-11.json           ← signed compliance artifact
        manifest.sig                   ← HMAC-SHA256 signature
```

### After `claws build cursor`

```
my-agent/
  ...existing OC files...
  .openclaw/governance/                ← governance (unchanged)
  build/                               ← NEW: cross-compilation output
    cursor/                            ← Cursor workspace format
      .cursorrules
      ...
    claude/                            ← Claude Code format
      CLAUDE.md
      ...
```

### .gitignore Additions

```gitignore
# claws build output
build/

# claws cache (reproducible from source)
.openclaw/governance/cache/

# claws secrets (encrypted, but shouldn't be in git)
.openclaw/governance/secrets/
```

**What SHOULD be committed**:
- `.openclaw/governance/policies/` — policy-as-code, versioned
- `.openclaw/governance/audit/chain.jsonl` — tamper-detectable audit trail
- `.openclaw/governance/compliance/` — signed evidence (for auditors)

---

## Fleet-Managed Directory Extension

When `claws broadcast` syncs a workspace with fleet policies:

```
my-agent/
  .openclaw/
    governance/
      policies/
        soc2-baseline.yaml           ← local policy
        fleet-baseline.yaml          ← from fleet broadcast (read-only)
      fleet/                         ← fleet metadata (auto-managed)
        last-broadcast.json          ← timestamp + hash
        fleet-policy-hash.json       ← for drift detection
```

Fleet-managed files are read-only from the developer's perspective. `claws check` validates
against the union of local + fleet policies (fleet is the floor, local can only tighten).

---

## SDK Path Resolution

The workspace-detector resolves user-facing paths to internal SDK types:

```typescript
// workspace-detector.ts
function resolveGovernancePaths(workspaceRoot: string): GovernancePaths {
  const ocDir = path.join(workspaceRoot, '.openclaw', 'governance');
  return {
    policies: path.join(ocDir, 'policies'),
    auditChain: path.join(ocDir, 'audit', 'chain.jsonl'),
    cache: {
      compile: path.join(ocDir, 'cache', 'compile'),
      boost: path.join(ocDir, 'cache', 'boost'),
      eval: path.join(ocDir, 'cache', 'eval'),
    },
    snapshots: path.join(ocDir, 'cache', 'snapshots'),
    secrets: path.join(ocDir, 'secrets', 'vault.enc'),
    compliance: path.join(ocDir, 'compliance'),
    fleet: path.join(ocDir, 'fleet'),
    buildOutput: path.join(workspaceRoot, 'build'),
  };
}
```

When running via `craft`/`guard`/`fleet` (Craftworks-native), the same logic resolves to `.craft/` paths. The SDK types are identical — only the path resolution differs.

---

## Key Findings

1. **openclaw.json governance extension is clean** — all optional fields, backward compatible
2. **Directory layout is intuitive** — governance/ under .openclaw/, build output in build/
3. **Three gitignore categories** — cache (don't commit), secrets (don't commit), policies+audit+compliance (commit)
4. **Fleet metadata is auto-managed** — developers never touch fleet/ directory
5. **SDK path resolution is a thin mapping** — .openclaw/governance/ ↔ .craft/ resolve to same types
6. **`governance.enabled` toggle** lets developers try compilation without committing to policies
