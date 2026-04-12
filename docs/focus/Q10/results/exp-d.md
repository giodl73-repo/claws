# Experiment d: Name Bakeoff Round 3

**Method**: design analysis
**Date**: 2026-04-11

---

## Overview

The compilation model changes the identity calculus. This tool is not a linter that reports findings — it is a COMPILER that reads 9 workspace source files and emits executable TypeScript, Python, and JSON enforcement programs. The name must signal "this generates code from your workspace files."

---

## Scoring Rubric

| Criterion | Weight | What it measures |
|-----------|--------|-----------------|
| Compiler signal | 25% | Does the name say "this generates code"? |
| Cross-platform | 20% | Does it work beyond OpenClaw (Cursor, Claude, Bedrock, LangGraph)? |
| Community / modern DX | 15% | Would a developer put this in their README badge? |
| TypeScript analogy | 15% | Does it evoke "types for agents" / "TypeScript for workspaces"? |
| Memorable / fun | 10% | Can you say it in a meeting without explaining it? |
| Collision safety | 10% | npm, PyPI, GitHub — is the name free? |
| Length (3-6 chars) | 5% | Short enough for CLI muscle memory |

---

## Existing Candidates

### 1. `glint` (5 chars)

**What it signals**: Governance lint. A sharp reflection. Modern, approachable.

**What `glint build openclaw` looks like**:
```bash
$ glint build openclaw
  Compiled 9 workspace files → governance-ir.json
  Emitting OpenClaw: skills/glint-governance/, hooks/glint-guard.ts, plugins/glint-gateway/
  ✓ Built in 487ms (29 rules, 0 violations)
```

**What `glint pinch` looks like**:
```bash
$ glint pinch
  ✓ 29 rules checked in 0.3s. 0 violations, 2 warnings.
```

| Criterion | Score | Notes |
|-----------|-------|-------|
| Compiler signal | 4/10 | "lint" is in the name. Linters don't generate code. Undersells the compiler. |
| Cross-platform | 9/10 | Platform-neutral. Works for anything. |
| Community / DX | 9/10 | Modern, short, badge-friendly. |
| TS analogy | 3/10 | No "type" or "compile" signal. |
| Memorable / fun | 8/10 | Easy to say, easy to remember. |
| Collision safety | 7/10 | npm: `glint` is taken (Ember linter). Would need `@craftworks/glint`. |
| Length | 10/10 | 5 chars. Perfect. |

**Weighted score**: 0.25(4) + 0.20(9) + 0.15(9) + 0.15(3) + 0.10(8) + 0.10(7) + 0.05(10) = 1.0 + 1.8 + 1.35 + 0.45 + 0.8 + 0.7 + 0.5 = **6.6**

---

### 2. `claws` (5 chars)

**What it signals**: Claw compiler. The `{lang}c` convention (like `rustc`, `scalac`, `kotlinc`).

**What `claws build openclaw` looks like**:
```bash
$ claws build openclaw
  Compiled 9 workspace files → governance-ir.json
  Emitting OpenClaw: skills/claws-governance/, hooks/claws-guard.ts
  ✓ Built in 487ms (29 rules, 0 violations)
```

**What `claws pinch` looks like**:
```bash
$ claws pinch
  ✓ 29 rules checked in 0.3s. 0 violations, 2 warnings.
```

| Criterion | Score | Notes |
|-----------|-------|-------|
| Compiler signal | 8/10 | `{lang}c` convention is universally recognized. Developers see "compiler." |
| Cross-platform | 3/10 | "Claw" ties it to OpenClaw. `claws build cursor` feels wrong. |
| Community / DX | 5/10 | Niche. Non-OC developers won't understand the name. |
| TS analogy | 6/10 | The `c` suffix says "compiler" clearly. No "type" signal. |
| Memorable / fun | 6/10 | Easy to say. "claw-see." |
| Collision safety | 9/10 | No npm/PyPI collisions found. |
| Length | 10/10 | 5 chars. |

**Weighted score**: 0.25(8) + 0.20(3) + 0.15(5) + 0.15(6) + 0.10(6) + 0.10(9) + 0.05(10) = 2.0 + 0.6 + 0.75 + 0.9 + 0.6 + 0.9 + 0.5 = **6.25**

