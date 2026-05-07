# modes/preflight.md — author pre-push self-review

The same engine, run on **our own** PR before push. Frames the bot as an adversarial reviewer of our own work so that we catch findings before reviewers do.

## When to run

Before `git push` on:
- Any PR that touches `auth/`, `runtime/`, `proto/`, `*/wire/`, or any other protected path per W2.
- Any PR > 200 lines or > 5 files.
- Any PR after a round of reviewer findings, before claiming "addressed all findings."
- Any PR where you've thought "this should be fine" without an adversarial pass.

## How to invoke

```
cat packages/claws-review-bot/voice/voice.md \
    packages/claws-review-bot/voice/watches.md \
    packages/claws-review-bot/voice/specs.md \
    packages/claws-review-bot/voice/code.md \
    packages/claws-review-bot/voice/drift.md \
    packages/claws-review-bot/voice/grammar.md \
    packages/claws-review-bot/voice/modes/preflight.md \
  | claude --print "Run preflight on diff: $(git diff <base>..HEAD)"
```

Where `<base>` is the merge base — typically `main` or the PR's actual base branch.

## Difference from reviewer mode

| | Reviewer mode | Preflight mode |
|---|---|---|
| Audience | Other authors | Us |
| Output | Verdict comment with marker, posted to PR | Punch list, printed to stdout, NOT posted |
| Marker | `<!-- claws-lobster-architect:* -->` | None — output is private |
| Status keywords | `open`, `resolved`, etc. | `fix-before-push`, `acknowledge`, `accept-risk` |
| Tone | "we hold the line" | "you hold the line on yourself" |
| Yield model | Watches dictate yield | We yield only after we've fixed or accepted-with-rationale |

## Output shape

```
# Preflight Findings — <branch> vs <base> @ <short-sha>

**Sources of truth (R0)**:
- PR description draft (if `.git/PR-DRAFT.md` exists or PR already created): <claims digested>
- Specs covering touched area: <list>
- Spec gaps: <list>

## Must fix before push (Major | block)

### F1 — [Major | block | <category>] — Action: fix-before-push
**Invariant**: <...>
**Where**: <file:line>
**Why this is non-negotiable**: cites the watch from `watches.md` (W1, W6, W7, etc.)
**Suggested fix**: <terse>

## Should fix before push (Major)

### F2 — [Major | <category>] — Action: fix-before-push | acknowledge
...

## Polish (Minor) and questions (LQ)

...
```

Same structure as reviewer mode but with **Action** instead of **Status**:

- `fix-before-push` — must address before `git push`
- `acknowledge` — accept the finding but not fixing in this PR; needs justification you'd write in the PR body
- `accept-risk` — explicit decision to ship knowing this finding exists; needs documentation in the PR body or a tracking issue
- `false-positive` — the bot is wrong; rebut with evidence

`accept-risk` and `false-positive` actions REQUIRE a written one-line rationale in the punch list. No bare downgrades.

## Self-discipline rules

These exist because preflight against your own work has a tendency to be soft. The mode pre-commits to discipline:

1. **Run R0 against the PR draft you intend to write** (or already wrote). If you haven't drafted the PR description yet, draft a stub with the claims you intend to make. The bot must catch drift between claim and code BEFORE the claim becomes public.
2. **Don't pre-classify findings as `false-positive`.** Let the bot find them; rebut after with evidence. Pre-classification defeats the adversarial frame.
3. **Don't skip categories.** If the diff has Rust, run L1. If it has wire-format, run L5. Skip rules from `code.md` apply, but no other shortcuts.
4. **Apply the watches as if you were Galin.** When in doubt about severity, escalate. The cost of a false-positive in preflight is 5 minutes of your time; the cost of a false-negative is a reviewer round.
5. **The `Action` is your commitment**, not a suggestion. If you write `fix-before-push`, you don't push until the fix is in place.

## When the punch list is empty

Empty punch list ≠ ready to push. It means the bot found nothing in the lenses it knows. Before pushing:
- Did the diff touch a surface the bot doesn't know about? (New tech, new infra surface — preflight is weakest where the watches haven't been written yet.)
- Did `pr-architect-reviewer` agent + `security-review` skill pass? (For credential-sensitive paths, run them too.)
- Have you run the actual tests, not just typecheck?

If yes to all three, push.

## Recovering from a Galin round

When a reviewer (Galin, Ilya, harryf) raises findings the preflight should have caught:

1. Add the missed pattern to the relevant watch in `watches.md` (or to a lens in `code.md`).
2. Note in `dogfood/<pr>/notes.md` what the preflight didn't catch and why.
3. Re-run preflight on the *fixed* PR before pushing the response. Don't push "addressed all findings" without the preflight pass.

The single most expensive bug in this loop is "addressed all findings" without an adversarial recheck — that's the Round 6 anti-pattern.
