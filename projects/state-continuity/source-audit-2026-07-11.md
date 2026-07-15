# Runtime State Continuity Source Audit

## Revisions

- OpenClaw: `C:\src\openclaw-layering-audit` at `fab69517b3d`.
- Readiness analogue: `C:\src\openclaw-hosting-readiness-registry` at
  `990ab4808c6`.
- Lobster: `C:\src\lobster-layering-audit` at `0a9514c1ce`.
- Hosted Integration RFC and project material were reviewed after the initial
  audit and supersede the original generic-provider hypothesis.

## OpenClaw State Findings

| Surface | Current behavior | Continuity consequence |
| --- | --- | --- |
| Global SQLite | Multiple subsystem writers; local transactions and revisions; no runtime-wide mutation generation. | Capture through the database's native online semantics. Do not invent aggregate consistency. |
| Per-agent SQLite | Independent database per agent; indexes have separate revisions. | Inventory and capture each required database independently. |
| Sessions/transcripts | File-backed and not uniformly covered by existing volatile backup behavior. | Classify and test them explicitly; do not infer consistency from SQLite capture. |
| Configuration | Atomic writes, version stamps, and last-known-good recovery exist. | Reuse native artifacts and provenance where available. |
| Workspace | Agent/tool writes; hosting durability may be provided outside core. | Declare captured, reconstructed, or externally bound treatment. |
| Plugin state | Some state shares core SQLite; plugins may also own external state. | V1 inventories core surfaces; third-party capture registration is deferred. |
| Credentials/identity | Mix of runtime-owned files and host-injected capabilities. | Never capture host-managed credentials; classify runtime-owned identity separately. |
| Caches/indexes | Often reconstructable. | Exclude only with an explicit reconstruction rule. |

Evidence includes `src/state/openclaw-state-db.paths.ts`,
`src/state/openclaw-agent-db.paths.ts`, global and agent SQL schemas,
`src/infra/backup-create.ts`, `src/infra/backup-volatile-filter.ts`,
`src/config/io.ts`, and `src/plugin-state/plugin-state-store.ts`.

Current backup creation captures discovered SQLite files independently and
sequentially. Its manifest has creation metadata but no aggregate source
generation, and the audited branch has no complete restore/import counterpart.
This supports a component inventory and immutable manifest, not component
watermarks or a global state transaction.

## Clean Shutdown Findings

OpenClaw supports graceful teardown: it stops admission, runs shutdown hooks,
and closes Channels, services, and stores. It is not currently a
continuity-safe shutdown protocol:

- warnings and timeouts may allow teardown to continue;
- no final aggregate recovery point is accepted;
- no destruction authorization is produced; and
- outer adapters or sidecars may still own writable state.

Continuity therefore composes with conventional clean shutdown. Planned
handoff drains work and writable owners, completes clean shutdown, captures the
resulting closed persisted state, publishes it, and only then authorizes
destruction.

## Readiness And Hosted Integration Findings

The readiness registry remains useful prior art for bounded callbacks, stable
evidence, requirement selection, and operator diagnostics. Checkpoint and
restore are side effects and must not reuse readiness's cached-observation
semantics.

RFC 0020 Hosted Integration now owns the actual extension pattern:

- central host bundle registration;
- typed owner-local references and activation;
- local/hosted capability bindings;
- Hosting Profile requirement selection;
- readiness, Status, and Doctor conventions;
- authorization, generations, and carriers.

RFC 0021 must use that pattern for publication and lifecycle bindings rather
than create a continuity provider registry, readiness system, or composition
runtime.

## Lobster Lifecycle And Wake Findings

`LifecycleCommand.workspace_action=checkpoint_unmount` is inert in the audited
branch. The existing `shutdown_ready` path waits for cron checkpoints, queues a
signal, attempts workspace commit/push, and releases the passport. Push failure
can be warning-only, so this is not final recovery-point publication.

Lobster does, however, provide evidence for the first Elastic scope:

- the durable Teams inbox retains messages across absent compute;
- ingress can provision a container and wait for readiness;
- delivery has fencing and deduplication;
- cron supports external wake scheduling; and
- host/API requests can be retained by host-owned infrastructure.

Channels requiring resident sockets or pollers do not satisfy zero-compute
Elastic behavior unless the host retains compute.

Relevant source areas include ProxyPipe lifecycle messages, container host
lifecycle, workspace git storage, Teams durable inbox/warmup/delivery, cron
wake scheduling, and gRPC readiness.

## Lobster Credential Findings

- Graph tokens are held in tmpfs.
- Proxy/session tokens remain host-owned.
- LLM credentials are injected through ProxyPipe/provider machinery.
- Pairing or adapter credentials may be reconstructed or reseeded.

Portable therefore requires destination capability equivalence and
authorization, not credential-byte backup. Any non-reconstructable
runtime-owned identity needs separate classification, encryption by external
key authority, redaction, audit, and destination authorization.

## Audit Decision

The design boundary is:

```text
existing state owners and storage semantics
  -> native online or closed-state capture
  -> immutable continuity manifest
  -> Hosted Integration publication binding
  -> exact acceptance receipt
  -> ordered restore and validation
  -> readiness
```

