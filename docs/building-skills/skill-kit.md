# @bic/claws-skill-kit

<!-- atom:skill-kit (C41) -->

The development framework for governed OC skills. You write business logic,
skill-kit writes governance plumbing.

## Install

```
npm install @bic/claws-skill-kit
```

No compiler needed. No claws.json needed. Standalone library.

## The skill() factory

Every governed skill starts with `skill()`:

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

risk, obo, and data are validated at build time. The handler receives a typed
context -- no raw `args` parsing.

## Decorators

Six metadata annotations. claws reads them at build time and generates wrappers.

| Decorator   | What it declares                                      |
| ----------- | ----------------------------------------------------- |
| `@obo`      | Handler acts on behalf of the user                    |
| `@audit`    | Action must be logged to the audit chain              |
| `@classify` | Override risk classification for a specific tool call |
| `@validate` | Input must pass validation before execution           |
| `@budget`   | Action costs tokens or money -- enforce limits        |
| `@timeout`  | Maximum execution time before auto-cancel             |

## Example: OBO skill (sends email)

R5 territory -- the skill acts AS the user:

```typescript
import { skill, obo, audit, budget } from "@bic/claws-skill-kit";

class SendEmailHandler {
  @obo("email") // acts as the user
  @audit("send") // log this action
  @budget(500) // max 500 tokens per call
  async handle(ctx) {
    const { to, subject, body } = ctx.input.all();
    const result = await ctx.tools.sendEmail({ to, subject, body });
    return { messageId: result.id };
  }
}

export default skill({
  name: "send-email",
  risk: "R5",
  obo: "email",
  data: "CONFIDENTIAL",
  handler: SendEmailHandler,
});
```

Decorators annotate the handler class method. claws reads them at build time and
generates governance wrappers. At runtime the generated code handles elicitation,
audit logging, and budget enforcement. You just write the send logic.

## Example: Multi-tool with per-tool classification

Different tools, different risk levels. `@classify` overrides per call:

```typescript
import { skill, classify, audit, timeout } from "@bic/claws-skill-kit";

class DataTransformHandler {
  @classify("R2") // read is lower risk
  async readSource(ctx) {
    return await ctx.tools.readData(ctx.input.get("source"));
  }

  @classify("R4")
  @audit("write")
  @timeout(30_000)
  async writeTarget(ctx, data) {
    await ctx.tools.writeData(ctx.input.get("target"), data);
  }

  async handle(ctx) {
    const data = await this.readSource(ctx);
    const transformed = applyRules(data);
    await this.writeTarget(ctx, transformed);
    return { rows: transformed.length };
  }
}

export default skill({
  name: "data-transform",
  risk: "R4",
  obo: "none",
  data: "CONFIDENTIAL",
  handler: DataTransformHandler,
});
```

## MockGateway for testing

Test skills without the OC Gateway running:

```typescript
import { MockGateway } from "@bic/claws-skill-kit/testing";
import sendEmail from "./send-email";

const gw = new MockGateway();
gw.mock("sendEmail", { id: "msg-123" });

const result = await gw.run(sendEmail, {
  to: "alice@example.com",
  subject: "Hello",
  body: "Test",
});
expect(result.messageId).toBe("msg-123");
expect(gw.auditLog).toHaveLength(1);
```

MockGateway records audit events, tracks budget usage, and validates governance
annotations -- same checks as the real Gateway, zero network.

## What you get

- **Typed context**: `ctx.input.get()` is typed. No argument parsing.
- **Build-time validation**: Wrong risk level? claws tells you before deploy.
- **Generated wrappers**: Elicitation, audit, budget -- you don't write them.
- **Standalone**: Works without the claws compiler. Add compilation later.

## Scenario-Driven Additions

### From skill-lifecycle scenarios (37 findings applied)

- Scaffold generates default risk level derived from workspace trust tier, preventing immediate G-CLASS violations
- Dependency auto-install or guided install for @bic/claws-skill-kit during scaffold; version alignment between claws and skill-kit enforced
- OBO auto-suggestion from skill name heuristics (e.g., "send-email" suggests obo: email)
- Frontmatter-to-decorator value propagation: governance values declared in SKILL.md frontmatter flow into claws import decorators automatically
- Governance-aware test generation from frontmatter produces test scenarios matching declared risk, OBO, and data classifications
- Scaffold output must produce pinch-clean results (zero violations from fresh scaffold)
- .gitignore included in scaffold template; skill name vs directory name consistency validated

## Next

- [Testing your skill](claws-test.md) -- @bic/claws-test for scenario testing
- [Adoption tiers](tier-adoption.md) -- start DECLARED, graduate when ready
- [Publishing to ClawHub](claws-publish.md) -- governed publish with badges
