# upstream-proposal-pr295 Review · hobbyist · R1

**Date**: 2026-04-30
**Reviewer**: the hobbyist (OC-P05) — local-laptop user, runs openclaw
near `main`, installs plugins from clawhub, hacks `SOUL.md` /
`TOOLS.md` directly, no gateway, no admin, no compliance auditor
**Verdict**: APPROVE-WITH-WARNINGS

## TL;DR for me, the hobbyist

I read the package three times trying to figure out which bits land
on my laptop. As far as I can tell:

- **PR-1** (workspace package + byte-stable config) — **good for
  me**. Means my `// comments` and trailing commas in
  `openclaw.json` actually survive when the runtime touches the
  file. Right now if openclaw rewrites the config (during an
  `update`, a migration, whatever), my comments get blown away
  and I have to put them back. This fixes that.
- **PR-2** (LKG carrier) — **invisible to me**. I don't write
  plugins. I don't register trackers. The runtime already
  auto-recovers my config when an agent corrupts it (#70528,
  shipped in v2026.4.23 — I already benefit). This PR is
  refactoring something that already works for me into a contract
  other plugins can register against. Fine. Skip.
- **PR-3** (PolicyIR types + ctx.lkgFingerprint + **hook merger
  conjunctive AND fix**) — **mostly invisible, but the merger fix
  is a behavior change for anyone running plugins**. That's the
  one I want to push on.

Net: the package helps me a little (PR-1), doesn't touch me at all
for two-thirds of it (PR-2, most of PR-3), and has one piece in
PR-3 that could surprise people running plugin combos that worked
yesterday. So: approve, but flag the one footgun loudly in release
notes so I'm not blindsided when `openclaw update` lands the merger
fix.

## What I tried to figure out

### "Does my openclaw.json survive after this?"

Yes — better than today. PR-1's "frontmatter raw-preserve /
byte-stable workspace files" thing is exactly the bug I hit twice
last month: I added `// note: this gateway is the home-lab one` to
my `openclaw.json`, ran `openclaw update`, and the comment was
gone. With PR-1 the runtime is supposed to round-trip the bytes
when it doesn't need to mutate them. That's a real win for
hobbyists, and if upstream lands it, I will notice (in a good way).

**Push: please make sure the release notes for whichever upstream
release this lands in says, in plain English: "your comments and
formatting in `openclaw.json` will now be preserved across runtime
rewrites."** That's the thing hobbyists will care about. Don't
bury it under "byte-stable workspace files" — half the people who
benefit won't know what that phrase means.

### "Do I need to learn anything new?"

Skimming the PR walkthrough and the pre-RFCs: **no**, not for the
common case. I don't write plugins. I don't author policies. I
don't register trackers. None of the new surface area
(`LKGTracker`, `PolicyIR`, `ctx.lkgFingerprint`) lands in my
`SOUL.md` or `TOOLS.md`. From my seat, openclaw should look the
same after this lands except my config comments survive.

If I did want to write a plugin someday, the LKG contract looks
like the kind of thing I'd need to read about before I shipped it,
but that's "future hobbyist who's becoming a skill author" — see
[[10-the-skill-connector-author]] persona, not me.

### "Will plugins I have installed start behaving differently?"

**This is the one place I want to push.**

The PR-3 description mentions a "hook merger conjunctive AND fix."
I had to read it three times. Here's what I think it means in
hobbyist terms: today, if I have two plugins installed and both of
them have hooks that say something about a tool call, the runtime
combines their answers in some way. The fix is that the combine
becomes "all of them have to agree to allow" instead of "any of
them allows" (or whatever the bug was — the proposal isn't super
clear from a hobbyist's perspective which way the bug went).

**That is a behavior change for anyone with multiple plugins
installed.** Concretely:

- If today plugin A says `allow` and plugin B says
  `requires-approval`, and the merger today picks `allow`, then
  after the fix I will start seeing approval prompts I didn't see
  before. That's annoying but probably correct (the stricter
  plugin should win).
- If today plugin A says `allow` and plugin B silently malfunctions
  (returns nothing / throws), the new "fail-closed" behavior could
  block tool calls that worked yesterday. Now I'm blocked because
  some clawhub plugin I installed six months ago is throwing on a
  code path nobody's exercised.
- Worst case: a plugin I installed and forgot about suddenly
  starts gating things, my agent stops working, I file a confused
  issue saying "openclaw broke after update."

**What I want from the proposal**:

1. **Release-note this in plain language.** Something like:
   "If you have multiple plugins installed, after this update the
   strictest plugin's decision wins. If your agent starts asking
   for approvals it didn't ask for before, this is why. If it
   starts blocking tool calls that worked before, check whether
   one of your plugins is throwing — `openclaw doctor` will tell
   you."
2. **An escape hatch I can find.** Some way to say "I see plugin
   X is misbehaving, let me disable just that one's hooks while I
   wait for an upstream fix." This probably already exists
   (`plugins.entries.X.enabled = false`?) but the release note
   should point at it.
