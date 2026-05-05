---
doc: R3-claws-skill-author-new-hire
round: 3
panel: cp-3-fork-prep
reviewers: [skill-author, new-hire]
created: 2026-05-04
---

# R3 — Skill-Author + New-Hire dual review of the 5 substrate packages

## Dual frame

**Skill-author (SA)**: experienced plugin author. Has shipped two starter packs already, reads `LintRule` types fluently, evaluates everything by "does the next plugin land in 30 minutes or 3 hours?" Cares about plugin-shape consistency across registries and round-trip ergonomics for typed options.

**New-hire (NH)**: never seen this code, comfortable with TypeScript and npm, told to "go write a workspace lint rule." Will spend ~5 minutes scanning before deciding the SDK is approachable. Cares about: where do I start? What's the bin name? Why are there four CLIs?

The two lenses converge surprisingly often: every plugin-shape inconsistency SA flags is also an NH on-ramp blocker. Where they diverge: SA cares about contract drift (e.g., "duplicate id throws" vs "last-writer-wins"); NH never notices until they get bitten in week three.

---

## Per-substrate findings

### `oc-paths-substrate` (`@openclaw/oc-path`)

- **NH — README is the only one in the five-pack** (NIT). Good: the README explicitly maps prototype → upstream destination, names the chokepoints, lists the build/test commands. NH lands here first and has a working mental model in 90 seconds. Bad: it sets an expectation the other four will not meet.
- **SA — `bin/openclaw-path.mjs` exists but isn't documented** (NIT). The bin is a useful smoke-test surface for plugin authors poking at AST + resolve, but neither the README nor `package.json.description` mentions what it does. SA who notices the bin will read the source; NH won't notice it exists.
- **SA — naming asymmetry: package is `@openclaw/oc-path` (singular), repo dir is `oc-paths-substrate` (plural)**. Matches the upstream-PR planning vocabulary (`oc-paths` proposal) but the published name is `oc-path`. Documented in the README's title heading; works fine for SA who has skimmed the proposal, mildly disorienting for NH (BLOCK if NH grep-searches `oc-paths` in `package.json` files and finds nothing).

### `pinch` (`@openclaw/oc-lint`, bin `openclaw-lint`)

- **NH — no README** (BLOCK). The single most-used substrate in the dual-lens experiment ("write a workspace lint rule") has zero package-root prose. NH lands at `src/index.ts`, sees `export const SDK_VERSION = '0.1.0'`, doesn't know whether to read `types.ts`, `registry.ts`, `api-extension.ts`, or `extensions/oclint-rules-starter/rules/`. Time-to-first-finding measured by "I have to read three files before I see a working rule" — not 5-minute approachable.
- **NH — three brand names for one thing** (WARN). package name = `@openclaw/oc-lint`. bin = `openclaw-lint`. Workspace dir + craft docs = `pinch`. The description-line "Cargo:Clippy ↔ OpenClaw:Pinch" is cute and correct framing for SA, but NH has to internalize three labels before the first command runs. Suggestion: lead any future README with a single line — "Pinch is the brand; `openclaw-lint` is the bin; `@openclaw/oc-lint` is the npm name."
- **SA — contract drift on duplicate rule ids** (BLOCK). `registry.ts:34-38` says re-registering the same id is "last-writer-wins; useful in tests and for operator-controlled rule overrides." `api-extension.ts:23-30` + `LintRuleRegistrationError` say duplicate id is a registration error with stable code `OC_LINT_DUPLICATE_RULE`. Both can't be true. SA who tries `registerLintRule(rule); registerLintRule(rule)` in a test will silently overwrite when they expected a throw, or vice versa. Either delete the error class or change the registry to throw — pick one and align the doc string.
- **SA — `LintRule<TOptions>` round-trip is asymmetric** (WARN). Author writes `LintRule<MyOptions>` and `registerLintRule<MyOptions>(rule)`. Retriever gets `LintRule<unknown>` from `getLintRule(id) / listLintRules()`. The cast back to `LintRule<MyOptions>` is the author's burden; there's no `getLintRule<MyOptions>(id)` overload, no `defaultOptions` accessor that preserves the type. Workable, annoying. Suggestion: either expose `getTypedLintRule<TOptions>(id): LintRule<TOptions> | null` (unsafe cast hidden behind an assertion the author opts into) or document the cast pattern in the eventual README.
- **SA — `test-harness` ships, registry exposes `_clearLintRuleRegistry`** (good). Author can write rule + test in one file and not pollute global state. This is the gold standard the other substrates should match.

### `oc-paths-doctor` (`@openclaw/oc-doctor`, no bin)