---

### 3. `typeclaw` (8 chars)

**What it signals**: TypeScript-for-Claw. "Types for your agents." The TypeScript analogy made explicit.

**What `typeclaw build openclaw` looks like**:
```bash
$ typeclaw build openclaw
  Compiled 9 workspace files → governance-ir.json
  Emitting OpenClaw: skills/typeclaw-governance/, hooks/typeclaw-guard.ts
  ✓ Built in 487ms (29 rules, 0 violations)
```

**What `typeclaw pinch` looks like**:
```bash
$ typeclaw pinch
  ✓ 29 rules checked in 0.3s. 0 violations, 2 warnings.
```

| Criterion | Score | Notes |
|-----------|-------|-------|
| Compiler signal | 9/10 | "Type" implies compilation. TypeScript precedent is strong. |
| Cross-platform | 4/10 | "Claw" ties it to OpenClaw. |
| Community / DX | 7/10 | TypeScript developers get it immediately. Non-TS devs may not. |
| TS analogy | 10/10 | The pitch writes itself: "TypeClaw adds types to your agent workspace." |
| Memorable / fun | 6/10 | Pronounceable ("type-claw") but 8 chars is long for CLI. |
| Collision safety | 8/10 | No collisions found. |
| Length | 3/10 | 8 chars. Too long for frequent CLI use. |

**Weighted score**: 0.25(9) + 0.20(4) + 0.15(7) + 0.15(10) + 0.10(6) + 0.10(8) + 0.05(3) = 2.25 + 0.8 + 1.05 + 1.5 + 0.6 + 0.8 + 0.15 = **7.15**

---

### 4. `tycl` (4 chars)

**What it signals**: TypeClaw abbreviated. Like `tsc` for TypeScript.

| Criterion | Score | Notes |
|-----------|-------|-------|
| Compiler signal | 5/10 | Abbreviation too opaque. `tycl` doesn't scream "compiler." |
| Cross-platform | 4/10 | Still has "claw" DNA. |
| Community / DX | 3/10 | Unpronounceable. "tick-el"? "tie-cull"? |
| TS analogy | 4/10 | Only recognizable if you already know TypeClaw. |
| Memorable / fun | 2/10 | Forgettable. Hard to say. |
| Collision safety | 9/10 | No collisions. |
| Length | 10/10 | 4 chars. |

**Weighted score**: 0.25(5) + 0.20(4) + 0.15(3) + 0.15(4) + 0.10(2) + 0.10(9) + 0.05(10) = 1.25 + 0.8 + 0.45 + 0.6 + 0.2 + 0.9 + 0.5 = **4.7**

---

### 5. `agc` (3 chars)

**What it signals**: Agent Governance Compiler.

| Criterion | Score | Notes |
|-----------|-------|-------|
| Compiler signal | 6/10 | "c" says compiler, but the abbreviation is opaque. |
| Cross-platform | 8/10 | "Agent" is platform-neutral. |
| Community / DX | 3/10 | Acronyms are corporate, not community. |
| TS analogy | 2/10 | No type signal. |
| Memorable / fun | 2/10 | Sounds like a government agency. |
| Collision safety | 5/10 | AGC is a common acronym (Apollo Guidance Computer, etc.). |
| Length | 10/10 | 3 chars. |

**Weighted score**: 0.25(6) + 0.20(8) + 0.15(3) + 0.15(2) + 0.10(2) + 0.10(5) + 0.05(10) = 1.5 + 1.6 + 0.45 + 0.3 + 0.2 + 0.5 + 0.5 = **5.05**

---

### 6. `goc` (3 chars)

**What it signals**: Governance Compiler.

| Criterion | Score | Notes |
|-----------|-------|-------|
| Compiler signal | 7/10 | "c" says compiler. |
| Cross-platform | 7/10 | "Governance" is platform-neutral. |
| Community / DX | 3/10 | Sounds like a typo of "Go compiler." |
| TS analogy | 2/10 | No type signal. |
| Memorable / fun | 3/10 | Confusable with `go` toolchain. |
| Collision safety | 4/10 | "goc" conflicts with Go community naming conventions. |
| Length | 10/10 | 3 chars. |

