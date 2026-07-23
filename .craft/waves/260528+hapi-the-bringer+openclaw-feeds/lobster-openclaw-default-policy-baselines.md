# Lobster OpenClaw Default Policy Baselines

Date: 2026-06-02

## Objective

Define two OpenClaw policy baselines for Lobster:

1. A product-shipped global baseline that represents the minimum policy
   standard Lobster expects for OpenClaw workspaces.
2. A tenant-owned Microsoft baseline that can be stricter and can be selected
   by a Microsoft tenant admin acting on behalf of the tenant/CISO posture.

Lobster should own baseline selection, storage, tenant precedence, and audit.
OpenClaw should own policy semantics, `policy compare`, `policy check`, and
workspace evidence.

## Source Inputs

- Lobster fundamentals:
  - `project-lobster-vault/Tech/OpenClaw/specs/proposals/upstream/fundamentals`
  - Compliance: C-SDL evidence, independent review, automated scanning,
    periodic evidence refresh.
  - Privacy: privacy by design, data minimization, no raw PII by default,
    retention, DSR/DPIA process.
  - Data classification: Public/Internal/Confidential/Highly Confidential,
    secrets and customer content as Highly Confidential, no HC data in logs or
    telemetry.
  - Threat modeling: DFDs, STRIDE, mitigations, independent review.
  - Responsible AI and accessibility: ship gates and review obligations.
- OpenClaw policy reference:
  - `docs/plugins/reference/policy.md`
  - `docs/cli/policy.md`

## Policy Boundaries

OpenClaw policy is a config-conformance layer. It should not claim to replace
Microsoft SDL, RAI, privacy, accessibility, or security review systems.

Use `policy.jsonc` for OpenClaw-observable configuration requirements:

- allowed/denied model providers;
- allowed/denied MCP servers;
- network/private-network posture;
- ingress/channel posture;
- Gateway exposure posture;
- feed source trust posture when feeds are present;
- agent workspace access and tool deny posture;
- sandbox runtime posture;
- config SecretRef/provider posture;
- config auth profile metadata;
- governed tool metadata.

Keep these outside `policy.jsonc` as process evidence or external gates:

- OneRAI registration and DSB approval;
- DPIA/legal basis/DSR implementation;
- SDLCA/S360/M365 Security Review status;
- penetration test evidence;
- accessibility test-pass evidence;
- manual review evidence;
- raw secret, transcript, log, telemetry, or customer-content inspection.

## Baseline Model

### Global Lobster OpenClaw baseline

This is the minimum baseline Lobster ships as software. It should be portable
across customers and not hard-code Microsoft-only providers, channels, feed ids,
or internal systems.

The global baseline should:

- require policy to exist and be hashable;
- deny obvious high-risk exposure defaults;
- require config-level secret and auth profile hygiene;
- require governed tools to declare ownership/risk/sensitivity;
- require agent workspaces to avoid broad write/runtime tool access by default;
- require sandboxing when a workspace is expected to run tools;
- leave provider/feed allowlists tenant-selectable unless Lobster ships a
  reviewed default source.

### Microsoft tenant baseline

This is a stricter tenant policy selected by a Microsoft tenant admin. It is
compared against the global baseline with `openclaw policy compare`; Lobster
accepts it only if OpenClaw reports `equal` or `stricter`.

The Microsoft tenant baseline can add:

- approved Microsoft tenant feed source ids;
- Microsoft-approved model provider allowlists;
- Microsoft-approved MCP server allowlists;
- stricter sandbox backend requirements;
- stricter channel/ingress requirements;
- stricter auth/secret provider source restrictions;
- stricter agent scopes for sensitive release, support, or production agents.

## Global Baseline Draft

```jsonc
{
  "$schema": "https://openclaw.ai/schemas/policy.schema.json",

  "network": {
    "privateNetwork": {
      "allow": false,
    },
  },

  "ingress": {
    "session": {
      "requireDmScope": "per-channel-peer",
    },
    "channels": {
      "allowDmPolicies": ["pairing", "allowlist", "disabled"],
      "denyOpenGroups": true,
      "requireMentionInGroups": true,
    },
  },

  "gateway": {
    "exposure": {
      "allowNonLoopbackBind": false,
      "allowTailscaleFunnel": false,
    },
    "auth": {
      "requireAuth": true,
      "requireExplicitRateLimit": true,
    },
    "controlUi": {
      "allowInsecure": false,
    },
    "remote": {
      "allow": false,
    },
    "http": {
      "denyEndpoints": ["chatCompletions", "responses"],
      "requireUrlAllowlists": true,
    },
  },

  "agents": {
    "workspace": {
      "allowedAccess": ["none", "ro"],
      "denyTools": ["exec", "process", "write", "edit", "apply_patch"],
    },
  },

  "sandbox": {
    "requireMode": ["all", "non-main"],
    "containers": {
      "denyHostNetwork": true,
      "denyContainerNamespaceJoin": true,
      "requireReadOnlyMounts": true,
      "denyContainerRuntimeSocketMounts": true,
      "denyUnconfinedProfiles": true,
    },
    "browser": {
      "requireCdpSourceRange": true,
    },
  },

  "secrets": {
    "requireManagedProviders": true,
    "denySources": ["exec", "file"],
    "allowInsecureProviders": false,
  },

  "auth": {
    "profiles": {
      "requireMetadata": ["provider", "mode"],
      "allowModes": ["api_key", "oauth", "token"],
    },
  },

  "tools": {
    "requireMetadata": ["risk", "sensitivity", "owner"],
    "profiles": {
      "allow": ["minimal", "messaging"],
    },
    "fs": {
      "requireWorkspaceOnly": true,
    },
    "exec": {
      "allowSecurity": ["deny", "allowlist"],
      "requireAsk": ["always"],
      "allowHosts": ["sandbox"],
    },
    "elevated": {
      "allow": false,
    },
    "denyTools": ["group:runtime", "group:fs"],
  },
}
```

