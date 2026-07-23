# Upstream-First Release Compact

## Purpose

Make upstream OpenClaw improvement the default response to Lobster runtime
gaps, and make every Lobster-only patch temporary, visible, and deletion-bound.

The desired behavior is simple:

```text
Lobster finds a gap
  -> name the OpenClaw owner and upstream contract or bug
  -> upstream issue/RFC/PR
  -> bounded temporary patch only when release timing requires it
  -> quarantine-cleared OpenClaw release
  -> hosting conformance and Lobster promotion
  -> delete the patch and obsolete tests
```

## Commitments

### OpenClaw

- Own portable runtime semantics and conformance tests.
- Keep accepted hosting fixes independently useful outside Lobster.
- Publish artifact, profile, and contract-version evidence needed by hosts.
- Preserve owner boundaries across Gateway, Channels, plugins, providers,
  AgentHarness, configuration, readiness, and continuity.

### Lobster

- Open or identify the upstream issue/RFC/PR before admitting a portable
  runtime workaround, except during an active incident.
- Prefer released OpenClaw behavior and supported plugin/binding surfaces over
  adapter rewrites, baked overlays, source patches, or private protocol frames.
- Promote quarantine-cleared OpenClaw releases on a regular automated cadence.
- Re-evaluate every carried patch against every candidate release.
- Stage the Lobster deletion change before broad rollout of the replacement.
- Remove expired fallback paths rather than retaining them indefinitely.

### Shared

- Use the four hosting contracts as the default classification:
  Readiness/Hosting Profiles, Managed Configuration, Hosted Integration, and
  Runtime State Continuity.
- Treat ordinary OpenClaw or plugin bugs as ordinary upstream fixes rather than
  inventing a hosting abstraction around them.
- Use AgentHarness for execution events and OCC for desired state, admission,
  placement, quota, and rollout; neither enters the runtime message hot path.

## Patch Admission Record

No new OpenClaw source patch, post-install rewrite, private config overlay, or
ProxyPipe behavior enters Lobster without a machine-readable record containing:

| Field               | Requirement                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------ |
| `id`                | Stable Lobster workaround id                                                                     |
| `owner`             | Named engineering owner                                                                          |
| `introducedAt`      | Date and Lobster commit/PR                                                                       |
| `reason`            | User or operational failure being mitigated                                                      |
| `classification`    | One of the four contracts, ordinary upstream bug/plugin feature, or legitimate Lobster ownership |
| `upstream`          | OpenClaw issue/RFC/PR, or incident exception with due date                                       |
| `affectedArtifacts` | OpenClaw packages/files/protocol/config surfaces changed                                         |
| `conformance`       | Test proving replacement behavior                                                                |
| `minimumRelease`    | First OpenClaw release expected to remove the workaround                                         |
| `expiry`            | Date or release after which fallback is forbidden                                                |
| `removal`           | Planned Lobster deletion PR/files/tests                                                          |
| `telemetry`         | Evidence that old-path use reached zero                                                          |

Incident exceptions must create the missing upstream record within two working
days. An exception without an owner and expiry is not admissible.

## Promotion Gate

PromoteClaw evaluates every quarantine-cleared candidate in this order:

1. Verify artifact identity and quarantine-feed evidence.
2. Run the selected Hosting Profile conformance and reference container proof.
3. Run Managed Configuration, Hosted Integration, and Continuity compatibility
   evidence required by the Lobster deployment posture.
4. Compare every workaround record with the candidate release.
5. Drop patches already replaced upstream.
6. Rebase and prove only the remaining bounded patches.
7. Block promotion on unknown patch status, failed conformance, undeclared
   version skew, or an expired fallback.
8. Open the Lobster promotion PR with patch-added, patch-retained, patch-dropped,
   and deletion-ready summaries.

A promotion is not green merely because patches still apply. It is green when
the candidate satisfies the supported hosting contract and every retained
workaround still has a valid reason and expiry.

## Deletion Gate

A workaround is complete only when:

- the replacement ships in a quarantine-cleared OpenClaw release;
- contract or behavior conformance passes against that artifact;
- Lobster canary telemetry shows the replacement path is authoritative;
- rollback remains possible for the declared observation window;
- the old implementation, fallback, drift gate, and obsolete tests are
  deleted; and
- the deletion ledger is marked `deleted` with the Lobster removal commit.

Dual-run is a bounded comparison technique, not a permanent operating mode.

## Measures

Report these measures by release and monthly trend:

| Measure                                             | Desired direction                |
| --------------------------------------------------- | -------------------------------- |
| Total Lobster-carried OpenClaw source patches       | Down                             |
| Post-install rewrite scripts                        | Down to zero                     |
| Private ProxyPipe semantic families                 | Down                             |
| Baked config writers and cleanup rules              | Down                             |
| Persistence wrappers and private state inference    | Down                             |
| Median workaround age                               | Down                             |
| Workarounds without upstream link, owner, or expiry | Zero                             |
| Candidate releases promoted after quarantine        | Regular and predictable          |
| Patches deleted during promotion                    | Visible positive release outcome |
| Hosting conformance failures caught before rollout  | Visible and acted upon           |

The primary architecture metric is deletion, not RFC or PR count.

## Ownership And Review

- PromoteClaw owns candidate discovery, patch comparison, conformance evidence,
  and promotion PR assembly.
- The layering-contract deletion ledger owns workaround classification and
  removal status.
- Each upstream subsystem owner approves its portable semantic replacement.
- Lobster owners approve enterprise rollout, telemetry, rollback, and deletion.
- Omar's review should focus on patch age/count, blocked promotions, missing
  owners/expiries, and deletion throughput.

## Starting Baseline

The July 2026 residual audit found eleven OpenClaw source patches and two
post-install rewrite scripts in the Lobster image path. This is the initial
patch-retirement queue. Existing workarounds should be backfilled into the
admission record before this compact blocks new promotion work.
