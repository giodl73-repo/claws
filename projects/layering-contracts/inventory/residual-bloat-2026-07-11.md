# Residual Lobster Bloat Audit - 2026-07-11

## Question

After Readiness and Hosting Profiles, Managed Configuration, Hosted
Integration, and Runtime State Continuity, what Lobster/OpenClaw coupling is
still not accounted for?

## Conclusion

No fifth peer-level portable hosting contract is evident. The remaining work
falls into four execution lanes:

1. adopt the four contracts in Lobster and delete their old carriers;
2. keep legitimate enterprise-host behavior in Lobster;
3. upstream ordinary OpenClaw and plugin fixes through a patch-retirement lane;
4. coordinate separately with AgentHarness and OCC at their existing plane
   boundaries.

The important correction is that not every Lobster patch is evidence for a new
hosting abstraction. Some are ordinary upstream product bugs or plugin
features and should be promoted directly.

## Environment Variables

`GatewayStartBody.extra_env` is a carrier, not a semantic contract. Each key
must move to one of these destinations:

| Current meaning | Destination |
| --- | --- |
| Ordinary OpenClaw setting or host/operator-owned value | Managed Configuration |
| Plugin enablement or plugin-owned feature gate | Plugin manifest/config and Lobster rollout selection |
| Host implementation, credential, endpoint, or traffic-policy selection | Hosted Integration owner binding |
| Runtime identity and selected hosting posture | Hosting Profile activation identity |
| Restore, checkpoint, persistence, or safe-shutdown fact | Runtime State Continuity |
| Container-only implementation detail | Remain in Lobster image/orchestration |
| Removed consumer or historical patch toggle | Delete |

The target is not zero environment variables. It is a small documented
bootstrap carrier with no environment key that silently rewrites ordinary
runtime behavior.

The current adapter has three separately maintained registries:

- runtime projection in `gateway_start_extra_env` and per-claims enrichers;
- warm-slot reset in `MANAGED_EXTRA_ENV_KEYS`;
- Gateway child forwarding in `ALLOWED_ENV`.

Until migration is complete, Lobster still needs one generated/tested
descriptor tying each key to source, lifecycle, sensitivity, destination,
omission/reset behavior, and consumer. That registry is compatibility
hardening and a deletion aid, not an OpenClaw RFC.

At the audited revision, a bounded literal-key scan found:

- 30 literal managed keys in the runtime projection path;
- 23 literal keys in the warm-slot reset list, with additional constant-backed
  entries that must be resolved before treating the difference as a bug;
- 28 literal keys in the Gateway child allowlist;
- 17 projected literal keys forwarded to the Gateway child; and
- 13 projected literal keys consumed adapter-side or converted into files/state.

The high-value mismatch candidates remain
`OPENCLAW_CODE_MODE_STREAMING_ENABLED`, `CRON_WORKIQ_PLAN_CAPTURE_ENABLED`,
`OPENCLAW_GIT_PASSPORT_STRICT_LEASE_ENABLED`, `OPENCLAW_GIT_REPO_FILENAME`,
`OPENCLAW_WEBIQ_ENABLED`, and
`OPENCLAW_WORKIQ_TEAMS_DELEGATED_RENAME_ENABLED`. Constant-backed reset entries
and special state handling cover some other literal differences, so the final
matrix must resolve symbols and consumers before filing bugs.

## OpenClaw Runtime Identity Adoption

The runtime-activation slice in OpenClaw PR 42 gives Lobster the missing hostee
identity fields, but Lobster still needs to populate them.

Recommended mapping:

| OpenClaw field | Lobster source | Lifecycle |
| --- | --- | --- |
| `runtimeId` | Stable logical route/binding identity for the tenant/user OpenClaw runtime | Survives process/container replacement |
| `incarnationId` | Physical Plex/container/process allocation identity | Changes whenever execution is replaced |

Lobster should pass both when launching the Gateway, then record the returned
activation identity beside route identity, worker/container identity, selected
profile, OpenClaw artifact, config generation, host-bundle version, and restored
state generation. Readiness proves the exact activation Lobster is routing to.

This does not move placement, worker pools, tenant routing, replicas, quotas,
or rollout ownership into OpenClaw. Those remain Lobster/OCC concerns.

## Start DTO Disposition

`GatewayStartBody` remains a legitimate Lobster adapter API during migration,
but it should shrink toward orchestration rather than remain the semantic home
for OpenClaw behavior.

| Start-body family | Long-term owner |
| --- | --- |
| Profile and runtime/incarnation identity | Hosting Profiles activation |
| Config fragments, model catalogs, policy values | Managed Configuration |
| ProxyPipe, credentials, provider adapters, Channel endpoints | Hosted Integration |
| Git mode, restore/checkpoint intent, shutdown safety | Runtime State Continuity |
| User/tenant routing, rollout flags, diagnostics selection | Lobster |

Unknown-field tolerance is useful for rolling versions, but requested behavior
needs owner-produced readiness evidence. Ignoring an unknown start field cannot
count as successful activation.

## Patch Retirement Lane

The current image applies eleven source patches plus two post-install rewrite
scripts. They do not all belong to the four RFCs.

| Patch family | Disposition |
| --- | --- |
| msteams brokered auth and benchmark-range networking (`0001-0002`) | Hosted Integration supplies the binding/traffic contract; concrete Teams behavior remains in the msteams plugin |
| Native msteams packaging (`0003`) | Plugin packaging/lifecycle contribution, then delete Lobster patch |
| Keyless WebIQ secrets fast path (`0004`) | Hosted Integration credential/provider binding plus readiness |
| Teams streaming, dedupe, quoted/forward normalization, threading (`0005-0007`, `0009`) | Ordinary msteams plugin fixes/features; upstream directly |
| Deferred Gateway activation (`0008`) | Hosting Profile activation/readiness and lifecycle adoption |
| Cron delivery target and tool-less run semantics (`0010-0011`) | Ordinary OpenClaw cron/tool-policy fixes; upstream directly |
| Request-timeout and cron-plan rewrite scripts | Audit individually as upstream bug/config/approval work; do not normalize post-install mutation as a hosting contract |

Every patch needs an upstream issue/PR, the first OpenClaw release containing
the replacement, a Lobster dual-run or conformance gate where necessary, and a
deletion PR. Patch count and age should be release-admission metrics.

## Remaining Concrete Work

1. Generate the complete environment-key descriptor and delete proven dead
   projections, beginning with the previously unconsumed streaming and cron
   capture keys.
2. Add Lobster runtime/incarnation identity projection and correlate it with
   readiness, routing, logs, and telemetry.
3. Map every `GatewayStartBody` field to one owner and mark its removal gate.
4. Classify all eleven source patches and both rewrite scripts by upstream
   issue/PR/release/deletion status.
5. Complete the ProxyPipe frame migration ledger and state path/writer
   inventory already assigned to Hosted Integration and Continuity.
6. Keep AgentHarness execution frames with RFC 31 and OCC desired-state,
   admission, placement, quota, and rollout outside the runtime hot path.

## Portfolio Test

The portfolio is complete only when a new Lobster workaround cannot be added
without answering:

- Which OpenClaw owner lacks a contract?
- Which of the four corners carries the portable semantic?
- Is this instead an ordinary OpenClaw/plugin bug?
- What release and Lobster deletion remove the workaround?

If none of those answers applies, the behavior is probably legitimate Lobster
product or infrastructure ownership rather than OpenClaw bloat.
