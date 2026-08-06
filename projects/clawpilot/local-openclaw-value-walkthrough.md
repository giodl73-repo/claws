# Local OpenClaw Value Walkthrough

This guide explains the Local OpenClaw runtime value story for:

- [gim-home/m#3954](https://github.com/gim-home/m/pull/3954) - Local OpenClaw
  runtime proof stack.

It assumes the reader has already read
`provider-routing-flexibility-pitch.md`.

That prerequisite matters. The flexibility pitch establishes that the current
Desktop provider is the fully capable baseline, provider routing must not
silently regress behavior, and Cloud/OpenClaw/Local OpenClaw paths become
eligible only when capability, readiness, policy, and proof justify routing
work to them.

This document starts after that point. It asks a narrower question:

Can Local OpenClaw become a governed local runtime provider without gaining
ambient access to the user's machine or weakening the current Desktop provider
baseline?

## One-Sentence Pitch

Local OpenClaw is valuable because it gives Scout a local, governable,
provider-independent runtime path while keeping Desktop in control of local
authority, user approval, policy, audit, package lifecycle, and rollback.

## Mental Model

```text
provider routing foundation
from #3953
       |
       v
+-----------------------------+
| Local OpenClaw as provider  |
| visible, governed, optional |
+--------------+--------------+
               |
               v
+-----------------------------+
| Desktop node-mode gate      |
| adapter point only          |
+--------------+--------------+
               |
               v
+-----------------------------+
| shared capabilities live in |
| provider-neutral #3955      |
+--------------+--------------+
               |
               v
+-----------------------------+
| proof as optional provider  |
| no default flip             |
+-----------------------------+
```

Local OpenClaw should not be "a local process that can do things." It should be
a provider candidate that must cross the same Desktop authority boundary as any
other non-baseline runtime.

## What This Adds Beyond Provider Routing

Provider routing answers "can Scout support more than one runtime path without
giving up the current Desktop baseline?"

Local OpenClaw adds the next set of questions:

| Question                                                                  | Why it matters                                                                          | Main PR                                          |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Can Local OpenClaw be discovered and shown without becoming default?      | Visibility should not imply authority.                                                  | [#3954](https://github.com/gim-home/m/pull/3954) |
| Can Scout bind a session to Local OpenClaw behind explicit dogfood flags? | The route must be testable in the app without changing normal behavior.                 | [#3954](https://github.com/gim-home/m/pull/3954) |
| Can Local OpenClaw ask Desktop for local work without bypassing Desktop?  | Local capabilities must stay behind policy, approval, and audit.                        | [#3954](https://github.com/gim-home/m/pull/3954) |
| Can the runtime path prove package/Gateway compatibility?                 | A local runtime provider needs concrete transport/package proof before broader dogfood. | [#3954](https://github.com/gim-home/m/pull/3954) |

## The Core Safety Rule

```text
Local OpenClaw request
        |
        v
+----------------------+
| Desktop validates    |
| runtime + session    |
+----------+-----------+
           |
           v
+----------------------+
| policy gate          |
+----------+-----------+
           |
           v
+----------------------+
| approval if needed   |
+----------+-----------+
           |
           v
+----------------------+
| audit before/after   |
+----------+-----------+
           |
           v
+----------------------+
| bounded executor     |
+----------------------+
```

Local OpenClaw can ask. Desktop decides. Execution happens only after Desktop
has validated runtime identity, session binding, policy, approval, and audit.

That is the value of the stack: it makes local power usable without making it
ambient.

## Main PR #3954: Local Runtime Provider Proof

[#3954](https://github.com/gim-home/m/pull/3954) proves Local OpenClaw can exist
as a governed Desktop runtime provider.

It folds these focused fork PRs:

| Fork PR                                             | Short title                           | What it proves                                                                                                        |
| --------------------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| [#72](https://github.com/giodl_microsoft/m/pull/72) | Local provider foundation             | Local OpenClaw can be represented as provider status and discovery data without launching or selecting it by default. |
| [#73](https://github.com/giodl_microsoft/m/pull/73) | Policy, session, lifecycle, transport | Provider eligibility, session binding, sidecar/client contracts, and safe disabled defaults are explicit.             |
| [#74](https://github.com/giodl_microsoft/m/pull/74) | Dogfood UI and chat routing           | The route can be exercised through Scout surfaces behind diagnostics/flags without changing default behavior.         |

Review #3954 for these properties:

- Local OpenClaw is visible but not default.
- Feature-off behavior preserves the current Desktop provider baseline.
- Provider identity, session identity, and Desktop authority are separate.
- The runtime path can be discovered, diagnosed, launched, and routed without
  turning on broad local capabilities.
- Dogfood routing is explicit and does not change default behavior.

## Shared Capability Work Moves Out

Desktop node capability core, filesystem read, shell exec, browser, clipboard,
local app, workspace write, and M365 token-broker work are not Local
OpenClaw-only. They should live in the provider-neutral Desktop capability PR
described by `provider-neutral-desktop-capabilities.md`.

Local OpenClaw can use those capabilities, but so can hosted cloud or future
providers once provider routing, policy, readiness, approval, and audit say they
are eligible.

## Integration Proof Moves Out

The live Lobster package-path proof, runtime-level non-Copilot provider
evidence, package integrity denials, admin/readiness policy gates, lifecycle
timeline, rollback proof, Local OpenClaw node-mode adapter, GUI capability
dogfood, and remaining-gap matrix should live in a separate integration proof PR
described by `local-openclaw-integration-proof.md`.

That proof PR should depend on both #3954 and the rebuilt provider-neutral
#3955. It should not force Local OpenClaw runtime review and shared Desktop
capability review into the same foundational PR.

## Why Local OpenClaw Is Worth Having

Local OpenClaw gives Scout four strategic options that are hard to get from a
single cloud-only path.

| Value                           | Explanation                                                                                                                               |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Provider independence           | Scout can evaluate Local OpenClaw without immediately removing the current Desktop provider baseline.                                     |
| Local authority with governance | Local capabilities can be powerful because Desktop remains the policy, approval, audit, and execution boundary.                           |
| Package and rollback control    | Runtime health, compatibility, source identity, launch, reconnect, and rollback can become product-visible states.                        |
| Shared capability reuse         | Local OpenClaw can use the same provider-neutral Desktop capability contracts as hosted cloud instead of owning special local-only tools. |

This is the core argument for Local OpenClaw: not "run something locally," but
"make local runtime power governable enough to review, dogfood, and eventually
switch over safely if the evidence supports it."

## What Is Proven So Far

The latest validation recorded in the PR stack shows:

| Area                                    | Current status                                                                                                       |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Local provider model                    | Source-level contracts and feature-off behavior are proven.                                                          |
| Local runtime discovery and diagnostics | Local OpenClaw can be visible and diagnosable without becoming default.                                              |
| Local session/runtime routing           | Dogfood routing can bind a session to Local OpenClaw behind explicit flags.                                          |
| Sidecar/client transport contracts      | Local OpenClaw can be represented through sidecar/client contracts without broad local authority.                    |
| Lobster package adapter foundation      | Gateway-compatible adapter proof belongs in the integration proof PR when combined with shared Desktop capabilities. |

## Remaining Gaps

These are not reasons to reject the architecture. They are the precise items
that should stay visible before anyone treats Local OpenClaw as default-ready.

| Gap                                   | Why it still matters                                                                                                   |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Gateway-returned provider attestation | Scout should receive source-authenticated provider evidence instead of relying on runtime logs.                        |
| Packaged installer/update rollback    | Source lifecycle rollback is proven in prior work; packaged installer/update rollback has not been run end to end.     |
| Scout-managed package acquisition     | The current proof can launch configured sidecars; Scout-owned downloader/acquirer is not wired yet.                    |
| Default-provider flip                 | The current Desktop provider remains the fully capable baseline until parity and validation justify changing defaults. |

## Reading Order

For a focused review:

1. Read `provider-routing-flexibility-pitch.md` first.
2. Read this document for the Local OpenClaw value story.
3. Review [#3954](https://github.com/gim-home/m/pull/3954) for the local
   runtime/provider model.
4. Read `provider-neutral-desktop-capabilities.md` for the shared #3955
   capability PR.

For deeper review, use the fork PR tables above to jump to the focused slice
that owns the concept being reviewed.

## What This Stack Is Not Claiming

This stack is intentionally not claiming:

- Local OpenClaw is already the default provider.
- GitHub Copilot CLI fallback can be removed immediately.
- The current Desktop provider baseline can be weakened.
- Shared browser, clipboard, app, workspace, and M365 capabilities are
  Local OpenClaw-only.
- Packaged installer/update rollback is fully live-packaged and complete.
- Gateway-returned provider attestation is production-grade.
- Scout-managed package acquisition is complete.

The value of #3954 is that Local OpenClaw becomes reviewable as a governed
provider candidate. The shared capability work belongs in the separate #3955
provider-neutral Desktop capabilities PR.