The first evidence slice is a local Archived round trip with a complete core
state inventory. Portable and Elastic add lifecycle authority only after that
substrate and Hosted Integration patterns are proven.
## PR 2 Current-Main Backup Audit

The first implementation branch exposed a useful distinction: current
OpenClaw already has a substantial native backup capture path, but it does not
yet satisfy the RFC 0021 Archived contract.

### Reusable current behavior

- `src/infra/backup-create.ts` discovers every SQLite database under the state
  root and snapshots each database with `VACUUM INTO`, including the canonical
  shared database and per-agent databases.
- `src/commands/backup-shared.ts` plans state, config, OAuth credentials, and
  workspace assets, deduplicating paths already covered by a parent asset.
- Archive entry remapping confines absolute source paths beneath one archive
  root.
- `src/commands/backup-verify.ts` rejects absolute/traversing entry names,
  duplicate normalized paths, payloads outside the declared root, missing
  assets, and hardlinks whose targets are absent or outside the archive.
- Archive publication is atomic and refuses overwrite.

These are native capture and structural verification primitives to reuse rather
than replace.

### Archived gaps

- Manifest schema 1 records asset kind, source path, and archive path, but no
  component ID, content digest, compatibility identity, dependency treatment,
  restore order, or checkpoint identity.
- Verification proves archive structure and payload presence, not exact content
  identity.
- There is no backup restore command or ordered clean-destination restore path.
- Live session transcript files and several queue/log surfaces are classified
  as volatile by the backup filter. The agent SQLite database may own canonical
  transcript state for migrated stores, but legacy/file-backed completeness
  must be proved rather than inferred.
- Backup explicitly includes the OAuth credentials directory, and captured
  shared/per-agent databases contain credential-bearing tables. RFC 0021 must
  distinguish approved runtime-owned protected identity material from
  host-managed credentials that must be re-resolved; whole-database capture
  alone cannot prove that boundary.
- The manifest contains absolute source paths. That is useful for provenance
  but cannot be surfaced unredacted through Status or receipts.

### Design consequence

PR 2 must not report existing backup archives as Archived recovery points. The
smallest valid vertical path is:

```text
native backup capture
  -> continuity component classification
  -> exact artifact identity
  -> clean-destination retrieval and confinement
  -> explicit restore/dependency validation
  -> only then effective Archived
```

The first PR 2 implementation work should reuse backup creation and
verification while adding exact identity and a clean-destination retrieval
seam. Credential policy and legacy session completeness remain blocking
evidence, not success-shaped defaults.

### Post-retrieval source evidence

- The current per-agent SQLite schema owns `sessions`, `session_entries`,
  `transcript_events`, and related identity tables, so migrated SQLite-backed
  session content is covered by native SQLite snapshotting.
- The volatile backup filter still excludes legacy root and per-agent session
  `.jsonl`/`.log` transcripts. Archived completeness therefore remains blocked
  whenever file-backed session content is authoritative.
- Legacy transcript import into SQLite is a Doctor migration
  (`src/commands/doctor-session-sqlite.ts` calling
  `importSqliteSessionRows`); normal backup creation does not run it.
- The same per-agent SQLite schema owns `auth_profile_store` and
  `auth_profile_state`; normal backup also includes the OAuth credentials
  directory. Whole-database capture and ordinary backup assets therefore still
  contain credential-bearing material.
- `src/agents/auth-profiles/sqlite.ts` explicitly describes
  `auth_profile_store.store_json` as the secrets-store payload. This confirms
  that an ordinary per-agent SQLite snapshot contains credential bytes, not
  merely credential-adjacent metadata.
- Commit `7dec3671cfc` adds only backup-asset component identity, dependency,
  restore-order, and verification metadata. It deliberately does not relabel
  those assets as complete continuity-state components or make Archived
  effective.
- Commit `8a266817226` makes that boundary machine-readable. New ordinary
  backup manifests remain ineligible for Archived and carry stable blockers
  for transcript exclusion policy, OAuth capture scope, credential-bearing
  rows in both global and per-agent SQLite snapshots, partial capture,
  workspace omission, and unresolved config-secret classification.
- OAuth evidence is based on canonical capture scope rather than a racy live
  file count. SQLite auth evidence is counted from the exact snapshots entering
  the archive. Verification requires the config-secret fail-closed blocker and
  rejects success-shaped continuity metadata.

### Credential-safe capture decision

- `src/agents/auth-profiles/state.ts` explicitly defines auth profile state as
  profile order, last-good selection, cooldown, failure, and usage metadata
  stored separately from secret-bearing credentials. Continuity can therefore
  reconstruct it rather than checkpoint it.
- Global `auth_profile_stores` and per-agent `auth_profile_store` contain the
  credential payload and must be deleted only from copied SQLite snapshots.
- `redactConfigSnapshot` is not a restore format. It redacts SecretRef IDs as
  well as literal values and depends on the original live config to restore
  placeholders during UI writes.
- `$include` resolution can capture fragments outside the root config file.
  Continuity must inventory and classify the guarded include closure before it
  can clear the config-secret blocker.
- The resulting treatment is recorded in
  `continuity-capture-treatment.md`; ordinary backup remains unchanged.
