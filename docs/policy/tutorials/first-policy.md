---
covers: [atom:POC/tool-pattern]
---

# Tutorial: your first policy

By the end of this tutorial you will have compiled a minimal OpenClaw
workspace to a `PolicyIR`, spotted a tier-classification finding, and
fixed it.

## Step 1 · Create a workspace

```
my-first-policy/
  AGENTS.md         ← prompt (empty is fine for this tutorial)
  TOOLS.md          ← tool declarations
  claws.json        ← snapshot metadata
```

Content of `TOOLS.md`:

```markdown
# Tools

## send-email
<!-- risk:R3 -->

Sends an email via the company SMTP server.

### args
- `to: string` - recipient
- `subject: string` - subject line
- `body: string` - body text

## summarize-inbox

Summarizes the caller's inbox.

### args_from
- `source: inbox-reader`

## inbox-reader
<!-- risk:R2 -->

Reads messages from the caller's inbox.
```

Content of `claws.json`:

```json
{ "snapshotId": "tutorial-001" }
```

## Step 2 · Parse and compile

```ts
import { parse } from '@bic/openclaw-workspace/parse';
import { compile, validate } from '@bic/openclaw-policy/compile';

const workspace = parse({
  'AGENTS.md': '',
  'TOOLS.md': readFileSync('TOOLS.md', 'utf8'),
  'claws.json': readFileSync('claws.json', 'utf8'),
});

const ir = compile(workspace);
console.log('Compiled snapshotId:', ir.snapshotId);
console.log('Tools:', [...ir.tools.keys()]);
```

Expected output:

```
Compiled snapshotId: tutorial-001
Tools: ['send-email', 'summarize-inbox', 'inbox-reader']
```

## Step 3 · Validate

```ts
const result = validate(ir);
console.log('Valid:', result.valid);
for (const f of result.findings) {
  console.log(`[${f.severity}] ${f.rule}: ${f.message}`);
}
```

You should see:

```
Valid: false
[BLOCK] G-03: summarize-inbox missing risk annotation
```

`summarize-inbox` has no `<!-- risk:... -->` tag. Every tool needs one.

## Step 4 · Fix and recompile

Edit `TOOLS.md`:

```markdown
## summarize-inbox
<!-- risk:R1 -->

Summarizes the caller's inbox.
...
```

Re-parse + re-compile + re-validate. This time:

```
Valid: true
```

## Step 5 · Inspect effective tier

```ts
const s = ir.tools.get('summarize-inbox')!;
console.log(`declared=${s.declaredTier} effective=${s.effectiveTier}`);
```

Output:

```
declared=R1 effective=R2
```

`summarize-inbox` is declared R1, but `args_from: inbox-reader`
propagates the R2 classification (G-CHAIN). Effective tier takes the
max.

## What you learned

- Compile: `compile(workspaceAST) → PolicyIR`
- Validate: `validate(ir) → findings`
- G-CHAIN: `args_from` chains propagate tier via `effectiveTier`
- Fail-fast: missing annotations block compile

Next: [../guides/using-the-compiler.md](../guides/using-the-compiler.md)
for the full 29-rule reference and the caching API.
