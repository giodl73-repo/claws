# Three-Tier Adoption

<!-- atom:tier-adoption (C45) -->

Start in 2 minutes. Graduate when ready.

## Tier 1: DECLARED (3 YAML lines, 2 minutes)

Add governance frontmatter to your SKILL.md. No dependencies, no build step:

```markdown
---
governance:
  risk: R2
  obo: none
  data: PUBLIC
---

# Weather Lookup

Get the current weather for any city.
```

```
$ claws pinch
  ✓ Risk: R2 (READ) · OBO: none · Data: PUBLIC
  Tier: DECLARED
  1 skill declared in 0.1s
```

**What you get**: A governance badge on ClawHub. Enterprise fleet scans can
see your skill. Risk is visible to installers. Total effort: 3 lines.

Not sure what to put? Run `claws annotate` -- it reads your SKILL.md and
suggests values. Values: risk (R1=OBSERVE through R5=TRANSACT), obo (none,
email, message, calendar, social, purchase, transact), data (PUBLIC,
INTERNAL, CONFIDENTIAL, RESTRICTED).

## Tier 2: TYPED (skill-kit import, 15 minutes)

Install @bic/claws-skill-kit and wrap your handler with `skill()`:

```
npm install @bic/claws-skill-kit
```

```typescript
import { skill, audit } from "@bic/claws-skill-kit";

class WeatherHandler {
  @audit("lookup")
  async handle(ctx) {
    const forecast = await ctx.tools.fetchWeather(ctx.input.get("city"));
    return { city: ctx.input.get("city"), forecast };
  }
}

export default skill({
  name: "weather-lookup",
  risk: "R2",
  obo: "none",
  data: "PUBLIC",
  handler: WeatherHandler,
});
```

```
$ claws pinch
  ✓ Frontmatter: R2 / none / PUBLIC
  ✓ Handler matches declarations
  ✓ @audit decorator: lookup action logged
  Tier: TYPED
  1 skill typed in 0.3s
```

**On top of DECLARED**: Typed handler context. Build-time checks that declared
risk matches actual tool usage. Decorators generate governance wrappers.

## Tier 3: VERIFIED (full compile, 30 minutes)

Run `claws build --skill` to compile your SKILL.md and handler into a full
governance package with generated tests and a signed manifest:

```
$ claws build --skill
  Parse:    SKILL.md               0.8ms
  Extract:  src/handler.ts         2.1ms
  Analyze:  risk classification    1.2ms
  Generate: governance wrappers    3.4ms
  Emit:     .claws/dist/ (4 files) 1.0ms
  Build: 8.5ms — VERIFIED

$ claws test
  Scenarios:    3 passed
  Governance:  12 checks passed
  Security:    16 rules passed
  ✓ weather-lookup VERIFIED in 1.2s
```

**On top of TYPED**: Auto-generated test cases from SKILL.md scenarios. Signed
manifest proving build provenance. Full governance and security validation.

## Badge progression on ClawHub

```
  DECLARED        Risk: R2 (READ) · OBO: none · Data: PUBLIC
  TYPED           Risk: R2 (READ) · OBO: none · Type-safe handler
  VERIFIED        Risk: R2 (READ) · OBO: none · Signed · Scanned · Tested
```

Enterprise install policies can require tiers by risk level: DECLARED for
R1-R2, TYPED for R3, VERIFIED for R4-R5.

## Which tier should I use?

| Situation                       | Tier     | Why                               |
| ------------------------------- | -------- | --------------------------------- |
| Hobby skill, low risk           | DECLARED | 3 lines, done                     |
| Production skill, medium risk   | TYPED    | Type safety catches real bugs     |
| Enterprise or OBO skill         | VERIFIED | Signed manifests, generated tests |
| Existing skill, want visibility | DECLARED | Zero dependencies, 2 minutes      |

Most skills will stay DECLARED. That's fine -- Tier 1 is designed to feel
complete, not like a stepping stone.

## Scenario-Driven Additions

### From skill-lifecycle scenarios (37 findings applied)

- Tier detection is from workspace state (handler analysis, manifest presence) not stored metadata -- tier is recomputed each time
- Prompt-only skill tier ceiling: skills without a handler (SKILL.md-only) can reach DECLARED but skip TYPED and VERIFIED
- Enterprise tier-per-risk enforcement: fleet policies can mandate VERIFIED for R4-R5 skills and TYPED for R3
- Signature staleness detection: modifying handler.ts after VERIFIED invalidates the manifest and triggers tier downgrade
- Visual distinction between DECLARED and VERIFIED badges with self-reported qualifier on DECLARED tier
- Data sensitivity requires higher tier for enterprise trust: RESTRICTED data skills need VERIFIED in enterprise contexts

## Next

- [skill-kit reference](skill-kit.md) -- the @bic/claws-skill-kit framework
- [Testing your skill](claws-test.md) -- what `claws test` actually checks
- [Publishing to ClawHub](claws-publish.md) -- governed publish with badges
