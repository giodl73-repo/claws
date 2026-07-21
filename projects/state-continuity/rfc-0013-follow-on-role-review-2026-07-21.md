# RFC 0013 Follow-On Role Review

## Scope

Reviewed:

- RFC 0013 at `openclaw/rfcs` PR 20, head
  `864d7dee6ba6b9cf9e2f902f174408e5fbc570db`;
- landed OpenClaw snapshot implementation PR 105718;
- the proposed RFC 0013 sidecar and five-PR replacement plan; and
- lessons from the real Lobster continuity proof.

Roles:

- `.craft/roles/claws/gateway-eng.md`
- `.craft/roles/claws/lobster-container-eng.md`
- `.craft/roles/claws/ciso.md`
- `.craft/roles/claws/founder.md`
- `.craft/roles/claws/platform-eng.md`
- `.craft/roles/claws/lorant-reviewer.md`

## Gateway Runtime Owner

**Finding:** approve the RFC 0013 base and sidecar direction.

- Snapshot creation remains an explicit owner operation, not a per-message,
  per-tool-call, or startup hot-path hook.
- The landed primitive already owns SQLite consistency and verification.
- Current `main` already provides
  `gateway.suspend.prepare|status|resume` from PR 103618, with Vincent's
  architecture/lint validation repair in PR 103925 and later hardening for
  background execs and cron settlement.
- Recurring capture must remain bounded, optional, and failure-isolated.
- Final handoff may reuse the same owner primitive after quiescence, but must
  not alter ordinary Gateway shutdown behavior.

**Required constraint:** no automatic capture, continuity framework, or second
Gateway pause API in the default Gateway path.

## Lobster Container Operator

**Finding:** approve after keeping lifecycle outside the snapshot primitive.

- Completed snapshot directories are a viable host persistence boundary.
- The shipped suspension lease is cooperative and refuse-only; it closes
  tracked admission and pauses scheduling but does not stop third-party Channel
  transports, persist external ingress, or prove arbitrary plugin work idle.
- Host publication, encryption, retention, source destruction, provisioning,
  and replay remain Lobster responsibilities.
- The sidecar plan removes the proposed publication-provider plugin and avoids
  adding another resident process.
- Restore phase timings, health, same-child replay, and reconnect behavior must
  remain observable in the paired proof.

**Required constraint:** a local snapshot path or process exit cannot become
host acceptance or readiness.

## Security

**Finding:** the sidecar plan needs an explicit backup-versus-portable boundary.

- Ordinary snapshots may contain auth profiles, session state, plugin state,
  and credentials-adjacent records.
- Host encryption and access control are necessary but do not replace explicit
  portable-state treatment.
- Portable composition must classify captured, external, reconstructed, and
  ephemeral state without secret values in manifests.
- Unknown credential treatment, literal-sensitive config, digest conflicts,
  and contradictory replay fail closed.

**Required constraint:** do not silently change RFC 0013 snapshot contents or
claim that every ordinary snapshot is portable.

## Founder And Simplicity

**Finding:** the revised direction is substantially better than the prior
twelve-PR architecture.

- RFC 0013 remains useful to every local OpenClaw user.
- Lobster is evidence and one host implementation, not the product model.
- The default OpenClaw experience has no host, plugin, CAPE, or lifecycle tax.
- Sidecars describe optional composition above a small native primitive.

**Required constraint:** sidecars must remain readable without Lobster context
and must not introduce vendor-specific transport, storage, or naming.

## Platform Operator

**Finding:** approve the aggregate recovery-point concept with stable evidence.

- Exact component identities and host acceptance receipts support audit,
  upgrade, fallback, and drift diagnosis.
- Each runtime can fail or quarantine independently.
- Fleet policy remains outside the artifact format.
- No global mutation generation or fleet-wide transaction is required.

**Required constraint:** Status and diagnostics may project the result later,
but should not be added before the underlying recovery transaction exists.

## Maintainer Review

**Blocking finding:** the RFC document and GitHub PR body have drifted.

The current RFC document says:

- implementation landed in PR 105718;
- the contract is `openclaw backup sqlite`;
- RFC status is `completed`; and
- scheduling, upload, retention, fencing, and failover remain outside scope.

The PR body still describes:

- a pre-landing pilot;
- the old `openclaw snapshot` command;
- implementation PRs as draft proofs;
- stale head/proof SHA `6e46159`; and
- draft acceptance metadata.

**Required fix:** replace the PR body with current-head scope and proof before
asking Vincent to review follow-on sidecars.

## Cross-Role Decision

Proceed with:

1. preserving RFC 0013 and #105718 unchanged as the SQLite owner primitive;
2. preserving current-main `gateway.suspend.*` as the cooperative handoff
   fence rather than adding a new pause API;
3. correcting PR 20's stale body;
4. explaining the Lobster lessons as evidence for a smaller follow-on;
5. asking Vincent to review the ownership boundary before sidecar authoring;
6. keeping the first sidecar pack optional and host-neutral; and
7. deferring implementation, CAPE, and Elastic wake until that review.

Do not proceed with:

- the prior twelve-PR topology;
- duplicate SQLite snapshot/archive code;
- a new publication-provider plugin contract;
- ordinary snapshot contents silently becoming credential-free portable state;
- process exit or local artifact creation authorizing destruction; or
- restored process startup being treated as readiness.