Notes:

- This is intentionally not a complete Microsoft internal compliance program.
- This is a config-conformance minimum for OpenClaw workspaces.
- `sandbox.containers.*` rules should only be enabled where the target OpenClaw
  build can observe those fields for the selected backend. Otherwise OpenClaw
  should correctly report unobservable container posture findings.
- Data-handling rules should be added to the global baseline when the target
  OpenClaw build exposes the current `dataHandling` policy schema. The intent is
  to require redaction, deny telemetry content capture, require retention
  maintenance, and deny transcript memory indexing, but only using real shipped
  policy fields.

## Microsoft Tenant Baseline Draft

```jsonc
{
  "$schema": "https://openclaw.ai/schemas/policy.schema.json",

  "mcp": {
    "servers": {
      "allow": ["microsoft-docs", "microsoft-graph", "sharepoint"],
      "deny": ["untrusted", "local-dev-remote"],
    },
  },

  "models": {
    "providers": {
      "allow": ["azure-openai", "foundry"],
      "deny": ["openrouter", "local", "unreviewed"],
    },
  },

  "feeds": {
    "sources": {
      "require": ["microsoft-reviewed"],
      "requirePinned": true,
      "allowUnsigned": false,
    },
  },

  "network": {
    "privateNetwork": {
      "allow": false,
    },
  },

  "ingress": {
    "session": {
      "requireDmScope": "per-channel-peer",
    },
    "channels": {
      "allowDmPolicies": ["pairing", "allowlist", "disabled"],
      "denyOpenGroups": true,
      "requireMentionInGroups": true,
    },
  },

  "gateway": {
    "exposure": {
      "allowNonLoopbackBind": false,
      "allowTailscaleFunnel": false,
    },
    "auth": {
      "requireAuth": true,
      "requireExplicitRateLimit": true,
    },
    "controlUi": {
      "allowInsecure": false,
    },
    "remote": {
      "allow": false,
    },
    "http": {
      "denyEndpoints": ["chatCompletions", "responses"],
      "requireUrlAllowlists": true,
    },
  },

  "agents": {
    "workspace": {
      "allowedAccess": ["none", "ro"],
      "denyTools": ["exec", "process", "write", "edit", "apply_patch"],
    },
  },

  "sandbox": {
    "requireMode": ["all"],
    "allowBackends": ["docker"],
    "containers": {
      "denyHostNetwork": true,
      "denyContainerNamespaceJoin": true,
      "requireReadOnlyMounts": true,
      "denyContainerRuntimeSocketMounts": true,
      "denyUnconfinedProfiles": true,
    },
    "browser": {
      "requireCdpSourceRange": true,
    },
  },

  "secrets": {
    "requireManagedProviders": true,
    "denySources": ["exec", "file", "env"],
    "allowInsecureProviders": false,
  },

  "auth": {
    "profiles": {
      "requireMetadata": ["provider", "mode"],
      "allowModes": ["oauth", "token"],
    },
  },

  "tools": {
    "requireMetadata": ["risk", "sensitivity", "owner"],
    "profiles": {
      "allow": ["minimal", "messaging"],
    },
    "fs": {
      "requireWorkspaceOnly": true,
    },
    "exec": {
      "allowSecurity": ["deny", "allowlist"],
      "requireAsk": ["always"],
      "allowHosts": ["sandbox"],
    },
    "elevated": {
      "allow": false,
    },
    "denyTools": ["group:runtime", "group:fs"],
  },

  "scopes": {
    "release-agents": {
      "agentIds": ["release-agent", "production-support-agent"],
      "tools": {
        "profiles": {
          "allow": ["minimal"],
        },
        "denyTools": [
          "group:runtime",
          "group:fs",
          "exec",
          "process",
          "write",
          "edit",
          "apply_patch",
        ],
      },
      "agents": {
        "workspace": {
          "allowedAccess": ["none"],
          "denyTools": ["exec", "process", "write", "edit", "apply_patch"],
        },
      },
      "sandbox": {
        "requireMode": ["all"],
        "allowBackends": ["docker"],
      },
    },
  },
}
```

Notes:

- Provider, MCP, and feed ids are placeholders until the tenant catalog is
  finalized.
- The Microsoft baseline should be allowed to be stricter than the shipped
  global baseline. It should not be required to stay generic.
