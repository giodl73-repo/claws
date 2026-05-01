# OpenClaw Guides — Orientation

<!-- atom:openclaw-guides-index (OC-G00) -->

These are claws-style ASCII guides for OpenClaw — narrowly scoped, ASCII-rich
explainers in the same shape as `docs/architecture/three-rings.md` and
`three-engine-model.md`. They are authored as `proof` source files in
`design/src/openclaw/` and compiled to `docs/guides/openclaw/` via
`proof compile`.

The full deep-dive specs live one directory up at `design/openclaw/*.md` (28
files, ~7,500 lines). The guides here are the **at-a-glance** layer above
those specs — pick a guide for the shape, drop down to the spec for the
detail.

---

## Guide index

| Guide | What you learn |
|-------|----------------|
| [01 Plugin lifecycle](01-plugin-lifecycle.md) | How a manifest becomes a live registration |
| [02 Three channels](02-three-channels.md) | Typed hooks vs legacy hooks vs diagnostic events |
| [03 Gateway bus](03-gateway-bus.md) | Gateway as everything-bus + three extensibility seams |
| [04 Turn anatomy](04-turn-anatomy.md) | Hooks, sandbox, and LLM in one request |
| [05 Trust boundary](05-trust-boundary.md) | metadata.trusted, WeakSet anti-spoof, redaction |
| [06 Manifest activation](06-manifest-activation.md) | Six trigger types that decide what loads |
| [07 Validate with proof](07-validate-with-proof.md) | Lint these guides with `proof check` |

---

## Source layout

<!-- proof:compiled from="proof:tree kind=org" uri="" -->
```org
design/
├── src/openclaw/: proof source (.source.md)
│   ├── 00-orientation.source.md: this file
│   ├── 01-plugin-lifecycle.source.md: manifest pipeline
│   ├── 02-three-channels.source.md: observation channels
│   ├── 03-gateway-bus.source.md: gateway extensibility
│   ├── 04-turn-anatomy.source.md: request lifecycle
│   ├── 05-trust-boundary.source.md: trust plus redaction
│   ├── 06-manifest-activation.source.md: activation triggers
│   └── 07-validate-with-proof.source.md: proof linting
├── openclaw/: deep-dive specs (.md, hand-written)
├── openclaw/guides/: compiled output (.md, proof-generated)
└── proof.toml: compile config
```
<!-- /proof:compiled -->

---

## Build

From `design/`:

```bash
proof compile src/openclaw
```

This regenerates every `.md` under `openclaw/guides/`. To validate without
writing:

```bash
proof check src/openclaw
proof compile src/openclaw --check
```

See [07 Validate with proof](07-validate-with-proof.md) for the lint setup
the team uses.

---

## Reading order

For someone new to OpenClaw:

1. Start with [03 Gateway bus](03-gateway-bus.md) — answers "what *is* OpenClaw."
2. Then [01 Plugin lifecycle](01-plugin-lifecycle.md) — how plugins plug in.
3. Then [04 Turn anatomy](04-turn-anatomy.md) — how a request flows.
4. Then [02 Three channels](02-three-channels.md) and [05 Trust boundary](05-trust-boundary.md) — observation + security.
5. Drop into [06 Manifest activation](06-manifest-activation.md) when you need to author a plugin.

---

## Related

- Deep-dive specs: `design/openclaw/README.md`
- Wave plan: `.craft/plans/claws-openclaw-upstream.md`
- Synthesis + four full ASCII diagrams: `design/openclaw/architecture.md`