3. **`openclaw doctor` should know about this.** If I run
   `openclaw doctor` after the fix lands and a plugin's hook is
   throwing, the output should explicitly say "this plugin's hook
   is throwing on tool call X; under the new merger this blocks
   the call; here's how to disable it." Don't make me dig through
   logs.

Without these, the proposal lands a security-correct change that
will generate a wave of "openclaw broke my workflow" issues from
hobbyists who don't know what a "conjunctive AND merger" is. The
upstream maintainer culture (#13) will get cranky and that gets
back to us.

### "Is any of this going to make me install more stuff?"

Doesn't look like it. PR-1 is a package extraction (`@openclaw/workspace`)
but as a hobbyist I just `npm install openclaw` (or curl-pipe-bash);
upstream's monorepo internals are upstream's problem. As long as
the published `openclaw` install still bundles what I need, I don't
care if it's one package or twelve.

**Push: please double-check that the default install story still
works.** If `@openclaw/workspace` becomes a separate package and a
hobbyist who installs `openclaw` ends up missing it because of a
peer-dep mistake, that's a regression for me even if everything
"works as designed" from a packaging standpoint. The pre-RFCs talk
a lot about contracts and types; they don't talk about the
hobbyist install path. Validate it.

### "Does this bring in M365 / Entra / Aether / governance overhead?"

Skimming the realigned-story and policy-pre-rfc:

- Policy generators are "downstream / per-consumer" — claws ships
  one, OPA/CEL/yaml users ship their own, **and a hobbyist runs
  openclaw without any policy generator at all**. PolicyIR is
  upstream as a _type_, not a _runtime_. So if I never install a
  policy generator, PolicyIR never runs in my setup. Good.
- Snap / signed snapshots / KeyVault / per-tenant signing keys —
  none of this lands on my laptop. The realigned-story is very
  clear that signing is at the gateway layer, and I don't run a
  gateway. Good.
- Audit chains stay downstream (claws-side). Good.

So the answer to the "is the proposal Chromium-shaped" test is:
**yes, mostly**. The contracts are upstream as types; the
opinionated runtime stuff stays downstream. That's the right
shape from where I sit.

### "Are there Microsoft-isms leaking in?"

I went looking. A few things I'd flag for cleanup before the PRs
hit upstream:

- **`Sensitivity` enum** with `'public' | 'internal' |
'confidential' | 'restricted'`. That's a Microsoft data-
  classification taxonomy. A hobbyist (or any non-MS user) is going
  to look at that and go "huh? what does 'restricted' mean for my
  home assistant?" The pre-RFC notes this — claws-specific R0–R5
  labels get re-mapped to a generic `Sensitivity` — but the
  _generic_ one is still MS-shaped. Either soften to something
  more obviously generic (`'low' | 'medium' | 'high' |
'critical'`, matching `RiskLevel` right above it) or document
  what each tier means in non-corporate terms. Today's spelling
  reads enterprise-only.
- **`Agent365-attested identity`** mentioned in the lkg-git pre-
  RFC for commit authorship. Hobbyists don't have Agent365. The
  pre-RFC does say "tests pass deterministic strings," so the
  contract itself isn't MS-bound, but the prose makes it sound
  like the only path. Add a hobbyist-shaped example: `name:
'my-laptop-agent'`, `email: 'me@example.com'`, no Agent365 in
  sight.
- **OneDrive / SharePoint / Aether** mentions in the multi-agent
  shared-workspace section. Fine that this is _a_ use case, but
  the section reads like it's the _primary_ use case. Most
  hobbyists running multi-agent are using Tailscale + a NAS or a
  shared git remote, not OneDrive. Lead with the generic case;
  put the OneDrive concern in a callout.

These aren't blockers for the contract shape. They're prose
hygiene before the pre-RFCs get pasted into `#clawtributors`.
Without the cleanup, upstream maintainers (and other hobbyists)
will read this and think "oh, another MS-flavored thing." That
hurts adoption and gives the realigned-story's "Chromium-shaped"
ambition a credibility hit.

## Strengths from where I sit

- **PR-1's byte-stability fix is a real hobbyist-facing win.** I
  hit this exact bug. So do other people on the upstream issue
  tracker (I've seen at least two issues complaining about
  comments getting eaten). Land this and we earn goodwill.
- **The contract-not-daemon framing keeps weight off my laptop.**
  The earlier shape (Hapi PR-6 daemon, audit chain, signing) would
  have made openclaw a much heavier install. The R1 amendment
  collapses to ~390–510 LoC of types upstream. From a hobbyist
  install-footprint perspective, that's almost free.
- **Existing config-LKG already protects me.** I didn't even know
  about `recoverConfigFromLastKnownGood` until I read this — but
  apparently it's been silently saving my bacon since v2026.4.23.
  Generalizing it so other agent-edited files inherit the same
  protection is the kind of compounding-quietly improvement I
  want. As long as nobody asks me to register a tracker, great.
- **`ctx.lkgFingerprint` is invisible to me.** Plugin authors care;
  I don't. Backward-compatible (it's an optional field on an
  existing context type). A++ for not breaking my installed
  plugins' compile.

