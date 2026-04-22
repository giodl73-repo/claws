---
covers: [atom:KTA/adoption-path, atom:KTR]
---

# Tutorial: write your first skill

By the end of this tutorial you will have shipped a DECLARED skill
that adds a `greet-user` tool to a claws workspace.

## Step 1 · Scaffold

```bash
mkdir my-first-skill && cd my-first-skill
npm init -y
npm i @bic/claws-skill-kit
```

## Step 2 · The tool

Create `src/index.ts`:

```ts
import { defineTool } from '@bic/claws-skill-kit/runtime';

export const greetUser = defineTool({
  name: 'greet-user',
  declaredTier: 'R1',
  async handler(args: { name: string }, ctx) {
    return { greeting: `Hello, ${args.name}!` };
  },
});
```

## Step 3 · Build

```bash
npx claws-skill-build --entry ./src/index.ts --out ./dist
```

This produces:

```
dist/
  TOOLS.md
  AGENTS.md
  manifest.json
  runtime.js
  runtime.js.map
```

`dist/TOOLS.md` now contains:

```markdown
## greet-user
<!-- risk:R1 -->

Greets a user.

### args
- `name: string` - the name to greet
```

## Step 4 · Install

Copy the skill into a claws workspace:

```bash
cp -r ./dist /path/to/workspace/claws/skills/my-first-skill/
claws doctor  # validates the new skill
```

## Step 5 · Use it

From the agent, call `greet-user`:

```
[agent calls greet-user with { name: "Alice" }]
=> { greeting: "Hello, Alice!" }
```

## Ring upgrade

Add an argsSchema to reach Ring 2:

```ts
export const greetUser = defineTool({
  name: 'greet-user',
  declaredTier: 'R1',
  argsSchema: {
    type: 'object',
    properties: { name: { type: 'string', maxLength: 100 } },
    required: ['name'],
  },
  async handler(args, ctx) {
    return { greeting: `Hello, ${args.name}!` };
  },
});
```

Rebuild. Now the skill is Ring 2 TYPED. Arg schema violations get
caught before the handler runs.

## What you learned

- `defineTool` is the API
- `claws-skill-build` is the build tool
- Skills install into `workspace/claws/skills/{name}/`
- Rings are detected, not declared

Next: [../guides/adoption-path.md](../guides/adoption-path.md) for
moving from Ring 1 → Ring 3.
