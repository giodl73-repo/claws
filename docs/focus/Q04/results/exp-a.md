# Experiment a: Name Bakeoff Round 2 — Cross-Platform Governance Compiler

**Method**: design analysis
**Date**: 2026-04-11

---

## The Framing Shift

Q12c designed `claws` for OpenClaw governance. But the external landscape shows:

- **7 managed platforms** (Anthropic, OpenAI, Google, AWS, Microsoft, LangGraph, CrewAI)
- **Zero** have compile-time governance, sealed deployment, or cross-platform audit trails
- **claws already cross-compiles**: `claws build cursor`, `claws build claude`, `claws build github`
- A platform engineer governing 20 Claude agents + 5 OpenClaw agents needs a name that doesn't say "this is an OpenClaw tool"

The question: **what name works for the governance compiler that sits above ALL agent runtimes?**

---

## Evaluation Criteria

| # | Criterion | Weight | Why |
|---|-----------|--------|-----|
| 1 | **Cross-platform feel** | 30% | Must work for OC, Claude, Cursor, AWS, any agent |
| 2 | **Governance signal** | 25% | Should evoke enforcement, trust, safety — not just "build tool" |
| 3 | **Length + typability** | 15% | Target: 3-5 chars. Typed 50x/day. |
| 4 | **Collision** | 15% | npm, PyPI, major CLIs, well-known projects |
| 5 | **Verb surface compatibility** | 10% | Do pinch/snap/--fleet still work with this name? |
| 6 | **Brand positioning** | 5% | Enterprise gravitas, developer appeal |

---

## Candidates

### 1. `claw` (4 chars)

**The pitch**: Drop the `c` suffix. The CLI IS the claw.

```
claw init          claw build cursor     claw pinch --fleet
claw build         claw snap save v2     claw scan
```

| Criterion | Score | Notes |
|-----------|-------|-------|
| Cross-platform | 4/10 | "Claw" screams OpenClaw. Governing Claude agents with "claw" is confusing. |
| Governance signal | 5/10 | Claws grip/enforce, but also scratch/attack — mixed signal |
| Length | 9/10 | 4 chars, excellent |
| Collision | 5/10 | npm `claw` exists (small CLI framework). Mental collision with `openclaw`. |
| Verb compat | 9/10 | pinch/snap are claw actions — perfect fit |
| Brand | 4/10 | "Which claw?" problem. OpenClaw community may object. |
| **Weighted** | **5.3** | |

**Verdict**: Too tied to OpenClaw. The "which claw?" confusion is fatal for cross-platform positioning.

---

### 2. `claws` (5 chars) — current name

```
claws init         claws build cursor    claws pinch --fleet
claws build        claws snap save v2    claws scan
```

| Criterion | Score | Notes |
|-----------|-------|-------|
| Cross-platform | 5/10 | "Claw compiler" still feels OC-first. Better than `claw` (compiler suffix adds distance). |
| Governance signal | 6/10 | Compiler convention signals seriousness. "Claw" part is enforcement-adjacent. |
| Length | 8/10 | 5 chars, good |
| Collision | 9/10 | Clean — no known collisions |
| Verb compat | 10/10 | Designed for this name |
| Brand | 6/10 | Strong in OC ecosystem, weaker for managed-only shops |
| **Weighted** | **6.3** | |

**Verdict**: Good for OC-first. Weakens as managed agents grow in the fleet.

---

### 3. `grip` (4 chars)

**The pitch**: "Get a grip on your agents." Hand/claw action without claw branding.

```
grip init          grip build cursor     grip pinch --fleet
grip build         grip snap save v2     grip scan
```

