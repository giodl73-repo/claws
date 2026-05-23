# PR #295 Review · skill-connector-author · 10

**Date**: 2026-04-30
**Persona**: The Skill / Connector Author (OC-P10)
**Verdict**: APPROVE-WITH-WARNINGS

I'm the developer who'd actually `import { LKGTracker } from '@openclaw/plugin-sdk/lkg'`,
register it for my plugin's state file, consume `ctx.lkgFingerprint` from
`before_tool_call`, and have to handle the array-shaped `requireApproval` return
when my plugin renders an approval prompt. This review is from that seat.

The contract is the right shape and the abstraction is one I'd actually use. The
ergonomics are mostly good — but the documentation gap is real, the
`LKGTracker<T>` type signature leaves money on the table, the codemod from
single-`requireApproval` to array shape is uglier in plugin code than the
proposal lets on, and the `LKGFingerprint` type leaks POSIX into my contract in
a way that will haunt non-FS backends.

## HC-BLOCK findings (must fix before merge — these break me as a consumer)

_None._ Nothing here makes the SDK unusable. The issues that exist are
ergonomics-tax and missing-docs, not "I cannot ship a plugin against this."

## HC-WARN findings (should address before this lands as stable SDK)

| # | Title | Where | Action |
|---|---|---|---|
| W1 | `LKGTracker<T>` is single-generic; loses the validation-issue type | `upstream-pr2-lkg.md` §Contract, `LKGTracker<T = unknown>` | The tracker carries `parse → T` and `validate(T) → ValidationResult`, where `ValidationResult.issues` is hardcoded `readonly ValidationIssue[]`. As a plugin author with structured issue types (e.g. my plugin already has `MyShapeIssue` with discriminated `kind`), I lose all that type info at the boundary — issues come back as the generic `ValidationIssue` shape. **Recommend `LKGTracker<TParsed, TIssue extends ValidationIssue = ValidationIssue>`** so I can flow my own issue type through. Default keeps the simple case unchanged; advanced consumers get type-safe fan-out. ~5 LoC delta in the contract; pays for itself the first time I want to switch on `issue.kind` in `suspiciousReasons`. |
| W2 | `LKGFingerprint` has 11 fields and 7 of them are POSIX-leaky | `upstream-pr2-lkg.md` §Contract, `LKGFingerprint` interface | `dev`, `ino`, `mode`, `nlink`, `uid`, `gid` are POSIX `stat(2)` fields. They're typed `number \| null` (nullable so non-FS backends can pass null). For my use case — registering a tracker over my plugin's state file — I care about `hash`, `bytes`, `mtimeMs`, `observedAt`. The other 7 are noise that bleed `node:fs` semantics into the SDK contract. **Recommend split: `LKGFingerprint` = `{ hash, bytes, observedAt }` (the universal substrate) + optional `LKGFingerprint.fsStat?: { mtimeMs, ctimeMs, dev, ino, mode, nlink, uid, gid }` (the POSIX appendix that FS-backend impls can populate but git/S3/IPFS impls leave undefined).** Otherwise the git-backed and S3-backed `LKGStore` impls that the proposal explicitly contemplates ([[downstream-lkg-git-backend]]) all return the same boilerplate `null`-bag for 7 fields, which is a smell — the type is documenting "which fields the FS impl happens to expose," not "what an LKG fingerprint is." |
| W3 | `ApprovalDescriptor \| ApprovalDescriptor[]` widening codemod is rosier than the diff actually is | `upstream-pr3-policyir.md` (merger fix), `pr-strategy.md` PR-3 | The proposal calls this a 5–10 LoC merger-side change, and frames the consumer side as "field widens." But every plugin author who today writes `if (result.requireApproval) { renderApprovalPrompt(result.requireApproval); }` now has to either branch on `Array.isArray(...)` everywhere they consume the return, or run a normalize-helper before consuming. Multiply by every approval-aware plugin in the wild. **Recommend either (a) ship a thin `normalizeApprovals(d): ApprovalDescriptor[]` helper from `@openclaw/plugin-sdk` that plugins import once and forget, or (b) define a `ApprovalDescriptors` opaque type with a `.toArray()` / `.first()` accessor pair so the array-vs-single shape is a private detail.** Asking 70+ plugin authors to write `Array.isArray` discrimination in their hot paths is an SDK-ergonomics failure mode I've seen before. |
| W4 | Pre-RFCs have zero plugin-author code examples | All three pre-RFCs | I read upstream-pr2-lkg.md cover-to-cover and there is not one example of "here is what a tracker registration looks like in a plugin." The contract section is types; the reference plugin section says "~150 LoC" but doesn't show the entry point I'd copy from. Same with pr3-policyir.md — `ctx.lkgFingerprint` is described as "the killer step" but no `before_tool_call` snippet shows a plugin author reading and using it (e.g., as a cache key). **Recommend each pre-RFC ship a 20-line "minimum viable plugin" example** at the top of the §Contract section. As a skill author, I copy from examples; I don't infer from type signatures. (See N1 below for what a good example looks like.) |

