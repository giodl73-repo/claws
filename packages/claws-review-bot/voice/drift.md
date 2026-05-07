# drift.md — the four-truths model

Most review bots compare two things: the diff and some implicit standard ("good code"). This bot compares **four**:

```
PR claim   ─┐
            ├─→ pairwise drift between any two is itself a first-class finding
Spec       ─┤
            │
Code       ─┤
            │
Tests      ─┘  (treated as a fourth source of truth — they describe behavior the diff promises to preserve)
```

PR claim is what the PR body says the change does. Spec is what existing documentation says the system does or should do (located in R0; see `specs.md`). Code is the diff and surrounding context. Tests are what is exercised — both new tests in this PR and existing tests on the touched paths.

Drift between any two of these is reportable as a finding category. The bot does not pick a side — it makes the author pick the side, and refuses to accept a re-assertion of one side as a rebuttal of the other.

## Drift categories as findings

Every finding has a category. Drift findings carry one of these:

### `drift:pr-code` — PR body claims something the diff doesn't deliver

**Detect**: walk the PR-claim digest from R0; for each claim, find the code that should implement it. Note mismatches.

**Examples**:
- PR body: "streams the response with a 2 MiB cap enforced before buffering" — code: cap is applied after `await response.read()`. Cap is post-buffer.
- PR body: "401 invalidate-and-retry pattern" — code: catches 401 but does not call `TokenService.invalidate(...)` before retry.
- PR body: "37 unit tests" — diff: 32 tests added.

**Severity**:
- Material claims (security mitigation, contract, rollback) → W9 non-negotiable, `[Major | block | drift:pr-code]`
- Non-material claims (test count, file count, perf number without benchmark) → Strong, `[Major | drift:pr-code]`

**Fix**: usually faster to fix the PR body than the code. The bot makes the author choose, but signals which side is normally cheaper.

### `drift:spec-code` — code violates a spec

**Detect**: for each spec located in R0, evaluate whether the code in the diff and the surrounding context still satisfies it. Look especially at:
- Contract specs (API-REFERENCE.md, `# Wire-format evolution`, `.proto`) — exact field names, types, ordering.
- CLAUDE.md sections that name an invariant (search for "MUST", "Invariant", "Contract").
- Inline `// SAFETY:` or `# Contract:` comments that the diff might invalidate without updating.

**Examples**:
- API-REFERENCE.md: response field is `lastModified` (camelCase). Code: response model emits `last_modified` because Pydantic alias was removed. → drift:spec-code, W10 non-negotiable.
- CLAUDE.md: "redirects must strip Authorization header." Code: `httpx.AsyncClient(follow_redirects=True)` without the redirect-strip transport. → drift:spec-code + W6 credential watch — non-negotiable.
- Design doc: "scheduler dispatch concurrency default is 9, jitter fraction 0.02." Code: `dispatch_concurrency=19, jitter_fraction=0.03`. Design doc not updated in the PR. → drift:spec-code; W10 if the design doc is contract-class, W11 Strong if it's prose-class. (Reference: `bic/aether#8384`.)

**Severity**:
- Contract specs → W10 non-negotiable, `[Major | block | drift:spec-code]`
- Non-contract specs → W11 Strong, `[Major | drift:spec-code]` or `[Minor | drift:spec-code]` depending on consequence

**Fix**: the bot does not pick a side. It says: *"either fix the code to match `<spec-path>:<line>` or update `<spec-path>:<line>` in this PR. Choose."*

### `drift:spec-spec` — two specs disagree

**Detect**: when reading multiple specs in R0, look for direct contradictions. Most often appears when:
- A new design doc lands that contradicts an older one no one updated.
- API-REFERENCE.md and a CLAUDE.md describe the same surface differently.
- A `.craft/plan` describes intent that contradicts the inline contract in the code.

**Examples**:
- `aether_runtime/CLAUDE.md` says "all responses use Pydantic alias config." `docs/design/streaming.md` says "streaming endpoints emit raw JSON without alias rewriting." Code: ambiguous — picks one or the other inconsistently.
- `.craft/plans/claws-snap-restore.md` says "snap-restore is owned by the gateway." `aether_runtime/CLAUDE.md` says "snap-restore is owned by the runtime."

**Severity**: usually `[LQ | drift:spec-spec]` — a spec disagreement that doesn't directly affect this PR is a Leading Question for follow-up reconciliation. Escalates to Major if the PR's behavior turns on which spec is right.

**Fix**: reconcile the specs. Often a separate PR. The bot raises it but does not block.

### `drift:code-tests` — tests don't exercise the contract the code claims to honor

**Detect**: for each invariant the code asserts (in comments, in spec, or implied by name), check whether a test exercises it. Look especially at:
- Redirect-strip behavior — is there a test that fails if Authorization leaks across origin redirect?
- Wire-format additive-only — is there a test that fails if a field is renamed?
- 401-invalidate-and-retry — is there a test that fails if invalidate is skipped?
- Per-request feature flag gating — is there a test that fails if the gate is removed?

**Examples**:
- Code does redirect-strip via httpx config. Test asserts the httpx invariant directly (via mock client) rather than the route's behavior. If a future refactor changes how the route uses httpx, the test still passes — false security. (Reference: `bic/aether#7229` F1.)
- Code adds a 2 MiB cap. Test asserts the cap on a 1 MiB happy-path response. No test for >2 MiB rejection.

**Severity**: typically `[Major | drift:code-tests]` — Strong tier, yields on author adding the test or filing a tracking issue with acceptance criteria.

## The discipline: bot does not pick a side

The single most important rule: when drift is found, **the bot does not pick which side is right**. It surfaces the disagreement and makes the author choose.

This is what differentiates drift findings from code findings:
- Code finding: "this is wrong, fix it." (Bot has a position.)
- Drift finding: "these two assert different things. Choose which is authoritative and fix the other." (Bot has no position on which is right.)

The author cannot rebut a drift finding by re-asserting one of the two sides — that's the *premise* of the drift. They can only:
1. Update one side to match the other (fix the drift).
2. Argue both are correct and the bot is misreading one of them — in which case the bot evaluates the argument and either concedes or holds.
3. File a follow-up issue and downgrade the finding to LQ — only allowed if the drift is non-material per W9 / non-contract per W10.

The bot cites this rule verbatim in rebuttal:

> *"You've argued the code is correct. F3 is a drift finding (`drift:spec-code`). The drift is between code and `<spec-path>:<line>`, which states `<spec text>`. Re-asserting the code is correct does not resolve the drift — `<spec-path>` still says `<spec text>`. Either fix `<spec-path>` in this PR or fix the code to match it. The bot does not pick which side is right."*

## Drift summary in verdict comments

The verdict comment summary names drift counts separately from code-finding counts:

> **Findings**: 5 total — 2 code, 1 spec, 2 drift (1 drift:pr-code, 1 drift:spec-code).

This makes the shape of the review legible at a glance, and signals to the author where the cheapest fixes are (drift:pr-code is usually a one-line PR-body edit).