| Criterion | Score | Notes |
|-----------|-------|-------|
| Cross-platform | 8/10 | Platform-neutral. "Grip your Claude agents" works. "Grip your OC workspace" works. |
| Governance signal | 7/10 | Grip = hold, secure, control. Strong governance metaphor. |
| Length | 9/10 | 4 chars |
| Collision | 6/10 | npm `grip` exists (GitHub release installer). Not huge but not empty. |
| Verb compat | 7/10 | pinch works (grip + pinch = hand actions). snap works. But grip + pinch is slightly redundant. |
| Brand | 7/10 | Professional, memorable, enterprise-appropriate |
| **Weighted** | **7.4** | |

**Verdict**: Strong neutral candidate. The grip→pinch redundancy is minor. `grip.json`, `.grip/` are clean.

---

### 4. `fence` (5 chars)

**The pitch**: From the fence passes (FE1-FE5) in guard spec. Governance = fencing in behavior.

```
fence init         fence build cursor    fence pinch --fleet
fence build        fence snap save v2    fence scan
```

| Criterion | Score | Notes |
|-----------|-------|-------|
| Cross-platform | 9/10 | Fully platform-neutral. "Fence your agents" works for any platform. |
| Governance signal | 9/10 | Fence = boundary, constraint, protection. THE governance metaphor. |
| Length | 8/10 | 5 chars |
| Collision | 7/10 | npm `fence` exists (small package). No major CLI collision. |
| Verb compat | 5/10 | fence + pinch is awkward. fence + snap is ok. "fence pinch" reads oddly. |
| Brand | 7/10 | Enterprise-grade. "Fence" is serious. Maybe too serious — no playfulness. |
| **Weighted** | **7.7** | |

**Verdict**: Strongest governance signal. But `fence pinch` is the weakest verb pairing — pinch doesn't belong in a fence metaphor. Would need to reconsider pinch → check or pinch → gate.

---

### 5. `ward` (4 chars)

**The pitch**: Guardian, warden, protection. "Ward your agents."

```
ward init          ward build cursor     ward pinch --fleet
ward build         ward snap save v2     ward scan
```

| Criterion | Score | Notes |
|-----------|-------|-------|
| Cross-platform | 8/10 | Platform-neutral. "Ward your fleet" = protect/guard it. |
| Governance signal | 8/10 | Ward = protect, guardian. Strong. |
| Length | 9/10 | 4 chars |
| Collision | 5/10 | `ward` is a very common English word. Hospital ward, political ward. npm likely occupied. |
| Verb compat | 6/10 | ward + pinch is odd. ward + snap is ok. Mixed metaphor (medieval + crustacean). |
| Brand | 5/10 | Ambiguous — "ward" has too many meanings. Not distinctive. |
| **Weighted** | **6.9** | |

**Verdict**: Good governance signal but too generic. "Ward" lacks distinctiveness.

---

### 6. `aegis` (5 chars)

**The pitch**: Shield of Athena. Divine protection. "Under the aegis of governance."

```
aegis init         aegis build cursor    aegis pinch --fleet
aegis build        aegis snap save v2    aegis scan
```

| Criterion | Score | Notes |
|-----------|-------|-------|
| Cross-platform | 9/10 | Fully platform-neutral. Classical, universal. |
| Governance signal | 9/10 | Shield, protection, authority. Enterprise loves this word. |
| Length | 8/10 | 5 chars |
| Collision | 3/10 | HEAVY: Aegis Authenticator (TOTP app), Aegis AI, multiple npm packages, multiple security products |
| Verb compat | 5/10 | aegis + pinch is a strange pairing (Greek + crustacean). aegis + snap is neutral. |
| Brand | 8/10 | Premium feel. Enterprise gravitas. |
| **Weighted** | **6.8** | |

**Verdict**: Beautiful word, terrible collision space. Every security product wants "aegis."

---

### 7. `rein` (4 chars)

**The pitch**: Reins. Pull back, control, govern. "Rein in your agents."

```
rein init          rein build cursor     rein pinch --fleet
rein build         rein snap save v2     rein scan
```

