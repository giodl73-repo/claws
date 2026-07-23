# Publish a Governance Skill

Package a governed skill, test it locally, and publish to ClawHub with governance badges.

## Prerequisites

- `@bic/claws-skill-kit` installed (`npm install @bic/claws-skill-kit`)
- A workspace with `claws.json` (for governance validation)
- ClawHub account configured

## Steps

### 1. Create the skill directory

Set up the standard structure:

```
my-skill/
  SKILL.md            Frontmatter: name, risk, obo, data classification
  src/
    handler.ts        Business logic using skill() factory
  package.json        Dependencies (@bic/claws-skill-kit as peer dep)
  tests/
    handler.test.ts   Tests using MockGateway
```

### 2. Declare governance in SKILL.md frontmatter

Add governance metadata at the top of SKILL.md:

```yaml
---
name: weather-lookup
risk: R2
obo: none
data: PUBLIC
---
```

These values are validated at build time. If your handler acts on behalf of the user (sends email, posts messages), set `obo` to the appropriate category (e.g., `email`, `messaging`). The `risk` level must match the handler's actual capabilities -- `claws publish` detects mismatches.

### 3. Write the handler

Use the `skill()` factory from `@bic/claws-skill-kit`:

```typescript
import { skill } from "@bic/claws-skill-kit";

export default skill({
  name: "weather-lookup",
  risk: "R2",
  obo: "none",
  data: "PUBLIC",
  handler: async (ctx) => {
    const city = ctx.input.get("city");
    return { forecast: await fetchWeather(city) };
  },
});
```

For higher-risk skills, use decorators (`@obo`, `@audit`, `@budget`, `@classify`, `@validate`, `@timeout`) on handler class methods. claws reads decorators at build time and generates governance wrappers.

### 4. Test with MockGateway

Test the skill without a running OC Gateway:

```typescript
import { MockGateway } from "@bic/claws-skill-kit/testing";
import weatherLookup from "./handler";

const gw = new MockGateway();
gw.mock("fetchWeather", { temp: 72 });

const result = await gw.run(weatherLookup, { city: "Seattle" });
expect(result.forecast.temp).toBe(72);
expect(gw.auditLog).toHaveLength(1);
```

MockGateway records audit events, tracks budget usage, and validates governance annotations -- same checks as the real Gateway, zero network.

### 5. Run governance checks

Verify the skill passes all governance rules:

```bash
claws check
```

The checker validates that declared frontmatter values match handler behavior. A `declared-vs-actual-obo` violation means SKILL.md says `obo: none` but the handler calls a tool that acts as the user.

### 6. Publish to ClawHub

Run the governed publish:

```bash
claws publish
```

This executes four steps in sequence: governance check (`claws check` -- all rules must pass), signed manifest generation (build hash + signer identity), dependency audit (`npm audit` + license scan), and publish to ClawHub with governance badge. If any step fails, nothing is published -- no half-published state.

The published skill receives a badge based on its governance tier:

| Tier     | Badge shows                         |
| -------- | ----------------------------------- |
| DECLARED | Risk + OBO + data classification    |
| TYPED    | + type-safe handler                 |
| VERIFIED | + signed manifest + dependency scan |

## What to do next

- [Write a governance rule](write-governance-rule.md) to add custom policies to your skill
- Review the [skill-kit concept guide](../concepts/skill-kit.md) for the full decorator reference
- Review [adoption tiers](../concepts/tier-adoption.md) to graduate from DECLARED to VERIFIED
