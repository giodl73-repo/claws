---
pulse: 08
slug: pr5-openclaw-policy
plan: claws-openclaw-upstream
checkpoint: cp-4
depends_on: [01, 06, 07]
governing_roles: [claws:gateway-eng, claws:compliance, claws:ciso, claws:claws-release-eng]
addresses_findings:
  [
    F-26,
    F-27,
    F-28,
    F-29,
    F-30,
    F-31,
    F-32,
    F-33,
    F-34,
    F-35,
    F-36,
    F-37,
    F-44,
    F-47,
    F-48,
    F-49,
    F-62,
    POL-R5-001..004,
    POL-RS-001..003,
    ADP-PR-001..005,
  ]
addresses_headlines: [H3]
---

# Pulse 08 · PR-4 — `@openclaw/policy` + `openclaw policy` Subcommand Group

## Objective

Open PR-4 against `github.com/openclaw/openclaw` adding `@openclaw/policy` (generator: emits `policy-ir.json` + `gateway-plugin.ts` + `audit-manifest.json` into `.openclaw/policy/`) AND extending the existing `openclaw` CLI with a 9-verb `openclaw policy` subcommand group (`check`, `generate`, `watch`, `comply`, `test`, `sim`, `report`, `verify`, `diff`). Carries the emitted-plugin registration adapter audit verdict.

## Deliverables

### Upstream PR

- [ ] PR-4 opened at `github.com/openclaw/openclaw` with title: `feat: add @openclaw/policy + openclaw policy subcommand group (9 verbs)`
- [ ] PR description leads with core-not-extension justification: "policy generation produces the gateway plugin that enforces governance at runtime; cannot be a third-party extension because the generated plugin's registration shape must match upstream's contract"
- [ ] PR description embeds bot-preempt checklist + CITES `docs/upstream/guides/adapter-audits.md` § 2 (emitted-plugin registration audit) verdict
- [ ] `packages/openclaw-policy/` content copied + renamed
- [ ] Subpath exports preserved: `/runtime`, `/types`, `/cli-handlers`, `/nonce-store`, `/seq-counter`, `/trust-set`
- [ ] `peerDependencies`: `@openclaw/workspace`, `@openclaw/guardrails` (versions pinned to PR-1 + PR-2 merge SHAs)
- [ ] `package.json` `name` flipped to `@openclaw/policy`; license `MIT`

### Generator-side invariants (per F-26 HC-BLOCK + F-30)

- [ ] `packages/openclaw-policy/src/generate/validate.ts` — refuses to emit when TOOLS.md declares `R5 + failOpen: true` (F-26)
- [ ] Generation-time error includes `oc://TOOLS.md/Tools/<name>` URI (F-28)
- [ ] `IRREVERSIBLE_EXTERNAL` capability clamps tier to R5 minimum (F-29)
- [ ] G-CHAIN: effective sensitivity = max of args_from chain (F-30); generator refuses laundering chains (F-31)
- [ ] PolicyIR includes `effectiveSensitivity` field per tool (F-32)

### Runtime defense-in-depth (per F-27)

- [ ] Emitted plugin treats R5 as fail-closed at runtime regardless of IR `failOpen` flag — defense against hand-edited JSON IR

### CLI subcommand group (9 verbs)

- [ ] `openclaw policy check [--file SOUL.md]` — parse + validate; diagnostics only
- [ ] `openclaw policy generate` — write `.openclaw/policy/{policy-ir.json, gateway-plugin.ts, audit-manifest.json}`
- [ ] `openclaw policy watch` — re-run check on save
- [ ] `openclaw policy comply [--rubric soc2|hipaa]` — rubric eval → signed ComplianceReport
- [ ] `openclaw policy test [--scenarios path/]` — YAML scenarios against current workspace
- [ ] `openclaw policy sim [--port 8443]` — local mock OC gateway
- [ ] `openclaw policy report [--format md|html|pdf]` — render compliance / audit / snapshot-diff
- [ ] `openclaw policy verify` — audit-chain integrity check
- [ ] `openclaw policy diff <id1> <id2>` — semantic diff of two PolicyIRs
- [ ] CLI handler shape matches upstream's dispatcher (yargs / oclif / Commander / custom — confirmed in adapter-audits.md § 2 per F-35)

### Runtime-gated enforcement model contributions (per F-44, F-47, F-48, F-49)

- [ ] `before_agent_start` hook compares workspace's current `snapshotId` against last promoted `snapshotId`; emits `requireApproval` when drift detected
- [ ] Audit entry for unauthorized-mutation includes `oc://` URI of mutated file (F-47)
- [ ] Multiple-mutation case: each file's drift reported separately (F-48)
- [ ] Comparison cost bounded — only files in policy-relevant set checked (F-49)

