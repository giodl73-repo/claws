# claws publish

<!-- atom:claws-publish (C93) -->

Governed publishing to ClawHub. One command wraps governance checks, manifest
signing, dependency audit, and badge generation around `clawhub publish`.

## What it does

`claws publish` runs four steps before your skill reaches ClawHub:

1. **Governance check** -- `claws check` (all rules must pass)
2. **Signed manifest** -- `.claws-manifest` with build hash + signer
3. **Dependency audit** -- `npm audit` + license scan
4. **Governance badge** -- tier + risk + OBO metadata for ClawHub

If any step fails, nothing gets published.

## Publishing a skill

```
$ claws publish

  claws publish — weather-lookup v1.2.0

  Step 1: Governance check
    ✓ R2 / none / PUBLIC — 12 governance, 16 security passed

  Step 2: Signed manifest
    ✓ sha256:a3f8c91d... · signer: giodl@craftworks

  Step 3: Dependency audit
    ✓ 14 packages, 0 vulnerabilities, MIT + Apache-2.0

  Step 4: Publish to ClawHub
    ✓ weather-lookup@1.2.0 published
    ✓ Badge: VERIFIED
    ✓ https://clawhub.dev/skills/weather-lookup

  Published in 3.2s
```

## When checks fail

Governance failures block publishing with actionable errors:

```
$ claws publish

  Step 1: Governance check
    ✗ declared-vs-actual-obo
      → SKILL.md declares obo: none
      → src/handler.ts calls sendEmail (OBO-EMAIL detected)
      Fix: change governance.obo to "email" in SKILL.md
      Docs: https://claws.dev/rules/declared-vs-actual-obo

  Publish blocked — 1 failure. Fix and retry.
```

No half-published state. Nothing reaches ClawHub until all checks pass.

## The signed manifest

Every publish creates `.claws-manifest`:

```json
{
  "skill": "weather-lookup",
  "version": "1.2.0",
  "tier": "VERIFIED",
  "governance": { "risk": "R2", "obo": "none", "data": "PUBLIC" },
  "build": {
    "hash": "sha256:a3f8c91d4b2e...",
    "timestamp": "2026-04-11T10:23:45Z",
    "signer": "giodl@craftworks",
    "clawsVersion": "0.4.1"
  },
  "dependencies": { "count": 14, "vulnerabilities": 0 }
}
```

The manifest travels with the package. Enterprise install policies can
require a valid manifest before allowing installation.

## What the ClawHub listing looks like

```
  ┌─────────────────────────────────────────────────┐
  │  weather-lookup                          v1.2.0 │
  │  Get the current weather for any city.          │
  │                                                 │
  │  ┌──────────────────────────────────────┐       │
  │  │  claws VERIFIED                      │       │
  │  │  Risk: R2 (READ) · OBO: none         │       │
  │  │  Supply chain: signed, scanned       │       │
  │  │  Deps: 14 (0 vulnerabilities)        │       │
  │  └──────────────────────────────────────┘       │
  │                                                 │
  │  ⬇ 2,340 installs · ★ 4.7 · Updated 2d ago    │
  └─────────────────────────────────────────────────┘
```

Skills without governance show no badge. DECLARED shows risk/obo/data.
TYPED adds "type-safe." VERIFIED adds "signed, scanned, tested."

## Any tier can publish

| Tier | What publish checks | Badge |
|------|-------------------|-------|
| DECLARED | Frontmatter valid, dependency audit | Risk + OBO + Data |
| TYPED | + handler matches declarations | + Type-safe |
| VERIFIED | + full security + signed manifest | + Signed + Scanned |

## claws publish vs clawhub publish

`claws publish` wraps `clawhub publish`. Switching is one word:

```bash
# Before                     # After
clawhub publish              claws publish
```

Same publish, plus governance checks and badge metadata. Existing CI
scripts and package.json scripts stay the same. Add `--ci` in pipelines
to disable interactive prompts and emit SARIF on failure.

## Scenario-Driven Additions

### From skill-lifecycle scenarios (37 findings applied)
- Publish distinguishes unsigned (no manifest) from invalid-signed (tampered manifest) with different error messages and remediation
- Fleet-level publish tier requirement: enterprise fleets can mandate minimum governance tier per risk level for published skills
- Security-relevant warnings (unsigned manifest, tier mismatch) are not suppressible by --quiet
- Publish atomicity: if remote publish fails, local state (version bump, badge metadata) is rolled back; no half-published state
- Badge freshness check at publish time ensures governance metadata reflects current handler, not stale VERIFIED status
- Manifest signing key source and key management documented alongside publish flow

## Next

- [skill-kit reference](skill-kit.md) -- building the skill
- [Testing your skill](claws-test.md) -- what gets checked before publish
- [Adoption tiers](tier-adoption.md) -- DECLARED/TYPED/VERIFIED
