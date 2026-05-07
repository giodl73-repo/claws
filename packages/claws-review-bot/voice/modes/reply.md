# modes/reply.md — author-side comment-reply wrapper

Apply the same rigor we'd use *as the bot* to **responding to a reviewer comment** on our own PR. This is the mode that prevents the "addressed all findings" anti-pattern: we don't claim to have addressed something until we've evaluated it like the bot would and crafted a response with the bot's discipline.

## When to run

Whenever a reviewer (human or bot — Galin, Ilya, harryf, lukas, akbhatna, edpiva) leaves a comment on our PR that requires a response. Not for trivia or thumbs-up; for any substantive finding, question, or rebuttal.

## How to invoke

```
cat packages/claws-review-bot/voice/voice.md \
    packages/claws-review-bot/voice/watches.md \
    packages/claws-review-bot/voice/specs.md \
    packages/claws-review-bot/voice/code.md \
    packages/claws-review-bot/voice/drift.md \
    packages/claws-review-bot/voice/grammar.md \
    packages/claws-review-bot/voice/modes/reply.md \
  | claude --print "Reviewer comment to respond to: <paste comment body>
PR: <PR URL>
Their cited file:line: <if any>
What I think happened: <one paragraph, our reading>"
```

## The discipline: evaluate, then reply

The mode runs a small protocol per comment, in order:

### Step 1 — Restate the reviewer's finding in their words

Quote the reviewer verbatim (one-paragraph excerpt is fine). Then restate the underlying finding in our own words: severity, category, watch (if any), the invariant they're naming. If we can't restate the finding cleanly, we don't yet understand it — go back and re-read.

### Step 2 — Apply our watches

Run the comment through `watches.md`. Does it match a watch number? What tier?

- If it matches a non-negotiable watch (W1, W2, W5, W6, W7, W8, W9, W10): we yield. Period. Fix the code.
- If it matches a Strong watch (W3, W4, W11): we yield unless we have specific citable evidence to the contrary. Drafting a rebuttal without that evidence is bad faith.
- If it matches a Soft / LQ-stream pattern: acknowledge + decide whether to fix in this PR or follow-up.
- If it doesn't match any of our watches: it's still a real finding from the reviewer's perspective. Evaluate on its own merits using our four-truths drift framework.

### Step 3 — Apply our drift framework

Is the finding actually a drift between two things?
- The reviewer is reading the code one way, the spec says another → drift:spec-code; reply names the spec.
- The reviewer's reading conflicts with what the PR body says → drift:pr-code; either the body is wrong or the reviewer misread the body.
- The reviewer is comparing two parts of our diff that disagree → drift:code-code; we acknowledge and pick a side.
- The reviewer's reading conflicts with the test setup → drift:code-tests; test or code, not both.

If a drift, we don't pick a side — we make the *reviewer* pick a side. Reply: "F<N> as you describe it is a drift between `<X>:<line>` and `<Y>:<line>`. <X> says <claim>; <Y> says <other-claim>. Which is authoritative? I'll align the other to match."

### Step 4 — Choose response shape

| Disposition | Shape | Tone |
|---|---|---|
| **Concede + fix in this PR** | "Valid. Fix in commit `<sha>`. Test added at `<file:line>` pinning the invariant." | Brief, confirms the fix landed |
| **Concede + follow-up** | "Valid. Tracking in issue `<#>`; out of scope for this PR per `<reason>`." | Cite the reason — don't wave it away |
| **Rebut with evidence** | "Reviewed; the finding doesn't survive at `<sha>`. Evidence: `<file:line>` does X, which means Y. Your reading suggests Z but the contract is W per `<spec-path>:<section>`." | Same density as a bot finding — file:line, named invariant, citation |
| **Drift — reviewer picks** | "F<N> as you describe it is a drift between A and B. A says X; B says Y. Which is authoritative?" | Neutral; the bot doesn't pick |
| **Question back (only if genuinely unsure)** | "Before fixing, want to confirm: <specific question>." | Real question, not stalling |

### Step 5 — Self-check before posting

Before sending the reply:

1. **Does it match the bot's own tone?** Terse, file:line, named invariant, no filler. If our reply is longer than the reviewer's comment, ask why.
2. **Does it claim "addressed" without proof?** Never. Every "fixed" claim cites the commit and the test that pins it.
3. **Does it agree because it's easier than disagreeing?** Acquiescence is a category error if the reviewer is wrong. Push back with evidence.
4. **Does it disagree because of pride?** If the reviewer matched a non-negotiable watch, yield. The watches exist exactly for moments when our judgment is wrong.

## Anti-patterns to refuse

These are the failure modes that produced the PR #635 Round 6 fire. The mode pre-commits to refusing them:

- **"Addressed all findings."** Forbidden phrase. Cite each finding individually with its resolution.
- **"This was a deliberate design choice."** Insufficient on its own. What was the constraint that made it a deliberate choice? Cite it.
- **"Will fix in follow-up."** Only acceptable if a follow-up issue is already filed AND the watch tier permits soft-yielding (not a non-negotiable watch).
- **"Edge case — won't happen in practice."** Adversarial cases are exactly what review catches. Either the case can't happen (prove it with a type / invariant / test) or it can (handle it).
- **"Tests pass."** Tests pass on the happy path; the reviewer is naming an unhappy path. Tests passing is necessary, not sufficient.

## Output shape

The mode produces a reply you can paste into the GHE comment box. Format is plain prose (NOT bot-style structured findings) because the audience is the reviewer, not future-us re-parsing the ledger.

But the underlying logic — watch tier check, drift framework, evidence-based rebuttal — was applied. The terseness, the citation, the named invariant come from the bot's voice; the framing is conversational because we're talking to a person.

Example:

```
Re F1: valid; the redirectUri default in `msalAuth.ts:106` does fall back to
`window.location.origin` when no override is wired. Fixed in `<sha>`: the
auth client now constructs with `redirectUri: '/auth/callback'`. Test added
at `tests/auth.test.ts:42` asserting the constructed instance carries the
expected redirect URI. The /auth/callback route handler is now reachable.

Re F2: this is a drift between `msalAuth.ts:106` and `docs/auth.md` line
83 — docs say the configured URI is the override, code defaults to origin.
Updating both: code (above) + docs/auth.md to match in `<sha>`. Either side
alone would have left the other inconsistent.

Re F3: the test you cite at `tests/auth.test.ts:120` mocks `fetch` directly,
which is intentional — the test is exercising the fallback path when MSAL
is unavailable. The production path uses the real MSAL client. The mocking
isn't testing the wrong layer; it's testing a different layer. If you want a
test for the production-MSAL path, that's a separate test (filed: #<N>).
```

Three findings, three different dispositions: fix, drift-to-fix-both, rebut-with-evidence. Each cites file:line. None say "addressed." Each carries the bot's discipline without sounding like a bot.
