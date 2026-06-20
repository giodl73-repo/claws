# Scout Feeds V-Team Demo

This folder contains a local command-line demo harness for the Scout feeds
v-team discussion. It does not compile Lobster locally. It exercises the same
shape and safety properties that the current Lobster stack is adding:

- Compose source contributions into a tenant-approved effective feed.
- Host the feed at a local `/v1/scout/feeds/approved.json` endpoint.
- Require the authenticated caller tenant to match `scope.tenantIdHash`.
- Verify a feed attestation before serving or installing.
- Install an approved skill into an OpenClaw-style target directory with
  provenance.

Run from Command Prompt:

```cmd
cd /d C:\src\claws-hapi
powershell -ExecutionPolicy Bypass -File .\projects\feeds\demo\scout-feeds-vteam-demo.ps1
```

Optional:

```cmd
powershell -ExecutionPolicy Bypass -File .\projects\feeds\demo\scout-feeds-vteam-demo.ps1 -TenantId fabrikam-demo -Port 8790
```

## Talk Track

The demo starts with contributions from more than one source, including a
ClawHub-style community source and a Microsoft curated source. The tenant
approval layer publishes the effective feed that clients should consume, not
the raw public registry. That effective feed is signed, scoped to the tenant,
and served behind an endpoint that fails closed when the caller tenant does not
match the feed scope.

The install step shows why this is useful to clients. A Scout or OpenClaw
client does not need direct access to every upstream registry. It fetches the
tenant-approved feed, installs only approved skill entries, and writes local
provenance so future updates can be explained and audited.

## Live MOS3 Personal And Marketplace Demo

For the v-team demo, use the live MOS3 script:

```cmd
cd /d C:\src\claws-hapi
powershell -ExecutionPolicy Bypass -File .\projects\feeds\demo\mos3-personal-feed-demo.ps1 -Environment msit -ShowMarketplace
```

What it shows:

- It gets a MOS3-scoped token through Aether's preauthorized token helper.
- It calls `/catalog/v1/users/acquisitions/get` for the signed-in user.
- It writes a local `personal` feed projection from those user acquisitions.
- It calls `/marketplace/v1/users/titles/query` to show the marketplace source
  for tenant feed composition.

Current proof on Gio's account:

- MSIT personal acquisitions return successfully but currently contain zero
  entries for `giodl@microsoft.com`.
- MSIT marketplace browse returns 24 titles, including 12 titles with skills
  and 24 with connectors.

Meeting framing:

```text
Personal feeds come from MOS3 user acquisitions, authored, acquired, or shared
items visible to the signed-in user.

Tenant feeds come from MOS3 marketplace browse plus admin composition, where a
tenant admin can allow, deny, pin, scope, and publish the effective feed.
```
