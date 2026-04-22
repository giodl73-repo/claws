# @bic/claws-test

<!-- atom:claws-test (C90) -->

Skill testing framework. Catches governance bugs before your users do.

## Install

```
npm install @bic/claws-test
```

Works standalone -- no compiler, no claws.json. Pairs with vitest or jest.

## Three testing layers

| Layer | Checks | What it catches |
|-------|--------|-----------------|
| Scenario runner | SKILL.md examples | Handler doesn't match its own docs |
| Governance validator | 12 rules | Declared risk doesn't match actual behavior |
| Security scanner | 16 rules | Injection, secrets, eval, unsafe inputs |

## Use as a library

```typescript
import { GovernanceValidator, SecurityScanner } from '@bic/claws-test';

// Governance: does your frontmatter match your handler?
const validator = new GovernanceValidator();
const gov = await validator.validate({
  skillPath: './SKILL.md',
  handlerPath: './src/handler.ts',
});
console.log(gov.findings); // [{ rule: 'declared-vs-actual-risk', ... }]

// Security: injection, secrets, eval
const scanner = new SecurityScanner();
const sec = await scanner.scan('./src/');
console.log(sec.issues); // [{ rule: 'no-eval', file: '...', line: 42 }]
```

## MockGateway + MockTools

Test handlers without a running OC Gateway:

```typescript
import { MockGateway, MockTools } from '@bic/claws-test';
import mySkill from './src/handler';

const gw = new MockGateway();
const tools = new MockTools();
tools.mock('fetchWeather', { temp: 72, condition: 'sunny' });

const result = await gw.run(mySkill, { input: { city: 'Seattle' }, tools });

expect(result.forecast.temp).toBe(72);
expect(gw.auditLog).toHaveLength(1);
expect(gw.budgetUsed).toBeLessThan(500);
expect(gw.elicitations).toHaveLength(0); // no OBO = no elicitation
```

MockGateway tracks audit events, budget consumption, elicitation prompts,
and tool calls. Assert on governance the same way you assert on logic.

## The `claws test` command

Runs all three layers in one pass:

```
$ claws test

  claws test — weather-lookup

  Scenarios
    ✓ city=Seattle returns forecast              12ms
    ✓ city=Tokyo returns forecast                 8ms
    ✓ missing city returns error                  3ms

  Governance (12 checks)
    ✓ declared-vs-actual-risk                     1ms
    ✓ declared-vs-actual-obo                      1ms
    ✓ declared-vs-actual-data                     0ms
    ✓ missing-audit-on-obo                        0ms
    ✓ obo-without-elicitation                     0ms
    ✓ risk-escalation                             1ms
    ... 6 more passed

  Security (16 rules)
    ✓ no-eval · no-exec · no-dynamic-import       0ms
    ✓ no-template-injection · no-hardcoded-secrets 0ms
    ... 11 more passed

  3 scenarios, 12 governance, 16 security — all passed (0.4s)
```

## The 12 governance checks

| Rule | What it catches |
|------|-----------------|
| declared-vs-actual-risk | Declared R2 but handler calls R4 tools |
| declared-vs-actual-obo | Declared "none" but handler sends email |
| declared-vs-actual-data | Declared PUBLIC but reads CONFIDENTIAL |
| missing-audit-on-obo | OBO action without @audit |
| missing-budget-on-transact | R5 TRANSACT without @budget |
| obo-without-elicitation | OBO without user confirmation |
| risk-escalation | Tool call exceeds skill risk ceiling |
| data-label-mismatch | Sensitivity label inconsistency |
| missing-timeout | Long operation without @timeout |
| unvalidated-input | User input without @validate |
| handler-export | Handler not exported as default |
| frontmatter-schema | Governance YAML doesn't match schema |

## Next

- [skill-kit reference](skill-kit.md) -- building the skill
- [Adoption tiers](tier-adoption.md) -- DECLARED/TYPED/VERIFIED
- [Publishing to ClawHub](claws-publish.md) -- ship it with a badge
