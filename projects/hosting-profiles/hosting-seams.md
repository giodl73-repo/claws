# OpenClaw Hosting Seams

## Question

How is OpenClaw hosted today, and does OpenClaw know it is being hosted?

## Short Answer

OpenClaw knows about individual hosting-shaped conditions, but not about a
single managed-host contract.

It has seams for Gateway auth, trusted proxying, runtime-only config, startup
auth/secrets activation, managed proxy routing, plugin health, policy doctor
checks, and runtime health. Those seams let a host run OpenClaw, but they do not
compose into one admission/readiness model that says:

```text
this process is running under hosted-openclaw/v0,
these host-supplied requirements are active,
these runtime facts prove they are active,
and Gateway traffic may now be accepted.
```

That is the real gap.

## Existing OpenClaw Seams

### Gateway startup pipeline

Real home: `src/gateway/server-startup-config.ts`

This is the strongest current seam. Gateway startup already:

- reads and validates the config snapshot;
- applies runtime-only plugin auto-enable;
- applies process-local config overrides;
- preflights Gateway auth secret refs;
- activates a secrets runtime snapshot;
- ensures Gateway startup auth before exposing user-facing surfaces.

This is where hosted startup admission would naturally plug in.

What is missing:

- no named hosted profile;
- no host-provided startup requirements object;
- no startup evidence object;
- no policy-conformance gate before readiness;
- no stable "hosted readiness failed because X" contract.

### Runtime-only config overrides

Real home: `src/config/runtime-overrides.ts`

OpenClaw can apply process-local overrides without mutating persisted config.
This is useful for hosted operation because Lobster/OCC should not have to write
tenant/ring/per-start values into a user's durable `openclaw.json`.

What is missing:

- override provenance is not a managed-host contract;
- no conformance check says which overrides were required or forbidden;
- no durable startup evidence explains why the runtime differs from source
  config.

### Runtime config snapshot

Real home: `src/config/runtime-snapshot.ts`

OpenClaw already has an active runtime config snapshot with revision,
fingerprints, source fingerprints, write notifications, and refresh handlers.
Secrets activation also installs runtime config snapshots.

What is missing:

- snapshots describe effective config, not host admission;
- no startup requirement can say "the runtime snapshot must include brokered
  egress and trusted-proxy posture";
- no readiness status ties snapshot fingerprints to policy conformance.

### Gateway auth and trusted proxy

Real homes:

- `src/config/types.gateway.ts`
- `src/gateway/auth-resolve.ts`
- `src/gateway/auth.ts`

OpenClaw already has `gateway.auth.mode = "trusted-proxy"`, trusted proxy
headers, required headers, allow-users, loopback controls, trusted proxy source
checks, origin checks, and clear auth failure reasons.

What is missing:

- there is no higher-level "hosted Gateway profile" that requires
  trusted-proxy auth plus the correct bind/direct-access posture;
- policy can require auth generally, but does not yet express startup admission
  like "hosted traffic is forbidden until trusted-proxy evidence is active";
- direct local access and proxy identity are configured as separate knobs, not
  summarized as hosted readiness.

### Managed proxy / brokered egress

Real homes:

- `src/config/zod-schema.proxy.ts`
- `src/infra/net/proxy/proxy-lifecycle.ts`
- `src/infra/net/proxy/active-proxy-state.ts`
- `src/proxy-capture/*`

OpenClaw already supports a managed external HTTP proxy, process-wide proxy env
injection, inherited child-process proxy state, loopback policy, active proxy
registration, TLS options, and bypasses for trusted loopback control-plane URLs.

What is missing:

- existing `proxy.*` config says how to route traffic, not whether hosted
  brokered egress is a required startup invariant;
- no standard evidence says "brokered egress is active, inherited by children,
  and fail-closed";
- no generic "no provider secrets in runtime" hosted posture is tied to proxy
  readiness;
- no readiness gate blocks Gateway traffic until required brokered egress is
  active.

### Policy conformance and doctor checks

Real homes:

- `extensions/policy/src/policy-conformance.ts`
- `extensions/policy/src/doctor/scopes/gateway.ts`
- other `extensions/policy/src/doctor/scopes/*`

Policy already compares candidate policy against a baseline and has doctor
checks for Gateway exposure, auth, rate limits, insecure Control UI toggles,
Tailscale Funnel, remote gateway mode, HTTP endpoints, URL fetch allowlists, and
node command deny posture.

This strongly suggests policy should own hosted startup requirements where they
are normative requirements.