## Concerns / asks (numbered for tracking)

1. **Release notes must speak hobbyist** for both the byte-
   stability win (PR-1) and the merger-fix behavior change (PR-3).
   Don't bury either under jargon. Specifically the merger fix —
   without a clear note, I will file a confused issue when my
   agent suddenly asks for approvals or when `openclaw doctor`
   doesn't yell loud enough about a misbehaving plugin.

2. **Plugin-misbehavior story for PR-3's merger fix.** The fix is
   probably correct (strictest plugin wins). But it changes
   behavior for anyone with multiple plugins. We need (a) a clear
   `openclaw doctor` message when a hook throws / returns
   nothing, (b) an obvious way to disable a single plugin's hook
   without uninstalling the plugin, (c) a release-notes story for
   "if your agent broke after this update, here's the diagnostic
   path." All three should exist before the PR-3 fix lands or it
   becomes a hobbyist support nightmare.

3. **Install-path validation.** `@openclaw/workspace` becoming a
   separate package is fine if `npm install openclaw` (or curl-
   pipe-bash) still bundles everything. Validate the hobbyist
   install path in CI before this lands. The pre-RFCs don't
   discuss it and it'd be embarrassing for the very PR that helps
   hobbyists most to break the hobbyist install.

4. **Microsoft-ism hygiene before `#clawtributors`** — at least
   `Sensitivity` enum spelling, the Agent365-only example for
   git-LKG authorship, and the OneDrive-primary framing of multi-
   agent shared workspace. Make the prose read as if a hobbyist
   wrote it, not a Microsoft enterprise team.

5. **One-line plain-English summary in each pre-RFC's TL;DR for
   the non-jargon reader.** PR-2's TL;DR talks about "LKGStore /
   LKGTracker contract"; PR-3's talks about "ctx.snapshotId" and
   "RFC 8785 JCS canonicalization." A hobbyist reading the GitHub
   PR description should see, in the first paragraph, what
   actually changes for them. Right now the answer is "nothing,
   probably" but I had to read 1500 lines to be sure of that.

## Things I do _not_ care about as a hobbyist

For the record, so the panel doesn't waste time addressing them
at me:

- KeyVault hot-path amortization. Not running KeyVault.
- Per-tenant signing keys. Not running tenants.
- SIEM-export integration tests for HMAC-chained audit. Not running
  SIEM.
- The 6-vs-10-week upstream chain timeline. Doesn't affect me;
  upstream lands when it lands.
- The trim-wave 6,200 LoC arithmetic. Internal claws cleanup; not
  visible to me.
- Snap-vs-policy-vs-LKG-fingerprint as the canonical anchor. As
  long as it works, the substrate name is upstream's bikeshed.
- The `openclaw-policy` → `claws-policy-generator` rename
  conversation. Not on the hobbyist install path.

These all matter; they just don't matter _to my persona_. The
proposal is appropriately invisible to me on those axes — that's
the right outcome.

## Verdict reasoning

The proposal is mostly invisible to me, which is what I want from
upstream contributions. The one place it lands on my laptop —
PR-1's byte-stable workspace files — is a genuine quality-of-life
improvement and I'm grateful for it. The two places it could
surprise me — PR-3's merger fix (behavior change for installed
plugins) and the install-path validity question (does
`npm install openclaw` still pull what I need?) — are both
fixable with release-notes hygiene, a `doctor` improvement, and
one CI check.

**APPROVE-WITH-WARNINGS** because:

- Approve: contract-shaped, types-only, runtime-light, doesn't
  bring M365 / Entra / Aether to my laptop, fixes a real config-
  comment-eating bug.
- Warnings: the merger-fix behavior change needs a hobbyist-
  shaped release-note + diagnostic story before it ships, the
  install path needs validation, and a few enterprise-flavored
  prose bits should be cleaned up before the pre-RFCs hit
  `#clawtributors`.

If the warnings get addressed, this is a clean win for the
persona. If they don't, the upstream issue tracker — which is
where my voice lives loudest — is going to get noisy in a way
that hurts the contributor's reputation.

## Cross-references

- [[Tech/OpenClaw/guides/personas/05-the-hobbyist]] — my persona
  card; the Chromium/Edge test that reviewing-as-me applies
- [[Tech/OpenClaw/guides/personas/13-the-upstream-maintainer]] —
  the persona who protects me; my issues feed their priorities
- [[Tech/OpenClaw/specs/proposals/lkg-pre-rfc]] — PR-2 pre-RFC
  (mostly invisible to me)
- [[Tech/OpenClaw/specs/proposals/policy-pre-rfc]] — PR-3 pre-RFC
  (the merger-fix concern lives here)
- [[Tech/OpenClaw/specs/proposals/realigned-story]] — chain
  narrative (read for context; not hobbyist-facing)
- [[Tech/OpenClaw/specs/proposals/lkg-git-pre-rfc]] — git-backed
  LKG impl; the OneDrive-primary framing concern lives here
