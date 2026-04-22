```
+================================================================+
|                                                                |
|   XCIII. RA THE RADIANT                                        |
|                                                                |
|   claws graduation + 4-package upstream pivot                  |
|   2026-04-12 .. 2026-04-19                                     |
|                                                                |
+================================================================+
```

## Metrics

| Metric | Value |
|--------|-------|
| Phases | 2 (Ra I = Phase 55, Ra II = Phase 56) |
| Commits | 310 since origin/main (`84490da25` → `13ca6a931`) |
| Plans | 4 (claws-sdk-graduation, claws-cap-integration, claws-compile-dx, claws-pre-extraction-packaging) |
| Checkpoints | 12 (CP-1 through CP-12) |
| Pulses | ~76 (Ra I: 53, Ra II: 23) |
| Files changed | 1,440 |
| Source + test lines added | +184,109 / −4,589 |
| Serve HTTP routes | 43 (Read, Write, Collaboration across 3 layers) |
| CLI verbs (via `claws`) | 20 (9 policy + 11 snap) |
| Compiler event types | 20 discriminated-union (CL-14 §9.2) |
| `@bic/claws-*` packages | 2 (`claws-compiler` MIT, `claws-sdk` UNLICENSED) |
| `@bic/openclaw-*` packages | 4 upstream-shape (workspace, guardrails, policy, snap) + 1 lsp (renamed from `claws-lsp`) |
| Upstream-shape src / test files | 110 / 77 across the 4 openclaw packages |
| Tests passing | 6,500+ across all packages (sdk 4,912 · cli 882 · serve 818 · policy-pkg 233 · workspace-pkg 162 · guardrails-pkg 136 · snap-pkg 134) |
| Coverage bar | 95/90/95/95 per-file across all claws-\* + openclaw-\* packages |
| Review panels | 12 checkpoint panels (3–6 roles each, tension-model clusters) |
| Disciplines | architect · gateway-eng · platform-eng · conformance · security · director · dragon · ciso · perf-stress |
| Subtree disposition | 39 entries (38 lift-as-claws-internal, 1 merge-into-package, 0 dropped) |
| Checkpoint tags | ra-cp-1 .. ra-cp-12 (all pushed) |

## Wave Breakdown

### Ra I — Phase 55 (CP-1..CP-7): claws Graduation + Serve + Collaboration

| CP | Name | Pulses | Summary |
|----|------|--------|---------|
| CP-1 | Infrastructure | P01–P06 | 9 OC readers · forma-sidecar resolver · FormaIR types · Node crypto · local audit chain · R5 fail-closed |
| CP-2 | Emit + Compile | P07–P12 | 7 target emitters · eval validator · compile cache · end-to-end pipeline gate |
| CP-3 | Package Split | P13–P16, P79 | Strip @craftworks from claws-sdk · `@bic/claws-sdk` MIT · `@bic/claws-sdk` UNLICENSED integrity-pinned · API contract · `claws cache` CLI |
| CP-4 | Publish + DX | P19, P20, P80, P81, P83 | Migration guide · GHE Packages pipeline · incremental compile · `claws watch` · CompilerEventBus (20 event types) |
| CP-5 | Serve Read Layer | P21–P28, P64, P66 | `claws serve` · 19 Read routes · oc:// path syntax · chunk assembler · SSE (7 event types) |
| CP-6 | Serve Write Layer | P29–P34, P67–P71 | 13 Write routes · workspace-edit lossless · validator gate · ETag 412 · dry-run · batch · time-travel · diff |
| CP-7 | Lobster Collaboration | P35–P39, P60–P73, P82 | 13 Collaboration routes · loop-soul/memory sync · calendar · workqueue · trust JWT · sessions · violation state · auto-snapshot · fleet compile · LSP |

### Ra II — Phase 56 (CP-8..CP-12): 4-Package Upstream Pivot

| CP | Name | Pulses | Summary |
|----|------|--------|---------|
| CP-8 | Spec Polish | P40–P42 | Proposal cross-ref sweep · invented-contract audit · deck regen |
| CP-9 | Shape Scenarios | P43–P46 | 3 scenarios (guardrails subpaths · canonicalize cross-consumer byte-parity · snap promote precondition) · 33 findings verified |
| CP-10 | Foundation Consolidation | P47–P50 | `@bic/openclaw-workspace` (path + ast + canonicalize) · `@bic/openclaw-guardrails` absorbs 6 orphans + spec/ · cross-peer-dep acyclic · byte-parity CI matrix |
| CP-11 | Core + Decoupling | P51–P56, P75, P76 | `@bic/openclaw-policy` (generator + runtime ABI) · `@bic/openclaw-snap` (registry + HTTP server + safeParse) · @craftworks/* sweep zero · DISPOSITION 39 subtrees · `claws-lsp` → `@bic/openclaw-lsp` |
| CP-12 | Horus-Ready | P57–P59, P74 | `--scope` flag + byte-parity across scopes · 20 CLI verbs + 3 decision paths E2E · coverage backfill · CLAWS-E → OC-POLICY-E rename · FILTER-REPO-MANIFEST.md |

## Mythological Parallel

Ra, the falcon-crowned sun god, sailed the solar barque across the sky by day and
through the underworld by night — the same vessel bearing a different cargo each
half of the journey. Ra the Radiant sailed claws on the same double voyage: by
day (Ra I) it carried the compiler out of the `@craftworks` monorepo into a
publishable `@bic/claws-*` pair with three layers of HTTP surface for CAP,
Lobster, and fleet; by night (Ra II) it navigated the underworld of scattered
implementation — six orphan packages, `@craftworks/*` transitive imports, a
flat `spec/` tree — and brought claws back out as four coherent upstream-shape
packages ready for Horus's filter-repo lift. Ra did not create the boundary; Ra
drew it. The package names are `@bic/openclaw-*` today; when Peter greenlights
the public scope, the `--scope @openclaw` flag mechanizes the flip. Ra's solar
barque remains in `bic/claws` after Horus sails; its cargo continues upstream.

## Key Technical Achievements

The wave graduated `claws` from monorepo tenant to publishable product and then
consolidated the result for upstream contribution. Ra I stripped every
`@craftworks/*` runtime import from the compiler core, published
`@bic/claws-sdk` (MIT) + `@bic/claws-sdk` (enterprise) with integrity-hash
pinning, stood up a 43-route HTTP daemon (`claws serve`) across Read / Write /
Collaboration layers with ETag concurrency + dry-run + batch + time-travel +
structured diff + SSE, and shipped a VS Code-aware LSP plus bounded-parallel
`claws fleet compile`. Ra II drew the upstream-contribution line: four new
`@bic/openclaw-*` packages (workspace, guardrails, policy, snap) absorb six
orphan governance packages and the flat `spec/` tree into sub-path exports with
zero cross-package cycles, zero `@craftworks/*` runtime imports (CI-guarded),
and byte-parity canonicalize across three consumers on Node 18/20/22 × Windows/
Linux. The internal CLI re-homes as `claws` with library-level handlers
parameterized by `binaryName` (runs for both `claws` and `openclaw`). A
`--scope` flag flips emitted imports between `@bic/openclaw-*` and upstream
`@openclaw/*` with byte-identical policy IR and audit manifests across scopes.
CP-12 produced a `FILTER-REPO-MANIFEST.md` enumerating every rule (refs
preservation, commit-rewrite, path-spec list, `.craft/waves/` disposition,
docs paths) so Horus runs filter-repo from a written plan, not a live
experiment. 12 checkpoint tags pushed. 12 panel reviews run. Zero unresolved
Majors at close.