What is missing:

- policy mainly evaluates config/evidence after the fact;
- there is no `policy.startup` or equivalent startup-admission section;
- policy does not yet consume a generic runtime startup evidence object;
- startup does not fail readiness based on policy conformance.

### Gateway health

Real homes:

- `src/gateway/server/health-state.ts`
- `src/gateway/server-methods/health.ts`
- `src/commands/health.ts`

OpenClaw health already reports channels, plugins, sessions, event loop,
config reload, model pricing, context-engine quarantine, delivery queues, and
some sensitive runtime facts for admin callers.

What is missing:

- health is observation, not admission;
- health can be cached/refreshed and is not the same as startup readiness;
- there is no hosted conformance status in health;
- no first-class "readiness gates passed/failed" summary exists.

### Plugin runtime boundary

Real home: `src/plugin-sdk/runtime-env.ts`

Plugins get shared runtime utilities, logging, env helpers, retry/backoff,
proxy dispatcher helpers, and runtime config snapshot helpers.

What is missing:

- no plugin-facing hosted context;
- plugins cannot declare "I require hosted startup evidence X";
- plugin load/health is not part of a generic hosted readiness gate.

## What This Means For The RFC

The RFC should stop sounding like OpenClaw needs a second config tree.

The sharper proposal is:

```text
1. Reuse existing OpenClaw config for durable settings.
2. Add policy-owned startup requirements for hosted/managed operation.
3. Add runtime-owned startup evidence from Gateway, proxy, secrets, state,
   plugins, and config snapshots.
4. Add hosted ignition checks that evaluate requirements against evidence.
5. Expose the resulting conformance status through health/diagnostics.
```

## Likely Interface Shape

Policy-owned startup requirements:

```jsonc
{
  "startup": {
    "requireProfile": "hosted-openclaw/v0",
    "gateway": {
      "requireTrustedProxy": true,
      "forbidDirectUnauthenticatedAccess": true
    },
    "egress": {
      "requireBrokered": true,
      "requireFailClosed": true,
      "forbidRuntimeProviderSecrets": true
    },
    "state": {
      "requireWorkspaceRestoredBeforeReady": true,
      "requireSingleWriter": true
    },
    "plugins": {
      "requireAllSelectedPluginsResolved": true
    }
  }
}
```

Runtime-owned startup evidence:

```jsonc
{
  "profile": "hosted-openclaw/v0",
  "config": {
    "sourceFingerprint": "...",
    "runtimeFingerprint": "..."
  },
  "gateway": {
    "authMode": "trusted-proxy",
    "trustedProxyConfigured": true,
    "directUnauthenticatedAccess": false
  },
  "egress": {
    "managedProxyActive": true,
    "childProcessProxyInherited": true,
    "runtimeProviderSecretsPresent": false
  },
  "state": {
    "workspaceRestored": true,
    "singleWriter": true
  },
  "plugins": {
    "requiredResolved": true
  }
}
```

Startup gate result:

```jsonc
{
  "ok": false,
  "profile": "hosted-openclaw/v0",
  "failures": [
    {
      "checkId": "hosted/egress/managed-proxy-required",
      "severity": "error",
      "requirement": "oc://policy/startup/egress/requireBrokered",
      "evidence": "oc://runtime/startup/egress/managedProxyActive",
      "message": "Brokered egress is required but no active managed proxy was registered."
    }
  ]
}
```

## Why OpenClaw Does Not Fully Know It Is Hosted Today

OpenClaw can infer hosted-like posture from:

- Gateway trusted-proxy config;
- remote/local Gateway mode;
- proxy config and active proxy env;
- runtime-only overrides;
- secrets runtime snapshots;
- plugin auto-enable state;
- policy baselines;
- health snapshots.

But inference is not a contract. A host cannot ask OpenClaw:

```text
Are you running as hosted-openclaw/v0 for this tenant/session,
under these startup requirements,
with these facts proven before Gateway traffic?
```

That is why Lobster keeps needing baked config, adapter checks, env restore
lists, and container-level patches. Lobster is compensating for a missing
OpenClaw startup-admission seam.

## Proposed Contract Name

Use **Hosted Ignition Checks** as the precise seam.

The larger project can still be "Hosted OpenClaw Conformance Profile", but the
actual interface we are trying to add is:

```text
policy startup requirements
+ runtime startup evidence
+ hosted ignition checks
+ Gateway readiness gate
```

That is narrower and easier to place in OpenClaw.
