# Experiment b: Naming Surface Options

**Method**: design analysis
**Date**: 2026-04-11

---

## First-Impression Test

An OpenClaw user runs `claws init` and sees new files in their workspace. What do they think?

### Option A: Craftworks-native (.craft/ + craft.json)

```
my-agent/
  SOUL.md
  AGENTS.md
  openclaw.json
  craft.json              ← "What is craft?"
  .craft/                 ← "What is .craft? I didn't install anything called craft."
    policies/
      soc2-baseline.yaml
    .track/
      audit-chain.jsonl
```

**First impression**: Confusion. "I installed claws, but now I see 'craft' everywhere."
**Cross-platform**: Works — .craft/ is platform-agnostic internally.
**Brand**: Leaks Craftworks internals. User didn't sign up for Craftworks.
**Verdict**: Fail. Brand leakage for a product CLI.

### Option B: OC-native (extend openclaw.json + .openclaw/governance/)

```
my-agent/
  SOUL.md
  AGENTS.md
  openclaw.json           ← extended: { ..., "governance": { "template": "soc2", ... } }
  .openclaw/              ← may already exist (OC uses this for some config)
    governance/
      policies/
        soc2-baseline.yaml
      audit/
        chain.jsonl
      cache/
```

**First impression**: Native. "Governance lives alongside my OpenClaw config."
**Cross-platform**: Problem. If I cross-compile to Cursor, does Cursor output go in `.openclaw/`? That's wrong — Cursor isn't OpenClaw.
**Brand**: No brand. User doesn't know they're using Craftworks (maybe good, maybe bad).
**Verdict**: Best for OC-only users. Awkward for cross-compilation.

### Option C: Product-native (.claws/ + claws.json)

```
my-agent/
  SOUL.md
  AGENTS.md
  openclaw.json
  claws.json             ← "That's the tool I installed."
  .claws/
    policies/
      soc2-baseline.yaml
    audit/
      chain.jsonl
    cache/
```

**First impression**: Clear. "claws created .claws/. Makes sense."
**Cross-platform**: Works — .claws/ is the governance tool's directory, not the agent platform's.
**Brand**: Product-specific. Ties governance to the tool, not the platform.
**Verdict**: Clean. But if tool is renamed, directories are wrong. (How likely is a rename? Low — we control the name.)

### Option D: Generic (.governance/ + governance.json)

```
my-agent/
  SOUL.md
  AGENTS.md
  openclaw.json
  governance.json
  .governance/
    policies/
      soc2-baseline.yaml
    audit/
      chain.jsonl
    cache/
```

**First impression**: Bland but clear. "This is where governance lives."
**Cross-platform**: Best — works for any agent format. "Governance" is universal.
**Brand**: None. No product association. Discoverable but unbranded.
**Verdict**: Most portable. But misses the product branding opportunity.

---

## Decision Matrix

| Criterion | Weight | A (.craft/) | B (.openclaw/) | C (.claws/) | D (.governance/) |
|-----------|--------|-------------|---------------|-------------|-----------------|
| First impression (OC user) | 25% | 2/10 | 9/10 | 7/10 | 6/10 |
| Cross-platform compat | 20% | 8/10 | 4/10 | 8/10 | 10/10 |
| Brand clarity | 15% | 3/10 | 5/10 | 8/10 | 2/10 |
| Discoverability | 15% | 5/10 | 8/10 | 7/10 | 7/10 |
| Rename resilience | 10% | 5/10 | 9/10 | 4/10 | 10/10 |
| Ecosystem fit | 15% | 4/10 | 8/10 | 6/10 | 7/10 |
| **Weighted score** | | **4.30** | **7.10** | **6.85** | **6.95** |

---

## The Hybrid: Option B+ (OC-native with cross-compile output separation)

The problem with pure Option B is cross-compilation output. Solution: governance lives in `.openclaw/governance/`, but cross-compilation output goes to a build directory:

```
my-agent/
  SOUL.md
  AGENTS.md
  openclaw.json           ← extended with governance config
  .openclaw/
    governance/           ← governance artifacts (policies, audit, cache)
      policies/
      audit/
      cache/
  build/                  ← cross-compilation output (gitignored)
    cursor/               ← claws build cursor
    claude/               ← claws build claude
    ma/                   ← claws build ma
```

This solves the cross-platform problem: governance is OC-native, build output is in a standard `build/` directory. Every language ecosystem uses `build/` or `dist/`.

The `openclaw.json` extension:

```json
{
  "name": "my-agent",
  "model": "claude-sonnet-4-5-20250514",
  "governance": {
    "template": "soc2",
    "trustTier": 2,
    "policies": [".openclaw/governance/policies/soc2-baseline.yaml"],
    "audit": true,
    "budgetCeiling": { "max": 50, "currency": "USD" }
  }
}
```

No new config file. No new dot-directory concept. Governance extends what already exists.

---

## Verdict: Option B+ (OC-native with build/ output separation)

**Governance**: `.openclaw/governance/` — native, expected, discoverable
**Config**: extend `openclaw.json` with `governance` section — no new files
**Build output**: `build/<target>/` — standard, gitignored, platform-agnostic
**Cache/snapshots**: `.openclaw/governance/cache/` — collocated with governance

---

## Internal Mapping

The SDK workspace-detector handles the translation:

| User sees | SDK resolves to | Why |
|-----------|----------------|-----|
| `.openclaw/governance/policies/` | Policy discovery path | Same as `.craft/policies/` internally |
| `.openclaw/governance/audit/chain.jsonl` | Audit chain path | Same as `.craft/.track/audit-chain.jsonl` |
| `.openclaw/governance/cache/` | Three-tier cache path | Same as `.craft/cache/` |
| `openclaw.json` → `governance` | Governance config | Overlays onto CompilationContext |
| `build/cursor/` | Emit output path | Same as craft build output |

When Craftworks runs internally (craft/guard/fleet), it uses `.craft/`. When claws runs, it uses `.openclaw/governance/`. The SDK resolves both to the same internal types. This is workspace-detector.ts and project-resolver.ts doing their job.

---

## Key Findings

1. **Option B+ scores highest** — OC-native governance + standard build output
2. **No new config file needed** — extend existing openclaw.json with governance section
3. **No new dot-directory concept** — .openclaw/ already exists in OC ecosystem
4. **Cross-compilation output goes to build/** — standard, gitignored, platform-agnostic
5. **SDK handles internal translation** — .openclaw/governance/ maps to same types as .craft/
6. **Zero "what is craft?" moments** — the entire user surface is OC-native
