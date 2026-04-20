# R1 Combined Review: claws-eval-api

**Panel**: craft/architect + craft/dragon
**Scope**: Plan `claws-eval-api` (5 pulses: 74-78), spec CL-10 "Eval API + Sift Query"
**Date**: 2026-04-16

---

## Findings

### F-01: Eval trigger loop is unguarded (DRAGON / HIGH)

Pulse 77 `EvalTriggerWatcher.onCompileComplete()` fires eval tiers after every
successful recompile. Pulse 74 `EvalOrchestrator.runEval()` stores results in
the compilation forest cache. If writing eval results to the forest triggers a
cache invalidation (via `CacheInvalidator` in `auto-recompile.ts`), and the
invalidation triggers a recompile, and the recompile triggers `onCompileComplete`
again, you get an infinite loop:

```
edit SOUL.md -> recompile -> onCompileComplete -> G2 eval -> store result
  -> forest write -> cache invalidation -> recompile -> onCompileComplete -> G2 eval -> ...
```

The plan says triggers fire "asynchronously" (pulse 77 line 76) but never
specifies a re-entrancy guard or a `isEvalInProgress` flag. G0+G1 are free so
looping is just wasteful. G2 costs an LLM call per cycle -- infinite loops burn
real money.

**Required**: Add a re-entrancy guard to `EvalTriggerWatcher`. If an eval is
already in progress for the current version, skip. Also: eval result writes to
the forest must NOT count as source-file changes for cache invalidation purposes.

### F-02: No sift expression sandbox -- RELAX evaluator is Turing-incomplete but still exploitable (DRAGON / MEDIUM)

The sift query endpoint (`POST /api/eval/sift`) accepts arbitrary RELAX
expressions from the HTTP caller. The existing `evaluateExpr` in
`craftworks-sdk/src/relax/relax-expr-evaluator.ts` handles 14 AST node kinds
including `ref` which resolves names from a context object. If the context
bindings include sensitive fields (fleet policy secrets, internal enforcement
metadata), a sift expression like `fleet_secret != ""` acts as a boolean oracle
that leaks data one bit at a time.

The plan says sift expressions use "the same syntax as `.claws/policies/*.yaml`
rules" but never defines which GovernanceIR fields are exposed as sift bindings
vs. which are internal-only.

**Required**: Define an explicit allowlist of sift-queryable attributes in the
`SiftQueryExecutor`. Only capability-manifest-level attributes (risk, obo,
data_label, trust_tier, etc.) should be queryable. Internal fields (enforcement
mechanisms, delegation targets, compiler metadata) must be excluded.

### F-03: Custom sift checks in claws.json are not validated at parse time (DRAGON / MEDIUM)

The plan shows `customChecks` in `claws.json` with arbitrary sift expressions
(line 38-43 of the plan). Pulse 77 `parseEvalConfig` validates tier names but
the deliverables never mention parsing or validating custom sift expressions
at config load time. A malformed expression in `claws.json` would fail silently
at G1 eval time instead of at config parse time.

Worse: since custom checks run as part of G1 (per plan line 55), a check that
triggers a parse error during every compile could wedge the compile pipeline
into a perpetual warning state.

**Required**: `parseEvalConfig` must parse and validate every `customChecks[].sift`
expression at config load time. Fail fast with a clear diagnostic pointing to
the offending check name and expression.

### F-04: RELAX evaluator lives in craftworks-sdk, not claws-sdk (ARCHITECT / MEDIUM)

The plan says sift reuses "the existing RELAX evaluator" (pulse 76). The actual
evaluator is `craftworks-sdk/src/relax/relax-expr-evaluator.ts`, and the RELAX
parser is `compiler-sdk/src/astro/ir/report/relax-parser.ts`. Neither lives in
claws-sdk. Pulse 76 puts `SiftQueryExecutor` in `claws-sdk/src/eval/` which
means claws-sdk must take a runtime dependency on both craftworks-sdk (evaluator)
and compiler-sdk (parser).

This is architecturally fine -- claws-sdk already depends on both. But the pulse
deliverables never mention the import paths or which package's RELAX API is the
integration target. An implementer could accidentally duplicate the expression
parser instead of reusing it.

