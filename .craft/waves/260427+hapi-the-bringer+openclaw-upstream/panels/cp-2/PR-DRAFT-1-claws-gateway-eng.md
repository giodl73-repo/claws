# PR-DRAFT 1 Review · claws-gateway-eng · pre-push

**Date**: 2026-04-28
**Verdict**: REQUEST-CHANGES
**Pre-push gate**: NO — would not let this open at `openclaw/openclaw` today. The performance claims in PR-1 lines 194 and 261 are bare assertions without numbers, and at least one of them (the "parity-or-faster" plain-JSON claim) is contradicted by what `short-circuit.ts` actually ships. The bot-trio's 4h-median culture rewards data and punishes overclaim — this body invites a "perf numbers please" comment that will burn a cycle.

## HC-BLOCK findings (must fix before opening PR-1)

| # | Title | Where in PR-1 | Why blocking | Action |
|---|---|---|---|---|
| B1 | "Plain JSON path parity-or-faster" claim is structurally wrong | L31, L188 (F-83), L194 (F-99), L261 | `short-circuit.ts:21–26` requires a full `parseJsonc()` first, THEN a recursive `walkForTrailingComma()` over every node, THEN a fallthrough to `JSON.stringify`. That is strictly *parse + walk + stringify* vs. today's *stringify*. It cannot be "parity-or-faster" — it is necessarily slower by at least one O(n) parse pass. The doc comment in `short-circuit.ts:11–14` itself admits "necessary not sufficient" and that callers must additionally re-stringify and compare for byte-identity. So the actual hot path is *parse + walk + stringify + compare + maybe stringify again*. | Replace "parity-or-faster" with measured numbers. Either (a) ship a true byte-prefix short-circuit BEFORE parse (regex-scan for `//`, `/*`, BOM, trailing-comma-before-`}`/`]`), and only then claim parity; or (b) drop the parity claim and frame as "AST always; <Xms p99 on Nkb configs". |
| B2 | "JSONC ≤2× stringify on 1MB" is unsourced (L194, F-99) | L194 | Greptile / similar will flag bare numeric claims with no benchmark output. Doctor + dashboard-save call `replaceConfigFile` on every save; a 50ms regression at 1MB is realistic given `parseJsonc` is single-pass char-at-a-time JS with `slice()` allocations on every string literal. Without a benchmark file in the PR diff this number cannot be defended in review. | Add a `bench/` script + recorded results table to PR body, OR drop the numeric assertion and replace with "p99 measured at <X>ms on <N>kb config; see bench/ output". The 50ms ceiling line in F-99 is fine — ceiling-as-test-assertion is defensible. |
| B3 | Recursive descent has no stack-depth or input-length cap | `parse.ts` whole file | `parseValue → parseObject → parseMember → parseValue` recurses with no depth guard. A 10k-deep `[[[[…]]]]` config (malicious or accidental — symlink loops in plugin manifests have produced this shape historically) will blow the V8 stack. For a substrate that sits below `replaceConfigFile`, an unhandled `RangeError` crashes the gateway worker. Same hazard in `short-circuit.ts:33` `walkForTrailingComma`. | Add a `MAX_DEPTH` guard (suggest 256) returning a `OC_CFG_PARSE_DEPTH_EXCEEDED` diagnostic. Add a `MAX_SOURCE_BYTES` (suggest 8MB) hard cap in `parseJsonc` entry. Both are bot-pre-empt insurance — a reviewer who notices the recursion and asks about DoS is going to expect this. |

## HC-WARN findings (should address)

