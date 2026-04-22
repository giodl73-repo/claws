# KTB — Skill build

**Sub-spec of**: [KT-skill-kit.md](./KT-skill-kit.md)

## Build pipeline

```ts
import { buildSkill } from '@bic/claws-skill-kit/build';

await buildSkill({
  entryPoint: './src/index.ts',
  outDir: './dist/',
  target: 'node20',
});
```

Output: a ready-to-install skill bundle at `./dist/`:

```
dist/
  TOOLS.md              ← generated from defineTool calls
  AGENTS.md             ← generated from skill's intro
  manifest.json         ← skill metadata
  runtime.js            ← bundled handlers
  runtime.js.map        ← source map
```

## Artifact prohibition

The emitted `runtime.js` MUST NOT include any of:

- `@bic/claws-sdk` (any subpath)
- `@bic/claws-serve` (any subpath)
- `@bic/claws-action`
- `@bic/openclaw-snap` (the daemon, not the client)
- `@bic/openclaw-policy/compile` (the compiler internals)

These are host-side or compile-time packages. A skill that bundles
them would ship code that isn't isolable — the host couldn't
sandbox the skill.

The build runs a prohibition check and FAILS if any are referenced.
Allowed imports:

- `@bic/claws-skill-kit/runtime` (what skills use)
- `@bic/openclaw-guardrails/provider` (for in-skill providers)
- `@bic/openclaw-workspace/path` (for oc:// URI handling)
- External libraries the skill explicitly declares

See [../pitfalls/build.md § P-01 SDK inclusion](../pitfalls/build.md).

## Manifest shape

```json
{
  "skillId": "my-skill",
  "version": "1.0.0",
  "skillKitVersion": "0.1.0",
  "tools": ["send-email", "fetch-inbox"],
  "providers": ["my-skill-guardrail"],
  "capabilities": ["smtp", "imap"]
}
```

The manifest is what the host consumes at install time to wire the
skill into its workspace. Capabilities enumerate the external
clients the skill needs; the host refuses to install a skill it
can't satisfy.

## Source map emission

The build emits source maps by default. Source maps let stack
traces at runtime point back to the skill author's source files,
making debugging meaningful.

`--no-source-maps` disables them (production builds where the
source should be hidden).
