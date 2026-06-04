# Lobster Policy Baseline - Config Conformance Draft

This is a starting baseline for Lobster/OpenClaw config conformance. It is not a
runtime enforcement promise. Runtime attestation and fail-closed behavior remain
follow-up work.

## Baseline shape

```jsonc
{
  "channels": {
    "denyRules": [
      {
        "id": "no-unapproved-provider",
        "when": { "provider": "unapproved" },
        "reason": "Only approved channel providers are allowed for this workspace.",
      },
    ],
  },
  "mcp": {
    "servers": {
      "allow": ["docs"],
      "deny": ["untrusted"],
    },
  },
  "models": {
    "providers": {
      "allow": ["openai", "anthropic"],
      "deny": ["openrouter"],
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
  "secrets": {
    "requireManagedProviders": true,
    "denySources": ["exec"],
    "allowInsecureProviders": false,
  },
  "auth": {
    "profiles": {
      "requireMetadata": ["provider", "mode"],
      "allowModes": ["api_key", "token"],
    },
  },
  "tools": {
    "requireMetadata": ["risk", "sensitivity", "owner"],
    "profiles": {
      "allow": ["messaging", "minimal"],
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
  "sandbox": {
    "requireMode": ["all", "non-main"],
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
}
```

## Config-side readiness

OpenClaw policy PRs cover the config conformance substrate needed for this
baseline:

- typed policy sections, stable check IDs, findings, evidence, and docs;
- strict policy shape validation so unsupported keys do not silently pass;
- top-level and scoped overlays with stricter duplicate handling;
- config checks for channels, MCP servers, model providers, network posture,
  gateway exposure, agent workspace posture, tool posture, secrets/auth profile
  posture, sandbox posture, ingress posture, and data handling;
- policy-to-policy comparison for checking an operator policy against an
  authored baseline;
- maintainer coverage tooling to flag config drift and newly added config
  options that policy may need to classify.

The main config-side gap is not the evaluator. It is packaging and ownership:
Lobster still needs to decide where the official baseline policy file lives,
which provider/channel/model ids are in its first approved lists, and whether
the shipped default should be "strict workspace" or a softer "report-only
enterprise posture" starter.

## Deliberate non-goals for this baseline

- Do not claim runtime enforcement or fail-closed behavior.
- Do not claim secret-value inspection or full secret management.
- Do not copy every OpenClaw config setting into policy.
- Do not make policy a second authorization language.
