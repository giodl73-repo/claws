# OpenClaw Control Model Review Packet

Use this index for team and `.roles` review.

## Decision summary

OpenClaw owns a framework-neutral Control Model and the authorized catalog of
applicable view descriptors contributed by core and installed extensions.
Clients such as Lobster select a compatible view, materialize only that
deferred payload, and map it into their own view model such as `SessionView`.
OpenClaw retains protocol, reconciliation, command, artifact, and authorization
semantics. Products retain presentation, renderer trust, theming, routing,
telemetry, and rollout.

## Project materials

| Material | Purpose |
| --- | --- |
| [Architecture](architecture.md) | Thesis, audit, ownership, contracts, PR series, evidence slice |
| [M/Lobster issue body](m-issue-draft.md) | Product adoption problem, direction, and acceptance sketch |
| [Role review](role-review.md) | Gateway, UX, CISO, founder, and Lobster runtime findings |
| [Session](SESSION.md) | Current branch, live issue, blockers, and resume state |

## Fork-only OpenClaw RFC

| Material | Link |
| --- | --- |
| RFC 0029 | https://github.com/giodl73-repo/rfcs/blob/user/giodl/rfc-0029-control-model/rfcs/0029-openclaw-control-model.md |
| Control Model v1 specification | https://github.com/giodl73-repo/rfcs/blob/user/giodl/rfc-0029-control-model/rfcs/0029/control-model-v1-spec.md |
| UI artifact and view-offer v1 specification | https://github.com/giodl73-repo/rfcs/blob/user/giodl/rfc-0029-control-model/rfcs/0029/ui-artifact-v1-spec.md |
| Conformance and adoption plan | https://github.com/giodl73-repo/rfcs/blob/user/giodl/rfc-0029-control-model/rfcs/0029/conformance-and-adoption-plan.md |
| Implementation and PR plan | https://github.com/giodl73-repo/rfcs/blob/user/giodl/rfc-0029-control-model/rfcs/0029/implementation-plan.md |

No upstream RFC issue or pull request exists.

## Live product issue

- [gim-home/m#5675](https://github.com/gim-home/m/issues/5675):
  M/Lobster adoption through the existing `SessionView` vocabulary.
- [gim-home/m#2511](https://github.com/gim-home/m/issues/2511):
  native React/JSON-render GenUX direction and swappable renderer discussion.

## Review questions

1. Is OpenClaw the correct owner for session/conversation reconciliation,
   commands, artifact lifecycle, and view descriptors?
2. Does descriptor discovery avoid eager work and unauthorized capability
   disclosure?
3. Is selected-only deferred materialization sufficient for the first native
   view?
4. Can Lobster map the selected projection into `SessionView` without adding a
   second shared view-model vocabulary?
5. Are native renderer registration, schema validation, action correlation,
   and MCP App fallback boundaries strong enough?
6. Which exact first view pair should prove selection: calendar/list,
   table/summary, or another bounded scenario?
7. Which existing Lobster and Control UI reducers become deletable after the
   evidence slice?

## Proposed review outcome

Approve, revise, or reject the smallest evidence slice. Do not decide package
publication, JSON Patch streaming, a generic component marketplace, or upstream
RFC submission in this review.