- Tenant admins should be able to submit this baseline through Lobster admin
  APIs. Lobster accepts it only after OpenClaw compares it to the global
  baseline and reports `equal` or `stricter`.

## Workspace Creation Flow

When Lobster creates an OpenClaw workspace/container:

1. Resolve the effective baseline:
   - start with the Lobster global baseline;
   - if the authenticated tenant has an accepted tenant baseline, use that
     tenant baseline;
   - if no tenant baseline exists, use the global baseline.
2. Materialize the effective baseline into the workspace/container as the
   default policy file, for example:
   - `.openclaw/policy/effective.policy.jsonc` for the managed baseline;
   - `policy.jsonc` as the active policy path if OpenClaw expects that path.
3. Configure the Policy plugin for the workspace:
   - `plugins.entries.policy.enabled = true`;
   - `plugins.entries.policy.config.enabled = true`;
   - `plugins.entries.policy.config.path = "policy.jsonc"` or the selected
     managed path;
   - `expectedHash` and `expectedAttestationHash` after the first clean check.
4. Run inside the OpenClaw container:
   - `openclaw policy compare --baseline <global-baseline> --policy <effective-policy> --json`
   - `openclaw policy check --json`
   - `openclaw doctor --lint`
5. Store audit output in Lobster:
   - baseline id and revision;
   - policy hash;
   - attestation hash;
   - comparison result;
   - workspace conformance result;
   - checked OpenClaw version and policy schema version.
6. Default response to nonconformance:
   - flag and warn;
   - block tenant baseline writes that are weaker than the global baseline;
   - do not shut down the user OpenClaw container unless a later enforcement
     policy explicitly says to do that.

## PR Shape

Recommended stack on top of the current Lobster admin PRs:

1. Baseline documents and test fixtures:
   - add global baseline fixture;
   - add Microsoft tenant baseline fixture;
   - document which fields are placeholders and which are enforced.
2. Admin API/runtime baseline storage:
   - store deployment baseline ref/content;
   - store tenant baseline ref/content;
   - accept tenant baseline only after OpenClaw compare says `equal` or
     `stricter`.
3. Workspace bootstrap:
   - materialize effective policy into newly created OpenClaw workspaces;
   - configure Policy plugin path/hash settings;
   - run policy check and record conformance.
4. Operational UX/audit:
   - show tenant baseline selection;
   - show last conformance status and attestation;
   - let tenant admin replace the tenant baseline and see compare failures.

## Open Questions

- Exact managed policy path inside the OpenClaw workspace/container.
- Whether `policy.jsonc` should be user-editable or generated from a managed
  `.openclaw/policy/effective.policy.jsonc` file.
- Exact Microsoft-approved provider/feed/MCP ids.
- Whether the first Lobster implementation should run `doctor --lint` on every
  workspace creation or only on first launch plus periodic/background checks.
- Whether nonconforming workspaces remain flag-and-warn forever or gain an
  explicit tenant/admin enforcement mode later.

## 2026-06-02 Implementation Note

Draft PR: https://microsoft.ghe.com/bic/lobster/pull/2270

Branch: `user/giodl/lobster-admin-policy-bootstrap`

Base: `user/giodl/lobster-admin-spaces-runtime`

Commit: `33a752407 openclaw: bootstrap managed policy baselines`

What landed in the draft:

- Lobster admin-space docs now describe OpenClaw workspace policy bootstrap,
  tenant baseline update rules, next-start upgrades, kill switch, exemptions,
  and flag-and-warn default handling.
- `lobster_runtime::admin_spaces` now has the effective policy baseline
  decision model. Accepted tenant baselines are used only when they were
  compared against the current deployment baseline floor.
- `openclaw_container` now bakes `/opt/openclaw/config/policy.global.jsonc`,
  materializes the effective baseline into the OpenClaw workspace before
  Gateway starts, and configures the Policy plugin to read that managed file.
- Disabled or exempted bootstrap states now explicitly disable stale Policy
  plugin overlays so the bypass takes effect on already-bootstrapped
  workspaces.
- Managed policy paths are confined to relative workspace paths. Absolute
  paths, drive prefixes, root paths, and parent traversal fail closed.

Validation:

```bash
cargo fmt --manifest-path src\openclaw_container\Cargo.toml --check
cargo fmt --manifest-path src\lobster_runtime\Cargo.toml --check
cargo test --manifest-path src\openclaw_container\Cargo.toml -p openclaw-adapter policy_bootstrap
cargo test --manifest-path src\openclaw_container\Cargo.toml -p openclaw-adapter default_policy_baseline_is_under_system_config_dir
cargo clippy --manifest-path src\openclaw_container\Cargo.toml -p openclaw-adapter --bin openclaw-adapter -- -D warnings
git diff --check
codex review --commit 33a752407
```

Known local blockers:

- `cargo test --manifest-path src\lobster_runtime\Cargo.toml admin_spaces`
  still fails before compile because the local environment cannot resolve the
  private `ecsclient` package.
- Full `cargo check --manifest-path src\openclaw_container\Cargo.toml` on
  Windows still reaches the existing Unix-only `aether-priv-bridge` target.
