# Platform Ecosystem Examples

Three-tier packages, skill-kit usage, sift expressions, and pinch optimization.

## Three-Tier Package Model

```
Tier 1: @openclaw/* (Community — free, contributed upstream)
  @openclaw/core          Gateway runtime
  @openclaw/gateway       Plugin host
  @openclaw/types         Base TypeScript types

Tier 2: @claws/* (Shared libraries — governance platform)
  @bic/claws-skill-kit        Skill authoring framework
  @claws/sift             Typed expression engine
  @bic/claws-test             Testing with MockGateway
  @claws/types            Governance TypeScript types
  @claws/audit            Audit trail utilities
  @claws/crypto           Key management + signing

Tier 3: @craftworks/* (Internal — enterprise toolchain)
  @craftworks/compiler-sdk   Full compilation pipeline
  @craftworks/agent-sdk      Agent runtime
  @craftworks/craftworks-sdk Domain logic
```

## @bic/claws-skill-kit Usage

```typescript
import { skill } from '@bic/claws-skill-kit';

// Simple skill with governance metadata
export default skill({
  name: 'triage-ticket',
  risk: 'R1',
  obo: 'none',
  data: 'INTERNAL',
  handler: async (ctx) => {
    const ticket = ctx.input.get('ticket');
    const priority = await classifyPriority(ticket);
    return { priority, category: inferCategory(ticket) };
  },
});
```

```typescript
// Higher-risk skill with decorators
import { skill, obo, audit, budget, timeout } from '@bic/claws-skill-kit';

export default skill({
  name: 'send-response',
  risk: 'R3',
  obo: 'email',
  data: 'INTERNAL',
  handler: async (ctx) => {
    const draft = ctx.input.get('draft');
    const recipient = ctx.input.get('recipient');
    await ctx.tools.call('send-email', { to: recipient, body: draft });
    return { sent: true };
  },
  decorators: [
    obo('email'),
    audit({ level: 'full' }),
    budget({ max: 1000 }),
    timeout({ seconds: 30 }),
  ],
});
```

## @claws/sift Expressions

```typescript
import { sift } from '@claws/sift';

// Find high-risk OBO skills
const riskySkills = sift(workspace)
  .skills()
  .where(s => s.risk >= 'R3' && s.obo !== 'none')
  .select('name', 'risk', 'obo');

// Count violations by severity
const violationCounts = sift(workspace)
  .policies()
  .where(p => p.status === 'violation')
  .groupBy('severity')
  .count();

// Budget analysis
const overBudget = sift(workspace)
  .tasks()
  .where(t => t.budget_pct > 90)
  .orderBy('budget_pct', 'desc')
  .select('name', 'budget_pct', 'stage');
```

## @bic/claws-test MockGateway

```typescript
import { MockGateway } from '@bic/claws-test';
import triageTicket from './triage-ticket';

const gw = new MockGateway();
gw.mock('search-knowledge', { results: ['policy-doc.md'] });

const result = await gw.run(triageTicket, {
  ticket: { title: 'Database down', severity: 'P1' }
});

expect(result.priority).toBe('critical');
expect(gw.auditLog).toHaveLength(1);
expect(gw.toolCalls).toEqual([
  { name: 'search-knowledge', params: expect.any(Object) }
]);
expect(gw.budgetUsed).toBeLessThan(2000);
```

## Pinch Optimization

```bash
# Without pinch
claws build
# L1 advisory: 3,600 tokens

# With pinch
claws build --with-pinch
# L1 advisory: 2,200 tokens (39% reduction)
# Enforcement semantics: IDENTICAL
```

Pinch compresses governance instructions by:
1. Deduplicating repeated policy language
2. Merging rules with identical scope and action
3. Abbreviating standard patterns to references