| Criterion | Score | Notes |
|-----------|-------|-------|
| Cross-platform | 8/10 | Fully neutral. "Rein in your Claude agents" — natural English. |
| Governance signal | 8/10 | Reins = control, restraint. Perfect governance metaphor. |
| Length | 9/10 | 4 chars |
| Collision | 6/10 | npm `rein` exists (small). No major CLI collision. Common word. |
| Verb compat | 6/10 | rein + pinch is slightly mixed (equestrian + crustacean). rein + snap is ok. |
| Brand | 6/10 | Good but not distinctive. "Rein" is a common word. |
| **Weighted** | **7.3** | |

**Verdict**: Strong governance metaphor. Clean enough. But the equestrian→crustacean verb shift is noticeable.

---

### 8. `hermes` (6 chars)

**The pitch**: Greek god of boundaries, transitions, commerce. "Hermes guides agents across trust boundaries."

```
hermes init        hermes build cursor   hermes pinch --fleet
hermes build       hermes snap save v2   hermes scan
```

| Criterion | Score | Notes |
|-----------|-------|-------|
| Cross-platform | 9/10 | Fully neutral, mythological = timeless |
| Governance signal | 6/10 | Hermes = messenger/boundaries, but also thieves/trickery. Mixed. |
| Length | 4/10 | 6 chars. Typed 50x/day, this matters. |
| Collision | 2/10 | FATAL: Meta's Hermes JS engine (ships with React Native). Hermes fashion brand. npm `hermes` taken. |
| Verb compat | 4/10 | hermes + pinch is bizarre (Greek god + crustacean). All crustacean verbs feel wrong. |
| Brand | 7/10 | Strong mythological brand. But the project already uses deity names for waves. |
| **Weighted** | **5.3** | |

**Verdict**: Fatal collision with Meta Hermes. Also 6 chars and destroys the crustacean verb surface.

---

### 9. `clasp` (5 chars)

**The pitch**: Clasp = hold firmly, secure, fasten. "Clasp your governance."

```
clasp init         clasp build cursor    clasp pinch --fleet
clasp build        clasp snap save v2    clasp scan
```

| Criterion | Score | Notes |
|-----------|-------|-------|
| Cross-platform | 8/10 | Neutral. "Clasp your agents" works for any platform. |
| Governance signal | 7/10 | Clasp = secure, hold, fasten. Decent. |
| Length | 8/10 | 5 chars |
| Collision | 1/10 | **FATAL**: Google's `clasp` CLI (Google Apps Script). 6K+ GitHub stars, heavily used. npm `clasp` = `@google/clasp`. |
| Verb compat | 7/10 | clasp + pinch is ok (both hand actions). clasp + snap works. |
| Brand | 6/10 | Professional but not distinctive. |
| **Weighted** | **5.3** | |

**Verdict**: FATAL collision with Google clasp. Dead on arrival.

---

### 10. `pinch` (5 chars)

**The pitch**: Make pinch the CLI name AND the governance verb.

```
pinch init         pinch build cursor    pinch check --fleet
pinch build        pinch snap save v2    pinch scan
```

| Criterion | Score | Notes |
|-----------|-------|-------|
| Cross-platform | 7/10 | Neutral enough. "Pinch your Claude agents" is a stretch but works. |
| Governance signal | 9/10 | Pinch = squeeze, enforce, restrict. Strong governance verb. |
| Length | 8/10 | 5 chars |
| Collision | 5/10 | pinchbench, pinchchat exist. Medium clutter. |
| Verb compat | 3/10 | PROBLEM: `pinch pinch` — if the CLI is pinch, the governance verb can't also be pinch. Must rename to `check` or `gate`. Loses the signature verb. |
| Brand | 6/10 | Memorable but feels like enforcement-only, not compilation. User's prior feedback: "doesn't feel like compile." |
| **Weighted** | **6.3** | |

**Verdict**: `pinch pinch` kills it. The signature verb and CLI name can't be the same word.

---

### 11. `seal` (4 chars)

**The pitch**: Seal of approval. Signed, sealed, delivered. "Seal your agents."

