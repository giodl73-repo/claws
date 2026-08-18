# Agent Security and Identity Project

Use this area to coordinate identity, authorization, node admission, execution
containment, and trust-boundary decisions across Scout, SuperApp, OpenClaw, and
Microsoft identity/platform dependencies.

The working model separates three concerns that must compose but must not be
treated as equivalents:

1. **Gateway and resource authorization**: who is asking, which user or agent
   principal is represented, and what downstream resources it may access.
2. **Node admission**: which device/runtime may connect to a gateway, including
   pairing, approval, token lifecycle, revocation, and capability grants.
3. **Execution identity and containment**: under which principal local work
   executes, which boundary constrains it, and how actions are attributed,
   audited, and revoked.

Process sandboxing with inherited user identity is a valid initial deployment
profile. It is not equivalent to a distinct session identity or an MXC-backed
containment profile.

## Active Notes

| Area | File |
| ---- | ---- |
| Session handoff | `SESSION.md` |
| Teams response and decision framing | `teams-response-2026-08-11.md` |
| Teams paste artifact | `artifacts/scout-identity-response-2026-08-11.html` |

## Current Hypothesis

- Cloud Scout is a gateway and uses Microsoft Entra ID at the product boundary.
- OBO of the human user may be the shortest credible path for near-term
  cloud-to-service authorization, without waiting for Agent User/WAM delivery.
- OpenClaw-style device pairing can admit a node to a gateway, but pairing alone
  does not define the principal under which local execution occurs.
- SuperApp's Microsoft product integration has additional identity,
  authorization, audit, containment, and revocation obligations beyond the
  generic upstream OpenClaw node protocol.
- Session MXC remains strategically important for a stronger isolated execution
  profile, but its scope, owner, dependency chain, and Ignite commitment need
  explicit confirmation.
- Oceana is a separate Windows AGI effort and should remain outside the
  Scout/OpenClaw architecture unless its owners identify a shared contract.

## Active Work

| Repo | PR / Issue | Branch | Status | Purpose |
| ---- | ---------- | ------ | ------ | ------- |
| `claws-hapi` | N/A | `main` | Active framing | Track decisions, owners, meeting outcomes, and response artifacts. |
| `openclaw/openclaw` | TBD | TBD | Related | Generic gateway/node pairing and authorization contracts. |
| `openclaw/openclaw-windows-node` | TBD | TBD | Related | Windows node and session MXC integration evidence. |
| `superapp-autopilot` | TBD | TBD | External owner | Microsoft product use of the Rust runtime and Scout gateway. |

## Immediate Decisions

1. Is OBO of the human user acceptable as the near-term Cloud Scout resource
   authorization model, and for which operations?
2. What principal does local node execution use in each deployment profile?
3. What security property does session MXC add beyond process sandboxing and
   inherited identity?
4. Is session MXC an Ignite requirement, a stretch goal, or a post-Ignite
   dependency, and who owns delivery?
5. Which guarantees belong upstream in OpenClaw versus in the Microsoft product
   integration?

## Related Areas

- `projects/openclaw-rust-node/README.md`
- `projects/enterpriseclaw/README.md`
- `projects/hosted-integration/README.md`
- `projects/policy/README.md`
