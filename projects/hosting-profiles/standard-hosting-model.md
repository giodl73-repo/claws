# Standard Hosting Model

## Thesis

OpenClaw hosting profiles should follow normal container/workload conventions:

```text
profiles select startup behavior;
the hoster supplies the envelope;
the hostee exposes startup, readiness, liveness, status, events, and drain.
```

The host should not need to patch OpenClaw internals to know whether OpenClaw is
safe to route traffic to. OpenClaw should provide a small, standard hostee
contract that works for a one-line local container and scales to enterprise
orchestration without changing the signal model.

The two missing surfaces are:

```text
1. named hosting profiles that scale;
2. a real ready check.
```

OpenClaw already has many facts through status, health, Gateway startup, proxy,
plugins, and sessions. What is missing is the adjudication:

```text
hosted requirements + runtime evidence -> readiness conditions -> traffic gate
```

## Comparable Systems

This is not a new pattern. OpenClaw should combine two familiar conventions:

- **Application profiles**: Spring Boot and Quarkus use named profiles to select
  environment-specific configuration such as dev, test, prod, or custom
  deployments.
- **Composition profiles**: Docker Compose profiles selectively activate the
  pieces needed for a particular scenario without changing the whole project.
- **Workload probes**: Docker `HEALTHCHECK` and Kubernetes startup, readiness,
  and liveness probes let the host ask whether a running process is actually
  usable.

The OpenClaw version is:

```text
profile selects defaults and requirements;
ready/live/status report whether the runtime satisfies them.
```

That makes profiles easy to explain and hard to object to. They are not a
platform feature by themselves; they are the service contract that lets many
platforms host OpenClaw consistently.

## The One-Line Host

The simplest useful hosted OpenClaw should look like:

```powershell
docker run --rm -p 18789:18789 -v openclaw:/workspace openclaw/openclaw gateway --profile container
```

OpenClaw should then provide:

- a stable HTTP readiness endpoint;
- a stable HTTP liveness endpoint;
- a hosted ignition result;
- machine-readable status conditions;
- stable startup/ready/failure events;
- graceful drain/shutdown behavior.

The host does not need to know all OpenClaw internals. It only needs to ask:

```text
Did ignition pass?
Is it ready?
Is it alive?
If not, what stable reason should I act on?
Can it drain?
```

## Ideal Docker Contract

For Docker, the host should only need normal container primitives:

```text
image
command
env/config
volume mounts
published port
healthcheck
signals
logs
```

OpenClaw should provide the app-level contract that Docker cannot infer:

```text
ready endpoint or command
live endpoint or command
status conditions
stable failure reasons
drain on SIGTERM
```

Ideal Docker run:

```powershell
docker run --rm `
  --name openclaw `
  -p 18789:18789 `
  -v openclaw-workspace:/workspace `
  -v openclaw-state:/state `
  -v ${PWD}\openclaw.json:/etc/openclaw/openclaw.json:ro `
  --health-cmd "curl -fsS http://127.0.0.1:18789/ready || exit 1" `
  --health-interval 10s `
  --health-timeout 3s `
  --health-retries 12 `
  openclaw/openclaw gateway run --hosting-profile container --config /etc/openclaw/openclaw.json
```

Equivalent Compose shape:

```yaml
services:
  openclaw:
    image: openclaw/openclaw
    command: ["gateway", "run", "--hosting-profile", "container", "--config", "/etc/openclaw/openclaw.json"]
    ports:
      - "18789:18789"
    volumes:
      - openclaw-workspace:/workspace
      - openclaw-state:/state
      - ./openclaw.json:/etc/openclaw/openclaw.json:ro
    healthcheck:
      test: ["CMD", "openclaw", "ready", "--json"]
      interval: 10s
      timeout: 3s
      retries: 12
    stop_grace_period: 30s

volumes:
  openclaw-workspace:
  openclaw-state:
```

That is the practical standard: Docker owns process lifecycle and restart
mode; OpenClaw owns the truth of readiness.

## How Container Images Make Hosting Easy

Well-behaved service containers usually make hosting easy by providing:

- one default foreground process;
- documented config paths and env vars;
- documented durable volume paths;
- deterministic startup validation;
- `/ready` and `/live` or equivalent CLI probes;
- stdout/stderr logs;
- graceful `SIGTERM` handling;
- stable exit codes and failure reasons;
- sample `docker run` and Compose manifests.

OpenClaw should follow that shape. A simple Docker deployment is one service:

```text
container process = OpenClaw Gateway
container port = Gateway HTTP/WebSocket port
config mount = OpenClaw config
workspace volume = agent workspace
state volume = OpenClaw runtime/session/plugin state
healthcheck = OpenClaw ready check
```

