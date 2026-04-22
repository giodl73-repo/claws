---
covers: [atom:KTA, atom:KTA/adoption-path]
---

# Adoption path: DECLARED → TYPED → VERIFIED

Most skills don't need Ring 3 on day one. The adoption path lets
authors ship useful skills fast, then graduate to stronger
guarantees as they mature.

## Day 1 — Ring 1: DECLARED

```ts
// my-skill/src/index.ts
import { defineTool } from '@bic/claws-skill-kit/runtime';

export const fetchWeather = defineTool({
  name: 'fetch-weather',
  declaredTier: 'R1',
  async handler(args: { city: string }, ctx) {
    const res = await fetch(`https://weather.example.com/${args.city}`);
    return await res.json();
  },
});
```

Plus a TOOLS.md the build generates. Ship it. Users install the skill;
claws treats `fetch-weather` as R1 (public read). Done.

## Week 2 — Ring 2: TYPED

Add arg validation:

```ts
export const fetchWeather = defineTool({
  name: 'fetch-weather',
  declaredTier: 'R1',
  argsSchema: {
    type: 'object',
    properties: {
      city: { type: 'string', maxLength: 100, pattern: '^[a-zA-Z ,-]+$' },
    },
    required: ['city'],
  },
  async handler(args, ctx) {
    // args is now typed AND validated
    const res = await fetch(`https://weather.example.com/${args.city}`);
    return await res.json();
  },
});
```

The schema catches garbage inputs at runtime before they hit your
handler. Malformed args → `SchemaValidationError` + `DecisionEntry`
with `invalidReason: 'args-schema-violation'`.

## Month 2 — Ring 3: VERIFIED

Add scenarios covering the decision table:

```
my-skill/
  src/
    index.ts
  tests/
    fetch-weather.scenario.ts
  scenarios/
    FW/                       ← 2-letter series for fetch-weather
      SC-01-happy-path.md
      SC-02-bad-city.md
      SC-03-rate-limited.md
  manifest.yaml               ← declares FW series runner + min: 3
```

Each scenario exercises a distinct decision. Coverage runs per-file
at 95/90/95/95. Ring 3 graduates the skill to "green badge".

## Graduation criteria

A skill auto-detects its ring based on what's present:

- Has TOOLS.md: Ring 1
- All tools have argsSchema: Ring 2
- All tools have scenarios meeting coverage: Ring 3

Skill authors don't declare their ring — the build computes it and
writes it to `manifest.json`.

## Why the rings matter

The ring a skill is at determines:

- **Trust level** — hosts that require high trust only install
  Ring 3 skills
- **UI badge** — editors show the ring level; users see guarantees
  at a glance
- **Fleet policy** — admins can enforce "no Ring 1 skills on
  production workspaces"

See [../specs/KTA-three-rings.md](../specs/KTA-three-rings.md) for
the formal spec + [../tutorials/first-skill.md](../tutorials/first-skill.md)
for the from-scratch walkthrough.
