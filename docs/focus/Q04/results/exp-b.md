# Experiment b: Final Scoring — Community-Modern-Fun-Extensible Rubric

**Method**: design analysis
**Date**: 2026-04-11

---

## Rubric

New criteria reweighted for cross-platform governance compiler positioning. The user wants: community feel, modern DX, fun/memorable, extensible to any agent platform.

| # | Criterion | Weight | What 10/10 looks like |
|---|-----------|--------|----------------------|
| 1 | **Platform extensibility** | 25% | Name works equally for OpenClaw, Claude, Cursor, Bedrock, LangGraph, CrewAI, custom. No ecosystem lock-in signal. |
| 2 | **Community & OSS vibe** | 20% | Feels like a tool developers would star on GitHub, recommend in Discord, put stickers on laptops. Approachable, not corporate. |
| 3 | **Modern DX feel** | 15% | Feels 2026, not 2016. Think: bun, deno, turbo, vite, ruff — short, sharp, confident. |
| 4 | **Fun / memorable** | 15% | You hear it once and remember it. Has personality. Sparks a smile or a "huh, cool." |
| 5 | **Governance signal** | 10% | Evokes enforcement, trust, safety, or compilation — doesn't need to scream it, but shouldn't fight it. |
| 6 | **Collision safety** | 10% | No fatal npm/PyPI/CLI collision. Binary name available or easily scoped. |
| 7 | **Verb surface compat** | 5% | pinch/snap/--fleet work naturally with this name. If not, the replacement verbs must be equally good. |

---

## The Field (16 candidates)

### Tier 1: Strongest contenders

---

#### `glint` (5 chars)

**Pitch**: Governance lint. Light off a shell. Sharp, modern, subtle.

```bash
glint init --template soc2
glint build cursor --optimize
glint pinch --fleet
glint snap save v2
glint audit export --format cef
```

Config: `glint.json` · `.glint/` · Package: `@craftworks/glint`

| Criterion | Score | Rationale |
|-----------|-------|-----------|
| Platform extensibility | 9 | Fully neutral. "Glint your Claude agents" — no ecosystem tie. |
| Community & OSS vibe | 9 | Short, sharp, sticker-worthy. "I glint my agents." Feels like ruff or bun — modern linter energy. |
| Modern DX feel | 9 | Sounds like it belongs next to vite, turbo, bun. Single syllable. Confident. |
| Fun / memorable | 8 | "Glint" = sharp edge, light flash. Slight danger/beauty. Memorable after one mention. |
| Governance signal | 7 | "Lint" is literally embedded. Developers instantly get "this validates." The "g" prefix adds weight. |
| Collision safety | 6 | `@glint/core` exists (Ember/Glimmer TS tooling). Different domain. Binary `glint` may conflict on some systems. Scoped `@craftworks/glint` is safe. |
| Verb surface compat | 8 | pinch works (glint + pinch = sharp edge actions). snap works. No metaphor clash. |
| **Weighted total** | **8.2** | |

**Tagline**: "Glint — governance for every agent."

---

#### `grip` (4 chars)

**Pitch**: Get a grip on your agents. Hand action. Cross-platform hold.

```bash
grip init --template soc2
grip build cursor --optimize
grip pinch --fleet
grip snap save v2
grip audit export --format cef
```

Config: `grip.json` · `.grip/` · Package: `@craftworks/grip`

| Criterion | Score | Rationale |
|-----------|-------|-----------|
| Platform extensibility | 8 | Neutral. "Grip your agents" works for any platform. Slight hand/claw resonance for OC users. |
| Community & OSS vibe | 7 | Solid, trustworthy. But doesn't spark the same "ooh" as glint. More workmanlike. |
| Modern DX feel | 7 | 4 chars is great. But "grip" sounds more 2018 (like helm, flux) than 2026 (like ruff, bun). |
| Fun / memorable | 6 | Functional but not playful. "Get a grip" is a cliché. No spark. |
| Governance signal | 8 | Grip = hold, control, secure. Strong governance metaphor without being heavy. |
| Collision safety | 6 | npm `grip` exists (GitHub release installer, ~200 weekly downloads). Scoped package is fine. |
| Verb surface compat | 7 | pinch works (grip + pinch = hand family). snap works. Slightly redundant with pinch. |
| **Weighted total** | **7.1** | |

**Tagline**: "Grip — hold your agents to standard."

---

#### `seal` (4 chars)

**Pitch**: Seal of approval. Signed, sealed, governed. Marine-adjacent.