- **NH — no bin, no README, only one CLI verb anywhere** (WARN). NH searching for "how do I run a doctor fix?" finds the answer is: "you don't; you register a contribution into a host that runs `openclaw doctor`." That's correct architecture (PR-3 "no new SDK verb"), but NH has no place to land. The package description says "ships starter-v0 starter pack" — surfacing **how** to invoke the starter pack from a workspace would close the gap.
- **SA — `FixerTier` default is documented in the field comment but not enforced** (WARN). `OcPathFixerSpec.tier` is optional, "defaults to `'mutating'`." But the default lives in the field comment, not in code SA can see. Where is the actual `?? 'mutating'` defaulting? If it's in the adapter, the comment is true; if it's only documented, an author who omits `tier` and a host that strict-equals `tier === 'mutating'` will both compile, both type-check, and silently miss the fixer. Spot-check needed: `adapter.ts` should normalize an undefined `tier` to `'mutating'` exactly once at registration boundary, then never let `undefined` flow through `DoctorFinding.tier`. (NH won't notice; SA will hit it the first time they ship a tier-graduated host.)
- **SA — `FixerTier` 3-tier vocabulary is good but the names are non-obvious** (NIT). `additive` / `mutating` / `regenerative` is precise but `mutating` reads as "the dangerous one" to a casual scanner; the comment correctly notes the safe-baseline is `additive`. Consider `safe / replace / regenerate` if churn is cheap, or document the mental model in a top-of-file paragraph.
- **SA — registry signature `registerDoctorHealthContribution` is non-generic** (NIT). Unlike `registerLintRule<TOptions>` and `registerPolicyGenerator<TValidated>`, this one takes a non-generic `DoctorHealthContribution`. Reasonable — the contribution doesn't carry caller-typed options on its public face — but the asymmetry is one more thing for SA to remember when porting between SDKs. The typed payload (`OcPathFixerSpec<TOptions>`) hides inside the adapter call site; that's fine.

### `lkg-recovery-substrate` (`@openclaw/lkg`, bin `openclaw-lkg`)

- **NH — no README + a fresh concept ("LKG", "tracker")** (BLOCK). LKG is the substrate where NH has the least prior intuition. Without prose, NH lands at `index.ts`, sees `export type { LKGActor, LKGEntry, ... }` and 11 imports. The `api.ts` first paragraph is good ("plugins call `register(tracker)` to opt a path into LKG protection") but it's hidden two folders deep. PITFALLS.md exists — was probably written for SA, will be read by NH out of desperation. Even a 20-line README with one diagram of "tracker → observe → promote/recover" would unblock most of the NH curve.
- **SA — registry pattern diverges from the other three** (WARN). pinch/oc-doctor/policy use a global `Map<string, ...>` registry with top-level `register*(spec)`. LKG uses an `LKGStore` interface where `register` is an instance method on a per-tenant store. The reasoning in `api.ts:8-13` ("multi-tenant note") is correct and load-bearing — global registry would be a bug. But `index.ts` doesn't surface the divergence. SA reading the pinch registry doc-comment ("**The plugin-shape pattern**: every openclaw plugin … same registration story") will be surprised when LKG breaks the pattern; the divergence is for-cause but should be called out in the LKG SDK barrel comment, not just in `api.ts`.
- **SA — `WorkspaceLkgConfig` lives in `lkg`, `WorkspaceLintConfig` in `pinch`, `WorkspacePolicyConfig` in `policy` — pattern is consistent and obvious** (good). Authoring a fourth substrate, SA would put the new config section in the new substrate's package without asking. Per-substrate ownership is stated in each `workspace-config.ts` header ("locally owned by this package; oc-paths-substrate has no upfront declaration of which sections exist"). Mark this as the canonical pattern in any future authoring guide.
- **SA — `LKGTracker<TParsed, TIssue>` round-trip is the strongest** (good). Generics flow through `register` and back out via the tracker's own typed `parse`/`validate`. SA gets full type recovery. Compare to pinch's `LintRule<unknown>` retrieval — LKG sets the bar.

### `policy-substrate` (`@openclaw/policy`, bin `openclaw-policy`)

- **NH — no README, no test-harness, four extensions to grep through** (WARN). NH writing their first generator finds `extensions/policy-from-md-starter` and reads it, then re-implements it. Without `./test-harness`, they hand-roll fixture scaffolding.
- **SA — no `./test-harness` export** (BLOCK). pinch has `./test-harness` (`runRule`, `assertFlags`). oc-doctor has `./test-harness` (`runFixer`, `runFixerAll`, `assertIdempotent`). lkg has `./test-harness` (`makeTestStore`, `assertPromotes`, `assertRecovers`). policy has none. SA writing a custom `PolicyGenerator` has to bring up `runExtractors` + a fake file list + their own assertions. The asymmetry is an explicit contract gap for the "policy is the canonical plugin pattern" frame — three of four canonical substrates ship the harness, the one named "canonical" doesn't. Wire `runExtractor(spec, files)` + `assertExtracts(result, ...)` + `assertGeneratorRoundTrip(generator, ir)` and re-export under `./test-harness`.
- **SA — `PolicyGeneratorSpec.requires.sdkVersion` field exists but `checkSdkCompat` is not exported from `policy/index.ts`** (NIT). pinch's `index.ts` re-exports `checkSdkCompat` from its api-extension; lkg's `index.ts` re-exports `checkSdkCompat` from its compat module; policy's `index.ts` doesn't, and there's no `compat.ts` in `policy/`. SA registering a generator with `requires.sdkVersion: '0.1.0'` has no host-side compatibility check to call. Either inline the same 9-line `checkSdkCompat` helper into policy, or hoist it into oc-paths-substrate so all three import it.
- **SA — `WorkspacePolicyConfig` ships as a bare interface; pinch + lkg ship interface + `resolve*Overrides()` resolver** (NIT). Policy's overrides are simpler (just `generator` and `policyPath`), so the resolver may not be load-bearing yet, but the asymmetry breaks the per-substrate pattern. If a fourth-substrate author looks at policy as the template, they'll skip the resolver and re-discover the merge logic later.

---

## Cross-cutting

**Plugin-shape consistency** — three out of three CLI-surface substrates (pinch, oc-doctor, policy) use the global-Map registry pattern; LKG uses an instance-store pattern for legitimate multi-tenant reasons. The pattern is *almost* uniform; calling out LKG's divergence in its barrel comment closes the only real gap. Registries' helper surface (`register*` / `get*` / `list*` / `_clear*`) is identical and that's the part SA cares about most.

**Type-erasure round-trip** — `LintRule<TOptions>` on register, `LintRule<unknown>` on retrieve. Same pattern in `PolicyGeneratorSpec`. LKG handles it best (full recovery via instance methods). For pinch + policy: a typed-getter overload (`getLintRule<T>(id): LintRule<T> | null` behind a docstring "caller asserts the type matches their registration") would close 90% of the friction. Not blocking; just rough edges.

**On-ramp gaps** — only oc-paths-substrate has a README. For the four others, NH's first read is `src/index.ts`, which is a 30-line re-export barrel that conveys nothing about how to author. A 30-line README per package — with the bin name + package name + brand + one code snippet showing a minimal plugin — would close the on-ramp gap entirely.

**Brand fragmentation** — pinch is the worst offender (3 names: `pinch` / `openclaw-lint` / `@openclaw/oc-lint`). lkg is two (`lkg` / `@openclaw/lkg`). policy + oc-doctor are aligned. If task #182 (the `openclaw <verb>` umbrella dispatcher) lands, the bin names mostly disappear from NH's mental model and only the package names + craft brands remain — that drops to 2 tags total per substrate, manageable.

**Confirm with the user — task #182 is a known gap, right?** Four separate `openclaw-*` bins where one `openclaw <verb>` would do, with the umbrella dispatcher tracked but not yet shipped. Worth naming explicitly in any new-author docs as "future: `openclaw lint` will replace `openclaw-lint`."

**`@module` JSDoc tags vs package.json names** — spot-checked. pinch's tags say `@module @openclaw/oc-lint` and the package is `@openclaw/oc-lint`. lkg's tags are mixed: some say `@openclaw/plugin-sdk/lkg/...` and others say `@openclaw/lkg/...`. Check `lkg/api.ts:14` (`@module @openclaw/plugin-sdk/lkg/api`) against `package.json.name` (`@openclaw/lkg`). Same in policy. The `@module` tags are stale-from-prior-naming; harmless to runtime but mildly confusing in generated typedoc. NIT.

---

## Ask list — smallest fix first

1. **NIT — pinch contract drift.** Pick one: throw on duplicate id, or last-writer-wins. Update the doc-comment that disagrees. ~5 min. (SA / BLOCK if you ship the wrong shape upstream.)
2. **NIT — `@module` tag drift.** Search-replace `@openclaw/plugin-sdk/lkg` → `@openclaw/lkg` and `@openclaw/plugin-sdk/policy` → `@openclaw/policy` across the LKG + policy SDK files. ~10 min.
3. **WARN — pinch README** (the highest-traffic blocker). 30 lines: brand triplet, one rule snippet, link to test-harness, link to PITFALLS. ~30 min. (NH BLOCK).
4. **WARN — lkg README + barrel comment calling out instance-store divergence.** 30 lines + a paragraph in `plugin-sdk/lkg/index.ts`. ~45 min. (NH BLOCK + SA WARN).
5. **WARN — oc-doctor + policy + lkg README parity.** Three more 30-line READMEs at the same shape. ~90 min total. (NH BLOCK).
6. **BLOCK — policy `./test-harness`.** Wire `runExtractor` + `assertExtracts` + `assertGeneratorRoundTrip`; re-export under `./test-harness`. Half-day. (SA BLOCK against the "policy is the canonical plugin pattern" frame.)
7. **WARN — `FixerTier` default normalization.** Audit `oc-doctor/adapter.ts` to confirm `tier ?? 'mutating'` happens exactly once at the adapter boundary. ~30 min.
8. **NIT — typed-getter overloads** for pinch + policy registries. ~20 min each.
9. **NIT — `checkSdkCompat` re-export from policy.** 5-line copy or extract to oc-paths-substrate. ~15 min.

The first five items clear every NH on-ramp blocker. SA's deeper concerns (items 6-9) are all under a half-day total.
