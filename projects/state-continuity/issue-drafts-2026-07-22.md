# State Continuity Issue Drafts

These are deliberately split by disclosure boundary. Do not paste the private
Scout issue links or production details into public OpenClaw GitHub.

## Private Lobster / Scout Umbrella

**Title:** Scout safe scale-to-zero: preserve accepted Teams work and cron
across absent or replaced compute

### Problem

Scout can retain Teams ingress and arrange cron wake while a user's container
is absent, but it cannot yet prove that a retiring OpenClaw Gateway generation
closed the complete required state, that the host durably accepted the exact
recovery point, or that replacement compute restored it before becoming ready.

The current private lifecycle paths therefore create a false choice:

- keep idle per-user compute resident; or
- accept gaps where ingress, scheduler state, restore ordering, and readiness
  can disagree during cold start, idle retirement, or replacement.

### Existing production evidence

- [bic/lobster#4666](https://microsoft.ghe.com/bic/lobster/issues/4666): first
  cold reply can remain silent for about four minutes; the stated target is no
  more than two minutes.
- [bic/lobster#4248](https://microsoft.ghe.com/bic/lobster/issues/4248): a
  cold-start timeout can head-of-line block a 1:1 conversation for 15 minutes.
- [bic/lobster#3760](https://microsoft.ghe.com/bic/lobster/issues/3760): cron
  pre-wake can lose a race with idle-drain reclamation.
- [bic/lobster#3927](https://microsoft.ghe.com/bic/lobster/issues/3927): wake
  behavior can repeatedly cold boot and clone a full workspace.
- [bic/lobster#3721](https://microsoft.ghe.com/bic/lobster/issues/3721): stale
  routing can suppress autonomous cron wake until a Teams message arrives.
- [bic/lobster#5031](https://microsoft.ghe.com/bic/lobster/issues/5031): durable
  inbox acceptance can be followed by loss of the original turn during drain.
- [bic/lobster#5493](https://microsoft.ghe.com/bic/lobster/issues/5493): cron
  wake continuity can disappear after an island or region move.
- [bic/lobster#3093](https://microsoft.ghe.com/bic/lobster/issues/3093): OpenClaw
  cron remains the source of truth; Redis wake state is intentionally not a
  replacement scheduler.

### Desired outcome

- Idle Scout users can reach zero resident Gateway compute.
- A Teams turn accepted by the durable inbox is never lost across retirement,
  replacement, or restored startup.
- Autonomous cron wakes and executes without an unrelated user message.
- Source compute is not destroyed until the exact OpenClaw recovery point is
  durably accepted.
- Replacement readiness binds the exact accepted recovery point and reconciled
  scheduler generation.
- Cold restored-ready meets the existing Scout first-reply SLO.

### Upstream dependency and evidence

- [openclaw/rfcs#46](https://github.com/openclaw/rfcs/pull/46) defines the
  host-neutral recovery lifecycle contracts.
- [openclaw/openclaw#112385](https://github.com/openclaw/openclaw/pull/112385)
  is the bounded recovery-point implementation draft.
- [openclaw/openclaw#112865](https://github.com/openclaw/openclaw/pull/112865)
  is the final-capture implementation draft.

This issue should track the Scout product outcome and production validation,
not freeze the implementation decomposition. The RFC owns the cross-project
contract.

## Public OpenClaw Capability Issue

**Title:** Define a recovery contract for hosts that stop and replace Gateway
compute

### Problem

Event-driven and per-user hosts can stop or replace Gateway compute, but a host
cannot infer an application-consistent OpenClaw recovery point by copying live
files. RFC 0013 defines safe snapshots for individual SQLite owners; it does
not prove the complete owner inventory, durable host acceptance, generation-
scoped source retirement, or restored admission.

Without a shared contract, every host must either keep idle Gateways resident
or implement private shutdown, copying, restore ordering, and readiness
inference.

### Desired contract

- The OpenClaw state owner supplies the complete required-component inventory.
- Final capture binds closed owner state to one exact recovery point.
- Host acceptance identifies the exact logical byte set.
- Source retirement is generation-scoped and fail-closed.
- Replacement admission remains closed until the accepted recovery point and
  required owners are ready.
- Existing `openclaw backup sqlite` and `gateway.suspend.*` contracts are
  reused rather than replaced.

### References

- Design: [openclaw/rfcs#46](https://github.com/openclaw/rfcs/pull/46)
- Related state ownership risk:
  [openclaw/openclaw#101290](https://github.com/openclaw/openclaw/issues/101290)
- Recovery-point draft:
  [openclaw/openclaw#112385](https://github.com/openclaw/openclaw/pull/112385)
- Final-capture evidence:
  [openclaw/openclaw#112865](https://github.com/openclaw/openclaw/pull/112865)

This issue should remain host-neutral. Retained ingress, wake registration,
external durability, compute placement, and lifecycle policy remain host
responsibilities.