```bash
seal init --template soc2
seal build cursor --optimize
seal pinch --fleet
seal snap save v2
seal audit export --format cef
```

Config: `seal.json` · `.seal/` · Package: `@craftworks/seal`

| Criterion | Score | Rationale |
|-----------|-------|-----------|
| Platform extensibility | 9 | Fully neutral. "Seal your Claude workspace" = certify it. Works for anything. |
| Community & OSS vibe | 7 | Clean, professional. But "seal" is corporate-safe, not community-playful. More enterprise than OSS. |
| Modern DX feel | 6 | Feels established, not cutting-edge. "Seal" is a 2020 word. Not bad, just not fresh. |
| Fun / memorable | 7 | The seal (animal) association adds charm. "Our compliance seal" — double meaning works. Seal emoji 🦭. |
| Governance signal | 9 | Best-in-class. "Sealed artifacts." "Seal of compliance." CISOs dream about this word. |
| Collision safety | 5 | Common word. npm `seal` exists. Multiple security products use "seal" in names. |
| Verb surface compat | 6 | seal + pinch is a mixed metaphor (marine mammal + crustacean). Works but slightly odd. |
| **Weighted total** | **7.1** | |

**Tagline**: "Seal — certified agent governance."

---

#### `fence` (5 chars)

**Pitch**: Governance boundaries. From the fence passes (FE1-FE5) in guard spec.

```bash
fence init --template soc2
fence build cursor --optimize
fence check --fleet               # pinch → check
fence snap save v2
fence audit export --format cef
```

Config: `fence.json` · `.fence/` · Package: `@craftworks/fence`

| Criterion | Score | Rationale |
|-----------|-------|-----------|
| Platform extensibility | 9 | Fully neutral. "Fence your Bedrock agents" = set boundaries. Universal. |
| Community & OSS vibe | 5 | Functional but dry. Nobody puts a "fence" sticker on a laptop. No personality. |
| Modern DX feel | 5 | Feels utilitarian, like a 2017 infra tool. Compare to vite/bun/ruff — fence lacks spark. |
| Fun / memorable | 4 | Not fun. "Fence" is what your neighbor complains about. Zero personality. |
| Governance signal | 10 | Perfect. "Fence" IS governance. Boundaries, containment, protection. Best governance word available. |
| Collision safety | 7 | npm `fence` exists (small). No major CLI collision. |
| Verb surface compat | 4 | MUST rename pinch → check or gate. "fence pinch" doesn't work. Loses signature verb. `--skip-fence` reads well though. |
| **Weighted total** | **6.3** | |

**Tagline**: "Fence — boundaries for every agent."

---

### Tier 2: Worth considering

---

#### `cast` (4 chars)

**Pitch**: A group of crabs. Cast your governance. Cast = mold, shape.

```bash
cast init --template soc2
cast build cursor --optimize
cast pinch --fleet
cast snap save v2
```

Config: `cast.json` · `.cast/` · Package: `@craftworks/cast`

| Criterion | Score | Rationale |
|-----------|-------|-----------|
| Platform extensibility | 8 | Neutral. "Cast governance across your fleet." Works for any platform. |
| Community & OSS vibe | 7 | "Cast" has maker energy — casting molds, casting spells. Interesting. |
| Modern DX feel | 7 | Short, punchy. Feels current. |
| Fun / memorable | 7 | The "group of crabs" Easter egg is charming for those who discover it. Multiple meanings = depth. |
| Governance signal | 5 | Weak. "Cast" doesn't evoke governance or enforcement. More creative/manufacturing. |
| Collision safety | 4 | Extremely common word. npm `cast` likely crowded. Foundry's `cast` (Ethereum) is prominent. |
| Verb surface compat | 7 | pinch works (crab cast + pinch). snap works. |
| **Weighted total** | **6.5** | |

---

#### `conch` (5 chars)

**Pitch**: Authority horn. Lord of the Flies: whoever holds the conch speaks.

```bash
conch init --template soc2
conch build cursor --optimize
conch pinch --fleet
conch snap save v2
```

Config: `conch.json` · `.conch/` · Package: `@craftworks/conch`

| Criterion | Score | Rationale |
|-----------|-------|-----------|
| Platform extensibility | 8 | Neutral. Marine, not claw-specific. |
| Community & OSS vibe | 8 | Literary reference, unexpected for a CLI. "That's cool" factor. |
| Modern DX feel | 6 | Unusual but not "modern." Feels more whimsical than sharp. |
| Fun / memorable | 9 | "Conch" — everyone remembers Lord of the Flies. The authority metaphor is perfect. Very sticker-worthy. |
| Governance signal | 7 | Authority horn = governance. "Blow the conch" = call for order. Indirect but resonant. |
| Collision safety | 7 | Less common word. npm probably has small packages but no major tool. |
| Verb surface compat | 6 | conch + pinch is a stretch (mollusk + crustacean). snap is neutral. |
| **Weighted total** | **7.3** | |

