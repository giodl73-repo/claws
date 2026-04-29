# cp-1 Review · claws-gateway-eng · R1

**Date**: 2026-04-28
**Verdict**: APPROVE-WITH-WARNINGS

## HC-BLOCK findings (must fix before cp-2 opens)

| # | Title | Where | Why blocking | Action |
|---|---|---|---|---|

*(none — see verdict reasoning)*

## HC-WARN findings (should address)

| # | Title | Where | Action |
|---|---|---|---|
| W1 | Per-diagnostic O(n) line/column re-walk | `parse.ts:103-124` (`pushDiag`) | Acceptable on valid input (zero diags) but pathological on malformed 100KB blob with N diagnostics → O(N·100KB). Add a `lineStartsCache` lazily on first `pushDiag` so subsequent diags are O(log n) binary search. Doctor against an actively-malformed config could otherwise drift toward seconds, not ms. |
| W2 | Unbounded recursion in parser + walker | `parse.ts:206-310` (`parseValue` → `parseObject`/`parseArray`), `walk.ts:32-53` (`walkInner`) | Recursive descent has no depth cap. Pathological input with 50K levels of nested `[[[...]]]` blows the JS stack and crashes whichever process called `parseJsonc`/`lint`. Add a `maxDepth` guard (default 256) that emits `OC_CFG_PARSE_DEPTH_EXCEEDED` and returns. Same guard must land in `walk.ts` and `emit.ts`'s walker. The `doctor` CLI is not in-Gateway, but `lint()` is also re-exported from `@openclaw/workspace/lint` (`src/index.ts:21`) — a host that calls it in-process inherits the crash. |
| W3 | Engine eagerly arrays all rule findings, then sorts | `lint/index.ts:16-33` | 13 rules each call their own `walk(doc.root, …)`, re-traversing the AST 13 times. For a 100KB config (~10K nodes) this is ~130K visits; bearable, but the `path: [...path]` clone on every visit (`walk.ts:39`) makes it allocation-heavy. Consider a single fused walker that runs every AST-only rule's per-node predicate on one pass — or at minimum, share the path array (snapshot only when a finding fires). Will matter when this engine moves anywhere near a hot path. |
| W4 | post-merge §3.1 H1 validators are functional-only | `post-merge-verification.md:83-129` | The runbook re-runs unit tests + a JSONC round-trip + URI round-trip. None of it asserts a perf invariant. After PR-1 lands, there is no trunk-side gate that catches "lint suite went from 50ms to 5s on regression." Add a microbench step (e.g. `pnpm --filter @openclaw/workspace bench tests/lint/perf.bench.ts` with a 100KB fixture and a wall-clock ceiling) to the H1 GREEN criteria. Same gap in H2-H5. |

## HC-NOTE findings (capture for follow-up)

| # | Title | Where |
|---|---|---|
| N1 | `emitJsoncWithMutation` rebuilds the source string per replacement (`out = out.slice(0, r.start) + r.text + out.slice(r.end)`) | `emit.ts:46-52` — O(replacements · sourceLen). For a 100KB file with 50 replacements that's ~5MB of intermediate string churn. Single-pass builder over sorted ranges would fix it. Not on hot path today; flagging for the fixer-PR cycle in §13. |
| N2 | `pluginIdCollisionRule.locatePath` is O(members) per segment | `plugin-id-collision.ts:61-78` — for deeply-nested duplicate, walks the linear `members.find` chain. Acceptable at config sizes; note for the day someone tests with 10K plugin entries. |
| N3 | `unknownFieldRule.closestKnown` is O(known·needle·candidate) per unknown key | `unknown-field.ts:59-91` — `editDistance` allocates two `Array(n+1)` per candidate. For a config with 20 unknown keys against a schema of 200 known keys, fine. Note for if/when schema explodes. |
| N4 | adapter-audits §4 enforcement-model description is internally consistent with `before_agent_start` semantics | `adapter-audits.md:332-413` correctly states the hook fires AFTER files load, that mutations land on disk, and that `snap stage on` is the write-time-prevention path. Matches the §4.6 perf bound (only hash files in the policy-relevant set, not all workspace files) — the right shape for the 50ms budget. |

## Strengths

- **Lint engine is a pure fold over `ALL_RULES`** (`lint/index.ts:18-23`): no global state, no module-level mutables, no I/O, no `Date.now()`, no `Math.random()`. Re-entrant and cache-friendly. Rules are pure functions of `(doc, schema)` exactly as the lens demands.
- **Schema is dependency-injected** (`types.ts:88-102`): the engine doesn't pin Zod / JSON Schema / hand-authored. A Gateway adopter can wire a stub schema with `kindOf → 'unknown'` everywhere and the engine silently skips schema-aware rules. Zero coupling.
- **JSONC parser does not throw on malformed input** (`parse.ts:5-9`): records diagnostics and resyncs. Critical for a Gateway that must never crash on a tenant's bad config.
- **adapter-audits §4.6 explicitly bounds the runtime hook's hash-set to the policy-relevant files** (`adapter-audits.md:407-413`). This is the only paragraph in the artifacts that even acknowledges the latency budget exists, and it gets the right answer (don't hash everything every turn).
- **`emitJsonc(doc)` short-circuits to `doc.source`** (`emit.ts:25-27`): the byte-identical pristine-round-trip path is allocation-free. The `isPlainJson` short-circuit (`short-circuit.ts:21-26`) keeps the 99% case at `JSON.stringify` parity.
- **Lint is not wired into any runtime hook today.** `lint()` is exposed from the workspace package (`src/index.ts:21`) for `doctor`-style CLI consumers; nothing in the artifacts plugs it into `before_agent_start`. This is the right factoring — governance stays a guest of the CLI surface, not the Gateway.

## Verdict reasoning

From the gateway-eng lens, the cp-1 deliverables are well-behaved with respect to my non-negotiables. None of the lint code runs inside a Gateway hook today, so the 50ms-per-hook budget is not at risk from PR-1 itself. The runtime-gated enforcement model in `adapter-audits.md` §4 correctly describes `before_agent_start` (post-load, can audit and block but cannot prevent the write) and is internally consistent with `hook-before-agent-start.types.ts:59-68` as cited in the original R1 plan review. Section §4.6 is the one place the spec acknowledges the latency budget and gets it right by scoping the hash-set to policy-relevant files. No HC-BLOCK.

The HC-WARNs are real but soft. The unbounded recursion (W2) and per-diag O(n) re-walk (W1) are the kind of thing a hostile or merely-bad config could weaponize against `doctor`; a 100KB config with 5K trailing-comma diagnostics could currently take seconds. They become HC-BLOCKs the day this engine moves anywhere near the hot path; today they want fixing in a follow-up. W3 (13 walker passes) is a worst-case ~130K visits for a 100KB config — back-of-envelope under 50ms on modern V8, but the fused walker is cheap enough to land in PR-1 if there's appetite. W4 (post-merge runbook is functional-only) is the most important to address: without a perf microbench in the GREEN criteria, regressions will land silently.

The lint surface is properly isolated: pure functions, dependency-injected schema, no global state, no blocking I/O, no module-level closures. The Gateway can host this engine without it owning anything. That's the right shape. APPROVE-WITH-WARNINGS — none of W1-W4 block cp-2 from opening, but all four want to land before the `doctor` lint surface becomes a default-on path or before any of this code drifts toward `before_agent_start`.
