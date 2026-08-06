# cp-1 Review · architect · R1

**Date**: 2026-04-28
**Verdict**: APPROVE-WITH-WARNINGS

## HC-BLOCK findings (architectural blockers — must fix before cp-2 opens)

_None._ The seams hold; the issues that exist are corner-cuts and forward-compat
hazards, not structural defects.

## HC-WARN findings (should address)

| #   | Title                                                                       | Where                                   | Action                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --- | --------------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W1  | `pluginIdSources(doc)` leaks the AST through the schema seam                | `src/lint/types.ts:98-102` (LintSchema) | The five other accessors take `path` (pure data); `pluginIdSources` takes a `JsoncDocument`. A Zod or JSON-Schema adapter has to walk an AST it didn't author. Move the walking into the rule (which already has `walk`); change the accessor to return _path-shapes_ (`["channels", "*"]`, `["plugins", "entries", "*"]`) or a predicate `isPluginIdPath(path)`, and let the rule collect ids by matching.                                                                                                                                             |
| W2  | `OC_CFG_TYPE_MISMATCH` permissive null short-circuits required-field policy | `src/lint/rules/type-mismatch.ts:51`    | `actual === 'null' ⇒ matches` is correct for _optional_ fields but wrong for required ones. Today the rule has no required/optional signal. Either pass `requiredChildKeys` through (reject null at required leaves) or document the carve-out in §12.2 explicitly so future-PR fixers don't auto-coerce.                                                                                                                                                                                                                                               |
| W3  | Engine post-processes `message` text — irreversible                         | `src/lint/index.ts:30`                  | Weaving `(${ocUri})` into `message` couples the URI surface to the human string. LSP / SARIF renderers want clean message + structured `ocUri`; CI logs want the woven form. Better: keep `message` clean; emit a `formatPlain(finding)` helper that does the weave at render time. Otherwise downstream renderers have to _strip_ the URI from message before re-rendering — an inversion.                                                                                                                                                             |
| W4  | §13 fixer roadmap under-specifies cross-fixer interaction                   | `UG-upstream.amend.md §13.1`            | Contract is "fix-then-re-lint produces zero target-code findings on same input." Says nothing about (a) fixer A introducing a finding for fixer B's code, (b) ordering when both apply, (c) shared scaffolding (e.g., AST-mutation helper used by 5+ fixers). Recommend: §13.1 add (i) a "no new findings of _any_ code" invariant, (ii) explicit reference to a forthcoming `lint/fixers/shared/` module before the second fixer-PR opens, (iii) note that cross-fixer composition is tested at a top-level `--fix-all` integration tier (not per-PR). |

## HC-NOTE findings (capture for follow-up)

| #   | Title                                                                                                                                                                                   | Where                                           |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| N1  | `LintFinding.path` is mutable-capable (`readonly (string\|number)[]`); engine spreads `[...path]` defensively in rules but contract doesn't ban callers from holding aliases            | `src/lint/types.ts:61`                          |
| N2  | `oc-config-uri.ts` uses `decodeURIComponent` which throws `URIError` on malformed input — not wrapped into `OcConfigUriError`; PR-2 should normalize                                    | `src/path/oc-config-uri.ts:76`                  |
| N3  | `AuditEntry` lacks `correlation.parentEventId` — re-inquiry chains across approval cycles will reconstruct via `approvalHandleId`, which works today but will not for tool-call lineage | `adapter-audits.md §3.2`                        |
| N4  | PR-1 four-way table conflates `/lint` justification (way 2) and `/path` justification (way 3) at the URI surface — lint generates URIs, so way 2 already proves way 3 partially         | `pr-drafts/PR-1.md §"earns its keep four ways"` |
| N5  | Genesis-case `chain.previousHash` not specified — convention should be `"sha256:0000…0000"` (zero-hash) so verifier has a single code path                                              | `adapter-audits.md §3.2`                        |

## Strengths

- **Schema seam is mostly right.** `LintSchema` is six small accessors over `path`-shaped values, not a "give me your Zod object." A Zod adapter is ~30 lines; a JSON-Schema adapter is ~50. The `needsSchema: boolean` rule flag plus `schema && rule.needsSchema ⇒ skip` engine logic is clean. (One leak — see W1.)
- **`LintFinding` vs `LintFindingDraft` split is the right call.** Rules don't import the URI helper; the engine stamps `ocUri` from `path`. Adding a new rule never needs to know URIs exist. This is the textbook DI seam done right.
- **Dependency direction is enforced.** `lint/*` imports `ast/jsonc/*`; ast imports nothing from lint (verified). The walker lives at `lint/rules/walk.ts`, not in `ast/`, which is correct: walking-with-path is a lint concern, not an AST concern.
- **`oc-config-uri.ts` proto/PR-2 separation is clean.** The encode/decode contract (numeric-segment recognition, `encodeURIComponent` for strings, structured `OcConfigUriError`) is stable enough that PR-2 is a re-home + canonicalization-doc, not a rewrite. Round-trip is proven.
- **§12 catalog is genuinely stable.** Fixed severity per code, append-only code list, codes traced to issue numbers. The `null`-permissive type-match rule is the one carve-out, called out in §12.2.

## Verdict reasoning

The lint engine is fresh code and reads like fresh code that knows it has six PRs of contribution behind it. The schema seam is the right shape: rules consume an interface defined locally, callers project Zod/JSON-Schema/hand-rolled into it. The only real leak (W1, `pluginIdSources(doc)`) is fixable in a small follow-up — the rule already has `walk`; move the walking out of the schema and the seam is fully data-shaped.

Forward-compat looks healthy. `oc-config-uri.ts` as a proto for PR-2 is honest about its role (the module docstring says so) and the encode/decode contract is deliberately conservative — PR-2 inherits a working surface, not a dead-end. `AuditEntry`'s `schemaVersion: 1` + discriminated `eventType` is the right substrate; new event types extend the union without breaking parsers (modulo N3/N5).

The §13 fixer roadmap is the weakest piece (W4). "13 separate PRs" scales to PR-3 or PR-4 fine, but at PR-6+ two fixers will want a shared AST-mutation helper, and the contract doesn't say where it lives or who reviews it. Tighten §13.1 to call out shared scaffolding and the cross-fixer no-regression invariant before the second fixer-PR opens; that closes the corner the spec is currently painting itself into. With W1–W4 addressed in cp-2, this is a 6-PR-durable substrate.
