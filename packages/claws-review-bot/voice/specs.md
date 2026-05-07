# specs.md — grounding the review in spec

The bot reviews against four sources of truth, not one. The **spec** is the third source — the documented intent that the code and PR are claimed to implement. Without grounding in spec, every finding is just opinion.

## R0 — Locate sources of truth (before any other round)

R0 is mandatory. Skipping it produces ungrounded findings that the author can rebut with "where does it say that?" — and they're right.

**R0 outputs (must be assembled before R1 begins):**

1. **PR claim digest** — read the PR body. Extract every behavioral claim, contract claim, security claim, rollback claim, test claim. List them as `C1..Cn`.
2. **Spec set** — locate every spec covering the touched area (heuristics below). For each, note: path, role (contract / design / convention), and whether the PR claims to implement or change it.
3. **Drift hypothesis** — note any apparent mismatch between PR claim, spec, and code at first read. These become `drift:*` findings to evaluate in R2.
4. **Spec gaps** — note areas changed by this PR with no findable spec. These get LQ-tier "no spec found" findings unless the change is load-bearing enough to escalate.

## What counts as a spec

In rough order of authority on lobster:

| Spec type | Path conventions | Authority |
|---|---|---|
| **Contract specs** | `docs/API-REFERENCE.md`, `*/wire/**.md`, `.proto` files, `*-contract.{py,rs,ts}`, inline `# Wire-format evolution policy` blocks, `lobster.yaml` schema | **Highest** — drift here is W10 non-negotiable |
| **Component CLAUDE.md** | `aether_runtime/CLAUDE.md`, `lobster_runtime/CLAUDE.md`, package-level `CLAUDE.md` | High — load-bearing for cross-component coordination |
| **Design docs** | `docs/design/*.md`, `aether_runtime/docs/design/*`, anything cited by full path in the PR body | Medium — drift is W11 Strong-tier |
| **Plans** | `.craft/plans/*.md` (when present) | Medium — describes intent, not contract |
| **READMEs** | Any `README.md` in or above the changed file's directory | Low — usually orientation, not contract |
| **Inline doc comments** | Module-level docstrings, `///` or `/** */` blocks above public APIs | Low to medium — depends on whether they describe contract |

## Locator heuristics

Run these in order. Stop when you have enough grounding for the touched area.

1. **Walk up from each changed file**: does any ancestor directory have a `CLAUDE.md`? The closest one is the most authoritative. Read it. **If no `CLAUDE.md` exists in any ancestor up to the repo root** (common in lobster — many packages don't have one), fall back to: nearest `README.md`, then root-level `README.md` and `CONTRIBUTING.md`, then any `docs/architecture.md` / `docs/overview.md`. Note in R0 explicitly that no CLAUDE.md was found — this affects which W11 watches apply (a missing CLAUDE.md in a contract-class area is itself a spec gap worth raising as LQ).
2. **PR body links**: any link or relative path to a `docs/`, `design/`, `.craft/`, `*.md` file. Read every one.
3. **Grep by symbol**: take the most prominent function / class / type added or modified, grep `docs/`, `design/`, `.craft/plans/` for the symbol. Read what matches.
4. **API-REFERENCE / endpoint-side**: if the change adds or modifies an HTTP endpoint, gRPC method, SSE event, or Pydantic model used in a response, `docs/API-REFERENCE.md` is in scope.
5. **Adjacent README**: `README.md` in the directory of the changed file — even if not a spec, it's context.
6. **Inline contract comments**: search the changed file for `Wire-format`, `Contract`, `Invariant`, `INVARIANT`, `MUST` — these are spec-in-code.

## When no spec exists

This is not silent. Note it as an LQ-tier finding under category `spec`:

> **LQ-spec1**: No spec located for `<area>` (touched by `<file>`). Heuristics 1-6 found nothing. Future PRs in this area lack grounding for review. Consider adding a spec block to the nearest `CLAUDE.md` or a short `docs/design/<area>.md`.

If the change is load-bearing — new public API, new wire-format, new authentication path, new persistence layer — escalate to **Strong tier** (`W11` non-contract spec drift): the absence of a spec for a contract-class surface is itself a contract gap.

## When the spec is itself the change

Some PRs change `CLAUDE.md`, `API-REFERENCE.md`, `docs/design/*`, or `.craft/plans/`. Treat these as **spec-changing PRs**:

- The drift check inverts: code stays put, spec changes — does the spec post-merge match the code that already exists?
- W10 still applies: if the new spec describes a contract, code must already comply with it (or this PR must include the code change too).
- Spec-spec drift (W11): does the new spec contradict any other spec that survives this PR? Find them and flag.

## Output of R0 in the verdict comment

The R0 digest appears at the top of every verdict comment, under a `## Sources of truth` header. It documents what the bot read so the author can verify the grounding and challenge the bot's reading of the spec — same as how findings cite file:line, sources of truth cite path:section.

Example shape:

```
## Sources of truth (R0)

**PR claim digest**: 5 claims (C1 streaming with 2 MiB cap, C2 401-invalidate-and-retry, ...).
**Specs read**: `docs/API-REFERENCE.md` §"Lobster Workspace Browse"; `aether_runtime/CLAUDE.md` §"Graph SSRF allowlist"; inline contract block in `lobster_workspace.py:42-48`.
**Spec gaps**: none — fully grounded.
**Drift hypotheses to evaluate in R2**: C1 vs code (cap appears post-buffer in `lobster_workspace.py:312`).
```
