---
covers: [atom:LSB, atom:LSB/demotion]
---

# Badge lifecycle

How badges change as skills evolve — promotion upward as authors
mature their skills, demotion downward when coverage or schemas
drop.

## Promotion path

```
  Ring 1 GRAY ──(add argsSchema)──▶ Ring 2 BLUE ──(add scenarios + coverage)──▶ Ring 3 GREEN
```

Promotion happens AUTOMATICALLY on the next LSP compile. Author
adds an argsSchema, saves the file, the badge turns blue within
seconds.

No explicit "publish" step — the badge tracks the current state of
the code.

## Demotion path

```
  Ring 3 GREEN
       │
       ├── remove a scenario file ──▶ Ring 2 BLUE
       ├── coverage drops < 95/90/95/95 ──▶ Ring 2 BLUE
       ├── remove argsSchema ──▶ Ring 1 GRAY
       └── introduce compile error ──▶ RED
```

Demotion is IMMEDIATE and VISIBLE. The badge changes color;
editors surface the reason.

## Mixed-ring skills

A skill with 3 tools where 2 are at Ring 3 and 1 is at Ring 1:
badge is YELLOW. The drill-down in the editor shows per-tool
rings:

```
my-skill  YELLOW
├── send-email     Ring 3 GREEN
├── fetch-inbox    Ring 3 GREEN
└── summarize      Ring 1 GRAY
```

Authors see which tool is dragging down the overall badge.

## Fleet-gated installs

If the fleet policy requires `minRing: VERIFIED`, skills below
Ring 3 can't install at all. The badge state in the editor is RED
with the message "fleet policy requires Ring 3".

In this mode, demotion to Ring 2 uninstalls the skill on next
workspace reload. That's loud feedback — the skill visibly stops
working, not silently accepts lower-trust.

## Why auto-demote

The demotion behaviour is intentional — it creates LOUD feedback
when a skill's guarantees regress. A skill that "was ring 3" but
silently became "ring 1" would mean users trusted it for something
it no longer guaranteed.

See [../pitfalls/badge.md](../pitfalls/badge.md) for the demotion
surprises authors run into.

## Cross-references

- [../specs/LSB-governance-badge.md](../specs/LSB-governance-badge.md) —
  formal badge spec
- [`skill-kit/specs/KTA-three-rings.md`](../../skill-kit/specs/KTA-three-rings.md) —
  the three-rings model the badge reflects