### CI / public-API obligations

- [ ] `docs/.generated/plugin-sdk-api-baseline.sha256` refreshed
- [ ] `docs/sdk-overview.md` table updated
- [ ] Swift protocol models regenerated for new gateway HTTP surface from `policy comply` and `policy report` (F-15)
- [ ] CHANGELOG entry appended at end-of-section
- [ ] Zero `@microsoft/*` import gate green

### Internal verification before pushing

- [ ] `pnpm --filter @openclaw/policy test` green
- [ ] `pnpm --filter @openclaw/policy build` green
- [ ] `pnpm --filter @openclaw/policy tsc --noEmit` green
- [ ] Determinism check: run `openclaw policy generate` twice, diff = 0 across artifacts (F-62)

## TDD Tests

- L0 unit (`packages/openclaw-policy/tests/unit/`):
  - Generator rejects R5 + failOpen with `oc://` URI in diagnostic (F-26, F-28)
  - Capability clamp R5 floor (F-29)
  - Generator refuses laundering args_from chains at generate time (F-31)
  - PolicyIR has `effectiveSensitivity` per tool (F-32)
  - Determinism: same input → byte-identical output (F-62)
- L1 integration (`packages/openclaw-policy/tests/integration/`):
  - Runtime defense-in-depth: hand-edited IR (`failOpen: true`) rejected at runtime (F-27)
  - Chain `read-restricted → summarize → post-publicly` rejected (F-30)
  - Hostile-write-then-read flow: drift detected before agent execution (F-44, partial SC-12)
  - Mutation report includes oc:// URI per file (F-47, F-48)
- L2 e2e:
  - Emitted plugin loads + registers via `@openclaw/plugin-sdk` HEAD without modification (F-33)
  - Sequential modifying mode (not claim mode) honored (F-34)
  - CLI subcommand dispatches to handler (F-35)

## Verification Gate

```bash
# HARD DEPENDENCY: adapter-audits.md § 2 (emitted-plugin) and § 3 (audit-stream) published
test -s "docs/upstream/guides/adapter-audits.md" \
  && grep -q "emitted-plugin registration audit" "docs/upstream/guides/adapter-audits.md" \
  || (echo "BLOCKING: adapter-audits.md § 2 missing"; exit 1)

# HARD DEPENDENCY: Wave B merged + codemod gate green on trunk
gh api repos/openclaw/openclaw/pulls/<PR-2-NUMBER> --jq '.merged' | grep -q true \
  && gh api repos/openclaw/openclaw/pulls/<PR-3-NUMBER> --jq '.merged' | grep -q true \
  || (echo "BLOCKING: Wave B not merged"; exit 1)

# Local validation against trunk
cd /c/src/openclaw-core && git fetch origin main && git checkout origin/main
cd /c/src/claws
pnpm --filter @openclaw/policy build
pnpm --filter @openclaw/policy test
pnpm --filter @openclaw/policy tsc --noEmit

# Determinism check
openclaw policy generate && cp -r .openclaw/policy/ /tmp/run-1/
openclaw policy generate && diff -r .openclaw/policy/ /tmp/run-1/ \
  || (echo "DETERMINISM FAIL"; exit 1)

# Bot-preempt pre-flight
grep -iE "(third.?party|extension|skill|clawhub)" PR-4-DESCRIPTION.md \
  && (echo "AUTO-CLOSE RISK"; exit 1) || echo "PR description clear"

# Open the PR
gh pr create --repo openclaw/openclaw \
  --title "feat: add @openclaw/policy + openclaw policy subcommand group (9 verbs)" \
  --body-file PR-4-DESCRIPTION.md
```

## Post-merge

Pulse 03 verification. Confirm deterministic-generation, R5 fail-closed, RESTRICTED stickiness all green on trunk.

## Key Constraints

- 2-PRs-open culture: PR-4 + PR-5 open simultaneously (Wave C). Both runtime-independent, so order doesn't matter beyond CI.
- Generator scope is large (9 CLI verbs, runtime defense, PolicyIR shape) — reviewers may suggest split. If they do, accept; PR-5a (generator only) + PR-5b (CLI subcommands) are an acceptable subdivision.
- Adapter-audits.md § 2 must include CLI subcommand precedent (F-35) before this PR opens — without that citation, registration shape risk is unmitigated.

## Scenario codes addressed

SC-08 (R5 fail-closed), SC-09 (RESTRICTED stickiness), SC-10 (emitted-plugin registration), partial SC-12 (hostile-write-then-read; the runtime gate lives here), SC-18 (generate determinism).
