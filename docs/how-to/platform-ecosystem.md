# Platform Ecosystem

Work with the three-tier package model, pinch optimization, sift expressions, and the .NET for OpenClaw vision.

## Understand Three-Tier Packages

claws organizes packages into three tiers:

| Tier | Package prefix | Audience | Examples |
|------|---------------|----------|----------|
| @openclaw/* | Community | OC developers | @openclaw/core, @openclaw/gateway |
| @claws/* | Shared libraries | claws users | @bic/claws-skill-kit, @claws/sift, @bic/claws-test |
| @craftworks/* | Internal | Craftworks team | @craftworks/compiler-sdk |

Adoption flows upward: start with @openclaw packages (free, community), add @claws packages (governance compiler), integrate @craftworks packages (enterprise).

## Use @bic/claws-skill-kit

Create governed skills with type safety:

```bash
npm install @bic/claws-skill-kit
```

```typescript
import { skill } from '@bic/claws-skill-kit';

export default skill({
  name: 'review-expense',
  risk: 'R2',
  obo: 'none',
  data: 'INTERNAL',
  handler: async (ctx) => {
    const report = ctx.input.get('report');
    return { approved: checkPolicy(report) };
  },
});
```

## Use @claws/sift

sift is the typed expression engine for governance queries:

```typescript
import { sift } from '@claws/sift';

const violations = sift(workspace)
  .skills()
  .where(s => s.risk >= 'R3' && s.obo !== 'none')
  .select('name', 'risk', 'obo');
```

sift builds on RELAX expressions but provides a TypeScript-native API with full type inference.

## Optimize with Pinch

Pinch optimizes governance budgets by compressing PRESS output:

```bash
claws build --with-pinch
```

Pinch reduces governance instruction token count by 30-50% without changing enforcement semantics. It generalizes the PRESS compression model for governance-specific content.

## Use the .NET for OpenClaw Vision

claws aims to be the .NET for OpenClaw: a shared library platform that makes OC development better regardless of whether you use the governance compiler. The 11+ @claws/* packages provide:

- **@bic/claws-skill-kit** -- skill authoring framework
- **@claws/sift** -- typed expressions
- **@bic/claws-test** -- skill testing with MockGateway
- **@claws/types** -- shared TypeScript types
- **@claws/audit** -- audit trail utilities

These packages work standalone. You do not need the claws compiler to use them.

## Next Steps

- [Compliance and Auditing](compliance-auditing.md) -- generate evidence
- [Publish a Skill](publish-skill.md) -- package and publish to ClawHub