---

#### `rein` (4 chars)

**Pitch**: Reins. Pull back, control. "Rein in your agents."

```bash
rein init --template soc2
rein build cursor --optimize
rein pinch --fleet
rein snap save v2
```

Config: `rein.json` · `.rein/` · Package: `@craftworks/rein`

| Criterion | Score | Rationale |
|-----------|-------|-----------|
| Platform extensibility | 8 | Neutral. "Rein in your Claude agents." Universal metaphor. |
| Community & OSS vibe | 6 | Decent but not exciting. "Rein" is functional. |
| Modern DX feel | 6 | Sounds like a 2019 Kubernetes tool. Not cutting-edge. |
| Fun / memorable | 5 | Not fun. Equestrian metaphor is serious, not playful. |
| Governance signal | 8 | "Rein in" = control, restrain. Strong governance verb. |
| Collision safety | 6 | Common word. npm `rein` exists (small). |
| Verb surface compat | 6 | rein + pinch clashes metaphors (equestrian + crustacean). |
| **Weighted total** | **6.5** | |

---

#### `reef` (4 chars)

**Pitch**: Marine ecosystem. Coral reef = interconnected structure. Fleet metaphor.

```bash
reef init --template soc2
reef build cursor --optimize
reef pinch --fleet
reef snap save v2
```

Config: `reef.json` · `.reef/` · Package: `@craftworks/reef`

| Criterion | Score | Rationale |
|-----------|-------|-----------|
| Platform extensibility | 8 | Neutral marine. "Reef" = structure that holds marine life together. |
| Community & OSS vibe | 7 | Nature-themed, approachable. |
| Modern DX feel | 6 | Pleasant but soft. Doesn't have the sharp modern energy of glint/bun/ruff. |
| Fun / memorable | 7 | "Reef" is evocative. Coral, ocean, ecosystem. Nice imagery. |
| Governance signal | 4 | Weak. Reefs are natural structures, not enforcement mechanisms. |
| Collision safety | 6 | npm `reef` likely exists (small). No major collision. |
| Verb surface compat | 7 | reef + pinch works (marine + crustacean = same habitat). snap works. |
| **Weighted total** | **6.4** | |

---

#### `molt` (4 chars)

**Pitch**: Crustacean transformation. Shed the old shell, grow stronger.

```bash
molt init --template soc2
molt build cursor --optimize
molt pinch --fleet
molt snap save v2
```

Config: `molt.json` · `.molt/` · Package: `@craftworks/molt`

| Criterion | Score | Rationale |
|-----------|-------|-----------|
| Platform extensibility | 7 | Neutral enough. "Molt" isn't tied to any platform. But it's niche vocabulary. |
| Community & OSS vibe | 7 | Quirky, memorable. Crustacean nerds love it. |
| Modern DX feel | 6 | Unusual but not cutting-edge. |
| Fun / memorable | 8 | "Molt" is unexpected for a CLI. People remember it. |
| Governance signal | 3 | Molt = transform, evolve. Opposite of governance (which holds steady). Wrong signal. |
| Collision safety | 7 | Less common word. Likely clean on npm. |
| Verb surface compat | 8 | molt + pinch = crustacean family. snap = crustacean. Perfect fit. |
| **Weighted total** | **6.3** | |

---

#### `claws` (5 chars) — baseline

```bash
claws init --template soc2
claws build cursor --optimize
claws pinch --fleet
claws snap save v2
```

Config: `claws.json` · `.claws/` · Package: `@craftworks/claws`

| Criterion | Score | Rationale |
|-----------|-------|-----------|
| Platform extensibility | 5 | "Claw compiler" signals OpenClaw. Cross-compiling Claude with a "claw" is odd. |
| Community & OSS vibe | 7 | Has personality. The {x}c pattern is recognizable. |
| Modern DX feel | 7 | rustc, javac → claws. Compiler convention is timeless. |
| Fun / memorable | 7 | "Claws" — crabby. Playful. |
| Governance signal | 6 | Compiler convention signals seriousness. "Claw" part is enforcement-adjacent. |
| Collision safety | 9 | Clean. No known collisions. |
| Verb surface compat | 10 | Designed for this name. pinch/snap are native. |
| **Weighted total** | **6.7** | |