**Weighted score**: 0.25(7) + 0.20(7) + 0.15(3) + 0.15(2) + 0.10(3) + 0.10(4) + 0.05(10) = 1.75 + 1.4 + 0.45 + 0.3 + 0.3 + 0.4 + 0.5 = **5.1**

---

### 7. `arc` (3 chars)

**What it signals**: Agent Rule Compiler.

| Criterion | Score | Notes |
|-----------|-------|-------|
| Compiler signal | 6/10 | "c" says compiler but "arc" reads as a shape/trajectory. |
| Cross-platform | 7/10 | Platform-neutral. |
| Community / DX | 7/10 | Short, modern, has energy. |
| TS analogy | 2/10 | No type signal. |
| Memorable / fun | 7/10 | Easy to say, evocative (trajectory, protection arc). |
| Collision safety | 3/10 | `arc` is heavily used (ARC browser, arc lint, etc.). |
| Length | 10/10 | 3 chars. |

**Weighted score**: 0.25(6) + 0.20(7) + 0.15(7) + 0.15(2) + 0.10(7) + 0.10(3) + 0.05(10) = 1.5 + 1.4 + 1.05 + 0.3 + 0.7 + 0.3 + 0.5 = **5.75**

---

### 8. `forge` (5 chars)

**What it signals**: Compile/forge enforcement code. Like a blacksmith forging governance.

| Criterion | Score | Notes |
|-----------|-------|-------|
| Compiler signal | 8/10 | "Forge" implies creation/construction. Strong generative signal. |
| Cross-platform | 8/10 | Platform-neutral. Universal metaphor. |
| Community / DX | 8/10 | Strong brand. Evocative. |
| TS analogy | 3/10 | No type signal. Different metaphor family. |
| Memorable / fun | 9/10 | Great word. Easy to say. "forge build openclaw" sounds powerful. |
| Collision safety | 2/10 | Heavily used: Electron Forge, Oracle Java Forge, Minecraft Forge, etc. |
| Length | 10/10 | 5 chars. |

**Weighted score**: 0.25(8) + 0.20(8) + 0.15(8) + 0.15(3) + 0.10(9) + 0.10(2) + 0.05(10) = 2.0 + 1.6 + 1.2 + 0.45 + 0.9 + 0.2 + 0.5 = **6.85**

---

### 9. `aegis` (5 chars)

**What it signals**: Shield, protection. Greek mythology.

| Criterion | Score | Notes |
|-----------|-------|-------|
| Compiler signal | 3/10 | "Shield" says protection, not compilation. |
| Cross-platform | 8/10 | Platform-neutral. |
| Community / DX | 7/10 | Evocative, mythological. |
| TS analogy | 1/10 | No type or compile signal. |
| Memorable / fun | 8/10 | Great word. Easy to say. |
| Collision safety | 5/10 | Several projects named Aegis (Aegis Authenticator, etc.). |
| Length | 10/10 | 5 chars. |

**Weighted score**: 0.25(3) + 0.20(8) + 0.15(7) + 0.15(1) + 0.10(8) + 0.10(5) + 0.05(10) = 0.75 + 1.6 + 1.05 + 0.15 + 0.8 + 0.5 + 0.5 = **5.35**

---

## New Candidates

### 10. `ward` (4 chars)

**What it signals**: Guardian/warden. "Ward your agents." A ward is a protective barrier AND a custodial role (warden). As a verb: "ward off attacks."

**What `ward build openclaw` looks like**:
```bash
$ ward build openclaw
  Compiled 9 workspace files → governance-ir.json
  Emitting OpenClaw: skills/ward-governance/, hooks/ward-guard.ts
  ✓ Built in 487ms (29 rules, 0 violations)
```

**What `ward pinch` looks like**:
```bash
$ ward pinch
  ✓ 29 rules checked in 0.3s. 0 violations, 2 warnings.
```

| Criterion | Score | Notes |
|-----------|-------|-------|
| Compiler signal | 5/10 | "Ward" is more guardian than compiler. But "ward build" works. |
| Cross-platform | 9/10 | Completely platform-neutral. |
| Community / DX | 8/10 | Short, English, approachable. |
| TS analogy | 2/10 | No type signal. |
| Memorable / fun | 8/10 | Easy to say, clear meaning, verb and noun. |
| Collision safety | 6/10 | Common word but fewer direct CLI collisions. |
| Length | 10/10 | 4 chars. |