## HC-NOTE findings (capture for follow-up)

| # | Title | Where |
|---|---|---|
| N1 | The "compose validators yourself in `validate()`" pattern needs a documented recipe — not just "you can do it" | `upstream-pr2-lkg.md` §Contract — single-validator-per-tracker is the design but compose-in-`validate` is the answer to "what about validate + lint + sanity-check stacked?" |
| N2 | `policyId = sha256(jcs(body))` IS a stable cache key for my plugin (good) — but the canonicalization rule needs to live in a documented helper, not folded into each consumer's evaluator | `upstream-pr3-policyir.md` §Canonicalization — RFC 8785 JCS is correct; needs `canonicalizePolicyIR()` exported from `@openclaw/plugin-sdk/policy-ir` so I'm not re-implementing JCS in my plugin |
| N3 | Optional hooks (`suspiciousReasons?`, `shouldRecover?`) are discoverable enough but not composable across trackers | `upstream-pr2-lkg.md` §Contract — Open Question §3 already flags this; my note: as a plugin author I hit "tracker-A's heuristic should fire when tracker-B is in a particular state" early and often |
| N4 | `LKGObservation` discriminated union — `outcome: 'skipped'` carries `reason: 'plugin-local-invalidity' \| 'no-lkg-available' \| 'tracker-shouldRecover-false'` as a string union, but `outcome: 'failed'` carries `reason: string` (open) — inconsistent; failed-reason should be a discriminated `LKGFailureReason` enum or my error-handling has to grep on free-form strings |
| N5 | `POLICY_IR_PATH` is exported as a const but not documented as override-able. As a plugin author shipping in a multi-tenant deployment, can I register an LKG tracker over `.openclaw/policy/policy-ir.json` for tenant A AND tenant B? Or is `POLICY_IR_PATH` singleton? Pre-RFC is silent. |
| N6 | `ctx.lkgFingerprint` is `LKGFingerprint?` (optional). Plugin authors will branch on `if (ctx.lkgFingerprint)` defensively forever. Consider documenting the conditions under which it's `undefined` (boot, non-tracked path, no observation yet) so I know whether to fail-closed in my `before_tool_call` |

## Strengths

- **`LKGStore.register<T>(tracker: LKGTracker<T>)` is the right shape.** I don't
  have to subclass anything, I don't have to implement a lifecycle interface,
  I don't have to think about disk format. I declare `path` + `parse` +
  `validate` and the substrate handles promote/observe/recover/audit/notify.
  This is the textbook "plugin author registers small declarative thing,
  runtime does the heavy lifting" pattern — same shape that makes
  `registerTrustedToolPolicy` work today. I'd actually use this.