| # | Title | Where | Action |
|---|---|---|---|
| W1 | `pushDiag` is O(n) per diagnostic (line/col rewalk from offset 0) | `parse.ts:113–122` | On a malformed 1MB input with hundreds of cascading diagnostics (resync path is permissive — `parseValue` falls through to `OC_CFG_PARSE_EXPECTED_VALUE` on every junk char), this becomes O(n²). Cap diagnostics at e.g. 100 per parse, OR build a line-start index once after parse and lazy-resolve line/col on access. |
| W2 | `emitJsoncWithMutation` rebuilds the source string on every replacement | `emit.ts:48–51` | `out = out.slice(0, r.start) + r.text + out.slice(r.end)` inside the for-loop is O(n) per replacement → O(n·k). For a config with k=50 mutated leaves on a 100KB source this is 5MB of intermediate string allocation. Use an array-of-segments builder + single `join('')` at the end. Cheap fix; visibly correct. |
| W3 | `replaceConfigFile` cadence in gateway hot path is understated in PR | L264–274 ("Migration / risk") | The PR describes the conversion as "<10KB sub-millisecond" but does not call out that dashboard-save and `openclaw update` cron paths fan-in to this primitive. State explicitly: "expected call rate: ≤1/s steady, ≤10/s burst on dashboard-save; budget per call ≤10ms p99 on 100KB". This pre-empts the bot question and demonstrates gateway-eng has thought about it. |
| W4 | Lint engine purity is good — note it explicitly | `lint/index.ts:16–33` | Confirmed: `lint()` takes `(JsoncDocument, LintOptions)` and never reaches into process state, plugin handles, or globals. Rules are `LintRule.run(doc, schema)` per `types.ts`. This is the right shape and PR-1 should *say so* — add one line under "Why governance must live in core" explicitly stating "lint is doctor-only; zero gateway-runtime hooks; 50ms hook budget never touched by lint". That phrase is the gateway-eng safety word. |

## HC-NOTE findings (capture for follow-up)

| # | Title | Where |
|---|---|---|
| N1 | `serializeLeaf` admits cosmetic loss on numbers (`1.0` → `"1"`) | `emit.ts:91–95` — acceptable per docstring but flag it in PR-1 test plan as F-XX rather than burying in code comment. |
| N2 | `parseObject` allocates a fresh member with spread on every comma — micro | `parse.ts:250–251` `members.pop(); members.push({ ...last, ... })`. Hot for large objects. Mutate in place. |
| N3 | `formatOcConfigUri(f.path)` runs once per finding in `lint/index.ts:29` even when caller doesn't care about ocUri rendering | Could be lazy. Not perf-critical (lint is doctor-only) but worth a TODO. |
| N4 | PR table at L9 cites issues like `#60917` without verification — reviewers may spot-check | Confirm at least 3–4 cited issue numbers actually exist in `openclaw/openclaw` before push. Bot-trio frequently spot-checks. |

## Strengths preserved

- **Discriminated-union `DiagnosticLocation`** (L120–124, L128) — correctly typed, narrowing-friendly, passes the bot-preempt "no permissive object" rule (L244). Bot-trio likes this shape.
- **Lint surface is pure** (`lint/index.ts:16–33`) — no `process.*`, no plugin handles, no globals; rules are folds over `(doc, schema)`. Doctor-only consumption is exactly the architectural boundary the gateway needs.
- **`emitJsonc(doc) → doc.source`** (`emit.ts:25–27`) — pristine round-trip is one line. F-76 invariant is structurally guaranteed, not assert-tested-into-existence. This will read as elegant.
- **Subpath earns-its-keep table** (L172–177) — pre-empts the "why is this monolithic" reviewer question that killed earlier workspace attempts upstream. Solid framing.
- **Issue-citation table** (L7–17) — data-driven justification is exactly the bot-trio's preferred argumentation register. Provided the numbers verify (N4), this will land well.

## Verdict reasoning

From the gateway-eng lens, the substrate work is sound and the *direction* is right — `replaceConfigFile` is a chokepoint, lossless emit is the correct primitive, the discriminated-union diagnostic location is the right type-system shape, and the lint engine is provably gateway-runtime-clean (it never touches process/plugin/global state). The 50ms hook budget is not at risk because lint never runs in a hook — it's doctor-only. That part is fine.

What is *not* fine for a pre-push gate is that the two performance claims that anchor the PR's "this is safe to put under every config write" argument (L194 and L261) are simultaneously load-bearing and untestable from the PR body. The "parity-or-faster" claim is structurally false against the implementation in `short-circuit.ts` — that file does parse-then-walk before it can short-circuit, which is by definition slower than today's bare `JSON.stringify`. The bot-trio reads code AND descriptions, and a reviewer who opens `short-circuit.ts` will see the contradiction in 30 seconds. That's a wasted review cycle and a dent in trust for the rest of the wave.

The other gateway-shaped concern is the absence of depth/length caps in the recursive descent parser. For a substrate that sits below every config-mutation path, an unhandled stack overflow on adversarial input is the kind of thing the bot-trio will absolutely flag — and they should. The fix is a 4-line `MAX_DEPTH` guard. That, combined with replacing the unsourced perf claims with either real benchmark output or honestly-framed ceilings, gets this to APPROVE-WITH-WARNINGS. As-is, push it and we burn cycles defending sentences we shouldn't have written.