**Weighted score**: 0.25(5) + 0.20(9) + 0.15(8) + 0.15(2) + 0.10(8) + 0.10(6) + 0.05(10) = 1.25 + 1.8 + 1.2 + 0.3 + 0.8 + 0.6 + 0.5 = **6.45**

---

### 11. `mint` (4 chars)

**What it signals**: Mint governance tokens/artifacts. "Mint" means to produce/create authoritatively (like minting coins). Crypto/blockchain resonance (minting = creating signed artifacts). Fresh, clean.

**What `mint build openclaw` looks like**:
```bash
$ mint build openclaw
  Compiled 9 workspace files → governance-ir.json
  Emitting OpenClaw: skills/mint-governance/, hooks/mint-guard.ts
  ✓ Minted in 487ms (29 rules, 0 violations)
```

**What `mint pinch` looks like**:
```bash
$ mint pinch
  ✓ 29 rules checked in 0.3s. 0 violations, 2 warnings.
```

| Criterion | Score | Notes |
|-----------|-------|-------|
| Compiler signal | 7/10 | "Minting" implies creation of authoritative artifacts. |
| Cross-platform | 9/10 | Completely platform-neutral. |
| Community / DX | 8/10 | Fresh, modern, short. |
| TS analogy | 3/10 | No type signal, but "minting types" is a stretch. |
| Memorable / fun | 9/10 | Great word. "mint build" is satisfying to say. |
| Collision safety | 4/10 | Linux Mint, mint.js, etc. Crowded namespace. |
| Length | 10/10 | 4 chars. |

**Weighted score**: 0.25(7) + 0.20(9) + 0.15(8) + 0.15(3) + 0.10(9) + 0.10(4) + 0.05(10) = 1.75 + 1.8 + 1.2 + 0.45 + 0.9 + 0.4 + 0.5 = **7.0**

---

### 12. `glyph` (5 chars)

**What it signals**: A glyph is a symbolic representation — the compiler turns workspace prose into symbolic/executable form. Code as glyphs. Also: "governance glyph" abbreviation works.

**What `glyph build openclaw` looks like**:
```bash
$ glyph build openclaw
  Compiled 9 workspace files → governance-ir.json
  Emitting OpenClaw: skills/glyph-governance/, hooks/glyph-guard.ts
  ✓ Built in 487ms (29 rules, 0 violations)
```

**What `glyph pinch` looks like**:
```bash
$ glyph pinch
  ✓ 29 rules checked in 0.3s. 0 violations, 2 warnings.
```

| Criterion | Score | Notes |
|-----------|-------|-------|
| Compiler signal | 7/10 | Glyphs are compiled symbols. Strong "representation transformation" signal. |
| Cross-platform | 9/10 | Completely platform-neutral. |
| Community / DX | 8/10 | Unique, modern, distinctive. |
| TS analogy | 5/10 | "Glyphs for your agents" — symbolic representation is adjacent to typing. |
| Memorable / fun | 8/10 | Interesting word. Easy to say. Visually distinctive. |
| Collision safety | 7/10 | Some font/typography tools, but few CLI tools. |
| Length | 10/10 | 5 chars. |

**Weighted score**: 0.25(7) + 0.20(9) + 0.15(8) + 0.15(5) + 0.10(8) + 0.10(7) + 0.05(10) = 1.75 + 1.8 + 1.2 + 0.75 + 0.8 + 0.7 + 0.5 = **7.5**

---

### 13. `sigil` (5 chars)

**What it signals**: A sigil is a magical symbol of authority and protection. In programming, sigils are type-prefixed symbols ($, @, %). "Governance sigils" — the compiler generates typed enforcement symbols from workspace prose.

**What `sigil build openclaw` looks like**:
```bash
$ sigil build openclaw
  Compiled 9 workspace files → governance-ir.json
  Emitting OpenClaw: skills/sigil-governance/, hooks/sigil-guard.ts
  ✓ Built in 487ms (29 rules, 0 violations)
```

**What `sigil pinch` looks like**:
```bash
$ sigil pinch
  ✓ 29 rules checked in 0.3s. 0 violations, 2 warnings.
```