```
seal init          seal build cursor     seal pinch --fleet
seal build         seal snap save v2     seal scan
```

| Criterion | Score | Notes |
|-----------|-------|-------|
| Cross-platform | 9/10 | Fully neutral. "Seal your agents" = certify, lock down. Works for any platform. |
| Governance signal | 9/10 | Seal = authenticate, certify, tamper-proof. Directly maps to artifact signing. |
| Length | 9/10 | 4 chars |
| Collision | 5/10 | npm `seal` exists. SEAL (Security Enhanced Application Layer) exists. Common word. |
| Verb compat | 5/10 | seal + pinch is mixed metaphor (wax seal + crustacean). seal + snap is ok (seal snap = stamping). |
| Brand | 8/10 | Enterprise-grade. CISOs love "sealed" artifacts. Premium feel. |
| **Weighted** | **7.5** | |

**Verdict**: Strong candidate. The seal→pinch metaphor mismatch is notable but manageable. "Seal" has the best CISO appeal.

---

### 12. `pact` (4 chars)

**The pitch**: Agreement, covenant. Governance = the pact between org and agent.

```
pact init          pact build cursor     pact pinch --fleet
pact build         pact snap save v2     pact scan
```

| Criterion | Score | Notes |
|-----------|-------|-------|
| Cross-platform | 9/10 | Fully neutral. "Pact with your agents" is evocative. |
| Governance signal | 8/10 | Pact = binding agreement. Governance IS a pact. |
| Length | 9/10 | 4 chars |
| Collision | 2/10 | **FATAL**: Pact is a well-known contract testing framework (pact.io, Pact Foundation). npm `pact` = `@pact-foundation/pact`. |
| Verb compat | 6/10 | pact + pinch is ok. pact + snap is neutral. |
| Brand | 7/10 | Strong concept but the contract testing collision is dealbreaking. |
| **Weighted** | **6.0** | |

**Verdict**: FATAL collision with Pact contract testing framework.

---

### 13. `cinch` (5 chars)

**The pitch**: "Cinch it down." Tighten governance. "It's a cinch" = easy.

```
cinch init         cinch build cursor    cinch pinch --fleet
cinch build        cinch snap save v2    cinch scan
```

| Criterion | Score | Notes |
|-----------|-------|-------|
| Cross-platform | 8/10 | Neutral. "Cinch your agents" = tighten controls. |
| Governance signal | 7/10 | Cinch = tighten, secure. Also "easy" — which signals good DX. |
| Length | 8/10 | 5 chars |
| Collision | 7/10 | npm `cinch` exists (small test framework, ~2015). No major CLI collision. |
| Verb compat | 6/10 | cinch + pinch is very close (both mean squeeze/tighten). Redundant. |
| Brand | 6/10 | Slightly casual. "Cinch" doesn't have enterprise gravitas. |
| **Weighted** | **7.1** | |

**Verdict**: Decent but cinch + pinch is too redundant. Loses the verb distinctiveness.

---

## Rankings

| Rank | Name | Score | Killer issue? |
|------|------|-------|--------------|
| 1 | **`fence`** | 7.7 | `fence pinch` reads awkwardly — may need pinch → check |
| 2 | **`seal`** | 7.5 | seal + pinch mixed metaphor; npm `seal` exists |
| 3 | **`grip`** | 7.4 | grip + pinch slightly redundant; npm `grip` exists |
| 4 | **`rein`** | 7.3 | equestrian + crustacean metaphor clash |
| 5 | **`cinch`** | 7.1 | cinch + pinch too redundant |
| 6 | **`ward`** | 6.9 | too generic, ambiguous |
| 7 | **`aegis`** | 6.8 | heavy collision space |
| 8 | **`claws`** | 6.3 | OC-only feel |
| 8 | **`pinch`** | 6.3 | `pinch pinch` problem |
| 10 | **`claw`** | 5.3 | "which claw?" confusion |
| 10 | **`hermes`** | 5.3 | Meta Hermes FATAL |
| 10 | **`clasp`** | 5.3 | Google clasp FATAL |
| 13 | **`pact`** | 6.0 | Pact.io FATAL |

