---
checkpoint: 5
pulse_range: [10, 12]
depends_on_cp: 4
review_panel:
  [
    claws:gateway-eng,
    claws:compliance,
    claws:ciso,
    claws:claws-release-eng,
    claws:claws-repo-steward,
    architect,
    testing,
  ]
final: true
---

# Checkpoint 5 · Wave D — Registry + Closeout

## Pulse Range

Pulses 10 through 12 (3 pulses).

## Dispatch Plan

PR-6 (snap) opens alone since Wave C is heavy and PR-6 carries broad surface (11 verbs + HTTP server + temporal query + compliance rubrics). Scope-flip + acceptance fixtures are internal-only and follow PR-6's merge.

- **Batch 1** (depends on cp-4 merge): pulse 10 (PR-6 @openclaw/snap)
- **Batch 2** (depends on PR-6 merged): pulse 11 (scope-flip internal)
- **Batch 3** (depends on pulse 11): pulse 12 (acceptance fixtures)

## Pulses

- [ ] Pulse 10 · `pr7-openclaw-snap` — Open PR-6 at openclaw/openclaw adding `@openclaw/snap` + 11-verb `openclaw snap` subcommand group + HTTP server with `/v1/resolve?uri=oc://...` (accepts both workspace and config URIs since PR-2 unified the scheme). Includes `snap resolvePolicy --at <timestamp>` for e-discovery. SOC 2 + HIPAA rubric coverage.
- [ ] Pulse 11 · `scope-flip-internal` — INTERNAL: rename `@bic/openclaw-*` → `@openclaw/*` across this monorepo. Closes the transient versioning gap (B1). Resolves H1–H4 as TRUE on this monorepo's main + four upstream merge SHAs.
- [ ] Pulse 12 · `acceptance-fixtures` — INTERNAL: materialize 41 fixtures across 6 series. Validates every scenario in the catalog has executable proof.

## Gate

cp-5 closes — and the wave closes — when:

1. PR-6 MERGES at openclaw/openclaw
2. Post-merge verification reports H4 GREEN against trunk: cross-OS snapshotId stability matrix + promote-audited test + HTTP smoke
3. Scope-flip pulse lands cleanly (`grep -r '@bic/openclaw' packages/` returns zero)
4. Acceptance fixtures pulse green: `npx vitest run tests/accept/scenarios.accept.test.ts` passes
5. All 7 PR merge SHAs + scope-flip commit SHA recorded in `docs/upstream/CHANGELOG.md`

**Critical**:

- This is the FINAL checkpoint; closeout (record + delivery stages) follows
- HTTP `/v1/resolve` endpoint MUST accept both `oc://workspace-file/...` and `oc://config/...` URIs (the unification PR-2 introduced)
- Acceptance-fixture pulse exercises POST-MERGE TRUNK reality; must run AFTER all upstream PRs merge AND after scope-flip
- Compliance rubric files (SOC 2 + HIPAA) location upstream is TBD; confirm in PR-6 review or co-locate in `packages/openclaw-snap/compliance/`

## Review Panel

Roles: claws:gateway-eng, claws:compliance, claws:ciso, claws:claws-release-eng, claws:claws-repo-steward, architect, testing
Write to: `panels/cp-5/`

Largest review panel because cp-5 is the closeout: HTTP surface (gateway-eng), compliance rubric coverage (compliance), CLI subcommand registration (gateway-eng), scope-flip coherence (release-eng + repo-steward), acceptance fixture integrity (testing).
