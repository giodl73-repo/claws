# KTA — Three-rings adoption

**Sub-spec of**: [KT-skill-kit.md](./KT-skill-kit.md)

## The three rings

Skills adopt claws governance in three progressive rings — a three-
stage opt-in path that lets skill authors ship quickly at first,
then tighten guarantees over time.

```
         DECLARED             TYPED               VERIFIED
         ────────             ─────               ────────
skill ──▶ TOOLS.md ──▶ typed schemas ──▶ scenarios + coverage
         (ring 1)       (ring 2)              (ring 3)
```

### Ring 1 — DECLARED

The minimum viable skill. TOOLS.md lists the tools with risk tiers
and an args description. The skill runs; claws governance applies
the declared tiers. That's it.

Author effort: low. Guarantee: declared tiers are honoured, but
tool implementations are trusted.

### Ring 2 — TYPED

Ring 1 + typed arg schemas via `defineTool({ argsSchema: ... })`.
Runtime validates args against schema before calling the handler.
Malformed args never reach the handler.

Author effort: medium. Guarantee: args are shape-correct at runtime.

### Ring 3 — VERIFIED

Ring 2 + accept scenarios covering the tool's decision table +
per-file coverage threshold (95/90/95/95).

Author effort: high. Guarantee: every declared behaviour has a
scenario that proves it; the tool is VERIFIED to match its spec.

## Adoption path

Authors move from DECLARED → TYPED → VERIFIED at their own pace.
Each ring is additive — moving up does NOT require changes to
already-working DECLARED code.

```ts
// Ring 1: DECLARED
export const sendEmail = defineTool({
  name: 'send-email',
  declaredTier: 'R5',
  async handler(args, ctx) { ... },
});

// Ring 2: TYPED — add argsSchema
export const sendEmail = defineTool({
  name: 'send-email',
  declaredTier: 'R5',
  argsSchema: { /* JSON Schema */ },
  async handler(args, ctx) { ... },
});

// Ring 3: VERIFIED — the test file emerges alongside
// tests/send-email.scenario.ts
```

## Governance-badge integration

The LSP's governance badge (see `lsp/specs/LSB-governance-badge.md`)
surfaces the ring each skill is at:

- Ring 1: gray badge
- Ring 2: blue badge
- Ring 3: green badge

Users see the ring level at a glance in their editor. Ring 3 is
the bar for production-critical skills.

See [../guides/adoption-path.md](../guides/adoption-path.md) for
the author-side walkthrough.