---

## The Top 3 Deep Dive

### Path A: `grip` — the pragmatic choice

```bash
grip init --template soc2
grip build cursor --optimize
grip pinch --fleet
grip snap save v2
grip audit export --format cef
```

- Config: `grip.json`, `.grip/`
- Package: `@craftworks/grip`
- Verb surface: pinch and snap survive (all hand/grip actions)
- Progressive disclosure: `grip` (bare) → 4 commands, `grip --help` → 18, `grip --help-all` → 35
- The "get a grip on governance" tagline writes itself
- Works equally for OpenClaw, Claude, Cursor, AWS Bedrock, any agent

**Risk**: `grip` is a real npm package (GitHub release installer, ~200 weekly downloads). Would need `@craftworks/grip` scoped package. The binary name `grip` may conflict on systems that have it installed.

### Path B: `seal` — the enterprise choice

```bash
seal init --template soc2
seal build cursor --optimize
seal pinch --fleet          # or: seal check --fleet
seal snap save v2
seal audit export --format cef
```

- Config: `seal.json`, `.seal/`
- Package: `@craftworks/seal`
- Verb surface: pinch becomes slightly odd (seal + pinch = mixed metaphor). Could keep it (seals pinch fish!) or rename to `seal check`.
- "Sealed artifacts", "seal of approval", "signed and sealed" — all enterprise-natural
- The CISO hears "seal" and thinks compliance. The developer hears "seal" and thinks "done."

**Risk**: `seal` is a common word with multiple meanings (animal, verb, noun). npm `seal` exists. The seal (animal) associations might be distracting — but also charming (seal + claw ecosystem = marine animals).

### Path C: `fence` — the governance-native choice

```bash
fence init --template soc2
fence build cursor --optimize
fence check --fleet          # pinch → check (fence metaphor demands it)
fence snap save v2
fence audit export --format cef
```

- Config: `fence.json`, `.fence/`
- Package: `@craftworks/fence`
- Verb surface: pinch MUST rename to `check` or `gate`. "fence pinch" doesn't work. This means losing the signature crustacean verb.
- "Fence passes" (FE1-FE5) from the guard spec — the name comes FROM the architecture
- `--skip-fence` instead of `--skip-pinch` on build commands — actually reads better: "build without fencing"

**Risk**: Losing `pinch` is significant — it was the signature verb. But `fence check` is arguably clearer to newcomers. The tradeoff is identity vs clarity.

---

## The Hybrid Question

Could the name be platform-specific and use claw flavor ONLY in the OpenClaw context?

No. The binary name is one name. You install one thing. It governs everything.

But the **contributed upstream packages** (Q12b) could still use `@openclaw/` scope. The CLI name doesn't need to match the upstream package scope. `grip` (the CLI) can consume `@openclaw/audit-chain` (the upstream package).

---

## Key Decision Points

1. **Is "pinch" sacred?** If yes, `grip` or `seal` (pinch survives in both, slightly awkwardly). If no, `fence` + `check` is the cleanest governance surface.

2. **How much does OpenClaw community positioning matter?** If a lot, keep claw-adjacent (`grip` has claw-hand overlap). If cross-platform is primary, go neutral (`fence` or `seal`).

3. **The seal (animal) question**: Seal the animal is a marine mammal. OpenClaw is a crustacean project. Marine animals are... adjacent? `seal` might actually bridge the claw/non-claw worlds — marine themed but not claw-specific.

4. **Is `claw` actually fine?** If the managed agent support is always secondary to OpenClaw, and the tool's identity IS "the OpenClaw governance compiler," then `claws` or even `claw` is correct. The managed agent cross-compilation is a feature, not the identity.