In this model the Gateway is not a separate host component. It is the OpenClaw
server process running inside the container. Docker starts the container,
OpenClaw starts the Gateway, and the Gateway exposes status/health/ready
surfaces once core startup checks pass.

Volumes should be recommended and profile-dependent rather than silently
assumed. For example:

- local/ephemeral profile can start without durable volumes;
- container profile should warn or fail with stable reasons when expected paths
  are missing or unwritable;
- managed profile can require workspace/state durability before readiness.

The host should not need to infer this from file errors. OpenClaw should say:

```text
ready=false
condition=StateReady
reason=StateVolumeMissing
message=/state is required by profile managed but is not mounted or writable.
```

## Hosting Profiles

Profiles are small named bundles of defaults and required checks. They should
not duplicate `gateway.*`, `proxy.*`, plugin config, model config, session
config, or state config. Those trees remain the source of detailed settings.

OpenClaw should ship the built-in profile definitions. Most operators should
pick one:

```text
local
container
node-mode
reverse-proxy
managed
```

That makes the feature easy to document and test. Hosts can say "run OpenClaw
as `node-mode`" instead of carrying a private checklist of implied startup
requirements.

This is also the product definition. The supported profiles become the support
matrix:

```text
OpenClaw supports local.
OpenClaw supports container.
OpenClaw supports node-mode.
OpenClaw supports reverse-proxy.
OpenClaw supports managed.
```

Maturity scorecards can build on that matrix. They can grade how complete a
profile is, which checks are warning-only, and which checks are release-blocking.

Suggested first profiles:

| Profile | Purpose | Required signal |
| --- | --- | --- |
| `local` | Developer/local foreground process | config, Gateway, workspace, plugins |
| `container` | One service in Docker or Compose | `local` plus ready/live/status and signal handling |
| `node-mode` | OpenClaw running as a platform-controlled execution node or cell | `container` plus node pairing, controlled-target inventory, command approval posture, control-channel readiness, and workspace/state readiness |
| `reverse-proxy` | Gateway behind TLS or identity proxy | `container` plus trusted proxy posture |
| `managed` | Platform-hosted OpenClaw | `node-mode` and/or `reverse-proxy` plus brokered egress, durable state, stable events, and drain |

The same condition schema should work for every profile. Profiles only change
which conditions are required for `ready=true`.

Add a new profile when the runtime role changes enough that readiness would
mean something different. For example, `node-mode` covers a platform-controlled
execution node with pairing, a control channel, target inventory, approvals,
and workspace/state readiness. A different node model with a different pairing
or target model should be a separate profile, not a hidden option inside
`node-mode`.

Operators can still customize, but customization should produce an effective
profile rather than rewriting the built-in definition in place:

```text
built-in profile + explicit overrides -> effective profile
```

Allowed overrides should be narrow, visible, and testable. Tightening a profile
by requiring an additional condition is reasonable. Silently weakening
`managed` or redefining `node-mode` is not.

No explicit profile should be required to run OpenClaw. The default effective
profile should be `local`, so existing local starts keep working. Hosts opt into
stronger behavior by selecting a profile at startup:

```powershell
openclaw gateway --profile container
openclaw gateway --profile node-mode
openclaw gateway --profile reverse-proxy
openclaw gateway --profile managed
```

For Docker and Compose, the recommended convention should be to pass the
profile in the container command because it is visible in the host manifest:

```yaml
command: ["gateway", "--profile", "container", "--config", "/etc/openclaw/openclaw.json"]
```

Config should also be able to select the same profile for deployments that want
one mounted file to describe the runtime:

```jsonc
{
  "hosting": {
    "profile": "container"
  }
}
```

If both are present, CLI should win over config. The selected profile in the
ready result should make mismatches obvious.

`/ready` without a profile argument should report readiness for the runtime's
effective profile. In the default case that means local readiness: config
loaded, Gateway usable if applicable, workspace usable, and required plugins
loaded. It should not require trusted-proxy auth, brokered egress, durable
state, or managed drain unless the selected profile requires those.

If a host expects a specific profile, the deployment manifest or release test
can assert that `/ready` reports that profile. If the runtime was started with a
different effective profile, the probe result makes the drift visible.

Do not add an unnamed "custom readiness" mode for starts that did not select a
profile. If a deployment configures stricter readiness gates, it should do so by
selecting a named profile. The detailed behavior still comes from ordinary
OpenClaw config:

```text
profile = which evidence is required before ready
gateway/proxy/plugins/state config = how that evidence is produced
```

## Ready Check

The ready check is the car-start moment. It is stronger than "the process is
running" and narrower than ongoing health.