- **Optional hooks are genuinely optional.** `suspiciousReasons?` and
  `shouldRecover?` default to "no extra heuristics, always recover when
  invalid." For 80% of plugins (mine included) I never define them. For the
  20% that need them (e.g., my plugin where the state file goes through a
  user-visible "draft" phase that's intentionally invalid), I extend without
  the SDK growing a mode flag. Composable in the right direction.

- **`policyId = sha256(jcs(body))` is a stable cache key — the JCS choice is
  correct.** Plain `JSON.stringify` would give me different hashes for
  semantically-identical PolicyIRs (key ordering, whitespace). RFC 8785 JCS
  fixes that. I can confidently key my plugin's in-memory caches off
  `(sessionKey, policyId)` and not worry about cache misses from re-emit
  drift. Same for `LKGFingerprint.hash = sha256(rawBytes)` — bytes-on-disk
  identity is what content addressing needs to be. Both anchors are
  load-bearing for me.

- **`extensions/lkg/` reference plugin is a real adoption path.** The
  proposal explicitly says "the existing `io.observe-recovery.ts` is
  untouched, migrates in a follow-up." That's exactly the migration story I
  want — the contract proves itself by being the new home for existing
  behavior, not by demanding a Big Bang rewrite. As a third-party plugin
  author I get to watch upstream eat its own dogfood before I commit.

- **Backend-agnosticism via `describe.each([fs, git])` is the right
  evidence.** The proposal claims "FS today, git tomorrow, S3 / IPFS one
  day; same surface" and backs it with a dual-backend conformance test. As a
  plugin author who might ship to enterprises on cloud-mounted workspaces
  (the M365 substrate pattern in my persona's "Forces" section), I care that
  my tracker registration doesn't have to know whether the deployment is
  filesystem or git-backed. The contract delivers that.

- **Conjunctive AND for `requireApproval` is the correct semantics.** First-
  wins (today's behavior) silently drops plugin-A's approval ask if
  plugin-B happens to fire first. That's a security regression latent in
  the current SDK, and the proposal is right to fix it. As a plugin author
  whose `requireApproval` could get dropped on the floor depending on load
  order, I want this fix even if the migration cost is real (W3).

## Verdict reasoning

**APPROVE-WITH-WARNINGS.** This is a substrate I'd ship plugins against. The
shape is right: small declarative registration, generic carrier,
backend-agnostic, content-addressed. The pre-RFCs read like work that knows
plugin authors will be the ones using it — not like a runtime team's internal
abstraction tossed over the SDK wall.

What keeps it out of straight APPROVE:

1. **Documentation gap (W4).** Three pre-RFCs and zero plugin-author code
   examples. I'd push back on this hard in the upstream review thread. The
   first plugin author who tries to register a tracker is going to copy from
   the reference impl in `extensions/lkg/`, which means the reference impl
   becomes the de facto documentation. That's fine if it ships with line-by-
   line comments aimed at consumers; it's not fine if it ships as runtime-
   team-quality code with no annotation. Recommend pre-RFCs add at minimum a
   20-line "minimum viable tracker" snippet and a 10-line "consume
   `ctx.lkgFingerprint` from `before_tool_call`" snippet.

2. **`LKGFingerprint` POSIX leak (W2).** The 7 nullable POSIX fields are a
   smell that will compound. Today they're "optional and null on non-FS
   backends." Tomorrow a maintainer adds an 8th POSIX field. The day after,
   a non-FS backend ships and 90% of fingerprint comparisons in plugin code
   are doing `if (fp.dev !== null && fp.ino !== null)` defensively. Split
   the type now while there are zero consumers downstream of the SDK. Cost:
   ~10 LoC delta in the contract.

3. **`ApprovalDescriptor[]` migration (W3).** The merger-side fix is
   correct (conjunctive AND); the consumer-side codemod is more invasive
   than the proposal admits. Every plugin author who renders an approval
   prompt now has to think about array-vs-single. Ship a normalize helper
   from the SDK so we don't have N implementations of `Array.isArray`-
   normalization across the plugin ecosystem.

4. **`LKGTracker<T>` second generic (W1).** Small ergonomic win that costs
   ~5 LoC in the contract and pays back the first time a plugin author
   wants typed issues. Easy fix; do it before the contract freezes.

What earns the APPROVE half: the load-bearing claims hold. Single-validator-
per-tracker with compose-in-`validate` IS the right answer (composing
validators yourself is more flexible than a fixed pipeline; the proposal
just needs to document the recipe — N1). `policyId` IS a stable enough
identity to use as a cache key in my plugin (N2 — but ship `canonicalize`
helper). The optional hooks ARE discoverable from the type signature alone.
The substrate IS one I'd build against.

Land this with the W1–W4 amendments and it's a 6-PR-durable plugin SDK
addition. Land it without them and the first wave of plugin authors will
file 4 issues in the first month asking variations of "where are the
examples" / "why does my fingerprint comparison need 7 null-checks" / "how
do I migrate my approval rendering" / "can I get my issue type back out the
other side."

---

## Specific probes (per review brief)

**Q: Is `LKGTracker<T>` the right shape, or `LKGTracker<TParsed, TIssues>`?**
The latter. See W1. One-generic loses the issue-type info at the validation
boundary; two-generic with a default keeps simple cases simple and makes
advanced cases type-safe. Cheap fix.

**Q: Are the optional hooks (`suspiciousReasons?`, `shouldRecover?`)
discoverable / composable / testable?**
Discoverable: yes (TypeScript surfaces them on hover). Composable across
trackers: no (N3; Open Question §3 in pre-RFC already flags it). Testable:
yes — they're pure functions of `(current, lastKnownGood, parsed)`, no
side-effects, easy to unit test in isolation.

**Q: Is the `ApprovalDescriptor | ApprovalDescriptor[]` widening codemod
easy to apply, or does it ripple through plugin code in ugly ways?**
It ripples. See W3. Today's plugin pattern is `if (result.requireApproval)
{ render(result.requireApproval); }`. Tomorrow it's either
`Array.isArray(...) ? render(...[0]) : render(...)` (ugly) or
`for (const a of normalizeApprovals(...)) { render(a); }` (less ugly but
the plugin author has to know to write `normalizeApprovals`, which
upstream isn't shipping). Ship the helper.

**Q: Is `policyId = sha256(jcs(body))` a stable enough identity that I can
use it as a cache key in my plugin?**
Yes. JCS is the right canonicalization (it's literally an RFC). The
caveat: don't make me re-implement JCS — export
`canonicalizePolicyIR(ir): string` from `@openclaw/plugin-sdk/policy-ir`
so I get the same canonicalization the runtime uses. See N2.

**Q: Single-validator-per-tracker — what about validate + lint + sanity
stacked?**
Compose them yourself in `validate()`, as the proposal says. That's the
right answer — I don't want a fixed pipeline forced on me — but document
the recipe. A pre-RFC §"Composing validators" subsection with a
10-line example would land it.

**Q: `LKGFingerprint` 11 fields — clean or POSIX-leaky?**
Leaky. See W2. 4 universal fields + 7 POSIX-stat fields. Split.

**Q: Are there examples in the pre-RFCs?**
No. See W4. This is the single biggest improvement the proposal could make
before it lands.

---

## Cross-references

- [[Tech/OpenClaw/guides/personas/10-the-skill-connector-author]] — my
  persona file
- [[Tech/OpenClaw/specs/proposals/upstream/workspace-modernization]] —
  package entry
- [[upstream-pr1-workspace]], [[upstream-pr2-lkg]],
  [[upstream-pr3-policyir]] — the three pre-RFCs reviewed
- `C:\src\claws\.craft\waves\260427+hapi-the-bringer+openclaw-upstream\panels\cp-1\R1-architect.md` —
  format reference

---

🤖 Review by skill-connector-author persona; format mirrors R1-architect.md.
