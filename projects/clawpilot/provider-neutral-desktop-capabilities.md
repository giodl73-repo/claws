# Provider-Neutral Desktop Capabilities

This is the PR-body-ready narrative for
[gim-home/m#3955](https://github.com/gim-home/m/pull/3955) after separating it
from the Local OpenClaw runtime stack.

It assumes the reader has already read:

1. `provider-routing-flexibility-pitch.md` for the provider-routing baseline.
2. `local-openclaw-value-walkthrough.md` only if they want the Local OpenClaw
   runtime context.

The important shift: the Desktop node capability core, filesystem/shell,
browser, clipboard, local app, workspace write, and M365 capability work should
not be Local OpenClaw-only. These are Desktop capability contracts that any
eligible provider can request through Desktop.

## One-Sentence Pitch

#3955 makes sensitive Desktop capabilities provider-neutral: hosted cloud,
Local OpenClaw, the current Desktop path, or future providers can request the
same tools, but Desktop keeps policy, approval, audit, token isolation, and
bounded execution authority.

## Why This Is Separate From #3954

#3954 proves Local OpenClaw can exist as a governed local runtime provider.

#3955 should prove a different thing: sensitive local capabilities are shared
Desktop contracts, not Local OpenClaw-private tools.

```text
eligible provider
hosted cloud / Local OpenClaw / current Desktop / future
        |
        v
+---------------------------+
| Desktop capability request|
| provider identity         |
| session binding           |
| target + preview          |
| sensitivity metadata      |
+-------------+-------------+
              |
              v
+---------------------------+
| Desktop authority gate    |
| policy approval audit     |
| token isolation           |
+-------------+-------------+
              |
              v
+---------------------------+
| bounded local executor    |
| browser clipboard app     |
| workspace M365 etc        |
+---------------------------+
```

The provider matters as policy input. It should not change the trust boundary.

## Baseline Rule

The current Desktop provider remains the fully capable compatibility baseline.
#3955 should not silently replace or weaken that path.

New provider use of these capabilities is eligible only when:

- The provider identity is known.
- The request is bound to an eligible session.
- The capability is supported on the Desktop node.
- Tenant/user policy allows the request.
- Approval requirements are satisfied.
- Audit records can explain the request, decision, and result.
- Unsupported behavior is explicit degraded/unavailable state, not silent
  regression.

## What #3955 Should Contain

| Capability family            | What it adds                                                                                                                                         | Why provider-neutral matters                                                                               |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Desktop node capability core | Request envelope, risk/data-boundary vocabulary, approval routing, executor skeleton, audit attribution, policy gates, and no-bypass evals.          | Every provider should cross the same Desktop authority boundary before local execution.                    |
| Filesystem and shell         | `filesystem.read` and `shell.exec` handlers with workspace scope, bounded output, sanitized env, timeout, approval, audit, and fail-closed behavior. | These are useful to cloud and Local OpenClaw, and should not be Local OpenClaw-private tools.              |
| Browser                      | `browser.open`, active-tab read, selection extraction, origin/context binding, preview, approval, audit.                                             | Cloud and Local OpenClaw both need browser context, but neither should get ambient browser profile access. |
| Clipboard                    | Read/write contracts, user gesture, preview, redaction, approval, audit.                                                                             | Clipboard access is user-context sensitive regardless of which provider asks.                              |
| Local app                    | Intent-based `app.open`, `file.openWithDefaultApp`, and `url.openExternal` patterns.                                                                 | Providers should request user-visible intents, not arbitrary executable launch.                            |
| Workspace write              | `filesystem.write` and `filesystem.patch` with workspace scope, diff preview, result digest, rollback hints.                                         | Any provider that writes locally needs the same safety contract.                                           |
| M365                         | Draft-first delegated action broker, scoped result, redacted status, no token pass-through.                                                          | Cloud and Local OpenClaw should never receive raw Graph tokens, cookies, or refresh tokens.                |

## What #3955 Should Not Contain

#3955 should not depend on the Local OpenClaw runtime stack for these core
capability contracts.

Move or keep these in Local OpenClaw-specific work instead:

| Local-only concern                                           | Better home                                      |
| ------------------------------------------------------------ | ------------------------------------------------ |
| Local OpenClaw package descriptor and fingerprint validation | Local OpenClaw runtime/readiness PR or follow-up |
| Lobster Gateway package-path proof                           | Local OpenClaw proof doc/PR                      |
| Local OpenClaw managed install/acquisition                   | Local OpenClaw admin/readiness follow-up         |
| Local OpenClaw sidecar lifecycle and rollback                | Local OpenClaw runtime/readiness PR or follow-up |
| Local OpenClaw-specific provider attestation gaps            | Local OpenClaw proof doc/PR                      |

Those are still important. They are just not prerequisites for making Desktop
capabilities provider-neutral.

## Concept 1: Capability Envelope

Every provider request should enter Desktop through the same typed envelope.

```text
request
  provider id
  runtime kind
  session id
  capability name
  target/preview
  sensitivity
  audit id
        |
        v
Desktop decision gate
```

Why this matters:

- Cloud intent is not local permission.
- Local OpenClaw intent is not local permission.
- Future providers do not need new trust boundaries.

Review checks:

- Are provider, session, capability, and target explicit?
- Does unsupported capability behavior fail closed?
- Is execution impossible before Desktop policy/approval/audit?

## Concept 2: Desktop Node Capability Core

The Desktop node capability core is the shared platform layer. It defines how a
provider asks Desktop for local work, how Desktop evaluates that request, and
how execution is attributed.

```text
provider request
        |
        v
+---------------------------+
| capability policy         |
| risk data-boundary TTL    |
+-------------+-------------+
              |
              v
+---------------------------+
| approval router           |
| user/admin decision       |
+-------------+-------------+
              |
              v
+---------------------------+
| executor + audit          |
| handler output bounded    |
+---------------------------+
```

Review checks:

- Is the capability contract provider-neutral?
- Are approval and audit reusable by cloud and Local OpenClaw callers?
- Do policy gates include provider identity, session binding, risk, data
  boundary, device readiness, and audit availability?
- Do evals prove bypass attempts fail closed?

## Concept 3: Filesystem And Shell

Filesystem read and shell exec are the first high-value local executors. They
should be shared Desktop capabilities, not proof that Local OpenClaw alone gets
local tools.

```text
filesystem/shell request
        |
        v
+---------------------------+
| workspace scope           |
| cwd/env/timeout/output    |
| deny-floor policy recheck |
+-------------+-------------+
              |
              v
+---------------------------+
| approval + audit          |
+-------------+-------------+
              |
              v
+---------------------------+
| bounded execution result  |
+---------------------------+
```

Review checks:

- Are filesystem reads workspace-scoped?
- Are shell commands bounded by cwd, env, timeout, output, and cleanup?
- Do denied, unsupported, invalid, or policy-blocked requests avoid execution?
- Can both cloud and Local OpenClaw route through the same executor contract?

## Concept 4: Browser And Clipboard

Browser and clipboard are user-context surfaces. They can expose sensitive data
and create side effects, so they need specific contracts rather than a generic
"local tool" escape hatch.

```text
browser/clipboard request
        |
        v
+---------------------------+
| context preview           |
| origin/url/title/selection|
| clipboard preview         |
+-------------+-------------+
              |
              v
+---------------------------+
| approval + audit          |
+-------------+-------------+
              |
              v
+---------------------------+
| bounded action            |
| no ambient profile access |
| no background polling     |
+---------------------------+
```

Review checks:

- Are browser reads bound to explicit origin/context?
- Are clipboard reads/writes previewed and approved?
- Are denied, stale, invalid, unsupported, or policy-blocked requests stopped?

## Concept 5: Local App And Workspace Write

App opening and workspace writes are durable local side effects. They need
intent allowlists, preview, approval, digest, and rollback metadata.

```text
app/write request
        |
        v
+---------------------------+
| target allowlist          |
| workspace scope           |
| diff/preview              |
+-------------+-------------+
              |
              v
+---------------------------+
| approval + audit          |
+-------------+-------------+
              |
              v
+---------------------------+
| open/write/patch result   |
| digest + rollback hint    |
+---------------------------+
```

Review checks:

- Are app targets intent-based instead of arbitrary executable launch?
- Are writes scoped to the workspace?
- Are destructive recursive operations denied?
- Does audit capture target, digest, diff summary, approval id, and rollback
  hint?

## Concept 6: M365 Token Broker Boundary

M365 work should go through a trusted broker that performs scoped actions and
returns bounded, redacted results. Providers should not receive tokens.

```text
M365 action request
        |
        v
+---------------------------+
| Desktop token broker      |
| tenant/user/scope checks  |
+-------------+-------------+
              |
              v
+---------------------------+
| draft-first action        |
| mail calendar Teams etc   |
+-------------+-------------+
              |
              v
+---------------------------+
| redacted result + audit   |
| no token pass-through     |
+---------------------------+
```

Review checks:

- Are raw Graph tokens impossible to return in result frames, logs,
  diagnostics, or audit payloads?
- Are send/write side effects separated from draft creation?
- Are tenant, user, scope, data-boundary, and confirmation checks explicit?

## Concept 7: Provider-Neutral Policy

Policy should evaluate the request and the provider. It should not hard-code
Local OpenClaw as the only caller.

Inputs:

- Provider id.
- Runtime kind.
- Session binding.
- User and tenant.
- Capability name.
- Risk level.
- Data boundary.
- Device readiness.
- Approval state.
- Audit availability.

Outputs:

- Allow.
- Deny.
- Defer for approval.
- Degraded/unavailable.

## Suggested PR Shape For #3955

Target base: the #3953 provider-routing/cloud-agent foundation branch, not the
#3954 Local OpenClaw runtime branch.

Scope:

- Add provider-neutral Desktop capability contracts.
- Add Desktop node capability policy, approval, executor, audit, and no-bypass
  evals.
- Add filesystem read and shell exec handlers and tests.
- Add browser/clipboard handlers and tests.
- Add local app/workspace write handlers and tests.
- Add M365 draft broker boundary and tests.
- Add approval/audit projections shared by provider callers.
- Keep feature-off/default behavior preserving the current Desktop baseline.

Out of scope:

- Local OpenClaw package acquisition.
- Local OpenClaw sidecar lifecycle.
- Lobster package-path proof.
- Local OpenClaw-specific admin policy.
- Default-provider flip.

## Validation To Carry In The PR Body

The PR body should carry exact validation once the branch is rebuilt. Expected
lanes:

- Focused unit tests for capability contracts and Desktop node policy.
- Focused unit tests for filesystem read and shell exec handlers.
- Focused unit tests for browser/clipboard handlers.
- Focused unit tests for app/workspace write handlers.
- Focused unit tests for M365 broker boundary.
- Focused approval/audit tests.
- `pnpm run typecheck`.
- `git diff --check`.

If a GUI or live-provider proof is included, it should be described as an
additional proof lane, not a prerequisite for the provider-neutral contract.

The stronger shape is to keep package/admin/live-provider proof out of #3955 and
move it to `local-openclaw-integration-proof.md`, where it can depend on both
the Local OpenClaw runtime PR and this provider-neutral capability PR.

## What This PR Is Not Claiming

#3955 should not claim:

- Local OpenClaw is default-ready.
- The current Desktop provider baseline can be weakened.
- Gateway parity exists for every Desktop surface.
- Live M365 Graph draft creation is already proven.
- Packaged Local OpenClaw install/update rollback is proven.
- Scout-managed Local OpenClaw package acquisition is wired.

The value of #3955 is narrower and stronger: sensitive Desktop tools become
shared governed capabilities that cloud, Local OpenClaw, and future providers
can request without bypassing Desktop authority.
