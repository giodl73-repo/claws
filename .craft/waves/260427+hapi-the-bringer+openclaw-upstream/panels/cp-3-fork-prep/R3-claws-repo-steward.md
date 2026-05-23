---
doc: R3-claws-repo-steward
round: 3
panel: cp-3-fork-prep
reviewer: claws-repo-steward
created: 2026-05-04
---

## Strategic frame

The five substrates are physically clean on the things you can grep
mechanically: zero `@bic/*` package references, zero
`from 'claws-*'` imports, zero `.craftworks/` paths, zero references
to `claws-sdk` / `claws-serve` / the OLD `openclaw-policy` prototype.
The post-rename sweep did its work. `package.json` files are uniform
on `@openclaw/*` scope and the dep graph is fork-internal.

Where the boundary leaks is **vocabulary, not topology**. The fork is
about to inherit a canonical workspace-roles enum that includes
`lobster.workflow` as a Tier-4 role; a starter rule pack named
`oclint-rules-lobster-yaml-starter`; a paired starter fixer pack named
`ocdoctor-fixers-yaml-starter` whose every fixer cites
`openclaw/lobster issue #NN`; a tracker test asserting
`byRole['lobster.workflow']`; and, most loudly, an `IDENTITY.md`
fixture that says **"Microsoft / claws monorepo team."** Plus
`lobster-docs/Tech/...` paths in two upstream-shaped JSDoc headers in
`policy-substrate`.

The mechanical sweep treated `lobster` as content. The role frame
says vocabulary IS the boundary: every `lobster.workflow` ID baked
into the upstream-destined enum is a future git-blame that points at
`bic/lobster` and asks future maintainers "why does the openclaw
core know about a downstream product?" Boundary purity > migration
convenience. The four lobster-themed concerns below are BLOCK because
they sit in code paths that ship upstream verbatim per the README's
"transplant is `cp src/* openclaw-core/src/*`" promise.

The steward's specific worry: this work is one `cp -r` away from
upstream. There is no chance to re-grep before the PR opens.
What ships, ships.

## Per-substrate findings

### 1. `oc-paths-substrate` → `@openclaw/oc-path`

- **BLOCK**: `src/plugin-sdk/oc-path/workspace/roles.ts:116-122` —
  Tier 4 canonical role `id: 'lobster.workflow'`, description
  `'Lobster workflow (yaml-shaped)'`, matcher `n.endsWith('.lobster')`.
  The `CANONICAL_ROLES` array IS the exported workspace contract
  (consumed by the manifest walker, by lkg-recovery's
  `registerOpenClawWorkspace`, by policy-substrate's path
  conventions). Shipping this verbatim names a downstream product
  inside the openclaw core role registry. Either drop the tier
  entirely (let lobster ship its own `extraRoles`) or generalize to a
  neutral `yaml.workflow` role keyed on a glob the host configures.
- **BLOCK**: `tests/fixtures/real/IDENTITY.md:3` —
  `Microsoft / claws monorepo team`. Fixture content travels with the
  test. Two leaks in seven words. Replace with neutral
  organization (e.g., `Acme Corp / platform team`) or scrub to
  `<organization>` / `<team>` placeholders.
- **WARN**: `README.md:3,7` — `downstream prototype of the upstream`
  + the absolute URL
  `https://microsoft.ghe.com/bic/lobster/blob/main/project-lobster-vault/Tech/OpenClaw/specs/proposals/upstream/oc-paths.md`.
  README likely doesn't ship upstream (per the file's "claws
  prototype" framing it's a transplant cover sheet), but the GHE URL
  hard-codes the Microsoft GHE host into the public record. Either
  move the README to `.craft/` notes or scrub the URL.
- **WARN**: `PITFALLS.md:7-11` — references the
  `claws-side governance taxonomy in /docs/PITFALLS.md`. PITFALLS.md
  is in `files: ["dist", "bin"]` indirectly (it's at package root,
  not shipped per the `files` field — verify), but the prose names
  the claws-side taxonomy as load-bearing context. Scrub or rephrase
  to "the host's broader governance taxonomy."
- **WARN**: `tests/scenarios/wave-23-pitfalls.test.ts:12` — comment
  references `claws-side docs/PITFALLS.md`. Test file, but if tests
  ship to upstream per the README's
  `tests/plugin-sdk/oc-path/*.test.ts` →
  `openclaw-core/test/plugin-sdk/oc-path/*.test.ts` map, the comment
  ships too.
