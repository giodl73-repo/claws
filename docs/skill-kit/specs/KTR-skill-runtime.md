# KTR — Skill runtime

**Sub-spec of**: [KT-skill-kit.md](./KT-skill-kit.md)

## `defineTool`

The primary API: skill authors define tools using `defineTool`.

```ts
import { defineTool } from '@bic/claws-skill-kit/runtime';

export const sendEmail = defineTool({
  name: 'send-email',
  declaredTier: 'R5',
  argsSchema: {
    type: 'object',
    properties: {
      to: { type: 'string' },
      subject: { type: 'string' },
      body: { type: 'string' },
    },
    required: ['to', 'subject', 'body'],
  },
  async handler(args, ctx: SkillContext) {
    const smtp = ctx.clients.smtp;
    await smtp.send(args);
    return { ok: true };
  },
});
```

Each `defineTool` emits a tool entry that the build pipeline
compiles into a TOOLS.md entry + a runtime handler.

## `SkillContext`

```ts
interface SkillContext {
  readonly tool: string;
  readonly args: unknown;
  readonly caller: Principal;
  readonly snapshotId: string;
  readonly correlationId: string;
  readonly clients: ReadonlyMap<string, unknown>;
  readonly host: HostContext;
  readonly log: Logger;
}
```

The `host.now()`, `host.nonce()`, and `host.hostId` fields match
`guardrails/specs/GRG-guardrail-provider.md § Clock injection`.
Skills MUST follow the no-direct-clock rule.

`ctx.clients` is a per-skill map of pre-authorized external clients
(SMTP, HTTP, database). The host wires clients in during skill
registration; skills can't mint new clients.

## Decision wiring

Skills that need their own `GuardrailProvider` (for in-skill
custom checks) can register one:

```ts
import { defineProvider } from '@bic/claws-skill-kit/runtime';

export const myProvider = defineProvider({
  id: 'my-skill-guardrail',
  async preAuthorize(ctx) {
    if (isRestrictedRecipient(ctx.args.to)) {
      return { kind: 'deny', reason: 'restricted-recipient' };
    }
    return { kind: 'allow' };
  },
});
```

The provider composes with the host's providers per the standard
composition rule (see `guardrails/specs/GRG-guardrail-provider.md § Composition`).

## Runtime vs build separation

Runtime helpers (`defineTool`, `SkillContext`, `defineProvider`) are
imported and used at runtime. Build helpers (`buildSkill`) are
invoked by the skill's build script.

Skills MUST NOT import from `@bic/claws-skill-kit/build` at runtime.
The prohibition is enforced at build time — see
[KTB § Artifact prohibition](./KTB-skill-build.md).
