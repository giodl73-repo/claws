---
pulse: 10
slug: pr7-openclaw-snap
plan: claws-openclaw-upstream
checkpoint: cp-5
depends_on: [01, 07, 08, 09]
governing_roles: [claws:gateway-eng, claws:compliance, claws:claws-release-eng]
addresses_findings: [F-63, F-64, F-65, F-66, F-67, F-68, F-69, F-70, F-71..F-75, SS-001, SP-001..002, SHQ-001..003, SHR-001..002]
addresses_headlines: [H4]
---

# Pulse 10 · PR-7 — `@openclaw/snap` + `openclaw snap` Subcommand Group

## Objective

Open PR-6 against `github.com/openclaw/openclaw` adding `@openclaw/snap` (content-addressable snapshot registry + HTTP server) AND extending the existing `openclaw` CLI with an 11-verb `openclaw snap` subcommand group. Includes `openclaw snap resolvePolicy --at <timestamp>` for e-discovery temporal queries (per amendment §7).

## Deliverables

### Upstream PR
- [ ] PR-6 opened at `github.com/openclaw/openclaw` with title: `feat: add @openclaw/snap + openclaw snap subcommand group (11 verbs + HTTP server + resolvePolicy temporal query)`
- [ ] PR description leads with core-not-extension justification: "snapshot registry is the source of truth for which workspace bytes are in force at any moment; cannot be a third-party extension because the audit chain anchors evidence to snapshot identity"
- [ ] PR description embeds bot-preempt checklist
- [ ] `packages/openclaw-snap/` content copied + renamed
- [ ] Subpath exports preserved: `/cli-handlers`
- [ ] `peerDependencies`: `@openclaw/workspace`, `@openclaw/guardrails` (versions pinned to merged release tags)
- [ ] `package.json` `name` flipped to `@openclaw/snap`; license `MIT`

### CLI subcommand group (11 verbs)
- [ ] `openclaw snap stage on|off` — toggle staging posture
- [ ] `openclaw snap status` — working tree + stage + drafts + current
- [ ] `openclaw snap diff --staged` — staged vs canonical
- [ ] `openclaw snap discard --stage` — clear `.stage/`
- [ ] `openclaw snap upload [--promote] [--local] [--label <name>]`
- [ ] `openclaw snap list [--status draft|current]`
- [ ] `openclaw snap diff <id1> <id2>` — semantic diff (composes `@openclaw/policy`)
- [ ] `openclaw snap checkout <id>` — reset working tree
- [ ] `openclaw snap promote <id>` — draft → current (audited)
- [ ] `openclaw snap rollback <id>`
- [ ] `openclaw snap discard <id>`
- [ ] `openclaw snap serve [--port 8443]` — HTTP server
- [ ] `openclaw snap resolvePolicy --at <iso8601>` — e-discovery temporal query (per amendment §7, F-66)

### HTTP surface (per spec §4)
- [ ] `POST /v1/snapshots` — upload pre-made snapshot
- [ ] `GET /v1/snapshots` — list (paginated)
- [ ] `GET /v1/snapshots/:id` — fetch
- [ ] `POST /v1/snapshots/:id/promote` — make current (audited)
- [ ] `POST /v1/snapshots/:id/rollback`
- [ ] `GET /v1/policy/current` — current snapshot's PolicyIR
- [ ] `GET /v1/resolve?uri=oc://...` — resolve oc:// URI; structured 404 with `OC_PATH_NOT_FOUND` (F-69, F-70)
- [ ] `GET /v1/healthz` — liveness

### Audit invariants (per amendment §7.2)
- [ ] `snap promote` emits `snapshot_promote` event with `{snapshotId, promotedAt, approverPrincipal, signedHandleId}` (F-64)
- [ ] Subsequent promote emits `snapshot_supersede` against previous current (F-65)
- [ ] Rollback emits `snapshot_rollback`
- [ ] All events flow into the hash-chained audit log via `@openclaw/guardrails/audit`

### Temporal query (per amendment §7, F-66)
- [ ] `snap resolvePolicy --at <iso8601>` walks audit chain for promote/supersede/rollback events
- [ ] Returns `{snapshotId, policyIrPath, promotedAt, supersededAt, queriedAt, evidence: { promote_event, supersede_event }}`
- [ ] Edge case: query before first promote → null + `{ reason: 'no policy in force at queried time' }` (F-68)