- **WARN**: `src/index.ts:2` and the `src/plugin-sdk/oc-path/find.ts`
  + `yaml/ast.ts` + `workspace/roles.ts` headers all describe
  themselves as "downstream prototype of the upstream..." — that's
  a useful prototype-stage banner here, but if `cp src/*
  openclaw-core/src/*` is the transplant rule, every header ships
  with `downstream prototype` baked in. Either strip on transplant
  (mechanical) OR make this an explicit transplant-step in the
  upstream PR plan.
- **NIT**: yaml AST docstring at `yaml/ast.ts:14` mentions
  `.craft/waves/*.yaml` — incidental, but it's the only `.craft/`
  reference in the substrate sources. Generalize to "host workflow
  files" or drop.
- **NIT**: `src/plugin-sdk/oc-path/find.ts:21` example uses
  `oc://workflow.lobster/steps/* /command` — example payload, not a
  contract, but the example chooses a lobster-shaped path.

### 2. `pinch` → `@openclaw/oc-lint` (bin `openclaw-lint`)

- **BLOCK**: `src/extensions/oclint-rules-lobster-yaml-starter/` —
  the entire directory is a starter pack named for the downstream
  product. Four rules, each citing
  `openclaw/lobster issue #25/#26/#41/#76/#77`, all keyed on
  `appliesTo: '*.lobster'`, all under
  `id: 'lobster-yaml-starter-v0/...'`. This pack lives in the lint
  package's `extensions/` dir which is exported per the
  `./rules-starter` subpath. Either:
    1. Delete the pack from the upstream PR scope; ship only
       `oclint-rules-{starter,jsonc-starter,jsonl-starter}` and let
       lobster ship the yaml-starter as a downstream package.
    2. Rename to `oclint-rules-yaml-starter-v0`, change all rule
       ids to `yaml-starter-v0/step/*`, change `appliesTo` to
       `*.yaml` or a host-configured glob, and rewrite each
       "Source: openclaw/lobster issue" docstring to a generic
       failure-mode description.
- **BLOCK**: `src/shared/starter-values.ts:65-71` —
  `STARTER_IN_PROCESS_TOOLS` list contains `'lobster'` and
  `'clawd.invoke'`. `clawd` is the claws daemon command name; both
  identifiers are downstream-product names baked into a
  shared-values constant exported from the lint package. Replace
  with neutral examples or move into the lobster-yaml starter pack
  if that pack survives.
- **BLOCK**: `src/shared/starter-values.ts:58` — comment refers to
  `lobster-yaml-starter-v0/step/shell-tool-collision`. Same pack
  cleanup as above.
- **WARN**: `src/extensions/oclint-rules-starter/index.ts:4` —
  header says rules were "distilled from claws's adversarial
  scenario waves." Attribution belongs in commit messages or PR
  bodies, not in the upstream rule pack source. Scrub.
- **WARN**: `src/cli/index.ts:386` — extension dispatch maps
  `.lobster` → yaml. Same lobster-as-canonical-extension issue as
  oc-paths-substrate's `roles.ts:121`; the CLI shouldn't know about
  a downstream extension. Drop the `.lobster` arm or make it
  configurable via the host's manifest extension list.
- **WARN**: `src/plugin-sdk/oc-lint/types.ts:27` — comment mentions
  "lobster-specific or workspace-specific conventions" by way of
  example. Generalize.
- **WARN**: `src/index.ts:2` — `downstream prototype of the
  upstream` header (same family as oc-paths-substrate; same fix).
- **NIT**: `tests/extensions/oclint-rules-starter/rules.test.ts:163`
  — `'## Organization\nMicrosoft\n'` test fixture content. In-line
  fixture, low blast radius, but the word "Microsoft" leaks.

### 3. `oc-paths-doctor` → `@openclaw/oc-doctor`

- **BLOCK**: `src/extensions/ocdoctor-fixers-yaml-starter/` —
  entire pack, four fixers, every header citing
  `openclaw/lobster issues #25, #26, #41, #76, #77`, all
  `appliesTo: '*.lobster'`. Same disposition as pinch's
  `oclint-rules-lobster-yaml-starter`: delete from upstream-PR
  scope OR rename + rewrite to neutral yaml-starter shape. The
  fixer pack pairs 1:1 with the lint pack; any decision on one
  must apply identically to the other.
- **WARN**: `src/index.ts:2` — `downstream prototype of the
  upstream` header. Same family.
- Otherwise this substrate is the cleanest of the five — the
  contamination is concentrated in the yaml-starter pack.