**Required**: Pulse 76 deliverables should explicitly state the import:
`import { evaluateExpr } from '@craftworks/sdk/relax/relax-expr-evaluator.js'`
and `import { parseRelaxExpr } from '@craftworks/compiler-sdk/astro/ir/report/relax-parser.js'`
(or the correct subpath exports). No new parser code in claws-sdk.

### F-05: CompilationForest and CompileEvent types do not exist yet (ARCHITECT / HIGH)

Pulse 74 depends on `CompilationForest` for version-indexed result storage.
Pulse 77 depends on `CompileEvent` with a changed-file list. Neither type
exists in claws-sdk today (confirmed by grep). The dependency table says these
come from pulse 32, but pulse 32 deliverables may not have defined these exact
types or they may be named differently.

The eval orchestrator constructor takes `CompilationForest` and the trigger
watcher inspects `CompileEvent.changedFiles` -- if these types are missing or
shaped differently, pulses 74 and 77 will fail at the type-checking gate.

**Required**: Before pulse 74 starts, verify pulse 32 actually exports
`CompilationForest` with `get(version)` / `set(version, result)` semantics, and
that the recompile pipeline emits a `CompileEvent` with a `changedFiles` list.
If not, add type definitions to pulse 74 scope.

### F-06: G2 eval results are advisory but nothing prevents fleet from mandating them as blocking (ARCHITECT / LOW)

CL-10 (line 2310-2312) says eval findings are "advisory" -- only G0+G1 trigger
violation state transitions. But the plan also says fleet policy can mandate
eval tiers and the profile system has `require: ["G2"]`. If fleet mandates G2
and G2 returns a "fail" status, what happens? The plan is silent on the
enforcement semantics of mandatory-but-advisory.

A CI gate would exit non-zero on G2 fail (pulse 78 acceptance test line 69).
But the compile pipeline would not block. This ambiguity will confuse fleet
admins.

**Recommended**: Clarify in the plan: fleet-mandated tiers are mandatory to
*run*, but their findings remain advisory unless the profile also sets a
`blockOnFail: true` flag. Add this to the profile schema.

### F-07: No rate limiting on the sift endpoint (DRAGON / LOW)

`POST /api/eval/sift` is advertised as sub-millisecond. That makes it an
excellent target for enumeration attacks -- an attacker with HTTP access can
fire thousands of sift queries per second to map the entire GovernanceIR
attribute space. Combined with F-02 (no attribute allowlist), this enables
fast data exfiltration.

The serve scaffold has `rate-limit.ts` middleware, but the plan never specifies
that sift queries should be rate-limited or require authentication.

**Recommended**: Apply the existing rate-limit middleware to `/api/eval/sift`.
Document that production deployments must use auth (API key or mTLS).

### F-08: Pulse 75 and 76 are in wrong dependency order (ARCHITECT / LOW)

The plan scope table (line 66-70) lists:
- Pulse 75: Eval API routes (POST /api/eval, GET /api/eval/results)
- Pulse 76: Sift query endpoint (POST /api/eval/sift)

But pulse 76's `depends_on` is `[66, 74]` -- it does NOT depend on pulse 75.
Meanwhile pulse 78 depends on both 75 and 76. This means pulses 75 and 76 can
run in parallel, which is fine. But the plan scope table implies sequential
ordering (75 before 76) which could mislead a pulse executor into unnecessary
serialization.

**Recommended**: Mark both as parallel-eligible in the plan scope table, or
note explicitly that 75 and 76 are independent.

---

## Verdict

**CONDITIONAL PASS** -- 3 required fixes before implementation begins.

| # | Severity | Required? |
|---|----------|-----------|
| F-01 | HIGH | Yes -- infinite loop guard |
| F-02 | MEDIUM | Yes -- sift attribute allowlist |
| F-03 | MEDIUM | Yes -- custom check validation |
| F-04 | MEDIUM | No -- clarify imports in deliverables |
| F-05 | HIGH | Verify before P74 starts |
| F-06 | LOW | Recommended |
| F-07 | LOW | Recommended |
| F-08 | LOW | Recommended |

The eval orchestrator placement in claws-sdk is correct -- it belongs with the
governance IR and compilation pipeline, not in claws-serve or claws-cli. The
sift query reuse of RELAX is the right design. Five pulses are sufficient for
the scope, provided F-01 through F-03 are addressed in the pulse deliverables
before coding starts.
