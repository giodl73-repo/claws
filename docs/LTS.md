# LTS Policy — bic/claws

## Summary

Currently **all live versions are supported**. Claws is early-stage;
LTS (long-term support) designation kicks in once the product reaches
GA on the internal GPR.

## Version support today

| Version range | Status          | Notes                                                        |
| ------------- | --------------- | ------------------------------------------------------------ |
| `0.x`         | Active (pre-GA) | No LTS designation; breaking changes possible on minor bumps |

Once the first GA version ships (target: `1.0.0`), the LTS window
defined below applies.

## LTS window (target — TBD by leadership)

**TBD:** leadership to confirm:

- Exact LTS duration (proposed: 18 months from major release)
- How many majors simultaneously LTS'd (proposed: current + prior)
- Whether LTS branches get security-only fixes or full patches

Placeholder until decided:

| Major version | GA date | LTS through | Status     |
| ------------- | ------- | ----------- | ---------- |
| `1.x`         | TBD     | TBD + 18mo  | Pending GA |

## Requesting LTS for a non-current version

If you're on an older major and need a bug fix after it's out of LTS:

1. Open a GHE issue on `bic/claws` tagged `lts-request`
2. Describe the bug + the version you're on
3. Include: internal business justification, severity, affected users
4. A `claws-release-eng` triages weekly

Approval is at the owner's discretion based on severity × user count.

## What changes with LTS

When a version is in LTS:

- Security patches get cherry-picked to the LTS branch
- No new features, no breaking changes
- `npm deprecate` warnings don't apply to LTS versions
- CI continues running on the LTS branch for the duration

When a version falls OUT of LTS:

- No more commits to that branch
- `npm deprecate @bic/claws-cli@X.Y "EOL: migrate to vZ"` applied
- Version stays on GPR (not unpublished) so existing consumers don't
  break mid-deploy — they just get the deprecation warning

## What's NOT in scope

- Public-facing LTS (no public releases from this machine per CLAUDE.md;
  all customers are Microsoft-internal today)
- ClawPilot or device-mode LTS (separate lifecycle)
- Security embargo policy (handled via microsoft-security@; see ops
  runbook, not this doc)
