# Local OpenClaw Integration Proof

This is the PR-body-ready narrative for the proof PR that should sit after both
of these prerequisites:

- [gim-home/m#3954](https://github.com/gim-home/m/pull/3954) - Local OpenClaw
  runtime provider proof.
- Rebuilt [gim-home/m#3955](https://github.com/gim-home/m/pull/3955) -
  provider-neutral Desktop capabilities.

GitHub only supports one base branch per PR, so "depends on both" should be
implemented as an integration branch that contains both prerequisite heads, with
this proof PR stacked above that combined branch.

## One-Sentence Pitch

This PR proves that Local OpenClaw can use the shared Desktop capability model
as a real runtime path: package launch, provider evidence, admin policy,
capability gates, live Lobster Gateway traffic, rollback, and remaining gaps are
all visible in one integration lane.

## Why This PR Exists

#3954 should stay focused on Local OpenClaw as a governed provider.

The rebuilt #3955 should stay focused on provider-neutral Desktop capabilities
that cloud, Local OpenClaw, and future providers can all request.

This proof PR composes them:

```text
                +-----------------------------+
                | #3954 Local OpenClaw        |
                | provider/runtime path       |
                +--------------+--------------+
                               |
                               v
                +-----------------------------+
                | combined integration base   |
                +--------------+--------------+
                               ^
                               |
                +--------------+--------------+
                | #3955 provider-neutral      |
                | Desktop capabilities        |
                +-----------------------------+
                               |
                               v
                +-----------------------------+
                | this proof PR               |
                | package admin live proof    |
                | provider evidence rollback  |
                +-----------------------------+
```

The value is separation. Runtime foundations are reviewable alone, shared
capabilities are reviewable alone, and the integration proof shows they compose
without making either foundation carry unrelated proof code.

## Dependency Shape

Recommended branch shape:

```text
user/giodl/scout-cloud-brain-architecture
        |
        +--> #3954 local-openclaw-runtime
        |
        +--> rebuilt #3955 provider-neutral-desktop-capabilities

integration base branch:
        merge/replay #3954 + rebuilt #3955

proof PR branch:
        integration base + package/admin/live-proof commits
```

The proof PR body should list both prerequisites and state that review should
start only after those prerequisite diffs are understood.

## What This PR Should Contain

| Proof area                                  | What it demonstrates                                                                                                                                 |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local OpenClaw package path                 | Scout can connect through the local OpenClaw stdio adapter to a Gateway-compatible runtime path.                                                     |
| Live Lobster Gateway traffic                | The adapter can connect to running Lobster E2E runtimes, create Gateway sessions, send chat, normalize assistant events, and emit `turn.complete`.   |
| Rerunnable live proof                       | A script can run the proof and emit redacted JSON output with run id, route, accepted metadata, and completion.                                      |
| Runtime-level non-Copilot provider evidence | The live runtime can complete through a non-Copilot provider path, with provider kind/model/source captured without leaking credentials.             |
| Admin policy and readiness                  | Tenant policy can disable managed install, Windows Companion attach, package sources, and capability families.                                       |
| Package integrity denials                   | Source identity mismatch and missing fingerprint degrade before sidecar start or client attach.                                                      |
| Lifecycle and rollback                      | Launch, compatibility refresh, attach, shutdown, rollback, and client clear states are visible and bounded.                                          |
| Local OpenClaw node-mode adapter            | Local OpenClaw runtime requests are translated into the shared provider-neutral Desktop capability model.                                            |
| Capability composition                      | Local OpenClaw uses shared filesystem, shell, browser, clipboard, app/workspace, and M365 capability contracts rather than private local-only tools. |
| Remaining gaps                              | Provider attestation, live Graph draft proof, packaged installer/update rollback, and Scout-managed acquisition remain explicit.                     |

## What This PR Should Not Contain

This proof PR should not define the foundational provider-neutral capability
contracts. Those belong in #3955.

It should not define the basic Local OpenClaw runtime/provider model. That
belongs in #3954.

It should not claim Local OpenClaw is default-ready. The current Desktop
provider remains the fully capable compatibility baseline until parity and
validation justify a default-provider change.

## Proof Flow

```text
start proof
   |
   v
verify prerequisites
   #3954 runtime provider present
   #3955 Desktop capabilities present
   |
   v
launch or attach Local OpenClaw runtime
   |
   v
connect Scout stdio adapter to Gateway path
   |
   v
send chat + observe assistant events
   |
   v
exercise capability/admin gates
   |
   v
record redacted proof summary
   |
   v
rollback / clear client state
```

## Suggested PR Body

### What

This PR adds the Local OpenClaw integration proof lane that composes the Local
OpenClaw runtime provider stack with provider-neutral Desktop capabilities.

### Why

The runtime provider work and shared Desktop capability work should be reviewed
separately. This PR proves the two foundations compose into a real dogfood path
without making either foundational PR carry package/admin/live-proof concerns.

### Prerequisites

- #3954 Local OpenClaw runtime provider proof.
- #3955 provider-neutral Desktop capabilities.

### Scope

- Live Lobster Gateway package-path proof.
- Local OpenClaw node-mode adapter into provider-neutral Desktop capabilities.
- GUI dogfood that proves Local OpenClaw can request shared Desktop
  capabilities through approval/audit.
- Rerunnable redacted proof script.
- Runtime-level non-Copilot provider evidence.
- Admin/readiness policy gates.
- Package integrity denials.
- Lifecycle and rollback proof.
- Evidence summary for reviewers.
- Remaining-gap documentation.

### Out Of Scope

- Defining provider-neutral Desktop capability contracts.
- Defining the basic Local OpenClaw provider/runtime model.
- Making Local OpenClaw the default provider.
- Removing the current Desktop provider baseline.

### Validation

Expected validation once rebuilt:

- `pnpm run proof:local-openclaw-lobster-live`
- `pnpm run test:local-openclaw-switch-over`
- Focused Local OpenClaw lifecycle/admin/integrity tests.
- Focused Desktop capability integration tests.
- `pnpm run typecheck`
- `git diff --check`

### Remaining Gaps

- Gateway-returned provider attestation should replace runtime-log-only
  provider evidence.
- Live M365 Graph draft creation remains blocked until a real broker/token setup
  is available.
- Packaged installer/update rollback has not been run end to end.
- Scout-managed Local OpenClaw package acquisition is not wired.

## Branch Surgery Plan

1. Rebuild #3955 as provider-neutral Desktop capabilities on the #3953
   provider-routing foundation.
2. Leave #3954 as Local OpenClaw runtime provider proof.
3. Create an integration base branch that combines #3954 and rebuilt #3955.
4. Move the existing package/admin/live-proof commits from the old #3955 branch
   onto a new proof branch based on that integration base.
5. Open the proof branch as a draft PR and use this document as the PR body.

This preserves review clarity:

- #3954: "Can Local OpenClaw be a governed provider?"
- #3955: "Can Desktop capabilities be shared by any eligible provider?"
- Integration proof: "Do those two foundations compose in a live Local OpenClaw
  dogfood path?"
