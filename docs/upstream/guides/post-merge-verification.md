---
title: Post-Merge Verification Runbook — H1–H5 trunk validation
status: draft
applies_to:
  - PR-1 (@openclaw/workspace + lint + oc://config URI scheme + doctor migration emit) → H1 validators
  - PR-2 (OC-4 stripFrontMatter raw-preserve) → H5 validators
  - PR-3 (@openclaw/guardrails) → H2 validators
  - PR-4 (OC-7 conjunctive merger) → H5 validators
  - PR-5 (@openclaw/policy) → H3 validators
  - PR-6 (@openclaw/snap) → H4 validators
upstream_baseline: openclaw/openclaw HEAD dd643c82b (2026-04-28 pull, refresh on each merge)
companion_to:
  - docs/upstream/specs/UG-upstream.md (Headlines H1–H5)
  - docs/upstream/guides/adapter-audits.md (re-audit triggers per §5)
  - docs/upstream/guides/bot-preempt-checklist.md (pre-merge gate)
---

# Post-Merge Verification Runbook

Runbook for confirming H1–H5 validation criteria against `openclaw/openclaw`
trunk after each contribution-wave PR merges. Per `R1-consolidated W2`:
the plan declares "MERGED at openclaw/openclaw" but doesn't specify *how*
verification runs. This guide closes that gap with copy-paste-able commands.

## §1 When to run

Verification runs **immediately after each PR merges**, NOT batched. The
next PR in the chain depends on the previous landing clean on trunk; the
2-open-at-a-time concurrency rule means at most one PR is unmerged when
the next opens. Skipping post-merge verification is the most common cause
of cascading failures down the wave.

Trigger order:

1. PR merges (squash or merge-commit; both supported)
2. Run `§2 Per-PR verification recipe` against the new HEAD
3. Run `§3 Per-headline validators` for the headline this PR addresses
4. Run `§4 Codemod validation gate` if PR-4 (OC-7) just merged
5. If any check fails, halt the wave per `§5 Failure modes`
6. If all green, record the merge in `docs/upstream/CHANGELOG.md` per
   `§6 CHANGELOG record format`

Time budget: a clean run is ~10 minutes (gh API calls + trunk pull +
package tests). A red run blocks the next PR until resolved.

## §2 Per-PR verification recipe

Run as a sequence; halt at the first non-zero exit.

```bash
# 1. Confirm merge state via the GitHub API
gh api repos/openclaw/openclaw/pulls/<N> --jq '.merged'
# Expect: true

# 2. Capture the merge SHA for the CHANGELOG record
MERGE_SHA=$(gh api repos/openclaw/openclaw/pulls/<N> --jq '.merge_commit_sha')
echo "Merge SHA: $MERGE_SHA"

# 3. Pull trunk into the local openclaw-core checkout
git -C /c/src/openclaw-core fetch origin --prune
git -C /c/src/openclaw-core log -1 origin/main --pretty='format:%H %s'
# Expect: SHA matches $MERGE_SHA (or a later commit if other PRs merged after)

# 4. Fast-forward local main if it's our verification baseline
cd /c/src/openclaw-core
git status      # confirm clean
git pull --ff-only

# 5. Reinstall (if package.json or workspace deps changed)
pnpm install --frozen-lockfile

# 6. Run trunk-side validators per §3 (per-headline)

# 7. If validators green, record the merge per §6
# If red, halt per §5
```

## §3 Per-headline validators

Each headline's validators run against trunk after that headline's PR merges. Tests run from the `openclaw-core` checkout root unless otherwise noted. Exit code 0 = green, non-zero = red (halt and file an issue).

### §3.1 H1 — `@openclaw/workspace` merged (PR-1, PR-2)

```bash
# Workspace package builds + tests
pnpm --filter @openclaw/workspace test
pnpm --filter @openclaw/workspace build
pnpm --filter @openclaw/workspace tsc --noEmit

# Cross-OS canonicalize CI matrix — runs in upstream's CI; verify the
# matrix turned green for the merge SHA.
gh run list --repo openclaw/openclaw --workflow openclaw-workspace-cross-os.yml \
  --commit "$MERGE_SHA" --json status,conclusion,databaseUrl --jq '.[0]'
# Expect: status=completed, conclusion=success

# Public-API baseline hash post-merge — capture for CHANGELOG record
node -e "const {createHash}=require('crypto');const fs=require('fs');console.log(createHash('sha256').update(fs.readFileSync('docs/.generated/plugin-sdk-api-baseline.sha256')).digest('hex'))"
# Expect: hex SHA-256; record in CHANGELOG line for this PR

# JSONC round-trip with comments — invariant (PR-1 headline)
node -e "
  const { parseJsonc, emitJsonc } = require('@openclaw/workspace/ast/jsonc');
  const input = '{\n  // user comment\n  \"key\": \"value\"\n}\n';
  const ast = parseJsonc(input);
  const output = emitJsonc(ast);
  if (output !== input) { console.error('LOSSY ROUND-TRIP'); process.exit(1); }
  console.log('Round-trip clean');
"

# Lint surface — the 13-code catalog runs against canonical config fixture
pnpm --filter @openclaw/workspace test tests/lint/

# Existing config-write tests (the chokepoint) still pass unchanged
pnpm test src/config/io.test.ts
pnpm test src/commands/doctor-legacy-config.migrations.test.ts
pnpm test src/commands/doctor-config-flow.test.ts

# H1 oc:// URI extension (PR-2): runtime-config diagnostic emits oc://config/...
node -e "
  const { formatOcConfigUri, parseOcConfigUri } = require('@openclaw/workspace/path');
  const path = ['channels', 'matrix', 'accessToken'];
  const uri = formatOcConfigUri(path);
  if (uri !== 'oc://config/channels/matrix/accessToken') process.exit(1);
  const back = parseOcConfigUri(uri);
  if (back.path.length !== 3) process.exit(1);
  console.log('oc://config round-trip clean');
"
```

H1 GREEN criteria: every command exits 0; CI matrix green; baseline-hash captured; JSONC + oc:// round-trip clean; lint suite green.

### §3.2 H2 — `@openclaw/guardrails` merged (PR-3)

```bash
pnpm --filter @openclaw/guardrails test
pnpm --filter @openclaw/guardrails build
pnpm --filter @openclaw/guardrails tsc --noEmit

# Hash-chain integrity — append, verify, tamper-detect
pnpm --filter @openclaw/guardrails test tests/integration/audit-chain.test.ts

# Approval-handle replay-resistance
pnpm --filter @openclaw/guardrails test tests/integration/approval-handle-replay.test.ts

# Zero @microsoft/* import gate (CI-enforced; verify locally)
grep -rn "@microsoft/" packages/openclaw-guardrails/src 2>/dev/null \
  && echo "FAIL: @microsoft/* import found" \
  || echo "PASS: zero @microsoft/* imports"

# SIEM round-trip per format (CEF, NDJSON, syslog, SARIF)
pnpm --filter @openclaw/guardrails test tests/integration/round-trip-cef.test.ts
pnpm --filter @openclaw/guardrails test tests/integration/round-trip-ndjson.test.ts
pnpm --filter @openclaw/guardrails test tests/integration/round-trip-syslog.test.ts
pnpm --filter @openclaw/guardrails test tests/integration/round-trip-sarif.test.ts

# Audit-stream wire-shape against trunk's audit envelope — re-check §3 of
# adapter-audits.md citations. If trunk added new fields, the mapping
# table needs amendment.
diff <(jq -r '.fields[]' packages/openclaw-guardrails/dist/audit-entry-schema.json) \
     <(grep -E '^export.*Audit' /c/src/openclaw-core/src/security/*.ts | head -50)
```

H2 GREEN criteria: every command exits 0; hash-chain + replay tests green; SIEM round-trips clean; zero `@microsoft/*` imports; audit-stream wire-shape unchanged from §3 of `adapter-audits.md`.

### §3.3 H3 — `@openclaw/policy` merged (PR-5)

```bash
pnpm --filter @openclaw/policy test
pnpm --filter @openclaw/policy build
pnpm --filter @openclaw/policy tsc --noEmit

# Deterministic generation — same input → byte-identical artifacts
node scripts/test-policy-deterministic.js
# Internally: runs `openclaw policy generate` twice on a fixture and asserts
# byte-identical policy-ir.json + gateway-plugin.ts + audit-manifest.json.

# Emitted plugin loads + registers via @openclaw/plugin-sdk HEAD
node -e "
  const { registrations } = require('./fixtures/policy-output/gateway-plugin.js');
  const { isPluginHookName } = require('@openclaw/plugin-sdk');
  for (const r of registrations) {
    if (!isPluginHookName(r.hookName)) {
      console.error('UNKNOWN HOOK NAME:', r.hookName);
      process.exit(1);
    }
  }
  console.log('All', registrations.length, 'registrations recognized');
"

# R5 + failOpen rejection — generator-side
echo '{"name":"x","riskLevel":"R5","failOpen":true}' | \
  pnpm --filter @openclaw/policy exec -- openclaw policy generate --in -
# Expect: non-zero exit + diagnostic citing oc:// URI of offending tool

# RESTRICTED stickiness — args_from chain refused at generate time
pnpm --filter @openclaw/policy test tests/integration/restricted-laundering.test.ts

# CLI subcommands wired correctly (per adapter-audits §2.4)
openclaw policy --help     # confirm 9 verbs listed: check generate watch comply test sim report verify diff
```

H3 GREEN criteria: every command exits 0; deterministic generation passes; emitted plugin's hook names all recognized; R5+failOpen rejected at generate-time; RESTRICTED stickiness enforced; 9-verb CLI surface present.

### §3.4 H4 — `@openclaw/snap` merged (PR-6)

```bash
pnpm --filter @openclaw/snap test
pnpm --filter @openclaw/snap build
pnpm --filter @openclaw/snap tsc --noEmit

# Cross-host snapshotId stability matrix
gh run list --repo openclaw/openclaw --workflow openclaw-snap-cross-os.yml \
  --commit "$MERGE_SHA" --json status,conclusion --jq '.[0]'
# Expect: completed, success

# promote audited
pnpm --filter @openclaw/snap test tests/integration/promote-audited.test.ts

# HTTP smoke test
pnpm --filter @openclaw/snap exec -- openclaw snap serve --port 8080 &
SERVER_PID=$!
sleep 2
curl -fsS http://localhost:8080/v1/healthz
curl -fsS http://localhost:8080/v1/snapshots
kill $SERVER_PID

# 11-verb CLI surface present
openclaw snap --help
# Expect verbs: stage on/off, status, diff --staged, discard --stage, upload, list, diff <a> <b>, checkout, promote, rollback, discard <id>, serve

# Temporal query (per UG-upstream § 7)
pnpm --filter @openclaw/snap test tests/integration/resolve-policy-historical.test.ts
```

H4 GREEN criteria: every command exits 0; cross-OS matrix green; promote-audit + HTTP healthz pass; 11-verb CLI surface; temporal query returns expected snapshotId for fixture.

### §3.5 H5 — OC-4 + OC-7 surgical PRs merged (PR-2, PR-4)

```bash
# OC-4 round-trip (stripFrontMatter raw-preserve)
pnpm test src/agents/workspace.stripfrontmatter.test.ts
# Expect: round-trip on templated SOUL.md emits byte-identical original

# OC-7 conjunctive merger (replaces ?? with array accumulation)
pnpm test src/plugins/__tests__/hooks-merger.test.ts
# Expect: three-plugin fixture; plugin-A's requireApproval cannot be
# downgraded by plugin-B's allow; companion receives every ApprovalDescriptor

# Crash-safety case (per W7) — plugin-B throws mid-emission
pnpm test src/plugins/__tests__/hooks-merger-crash-safety.test.ts
# Expect: plugin-A's approval survives plugin-B throw

# Existing tests asserting "first-wins" must FAIL on the merger change
# — that breakage is the proof. Verify the broken tests were updated/removed
# in PR-4, not silenced.
git log -1 --pretty='format:%s' src/plugins/__tests__/hooks-merger.test.ts
# Expect: commit message references PR-4 / OC-7 conjunctive merger
```

H5 GREEN criteria: OC-4 + OC-7 + crash-safety tests green; old "first-wins" assertions either updated or removed (not silenced).

## §4 Codemod validation gate (W1)

After PR-4 (OC-7) merges, before declaring H5 done:

```bash
# 1. Pull trunk into openclaw-core (already done in §2 step 4)
cd /c/src/openclaw-core && git pull --ff-only

# 2. Run our internal claws-side packages against trunk's widened
#    requireApproval field. The codemod that adapts to ApprovalDescriptor[]
#    must produce clean compiles.
cd /c/src/claws
pnpm install --frozen-lockfile
pnpm --filter @bic/openclaw-policy build
pnpm --filter @bic/openclaw-snap build

# 3. Run their test suites against trunk's hooks.ts
pnpm --filter @bic/openclaw-policy test
pnpm --filter @bic/openclaw-snap test

# 4. Codemod artifact: confirm the migration script committed in PR-4
#    runs cleanly against a representative consumer fixture
node /c/src/openclaw-core/scripts/oc7-codemod.js --dry-run \
  /c/src/claws/packages/openclaw-policy
# Expect: zero changes (we already ship the new shape)
```

Codemod gate GREEN criteria: claws-side `@bic/openclaw-policy` and
`@bic/openclaw-snap` compile clean against trunk's widened
`requireApproval`; both test suites green; codemod dry-run reports zero
changes for our packages (we already adopt the array form).

If codemod gate red: roll back internal consumers' adoption pending fix.
PR-5 + PR-6 still openable since they don't use the OC-7 surface yet.

## §5 Failure modes

### §5.1 Trunk verification red

If any command in §3 fails:

1. **Halt the wave.** Do NOT open the next PR in the chain.
2. **File an issue at openclaw/openclaw** with:
   - PR # that just merged
   - Failing command + full output
   - Suspected cause (regression, unrelated upstream change, our test bug)
   - Tag: `regression` if upstream caused it, `bug` if our test was wrong
3. **Decide rollback or forward-fix:**
   - If upstream caused it: file regression issue; wait for upstream fix; do not open next PR until trunk green
   - If our test caused it: open a follow-up PR fixing the test; the original PR's merge stays

### §5.2 Codemod verification red

If §4 fails:

1. Roll back internal consumers' adoption pending fix.
2. PR-5 + PR-6 may still open since they don't consume the OC-7 surface yet.
3. File a follow-up PR against `claws` correcting the codemod or our package's adoption.
4. Once codemod gate green, resume the wave.

### §5.3 Adapter audit drift detected

If §3 reveals trunk-side changes to `PluginHookRegistration`,
`AuditEntry`, or the audit envelope:

1. Halt before opening next PR.
2. Update `docs/upstream/guides/adapter-audits.md` § 2.1, § 2.4, or § 3.2-3.3 with the new shape.
3. Re-verify our package's emit/registration shape against the updated audit.
4. File an amendment PR at upstream if the change broke our integration.
5. Resume only after the audit re-runs green.

## §6 CHANGELOG record format

For each merged PR, append one line to `docs/upstream/CHANGELOG.md` under
the wave's section:

```markdown
- **PR-<N>** `<package or change>` MERGED 2026-MM-DD at SHA `xxxxxxx` —
  H<n> trunk-side validators GREEN. baseline-hash post:
  `sha256:<...>`. (See `docs/upstream/guides/post-merge-verification.md` § 3.<n>.)
```

Concrete example after PR-1 merges:

```markdown
- **PR-1** `@openclaw/workspace` MERGED 2026-05-02 at SHA `a1b2c3d` —
  H1 trunk-side validators GREEN. baseline-hash post:
  `sha256:f00ba12...`. JSONC round-trip + oc://config URI round-trip clean.
  Lint suite (43 tests) green. (See post-merge-verification.md § 3.1.)
```

The CHANGELOG is the audit trail for the wave; auditors and follow-up
contributors read it to understand what landed when. Keep entries
chronological under each wave's section; do not collapse merges.