---

### Tier 3: Eliminated

| Name | Chars | Fatal issue |
|------|-------|-------------|
| `clasp` | 5 | Google clasp CLI — npm `@google/clasp` |
| `hermes` | 6 | Meta Hermes JS engine (React Native) |
| `pact` | 4 | Pact contract testing framework (pact.io) |
| `pinch` | 5 | `pinch pinch` problem — CLI name = governance verb |
| `claw` | 4 | "Which claw?" confusion with OpenClaw CLI |
| `aegis` | 5 | Dozens of security products (Aegis Authenticator, etc.) |
| `ward` | 4 | Too generic, ambiguous (hospital/political/guardian) |
| `cinch` | 5 | cinch + pinch too redundant |

---

## Final Rankings

| Rank | Name | Chars | Weighted | Key strength | Key risk |
|------|------|-------|---------|-------------|---------|
| **1** | **`glint`** | 5 | **8.2** | Modern DX + community vibe + "governance lint" embedded | @glint/core Ember collision (moderate) |
| **2** | **`conch`** | 5 | **7.3** | Memorability + literary authority metaphor + unique | Not crustacean (mollusk); pronunciation varies ("konk" vs "kontch") |
| **3** | **`grip`** | 4 | **7.1** | Governance signal + 4 chars + hand/claw bridge | "Get a grip" cliché; npm `grip` exists |
| **4** | **`seal`** | 4 | **7.1** | CISO-perfect governance signal + marine bridge | Enterprise > community feel; common word; npm `seal` exists |
| **5** | **`claws`** | 5 | **6.7** | Perfect OC fit + clean collision + verb surface | Weakens with managed agents |
| **6** | **`cast`** | 4 | **6.5** | "Group of crabs" Easter egg + multi-meaning depth | Foundry `cast` (Ethereum); weak governance signal |
| **7** | **`rein`** | 4 | **6.5** | Strong governance metaphor | Not fun; equestrian ≠ crustacean |
| **8** | **`reef`** | 4 | **6.4** | Marine ecosystem metaphor | Weak governance signal |
| **9** | **`fence`** | 5 | **6.3** | Best governance signal (10/10) | Zero fun; kills pinch verb |
| **10** | **`molt`** | 4 | **6.3** | Memorable + crustacean-native | Wrong governance signal (transform ≠ enforce) |

---

## The Verdict

### `glint` wins on the rubric.

It scores highest on the three criteria the user weighted most: platform extensibility (9), community vibe (9), and modern DX (9). The governance signal comes free — "lint" is embedded in the name. The collision with `@glint/core` (Ember tooling) is moderate and in a completely different domain.

**Why glint over the others:**

| vs | Why glint wins |
|----|---------------|
| vs `grip` | grip is workmanlike where glint sparkles. grip sounds like a 2018 K8s tool. glint sounds like ruff, bun, vite. |
| vs `seal` | seal is enterprise-corporate. glint is community-first. The rubric weights community 2x over governance signal. |
| vs `fence` | fence is governance-perfect but personality-zero. It kills pinch. glint keeps the whole verb surface. |
| vs `conch` | conch is memorable but pronunciation wars ("konk"/"kontch") hurt adoption. glint is unambiguous. |
| vs `claws` | claws is OC-native but weakens as managed agents join the fleet. glint is platform-agnostic from day one. |

### The `glint` experience:

```bash
# Developer daily
glint init --template soc2            # "Glint my workspace"
glint build cursor --optimize         # Cross-compile for Cursor
glint pinch                           # Governance check
glint pinch --staged                  # Pre-commit hook
glint watch                           # Auto-recompile + auto-pinch

# Platform engineer
glint scan                            # Discover all agent workspaces
glint pinch --fleet                   # Fleet governance sweep
glint broadcast --confirm             # Push policies everywhere
glint drift                           # Detect policy drift

# CISO
glint comply soc2                     # SOC 2 evidence
glint audit verify                    # Chain integrity
glint audit export --format cef       # SIEM export
```

**Tagline options:**
- "Glint — governance for every agent."
- "Glint — lint for the age of agents."
- "Glint — the sharp edge of agent governance."

### Runner-up: `conch`

If the user wants more personality and literary depth over modern DX sharpness, `conch` is the alternative. The Lord of the Flies authority metaphor is unforgettable, and marine-themed without being claw-locked.

### If staying claw-native: `claws`

If managed agent support stays secondary and OpenClaw community positioning is primary, `claws` remains the right answer. The verb surface was designed for it. Nothing beats `claws pinch --fleet` in the claw ecosystem.
