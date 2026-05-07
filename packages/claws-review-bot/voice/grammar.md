# grammar.md — comment-body grammar (re-parse contract)

Verdict comments are the ledger. Each tick re-reads the most recent `claws-lobster-architect` comment to reconstruct finding state. This file pins the grammar so re-parsing is reliable.

If a prior comment fails to parse against this grammar, log the failure and treat the PR as fresh — never half-parse a corrupted ledger.

## Marker (first line of comment)

Every verdict comment opens with an HTML comment marker on its own line. The marker carries the comment kind and (for re-evals) the head SHA reviewed:

```
<!-- claws-lobster-architect:hold -->
<!-- claws-lobster-architect:initial -->
<!-- claws-lobster-architect:reeval:<short-sha> -->
<!-- claws-lobster-architect:approve -->
```

`<short-sha>` is the first 9 characters of the head SHA reviewed. The marker is the parser's anchor — it is REQUIRED, must be the first non-whitespace content of the comment, and must not appear inside other comments.

## Header line

After the marker (and a blank line), the comment opens with an H2 header:

```
## Architect Review — PR #<N> @ `<short-sha>`
```

The SHA in the header MUST match the SHA in the marker. Mismatch = parse failure.

## Sources of truth (R0 digest, mandatory section)

```
## Sources of truth (R0)

**PR claim digest**: <N> claims (C1 <one-line summary>, C2 <one-line summary>, ...).
**Specs read**: `<path>` §"<section>"; `<path>` §"<section>"; ...
**Spec gaps**: <none | list of areas with no findable spec>.
**Drift hypotheses**: <list of pairwise mismatches to evaluate, or "none">.
```

Every claim has an ID `C1..Cn`. Every drift hypothesis ties to a claim or to two spec/code paths.

## Findings section

```
## Findings

### F1 — [<severity> | <category>[ | pre-existing]] — Status: <keyword>
**Recommendation**: <block | fix-before-merge | fix-or-acknowledge | follow-up>.
**Invariant**: <named invariant, with spec citation when grounded>.
**Where**: <file:line, primary>; <file:line, secondary>; ...
**Counter-search**: <what was searched, what was found, why finding survives>.
**Suggested fix**: <terse>.
```

### Finding-id formats

- `F<N>` — finding raised on the initial review (N starts at 1)
- `F-new<N>` — finding introduced by a delta push (regression detection); N restarts at 1 per push
- `LQ<N>` — leading question, never blocks; lives in its own LQ section after the F-stream

### Severity values (exactly one)

- `Major | block` — non-negotiable per `watches.md`; merge blocked
- `Major` — strong-tier; should fix before merge
- `Minor` — soft-tier; polish
- `LQ` — only used for LQ<N> findings, never for F<N>

### Category values (exactly one)

- `code` — bug in the code itself
- `spec` — the spec is wrong/stale/incoherent
- `drift:pr-code` — PR body misrepresents the diff
- `drift:spec-code` — code violates a spec
- `drift:code-code` — production code disagrees with itself
- `drift:spec-spec` — two specs disagree
- `drift:code-tests` — tests don't exercise the contract the code claims

### Optional modifiers (any number, separated by ` | `)

- `pre-existing` — the issue predates this PR but is surfaced by it; see `watches.md` "pre-existing drift" branch

### Status keywords (exactly one, on the header line)

- `open` — finding stands; needs author action
- `resolved` — author addressed in the latest push (cite the resolving commit/file:line in **Recommendation** field)
- `wontfix-asserted` — author has rebutted the finding; the bot has *conceded* (not just acknowledged); the finding closes
- `superseded` — replaced by a newer finding (cite the superseder by ID)
- `dropped-counter-search` — finding existed in R3 but did not survive R4
- `dropped-challenge` — finding existed in R4 but did not survive R5

`open` and `resolved` are the only statuses that survive across ticks. The dropped-* statuses appear only in the "process notes" appendix (if posted), not in the live ledger.

## Leading questions section

```
## Leading questions (non-blocking)

### LQ1 — [LQ | <category>] — Status: open
<question text>; cited at `<file:line>` if applicable.
```

LQs never carry a status other than `open`. Once the author answers, the LQ moves out of the ledger entirely on the next re-eval (it isn't carried as `resolved` — questions are conversation, not findings).

## Footer

```
---

> **Constraint 10**: if this PR merges with a Major finding ≥75% confidence, an issue will be auto-filed against `bic/lobster` with the finding skeleton and acceptance criteria.
```

The footer is constant across initial / reeval / approve. Only present in `:initial` and `:reeval:*` comments. Approve comments omit it.

## Reeval-specific section

For `:reeval:<sha>` comments, an additional summary appears immediately after the marker / header / R0 digest:

```
## Delta summary (vs `<prior-sha>`)

- **Resolved**: <K> findings (F<N>, F<N>, ...).
- **Still open**: <M> findings (F<N>, F<N>, ...).
- **New** (regression detection): <P> findings (F-new1, F-new2, ...).
- **Wontfix-asserted (conceded)**: <Q> findings (F<N>, ...).
```

Empty bullets are written as `<none>`, not omitted. This makes the parse deterministic.

## Approve-specific shape

`:approve` comments have a smaller structure:

```
<!-- claws-lobster-architect:approve -->

## Architect Review — PR #<N> @ `<short-sha>` — APPROVE

**Total review history**: <K> findings raised across <T> ticks; all resolved or conceded.
**Resolved findings**: F1 (...), F3 (...), ...
**Wontfix-asserted findings**: F2 (...), ...
**Final R0 digest**: same shape as initial.
```

No findings section, no LQ section. Approve is a closing receipt.

## What does NOT go in the comment

- Internal process notes (R1/R2/R3/R4/R5 progression details, agent IDs, tool call counts) — these go in `dogfood/` `notes.md` files, not in the live PR comment.
- Findings that were dropped at counter-search or challenge — these are in notes, not in the live ledger.
- Author commentary or apology language — the bot does not editorialize. Pure findings, pure structure.