| Criterion | Score | Notes |
|-----------|-------|-------|
| Compiler signal | 7/10 | Sigils in programming are type markers. "Sigil" implies transformation and typing. |
| Cross-platform | 9/10 | Platform-neutral. Universal metaphor. |
| Community / DX | 7/10 | Interesting, distinctive, slightly esoteric. |
| TS analogy | 7/10 | Sigils ARE type markers in programming. Strong analogy. |
| Memorable / fun | 8/10 | Evocative, magical, easy to pronounce. |
| Collision safety | 7/10 | Few direct CLI collisions found. |
| Length | 10/10 | 5 chars. |

**Weighted score**: 0.25(7) + 0.20(9) + 0.15(7) + 0.15(7) + 0.10(8) + 0.10(7) + 0.05(10) = 1.75 + 1.8 + 1.05 + 1.05 + 0.8 + 0.7 + 0.5 = **7.65**

---

### 14. `rune` (4 chars)

**What it signals**: A rune is an ancient symbol with power. In programming, Go uses "rune" for character types. "Governance runes" — the compiler inscribes typed enforcement from workspace prose.

**What `rune build openclaw` looks like**:
```bash
$ rune build openclaw
  Compiled 9 workspace files → governance-ir.json
  Emitting OpenClaw: skills/rune-governance/, hooks/rune-guard.ts
  ✓ Built in 487ms (29 rules, 0 violations)
```

| Criterion | Score | Notes |
|-----------|-------|-------|
| Compiler signal | 6/10 | Runes are symbols, but less obviously "compiler." |
| Cross-platform | 9/10 | Platform-neutral. |
| Community / DX | 8/10 | Short, evocative, modern gaming/crypto resonance. |
| TS analogy | 5/10 | Go's "rune" is a type. Some type signal. |
| Memorable / fun | 9/10 | Great word. 4 chars. Easy to say. |
| Collision safety | 5/10 | Rune Labs, various rune-* packages. |
| Length | 10/10 | 4 chars. |

**Weighted score**: 0.25(6) + 0.20(9) + 0.15(8) + 0.15(5) + 0.10(9) + 0.10(5) + 0.05(10) = 1.5 + 1.8 + 1.2 + 0.75 + 0.9 + 0.5 + 0.5 = **7.15**

---

## Final Ranking

| Rank | Name | Score | Strengths | Weaknesses |
|------|------|-------|-----------|------------|
| 1 | **`sigil`** | **7.65** | Type-marker analogy, compiler signal, distinctive, cross-platform | Slightly esoteric |
| 2 | **`glyph`** | **7.5** | Symbolic transformation, distinctive, modern, cross-platform | Less obvious compiler signal than sigil |
| 3 | **`typeclaw`** | **7.15** | Perfect TS analogy, strongest compiler signal | 8 chars (too long for CLI), OC-specific |
| 4 | **`rune`** | **7.15** | Short (4 chars), memorable, modern | Weaker compiler signal, Go collision |
| 5 | **`mint`** | **7.0** | Authoritative creation, fresh, modern | Crowded namespace (Linux Mint) |
| 6 | **`forge`** | **6.85** | Strong generative signal, universal | Heavy collision (Electron Forge, etc.) |
| 7 | **`glint`** | **6.6** | Modern DX, cross-platform, short | "Lint" undersells the compiler |
| 8 | **`ward`** | **6.45** | Guardian meaning, short, approachable | Not a compiler word |
| 9 | **`claws`** | **6.25** | Clear compiler signal via `{lang}c` | OC-specific, weak cross-platform |
| 10 | **`aegis`** | **5.35** | Great word, mythological | No compiler signal at all |
| 11 | **`arc`** | **5.75** | Short, energetic | Heavy collision, no compiler signal |
| 12 | **`goc`** | **5.1** | Short, compiler suffix | Confusable with Go |
| 13 | **`agc`** | **5.05** | Platform-neutral, compiler suffix | Corporate acronym feel |
| 14 | **`tycl`** | **4.7** | Short | Unpronounceable, opaque |

---

## Analysis

### The Top Tier (7.0+)

Five names score above 7.0. They split into two families:

**Symbolic family**: `sigil`, `glyph`, `rune` — all evoke "symbols with power" and "transformation from one representation to another." This is exactly what the compiler does: transform workspace prose into typed enforcement code. The symbolic metaphor captures compilation without being an acronym.

**Type family**: `typeclaw` — the TypeScript analogy made explicit. "Types for your agents." The pitch writes itself. But it's 8 characters and OC-specific.

**Creation family**: `mint` — authoritative creation of artifacts. The blockchain/crypto resonance is a double-edged sword (some developers love it, some are fatigued).

### The Critical Question

> Does the name tell the developer "this generates code from my workspace files"?

- **`sigil`**: Yes — "sigil build" implies inscribing typed symbols from workspace content. Programming sigils are type markers. A developer sees "sigil" and thinks "typed transformation."
- **`glyph`**: Partially — "glyph build" implies symbolic representation. The compiler transforms prose into symbols. But "glyph" is more passive (a glyph is a symbol you READ, not generate).
- **`typeclaw`**: Yes — "types for your agents" is immediately clear. But OC-locked.
- **`rune`**: Partially — runes have power (protection, enforcement) but the "compilation" signal is weaker.
- **`glint`**: No — "glint" says "lint." Linters don't generate code.

---

## Recommendation

**`sigil` is the recommended name.**

Rationale:
1. **Compiler identity**: Sigils in programming ARE type markers. A "sigil" is literally a symbol that tells you the type of something ($string, @array, %hash). The tool adds type-like governance to agent workspaces. The analogy is deep, not surface.
2. **Cross-platform**: Completely platform-neutral. Works for OpenClaw, Cursor, Claude, Bedrock, anything.
3. **The generation signal**: "Sigil build" implies the tool inscribes/generates enforcement from source. Sigils are CREATED, not just checked.
4. **Memorable**: 5 characters, easy to pronounce ("SIH-jil"), distinctive in the CLI tooling landscape.
5. **The crustacean connection**: A crab's claws leave marks in sand — sigils. The governance compiler leaves typed enforcement marks in the workspace. The metaphor extends without requiring the name to say "claw."
6. **Conversation test**: "We use sigil to compile governance for our agents." Clear, professional, no explanation needed.

**Fallback**: `glyph` — nearly as strong, slightly more intuitive for non-programmers.

**If OC-only is acceptable**: `typeclaw` — the TypeScript analogy is unbeatable for OC developers, but the name dies outside the OpenClaw ecosystem.

### What changes

| Asset | `glint` (current) | `sigil` (proposed) |
|-------|-------------------|-------------------|
| CLI | `glint` | `sigil` |
| Config | `glint.json` | `sigil.json` |
| Directory | `.glint/` | `.sigil/` |
| npm package | `@craftworks/glint` | `@craftworks/sigil` |
| Generated skill | `skills/glint-governance/` | `skills/sigil-governance/` |
| Hook | `hooks/glint-guard.ts` | `hooks/sigil-guard.ts` |
| Plugin | `plugins/glint-gateway/` | `plugins/sigil-gateway/` |
| Crustacean verb | `sigil pinch` | Preserved. "Pinch" is the verb, not the name. |

---

## Findings

1. **The lint problem is real.** `glint` scores 4/10 on compiler signal. When the tool's primary value is compilation (generating enforcement code), a name that says "lint" actively misleads. Every conversation starts with "it's not actually a linter."

2. **Cross-platform eliminates OC-specific names.** `claws` and `typeclaw` score 3-4/10 on cross-platform. The tool governs Cursor, Claude, Bedrock, and LangGraph agents. An OC-specific name limits adoption.

3. **The symbolic family beats the acronym family.** `sigil`, `glyph`, `rune` all score higher than `agc`, `goc`, `tycl`. Evocative names that imply transformation outperform mechanical abbreviations.

4. **Collision safety matters more than memorable-ness.** `forge` (9/10 memorable) is killed by collision (2/10). `sigil` (8/10 memorable) survives with clean namespace (7/10).

5. **The TypeScript analogy is powerful but not essential.** `typeclaw` scores 10/10 on the TS analogy but 4/10 on cross-platform. `sigil` scores 7/10 on the TS analogy (sigils ARE type markers) and 9/10 on cross-platform. The analogy works without being literal.
