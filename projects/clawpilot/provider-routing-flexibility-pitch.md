# Provider Routing Flexibility Pitch

This is the focused pitch for
[gim-home/m#3953](https://github.com/gim-home/m/pull/3953): preserve Scout
Desktop flexibility while adding Cloud/OpenClaw as a real runtime path.

The point is not to choose "current Desktop provider" or "Cloud/OpenClaw" today.
The point is to stop that from being a forced architectural choice.

The baseline assumption is that the current Desktop provider path is the fully
capable current behavior. Provider routing should not regress it. A new cloud,
OpenClaw, Local OpenClaw, or future provider path becomes eligible only when it
can preserve the required behavior for that request, or when the product
explicitly shows a degraded/unavailable state instead of silently taking
functionality away.

## One-Sentence Pitch

PR #3953 lets Scout adopt Cloud/OpenClaw as a provider without giving up the
existing fully capable Desktop provider path, Local OpenClaw, or future provider
options.

## Narrowed Contract For The Current Node-Mode Stack

To align with the active node-mode PR chain, #3953 can be read as a minimal
contract instead of a broad architecture rewrite:

1. Cloud-brain ingress is allowed.
2. Each routed turn records provider identity and route reason.
3. Local work always crosses the same Desktop node harness boundary.
4. Provider eligibility and fallback to Desktop baseline stay explicit.
5. Audit can explain provider, capability, decision, and executor path.

This keeps #3953 small and compatible with the current implementation direction:
cloud path growth plus one shared Desktop authority boundary.

## Why This Exists

The Gateway work is valuable. It makes the cloud-brain path viable: Desktop can
connect to routed Gateway clusters, render server-side approval cards, and use
Gateway capabilities when the cloud supports the surface.

The risk is treating that as a binary switch. If Desktop simply becomes a thin
client for whatever Gateway can control, then Desktop functionality becomes
limited by cloud parity. Features that are local today can become hidden,
gated, or unavailable until Gateway has matching primitives.

PR #3953 gives us a more durable shape:

- Keep the fully capable current Desktop provider path available.
- Add hosted Cloud/OpenClaw as a provider candidate.
- Leave room for Local OpenClaw as a governed provider candidate.
- Let policy, readiness, and capability proof decide which path is eligible.
- Keep Desktop as the trusted local gateway for browser, clipboard, file,
  shell, app, and M365-sensitive work.

The default safety rule is simple: do not route a request to a less-capable path
unless that degraded behavior is explicit, reviewable, and acceptable for that
request.

## Why This Still Fits After #4086-#4194

The current node-mode PR chain strengthens execution boundaries, not provider
routing policy:

- #4086, #4087, #4088, #4123, #4090, #4137, #4193, and #4194 harden the shared
  Desktop command/local-tool harness, approval semantics, and trust/audit shape.
- #3953 remains the provider-selection contract that decides which runtime path
  is eligible for a request.

So these tracks are complementary:

- node-mode PRs: "how local execution is governed";
- #3953: "who is eligible to request it and when fallback applies."

## Baseline Guarantee

The current Desktop provider is the compatibility baseline. It represents the
behavior users can rely on today.

```text
baseline behavior
      |
      v
+-----------------------------+
| current Desktop provider    |
| fully capable current path  |
+--------------+--------------+
               |
               v
+-----------------------------+
| provider routing adds paths |
| but does not remove baseline|
+--------------+--------------+
               |
               v
+-----------------------------+
| new provider is eligible    |
| only when behavior is       |
| preserved or explicitly     |
| degraded                    |
+-----------------------------+
```

This matters because "use Gateway" or "use OpenClaw" should not accidentally
mean "lose Desktop capabilities." The current provider remains the reference
path until a new provider has enough capability, policy, readiness, and proof to
handle the request.

Review rule:

- Existing Desktop behavior is preserved by default.
- Cloud/OpenClaw paths must prove eligibility before replacing a route.
- Unsupported cloud behavior should be explicit degraded/unavailable state, not
  silent regression.
- Default-provider changes are a later decision, after parity and validation are
  proven for the relevant surface.

## The Flexibility Model

```text
+-----------------------------+
| user/session wants work     |
+--------------+--------------+
               |
               v
+-----------------------------+
| runtime routing decision    |
| session, policy, readiness  |
+------+----------+-----------+
       |          |
       |          +--------------------------+
       |                                     |
       v                                     v
+-------------+                     +------------------+
| current     |                     | hosted Cloud /   |
| Desktop     |                     | OpenClaw provider|
| provider    |                     +--------+---------+
| baseline    |                              |
+------+------+                              |
       |                                     v
       |                            +------------------+
       |                            | Desktop local    |
       |                            | capability gate  |
       |                            | policy/approval  |
       |                            | audit            |
       |                            +--------+---------+
       |                                     |
       +------------------+------------------+
                          |
                          v
               +-----------------------------+
               | user-visible result         |
               +-----------------------------+

Other provider candidates can plug into the same routing decision:
Local OpenClaw, future hosted runtimes, enterprise-specific runtimes.
```

The important boundary is the middle. Runtime selection becomes explicit data
instead of hidden backend branching. The Desktop provider remains the baseline
candidate unless another provider is explicitly eligible for the work.

## What We Avoid

```text
Binary switch:

Desktop app
    |
    v
Gateway cloud only
    |
    +--> works if Gateway supports the surface
    +--> hidden/gated if Gateway lacks parity
    +--> local work needs one-off bridges

Provider routing:

Desktop app
    |
    v
runtime router
    |
    +--> current Desktop provider
    +--> hosted Cloud/OpenClaw
    +--> Local OpenClaw
    +--> future provider
    |
    v
Desktop capability gateway for local authority
```

The second shape lets Gateway mature without forcing Desktop to lose useful
local behavior during the transition. When Gateway lacks parity for a surface,
the routing layer can keep the current Desktop provider path or show an explicit
degraded state instead of regressing the user experience.

## Why #3953 Is The First Step

PR #3953 is the cloud-agent/provider-routing foundation. It does not need to
prove every local capability. It needs to make the choice explicit and
reviewable.

It introduces:

| Piece                            | Why it matters                                                                                      |
| -------------------------------- | --------------------------------------------------------------------------------------------------- |
| Hosted agent roster              | Desktop can know which cloud-hosted agents exist and whether they are healthy or eligible.          |
| Runtime routing                  | A session can bind to a specific runtime/provider path instead of assuming one backend.             |
| Capability envelope              | Cloud requests for local work cross a typed boundary before Desktop decides anything.               |
| Policy and readiness checks      | Cloud provider eligibility can depend on rollout, admin policy, device health, and feature support. |
| Approval and audit shape         | Local side effects remain reviewable even when the request starts in the cloud.                     |
| Device routing and degraded mode | Cloud cannot assume a Desktop node is online, fresh, or allowed to execute local work.              |

## Concepts Introduced By #3953

The PR is easier to review if each concept is separated from the code shape.

The central move is this: make runtime choice, agent identity, local authority,
and approval/audit boundaries explicit. Without that separation, "use cloud" can
accidentally mean "give up current Desktop behavior" or "let the cloud decide
what Desktop can do locally."

```text
                         +----------------------+
                         | user asks for work   |
                         +----------+-----------+
                                    |
                                    v
                         +----------------------+
                         | runtime routing      |
                         | provider eligibility |
                         +----+------------+----+
                              |            |
            current path      |            | cloud/open path
                              v            v
                     +------------+   +------------------+
                     | Desktop    |   | hosted agent     |
                     | provider   |   | roster + binding |
                     | baseline   |   | when eligible    |
                     +-----+------+   +---------+--------+
                           |                    |
                           |                    v
                           |          +------------------+
                           |          | capability       |
                           |          | envelope         |
                           |          +---------+--------+
                           |                    |
                           +----------+---------+
                                      |
                                      v
                           +--------------------+
                           | Desktop authority  |
                           | policy approval    |
                           | audit readiness    |
                           +---------+----------+
                                     |
                                     v
                           +--------------------+
                           | bounded result     |
                           +--------------------+
```

## Concept 1: Provider

A provider is the runtime path that can satisfy a user request. It might be the
fully capable current Desktop provider path, a hosted Cloud/OpenClaw runtime,
Local OpenClaw, or a future enterprise runtime.

Provider is not the same thing as backend mode. Provider is the thing we route
work to after policy and readiness have been evaluated.

```text
request
  |
  v
+-------------------+
| provider choice   |
+---------+---------+
          |
          +--> current Desktop provider
          |    fully capable baseline
          |
          +--> hosted Cloud/OpenClaw provider
          |
          +--> Local OpenClaw provider
          |
          +--> future provider
```

Why this matters:

- We can add Cloud/OpenClaw without deleting or weakening the current provider
  path.
- We can compare providers by capability, readiness, policy, and health.
- We can move default behavior later, after the evidence is good enough.

What reviewers should look for:

- Is provider identity explicit?
- Can the existing fully capable provider remain available?
- Does the code avoid hard-coding "Gateway mode means the only runtime"?

## Concept 2: Runtime Routing

Runtime routing is the decision that binds a session or request to a provider.
It is where the product chooses "which runtime should handle this work?"

That decision should not be hidden inside scattered backend checks. It should be
visible enough to explain why a session chose one provider, degraded to another,
or failed closed.

```text
+-----------------------+
| routing inputs        |
| session kind          |
| requested capability  |
| provider health       |
| rollout flag          |
| policy eligibility    |
| device readiness      |
+-----------+-----------+
            |
            v
+-----------------------+
| runtime binding       |
| provider id           |
| agent id              |
| session id            |
| reason/degrade state  |
+-----------------------+
```

Why this matters:

- A cloud provider can be eligible for some work and ineligible for other work.
- The fully capable Desktop provider can remain eligible while Gateway parity
  matures.
- Reviewers can reason about routing without reading every UI flag branch.

What reviewers should look for:

- Does a routed session know which provider owns it?
- Are degraded and unavailable states explicit?
- Can routing decisions be audited or explained?
- Does routing avoid silently replacing a fully capable Desktop path with a
  less-capable provider?

## Concept 3: Hosted Agent Roster

A hosted agent roster is the typed list of cloud-hosted agents that Desktop can
see and reason about. It answers "which cloud agents exist and what state are
they in?"

Without a roster, "cloud" is too vague. A user may have multiple hosted agents,
different regions, health states, rollout states, or policy eligibility.

```text
+---------------------+
| hosted agent roster |
+----------+----------+
           |
           +--> agent id
           +--> provider id
           +--> display/status
           +--> region/capacity
           +--> health/readiness
           +--> policy eligibility
```

Why this matters:

- Desktop can show or route to a specific hosted agent.
- Cloud agent identity can later appear in audit and approval records.
- A hosted agent can be present but not eligible.

What reviewers should look for:

- Are agent identity and provider identity distinct?
- Does health/readiness avoid implying authority?
- Are unavailable agents represented without breaking the current path?

## Concept 4: Session Runtime Binding

Session runtime binding records which provider and agent a session is using.
This prevents the product from treating all sessions as equivalent once routing
has happened.

```text
+------------------+       +----------------------+
| Scout session    | ----> | runtime binding      |
+------------------+       | provider: cloud/open |
                           | agent: hosted-123    |
                           | device: desktop-A    |
                           | state: degraded/ok   |
                           +----------------------+
```

Why this matters:

- A session can be restored with the same runtime context.
- Desktop can know whether a local capability request belongs to this session.
- Failover or degradation can be represented instead of guessed.

What reviewers should look for:

- Is binding explicit rather than inferred from backend name?
- Are user, session, provider, agent, and device identities kept separate?
- Does changing providers require an explicit transition?

## Concept 5: Capability Envelope

A capability envelope is the typed request shape used when a provider asks
Desktop to do local work. It is intentionally not the executor itself. It is the
boundary before Desktop decides whether anything can happen.

```text
cloud/open provider intent
          |
          v
+------------------------+
| capability envelope    |
| capability name        |
| session binding        |
| requested action       |
| target/preview         |
| sensitivity metadata   |
+-----------+------------+
            |
            v
+------------------------+
| Desktop decision gate  |
| validate               |
| policy                 |
| approval               |
| audit                  |
+------------------------+
```

Why this matters:

- Cloud intent is not local permission.
- Desktop can reject malformed, unsupported, stale, or policy-denied requests.
- Sensitive flows later have one place to attach preview, approval, and audit.

What reviewers should look for:

- Does the envelope carry enough context to decide safely?
- Does unsupported capability behavior fail closed?
- Is execution impossible before Desktop validation, policy, approval, and
  audit checks?

## Concept 6: Desktop As Local Authority Gateway

Desktop remains the trusted local boundary. The provider can ask. Desktop
decides. Executors run only after Desktop has applied policy, approval, audit,
session binding, and local context.

```text
+------------------+      +---------------------+      +-------------------+
| provider asks    | ---> | Desktop decides     | ---> | bounded executor  |
| cloud/local/etc. |      | policy/approval     |      | one capability    |
|                  |      | audit/session       |      | no ambient access |
+------------------+      +---------------------+      +-------------------+
```

Why this matters:

- Cloud/OpenClaw adoption does not require giving cloud ambient local control.
- Browser, clipboard, shell, file, app, and M365-sensitive flows can be added
  behind one trust boundary.
- Existing Desktop permission UX and local context remain central.

What reviewers should look for:

- Does the provider ever bypass Desktop authority?
- Are policy, approval, and audit modeled as required boundaries?
- Does Desktop own local execution decisions even when the request starts in
  the cloud?

## Concept 7: Readiness And Degraded Mode

Readiness says whether a provider or device can actually support a route now.
Degraded mode says what the user sees when it cannot.

This is important because cloud adoption is not only "is the feature compiled?"
It also depends on rollout, account eligibility, cluster routing, Desktop node
availability, policy, supported capabilities, and health.

```text
+-------------------+
| readiness checks  |
+---------+---------+
          |
          +--> cloud route available?
          +--> hosted agent healthy?
          +--> Desktop node online?
          +--> capability supported?
          +--> policy allows it?
          +--> rollout enabled?
          |
          v
+-------------------+
| eligible          |
| degraded          |
| unavailable       |
| fail closed       |
+-------------------+
```

Why this matters:

- Gateway can be adopted incrementally.
- Users get explicit unavailable/degraded behavior instead of silent feature
  loss.
- Reviewers can distinguish "not supported yet" from "broken."
- Existing Desktop behavior can continue while the cloud path matures.

What reviewers should look for:

- Are readiness failures represented as data?
- Does unavailable cloud preserve the fully capable Desktop path where possible?
- Does degraded mode avoid pretending parity is complete?

## Concept 8: Approval And Audit

Approval is the user/admin decision for a sensitive local action. Audit is the
record of what was requested, why it was allowed or denied, and what happened.

In #3953, the key value is that approval and audit are part of the provider
contract from the start, not bolted on after local capabilities appear.

```text
capability request
      |
      v
+-------------+     +-------------+     +-------------+
| policy      | --> | approval    | --> | audit       |
| allow/deny  |     | user/admin  |     | replayable  |
+-------------+     +-------------+     +-------------+
      |                   |                   |
      v                   v                   v
fail closed        approved/denied      reviewer proof
```

Why this matters:

- Local side effects are explainable.
- Reviewers can inspect deny, expiry, unsupported, and success paths.
- Later high-risk capabilities can reuse the same trust model.

What reviewers should look for:

- Are approval prompts derived from typed capability data?
- Are denied/expired requests audited without executing?
- Can audit records explain provider, session, capability, decision, and result?

## Concept 9: Why This Is Not The Local OpenClaw Pitch

Local OpenClaw is one important provider candidate, but this document is about
the abstraction that makes provider choice possible.

```text
This document:
  provider routing and flexibility
  #3953 cloud-agent foundation
  Desktop local authority boundary

Separate Local OpenClaw narrative:
  package path
  non-Copilot proof
  browser/clipboard/app/M365 capabilities
  managed install, rollback, admin readiness
```

Why this matters:

- Reviewers can evaluate #3953 without first accepting the full Local OpenClaw
  switch-over story.
- The cloud Gateway direction can continue even if Local OpenClaw rollout takes
  longer.
- The same provider/routing model still creates room for Local OpenClaw later.

What reviewers should look for:

- Does #3953 stand on its own as a cloud-provider optionality layer?
- Does it avoid depending on Local OpenClaw-specific assumptions?
- Does it preserve the path for #3954/#3955 to add Local OpenClaw later?

## The Review Frame

Review #3953 as an optionality layer, not as a declaration that hosted
Cloud/OpenClaw is the only future runtime or that the current Desktop provider
should lose baseline status.

```text
                 +----------------------+
                 | provider/routing API |
                 +----------+-----------+
                            |
        +-------------------+-------------------+
        |                   |                   |
        v                   v                   v
+---------------+   +---------------+   +---------------+
| keep current  |   | adopt cloud   |   | add local /   |
| provider path |   | provider path |   | future paths  |
| as baseline   |   | when eligible |   | when eligible |
+-------+-------+   +-------+-------+   +-------+-------+
        |                   |                   |
        +-------------------+-------------------+
                            |
                            v
                 +----------------------+
                 | policy/readiness     |
                 | decides eligibility  |
                 +----------------------+
```

That is the reason this PR matters even if reviewers are aligned on the cloud
direction. It lets the cloud direction become a provider implementation instead
of a replacement for provider choice.

## Complementary To Gateway Work

| Question                                              | Gateway cloud path                                                       | #3953 flexibility layer                                                                                           |
| ----------------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| How does Desktop reach the cloud brain?               | Route Desktop operator/node sockets to the right Gateway cluster.        | Treat the cloud brain as a runtime/provider candidate.                                                            |
| What happens when Gateway supports a surface?         | Desktop can use the cloud-backed capability.                             | Routing can prefer or allow the cloud provider when policy/readiness pass.                                        |
| What happens when Gateway does not support a surface? | Desktop may hide, gate, or fail closed for that surface.                 | Desktop can keep the fully capable existing provider path or route local work through a governed capability gate. |
| Who owns local authority?                             | Gateway can request or coordinate local work through node/control paths. | Desktop remains the trusted policy, approval, audit, and execution boundary.                                      |
| How do we roll out safely?                            | Capability flags and cloud readiness tiers.                              | Provider eligibility combines capability flags, policy, readiness, audit, and device state.                       |

So this is not anti-Gateway. It is the compatibility layer that lets Gateway
succeed without forcing every Desktop surface to wait for Gateway parity.

## Decision Pressure Table

| Decision pressure         | Without #3953                                                            | With #3953                                                                          |
| ------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Cloud adoption            | Binary switch toward the Gateway/cloud brain.                            | Cloud/OpenClaw becomes a selectable provider path.                                  |
| Existing Desktop behavior | Risk of hiding or regressing surfaces that Gateway does not support yet. | The fully capable Desktop provider remains the baseline while cloud parity matures. |
| Local authority           | Local work risks becoming scattered across backend-specific branches.    | Desktop owns a single local capability gate with policy, approval, and audit.       |
| Reviewability             | Runtime choice is inferred from backend mode and flags.                  | Runtime/provider/session binding is explicit.                                       |
| Rollout                   | The product has to decide default behavior before all parity is proven.  | Defaults can move later, after provider readiness and evidence improve.             |
| Future providers          | Each new provider risks another integration branch.                      | New providers plug into the same routing and eligibility model.                     |

## What #3953 Does Not Claim

PR #3953 does not claim:

- Cloud/OpenClaw should be the default provider immediately.
- Local OpenClaw should replace the current provider path immediately.
- Gateway parity is complete for every Desktop surface.
- Browser, clipboard, shell, workspace, app, and M365-sensitive flows are all
  production-complete.

Those are separate proof and rollout questions. #3953 answers the prior
architecture question: can Scout support more than one runtime path cleanly?

## How To Pitch It

Use this framing:

```text
We should not make the cloud-brain decision and the provider-choice decision
the same decision.

#3953 separates them.

It lets Gateway/OpenClaw become a provider path while preserving the current
fully capable Desktop path, leaving room for Local OpenClaw, and keeping Desktop
responsible for local policy, approval, audit, and sensitive capabilities.
```

That gives reviewers a clean ask:

1. Accept provider routing as the neutral abstraction.
2. Let Gateway continue as the cloud provider implementation.
3. Keep Desktop local authority behind policy, approval, and audit.
4. Keep the current Desktop provider as the fully capable baseline until parity
   and validation justify a default-provider change.

## Related PRs

Primary grouped PR:

- [gim-home/m#3953](https://github.com/gim-home/m/pull/3953) - Cloud agent
  integration proof stack.

Focused fork PRs:

- [#66](https://github.com/giodl_microsoft/m/pull/66) - Cloud agent
  foundation, routing, and session binding.
- [#67](https://github.com/giodl_microsoft/m/pull/67) - Approval, policy, and
  audit model.
- [#68](https://github.com/giodl_microsoft/m/pull/68) - Device routing and
  readiness.
- [#69](https://github.com/giodl_microsoft/m/pull/69) - Hosted runtime source
  harness.
- [#70](https://github.com/giodl_microsoft/m/pull/70) - Desktop approval
  gateway.
- [#71](https://github.com/giodl_microsoft/m/pull/71) - Execution transport and
  replay proof.

Broader Local OpenClaw value narrative:

- `openclaw-pr-walkthrough-for-lorant.md`
