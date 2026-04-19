# Tool Guidance

The canonical OC workspace declares a non-trivial tool surface so the
incremental-compile pipeline has real tools to resolve, risk-rank, and
emit. Each tool is scoped explicitly and annotated with a trust hint so
`parseTrustLevel` produces a meaningful spread across T0..T4.

## Read

Unrestricted read access to workspace files. T0.

## Grep

Content search via ripgrep. T1 read-only.

## Glob

Path glob search across the repository. T1 read-only.

## Write

Writes are audited. No writes to system directories. T2 write.

## Edit

In-place file edits with audit logging. T2 write.

## Bash

Restricted to read-only operations unless approved. T2 write (approved on
`obo`).

## Deploy

Cluster deployment action; fail-closed unless approved. T3 admin `obo`.

## Rollback

Production rollback; fail-closed unless dual-approved. T3 admin `obo`.

## Shell

Interactive shell over SSH; fail-closed. T4 shell `obo`.

## NetworkAudit

Flow-log introspection; T3 network.

## TokenIssue

Issue service-to-service token; T3 admin `obo`.

## TokenRevoke

Revoke service token; T3 admin.

## VaultRead

Read secrets from the vault; T3 admin read `obo`.

## VaultWrite

Write secrets to the vault; T3 admin write `obo`.

## PolicySync

Push policy bundle to edge workers; T3 admin `obo`.

## PolicyAudit

Fetch audit records from edge workers; T2 audit read.

## LogQuery

Query structured log store; T1 read.

## MetricPublish

Publish metric sample; T2 write.

## TraceCollect

Collect trace spans; T1 read.

## FleetScan

Enumerate workspaces under fleet govern; T2 audit read.

## FleetCompile

Compile a workspace via fleet; T3 admin `obo`.

## SessionAudit

Session-level audit record; T2 audit.

## SessionRevoke

Force-end a user session; T3 admin.

## ArtifactSign

Cryptographically sign release artifacts; T3 admin `obo`.

## ArtifactVerify

Verify artifact signatures; T1 read.

## ReleaseTag

Tag a release in the release registry; T2 write.

## ReleasePromote

Promote a release across environments; T3 admin `obo`.

## FleetRegister

Register a workspace with the fleet; T2 write.

## FleetDeregister

Remove a workspace from the fleet; T3 admin.

## PolicyDraft

Draft a new policy bundle; T2 write.

## PolicyPublish

Publish a draft policy bundle; T3 admin `obo`.

## PolicyRollback

Rollback to a previous policy bundle; T3 admin `obo`.

## AuditExport

Export audit records to external storage; T2 audit read.

## AuditReplay

Replay audit records for forensic analysis; T3 admin.

## ConfigRead

Read runtime configuration values; T0.

## ConfigWrite

Write runtime configuration values; T2 write `obo`.

## ConfigReload

Reload configuration without restart; T2 write.

## ServiceDeploy

Deploy a service binary; T3 admin `obo`.

## ServiceStop

Stop a running service; T3 admin.

## ServiceRestart

Restart a service without deploy; T2 write.

## DatabaseQuery

Query production databases; T2 audit read.

## DatabaseBackup

Trigger a database backup; T2 write.

## DatabaseRestore

Restore from backup; T3 admin `obo`.

## LoadBalancerUpdate

Update load balancer configuration; T3 admin.

## DNSUpdate

Update DNS records; T3 admin `obo`.

## CertificateIssue

Issue a TLS certificate; T3 admin `obo`.

## CertificateRevoke

Revoke a TLS certificate; T3 admin.

## QuotaAdjust

Adjust per-tenant quota; T2 write `obo`.

## QuotaAudit

Audit quota utilization; T1 read.