### Compliance rubric coverage (per N4, F-71..F-75)
- [ ] `compliance/rubrics/soc2.yaml` (TBD location upstream) — CC6.1, CC7.2, CC7.3 traced to audit predicates
- [ ] `compliance/rubrics/hipaa.yaml` — §164.312(a)(1), (b), (c)(1), (d), (e)(2)(ii) traced to audit predicates
- [ ] `compliance/README.md` — per-framework gaps documented

### CI / public-API obligations
- [ ] `docs/.generated/plugin-sdk-api-baseline.sha256` refreshed
- [ ] `docs/sdk-overview.md` table updated
- [ ] Swift protocol models regenerated for new HTTP gateway surface (F-15)
- [ ] CHANGELOG entry appended at end-of-section
- [ ] Cross-OS snapshotId stability CI matrix added (Linux + macOS + Windows; same files → same id)

### Internal verification before pushing
- [ ] `pnpm --filter @openclaw/snap test` green
- [ ] `pnpm --filter @openclaw/snap build` green
- [ ] `pnpm --filter @openclaw/snap tsc --noEmit` green

## TDD Tests

- L0 unit (`packages/openclaw-snap/tests/unit/`):
  - `snapshotId = sha256(canonical(workspaceFiles))` deterministic (F-63)
  - HTTP `/v1/healthz` returns 200 with shape `{status: 'ok'}`
  - HTTP `/v1/resolve` 404 envelope shape (F-70)
- L1 integration (`packages/openclaw-snap/tests/integration/`):
  - Cross-OS snapshotId matrix matches (F-63)
  - `snap promote` emits event with all required fields (F-64)
  - Subsequent promote emits `snapshot_supersede` (F-65)
  - HTTP `/v1/resolve?uri=oc://...` returns field value + snapshotId (F-69)
- L2 e2e:
  - Temporal query: 3 promoted snapshots, query inside each window returns correct id (F-66)
  - Evidence object includes promote/supersede UUIDs (F-67)
  - Edge: query before first promote → null + reason (F-68)
- L3 acceptance (`packages/openclaw-snap/tests/accept/`):
  - SOC 2 rubric → audit predicate traceability (F-71..F-73)
  - HIPAA rubric → audit predicate traceability (F-74, F-75)

## Verification Gate

```bash
# HARD DEPENDENCY: Wave B merged
gh api repos/openclaw/openclaw/pulls/<PR-3-NUMBER> --jq '.merged' | grep -q true \
  && gh api repos/openclaw/openclaw/pulls/<PR-4-NUMBER> --jq '.merged' | grep -q true \
  || (echo "BLOCKING: Wave B not merged"; exit 1)

# Local validation against trunk
pnpm --filter @openclaw/snap build
pnpm --filter @openclaw/snap test
pnpm --filter @openclaw/snap tsc --noEmit

# HTTP smoke
openclaw snap serve --port 8443 &
SERVE_PID=$!
sleep 2
curl -fsS http://localhost:8443/v1/healthz | grep -q '"status":"ok"' \
  || (kill $SERVE_PID; echo "HTTP smoke FAIL"; exit 1)
kill $SERVE_PID

# Bot-preempt pre-flight
grep -iE "(third.?party|extension|skill|clawhub)" PR-6-DESCRIPTION.md \
  && (echo "AUTO-CLOSE RISK"; exit 1) || echo "PR description clear"

# Open the PR
gh pr create --repo openclaw/openclaw \
  --title "feat: add @openclaw/snap + openclaw snap subcommand group (11 verbs + HTTP + resolvePolicy)" \
  --body-file PR-6-DESCRIPTION.md
```

## Post-merge

Pulse 03 verification. Cross-OS snapshotId matrix green; promote-audited test green; HTTP smoke green on trunk.

## Key Constraints

- PR-5 + PR-6 may open simultaneously (Wave C); they're runtime-independent.
- HTTP surface is broad; reviewer may suggest split. If they do, accept; PR-6a (registry + CLI verbs) + PR-6b (HTTP server) is acceptable.
- Compliance rubric files location upstream is TBD — confirm in PR review or co-locate in `packages/openclaw-snap/compliance/`.

## Scenario codes addressed

SC-19 (snapshotId stability), SC-20 (promote audited), SC-21 (snap-policy-historical-query / W4), SC-22 (HTTP resolve), SC-23 (SOC 2 rubric), SC-24 (HIPAA rubric).