```text
OpenClaw started successfully,
loaded its effective configuration,
proved required dependencies and runtime posture,
passed core startup requirements,
and may accept hosted traffic.
```

Suggested shape:

```jsonc
{
  "ready": true,
  "profile": "container",
  "phase": "Ready",
  "conditions": [
    {
      "type": "ConfigLoaded",
      "status": "True",
      "reason": "EffectiveConfigReady"
    },
    {
      "type": "GatewayReady",
      "status": "True",
      "reason": "TrustedProxyActive"
    },
    {
      "type": "EgressReady",
      "status": "True",
      "reason": "ManagedProxyActive"
    },
    {
      "type": "StateReady",
      "status": "True",
      "reason": "WorkspaceRestored"
    },
    {
      "type": "PluginsReady",
      "status": "True",
      "reason": "RequiredPluginsLoaded"
    }
  ]
}
```

## Same Signals At Every Complexity Level

### Level 0: Local container

Host supplies:

- config file;
- workspace volume;
- port mapping.

OpenClaw proves:

- config loaded;
- Gateway started;
- workspace path usable;
- plugins loaded;
- readiness endpoint returns ready.

### Level 1: Reverse-proxy hosted

Host adds:

- TLS/reverse proxy;
- trusted identity headers;
- allowed origins.

OpenClaw proves:

- Gateway auth resolved to trusted-proxy;
- required proxy headers are configured;
- direct unsafe access is blocked;
- readiness remains closed until Gateway posture is active.

### Level 2: Brokered egress

Host adds:

- managed proxy or provider pipe;
- no provider secrets in runtime;
- fail-closed egress rule.

OpenClaw proves:

- brokered egress is active;
- child processes inherit required proxy posture;
- runtime provider secrets are absent if forbidden;
- readiness fails closed if egress is required but unavailable.

### Level 3: Durable state

Host adds:

- mounted workspace or external restore;
- checkpoint/snapshot rule;
- single-writer lease.

OpenClaw proves:

- workspace restored before ready;
- state/session paths are usable;
- single-writer evidence exists if required;
- checkpoint/drain behavior is available.

### Level 4: Managed plugins and restrictions

Host adds:

- selected plugins;
- tool/node/sandbox/network restrictions.

OpenClaw proves:

- required plugins resolved and loaded;
- core startup requirements pass against runtime evidence;
- denied tools/node commands are actually denied;

### Level 5: Multi-tenant platform

Host adds:

- tenant identity;
- routing;
- quotas;
- worker pools;
- audit and telemetry sinks;
- OCC-style desired state.

OpenClaw still exposes the same signals:

- ignition result;
- readiness;
- liveness;
- status conditions;
- events;
- drain.

The platform gets richer desired state and placement logic, but the hostee
contract does not change.

## Node-Mode And Controlled Targets

`node-mode` should describe the OpenClaw runtime role, not the product-specific
shape of what it controls. A platform may run one OpenClaw agent that controls
one or more desktops, sandboxes, VMs, pods, browsers, or other execution
targets.

For a Scout-like deployment, the generic shape is:

```text
platform agent
  -> OpenClaw node-mode runtime
       -> controlled target 1
       -> controlled target 2
       -> controlled target N
```

The readiness question is therefore not just "is the node paired?" It is:

```text
is the node paired,
is its control channel ready,
is its target inventory known,
are required targets available or intentionally deferred,
is command approval posture active,
and are workspace/state paths ready?
```

The OpenClaw contract should name those generic facts. Scout can decide how
many desktops are required for a tenant/session and how to route users to them.

## What Is Missing In OpenClaw

OpenClaw already has many ingredients:

- Gateway startup config and secrets activation;
- trusted-proxy Gateway auth;
- managed proxy lifecycle;
- runtime config snapshots;
- plugin registry and health;
- health/status APIs.

The missing standard hostee contract is:

```text
HostingProfile
ReadyCheckResult
Readiness conditions
Stable failure reasons
Startup-critical core requirements
Runtime startup evidence
Graceful drain semantics
```

That is why hosts end up carrying baked config, env restore lists, persistence
wrappers, and custom probes. They are compensating for missing workload
readiness semantics.

## RFC Direction

The OpenClaw RFC should be framed as:

```text
Make OpenClaw a well-behaved hosted workload.
```

Not:

```text
Add Lobster support.
Add OCC.
Add a second hosted config tree.
Move Gateway into a platform.
```

The first implementation should be small:

1. Define ready check result and condition names.
2. Reuse existing config/proxy/Gateway/plugin/state evidence.
3. Add startup-critical core requirements.
4. Gate readiness on the ready check.
5. Expose the result through health/status and stable events.
