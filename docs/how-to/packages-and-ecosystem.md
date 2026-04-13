# Use the Package Ecosystem

Navigate the three-tier package architecture, use @claws/sift for expressions, and manage the .NET for OpenClaw libraries.

## Three-Tier Packages

claws uses a three-tier package architecture:

| Tier | Scope | Audience | Example |
|------|-------|----------|---------|
| @openclaw/* | Contributed to OpenClaw upstream | All OC users | @openclaw/types |
| @claws/* | Shared governance libraries | claws users | @claws/sift, @bic/claws-skill-kit |
| @craftworks/* | Internal Craftworks packages | Craftworks devs | @craftworks/compiler-sdk |

Packages flow upstream: patterns proven in @craftworks/ graduate to @claws/, then to @openclaw/*.

## Use @claws/sift

sift is the typed expression engine for governance queries (a RELAX generalization):

```bash
npm install @claws/sift
```

```typescript
import { sift } from '@claws/sift';

const risky = sift('tools.where(risk >= "R4")');
const result = risky.evaluate(workspace);
```

## Use @bic/claws-skill-kit

skill-kit provides scaffolding and testing for governance skills:

```bash
npm install @bic/claws-skill-kit
```

```bash
# Create a new governance skill
npx skill-kit create "audit-trail-check"

# Run skill tests
npx skill-kit test

# Validate skill structure
npx skill-kit lint
```

## Governance Badges

Published skills receive governance badges on ClawHub:

| Badge | Meaning |
|-------|---------|
| DECLARED | Skill has claws.json, basic governance metadata |
| TYPED | Skill has typed parameters and return contracts |
| VERIFIED | Skill passes all governance checks, has eval suite |

Achieve VERIFIED badge:

```bash
claws check --skill my-skill        # Must pass all checks
claws build --skill my-skill         # Must compile cleanly
claws test --skill my-skill          # Must have passing tests
claws publish --skill my-skill       # Submits for badge evaluation
```

## Progressive Disclosure

claws exposes commands gradually based on user experience:

| Level | Commands | Trigger |
|-------|----------|---------|
| Basic (4) | init, build, check, uninstall | Default |
| Standard (18) | + watch, doctor, snap, publish, test, ... | After first build |
| Full (40) | + fleet, comply, assess, a2a, ... | Explicit `--full` or config |

Enable full command surface:

```json
{
  "disclosure": "full"
}
```

## Tier Adoption Path

Move workspaces through the adoption tiers:

```
DECLARED → TYPED → VERIFIED
```

1. **DECLARED**: Run `claws init` -- workspace has governance metadata
2. **TYPED**: Add typed parameters to all skills, pass `claws check --typed`
3. **VERIFIED**: Add eval suites, pass all governance checks, publish to ClawHub

## .NET for OpenClaw Vision

claws aims to be the .NET for OpenClaw -- a comprehensive standard library:

```
@claws/sift          → Expression engine (like LINQ)
@bic/claws-skill-kit     → Skill development (like ASP.NET templates)
@bic/claws-test          → Skill testing (like xUnit)
@claws/governance    → Policy engine (like .NET Security)
```

These libraries are platform-independent. They work with any OC-compatible workspace.