### 4. `lkg-recovery-substrate` → `@openclaw/lkg` (bin `openclaw-lkg`)

- **BLOCK**: `src/trackers/openclaw-workspace.ts:53,61,76` plus
  `src/trackers/index.ts:35` — `OpenClawSkippedEntry` type is
  exported. Looks fine on its own (it's `OpenClaw*`, not `Claws*`),
  EXCEPT the `registerOpenClawWorkspace` tracker reads the
  workspace manifest including the `lobster.workflow` Tier-4 role.
  Indirect leak via oc-paths-substrate's role registry — fix that
  upstream of this package and the indirection clears.
- **WARN**: `tests/trackers/openclaw-workspace.test.ts:148,293`
  asserts `byRole['lobster.workflow']` and contains the role id
  in a `toContain` check. Test ships with the package per the
  starter convention. Update once `roles.ts` is generalized.
- **WARN**: `tests/extensions/lkg-fs/bounding-box.test.ts:208,230,246,367,379`
  + `tests/trackers/trackers.test.ts:203,204,217,251,264` +
  `tests/integration/manifest-multi-consumer.test.ts:63` — fixtures
  use `wf.lobster` / `build.lobster` / `test.lobster` filenames as
  yaml-kind exemplars. Switch to `.yaml` / `.yml` once the
  canonical role generalizes.
- **WARN**: `PITFALLS.md:9` references "claws-side
  `docs/PITFALLS.md`"; lines 73-74 mention `wf.lobster` as a kind
  exemplar. Same scrub.
- **WARN**: `src/index.ts:2` — `downstream prototype` header.
- **NIT**: `src/trackers/openclaw-workspace.ts:1-3` docstring is
  fine — `openclaw artifact set` is the right vocabulary.

### 5. `policy-substrate` → `@openclaw/policy` (bin `openclaw-policy`)

- **BLOCK**: `src/plugin-sdk/policy/index.ts:5` and
  `src/plugin-sdk/policy/types.ts:6` — both reference
  `lobster-docs/Tech/OpenClaw/specs/proposals/upstream/policy-anchoring/upstream-pr1-policyir.md`
  as the spec source. `lobster-docs/` is the obsidian vault repo
  path; this absolute reference will dangle the moment the PR
  opens upstream and a maintainer tries to follow it. Replace with
  the upstream PR URL once filed, or drop the reference and let
  the PR body carry the spec link.
- **WARN**: `src/plugin-sdk/policy/registry.ts:4,49` — comments
  list `(claws / OPA / CEL / yaml shim / future)` as example
  downstream consumers and a `description: 'Markdown workspace →
  PolicyIR (claws-shaped)'`. The "claws-shaped" string is metadata
  on a registered generator spec; if the description string ends
  up surfaced in CLI listings (`openclaw-policy generate --list`),
  the word leaks at runtime. Generalize to "Markdown workspace →
  PolicyIR (reference impl)."
- **WARN**: `src/plugin-sdk/policy/build.ts:8` and
  `src/plugin-sdk/policy/types.ts:112` — same `(claws / OPA / CEL /
  yaml)` enumeration in JSDoc. Comment-only.
- **WARN**: `src/extensions/policy-from-md-starter/index.ts:2` —
  header calls the pack a "claws-shaped reference generator pack."
  The starter is a reference generator, not specifically
  claws-shaped; rename in prose.
- **WARN**:
  `src/extensions/policy-from-md-starter/extractors/tools-from-tools-md.ts:5`
  — comment: "The convention used by claws's authoring layer is
  `### name # R<n>, ...`." If the convention is the upstream
  contract (the `## Tools` ### form), describe it as the contract,
  not as claws's choice.
- **WARN**: `src/index.ts:2` — `downstream prototype` header.

## Cross-cutting boundary concerns

1. **The `downstream prototype of the upstream X` header pattern**
   appears in the top-of-file JSDoc of every substrate's
   `src/index.ts` and several deep modules. It's a useful prototype
   marker today and a leak post-fork. Decide now whether the
   transplant step strips it (mechanical, deterministic) or whether
   the headers go away in source pre-fork. Either is fine; doing
   neither means it ships.

2. **`lobster.workflow` as a canonical role is the load-bearing
   leak.** It's not just a string — the role appears in the role
   registry, the manifest walker, the tracker registrar's per-kind
   lookup, the policy starter's manifest consumption, and the
   bounding-box test that locks the four-kinds claim. Removing it
   ripples through ALL FIVE substrates' tests. Treat this as one
   refactor, not five.

3. **Two starter packs (`oclint-rules-lobster-yaml-starter` and
   `ocdoctor-fixers-yaml-starter`) are lobster-flavored end-to-end.**
   They cite specific `openclaw/lobster` GitHub issue numbers as
   provenance; they key on `*.lobster`; their rule/fixer ids
   contain `lobster-yaml-starter-v0/`. The cleanest fork-prep move
   is to extract these two packs into a separate
   `lobster-yaml-starter` package that's NOT in the upstream PR
   scope at all. Keeps the upstream surface to "universal substrate
   + neutral starter packs" and lets the lobster-flavored content
   ship downstream.

4. **`@bic/* → @openclaw/*` rename was clean on package.json deps and
   import paths, but did NOT sweep prose.** Future renames (e.g.,
   "claws → some-neutral-name" if that ever happens) need a prose
   sweep step explicitly in the runbook.

5. **No `.craft/` or `.craftworks/` references in source.** Verified
   via grep across all five substrates. Single incidental hit in
   `oc-paths-substrate/src/plugin-sdk/oc-path/yaml/ast.ts:14`
   (`.craft/waves/*.yaml`) is documentation-only and easy to scrub.

## Ask list (pre-fork cleanup)

BLOCK (residue that taints the fork at PR-open time):

1. `oc-paths-substrate/src/plugin-sdk/oc-path/workspace/roles.ts:116-122`
   — drop `lobster.workflow` Tier-4 role OR generalize.
2. `oc-paths-substrate/tests/fixtures/real/IDENTITY.md:3` —
   replace `Microsoft / claws monorepo team`.
3. `pinch/src/extensions/oclint-rules-lobster-yaml-starter/`
   (whole dir, ~10 files) — delete from upstream PR scope OR rename
   + de-lobster.
4. `pinch/src/shared/starter-values.ts:58,65-71` — purge
   `'lobster'` and `'clawd.invoke'` from
   `STARTER_IN_PROCESS_TOOLS`.
5. `oc-paths-doctor/src/extensions/ocdoctor-fixers-yaml-starter/`
   (whole dir, ~6 files) — same disposition as #3.
6. `policy-substrate/src/plugin-sdk/policy/{index.ts:5,types.ts:6}`
   — replace `lobster-docs/Tech/OpenClaw/...` paths with the
   upstream PR URL or drop.

WARN (residue not visible at fork-time but ages badly):

7. All five `src/index.ts` headers + ~6 deep-module headers
   carrying `downstream prototype of the upstream`. Decide the
   transplant policy: strip-on-cp or scrub-in-source.
8. `pinch/src/cli/index.ts:386` and other `.lobster` extension
   dispatch arms — generalize once the canonical role generalizes.
9. All `(claws / OPA / CEL / yaml)` consumer enumerations in
   policy-substrate's plugin-sdk JSDoc — replace `claws` with
   `host` or drop the enumeration.
10. `lkg-recovery-substrate/PITFALLS.md:9` and `oc-paths-substrate/
    PITFALLS.md:7-11` — claws-side cross-references in PITFALLS
    docs that ship at package root.
11. lkg-recovery-substrate test fixtures using `*.lobster`
    filenames (cited above) — switch to `.yaml`.
12. `pinch/src/extensions/oclint-rules-starter/index.ts:4` —
    "distilled from claws's adversarial scenario waves" attribution
    string.
13. `policy-substrate/src/plugin-sdk/policy/registry.ts:49`
    `description: 'Markdown workspace → PolicyIR (claws-shaped)'`
    — runtime-visible string.

NIT:

14. `oc-paths-substrate/src/plugin-sdk/oc-path/yaml/ast.ts:14`
    `.craft/waves/*.yaml` reference — generalize.
15. `oc-paths-substrate/src/plugin-sdk/oc-path/find.ts:21` —
    example uses `workflow.lobster` payload; generalize.
16. `pinch/tests/extensions/oclint-rules-starter/rules.test.ts:163`
    inline `Microsoft` fixture token.
17. `oc-paths-substrate/README.md` — either move to `.craft/` or
    scrub the GHE URL.

Bottom line: the mechanical sweep was thorough, the vocabulary
sweep wasn't started. The role registry + two starter packs are
the load-bearing leaks; the rest is shallow scrubbing. Boundary
purity > migration convenience — fix the role, drop or rename the
two lobster-flavored starter packs, and the fork opens clean.
