---
slug: claws-oc-format-alignment
preset: "claws"
plan: "Align claws parsers + PEG grammars with actual OpenClaw workspace format from openclaw/openclaw repo"
area: claws
status: Closed
atoms: [atom:workspace-format, atom:governance-ir]
specs: [CL-01, CL-04]
stages:
  implementation:
    reviews: [claws:gateway-eng, claws:founder, craft:type-system]
  testing:
    reviews: [claws:skill-author, craft:testing]
---

# OC Format Alignment

## Problem

The claws governance compiler has three sources of truth for OpenClaw file formats that have diverged:

1. **PEG grammars** (`design/astro/grammars/openclaw-*.peg`) — define formal syntax
2. **claws-sdk parsers** (`claws-sdk/src/compile/intent/*-intent.ts`) — extract governance intent
3. **Actual OpenClaw format** (`github.com/openclaw/openclaw`) — what real workspaces look like

Key divergences discovered during Anubis CP-1 gateway acceptance testing:

### AGENTS.md
| Source | Format |
|--------|--------|
| PEG grammar | `- description:`, `- model:`, `- tools:\n  - x\n  - y` (nested list) |
| claws parser | `- Tools: X, Y, Z` (comma-separated), `- Delegates to:` |
| Real OC | Free-form markdown. Agent instructions, not roster. No standardized fields. |

### TOOLS.md
| Source | Format |
|--------|--------|
| PEG grammar | `## Tool Guidance` table: `\| Tool \| Guidance \|` |
| claws parser | `## tool-name` sections with `- Risk: R1` fields |
| Real OC | Free-form notes about YOUR tools (SSH hosts, camera names). Tools defined by platform, not file. |

### SOUL.md
| Source | Format |
|--------|--------|
| PEG grammar | Formal structure with deny constraints |
| claws parser | Keyword extraction (deny, never, restrict patterns) |
| Real OC | Free-form personality + safety instructions |

## Decision

claws is a **governance compiler**, not a format validator. It extracts *intent* from whatever format the workspace uses. The parsers should:

1. Accept the **real OC format** (free-form markdown with heuristic extraction)
2. Also accept the **PEG grammar format** (structured fields — used by `claws init --template`)
3. Never reject a workspace because the format doesn't match a spec

The PEG grammars should be updated to describe what `claws init` **emits**, not what it requires as input.

## Headlines

1. **AGENTS.md parser**: Handle nested `- tools:` list AND comma-separated `- Tools:` AND free-form prose mentioning tool names
2. **TOOLS.md parser**: Handle table format AND section format AND free-form notes
3. **PEG grammar update**: Mark grammars as "emitter output format" not "required input format"
4. **Reference workspace**: Provide two variants — `structured/` (PEG grammar format for init templates) and `freeform/` (real OC format for testing tolerance)
5. **Parser tests**: Each parser tested against both formats
6. **Expected-fail P-064**: Fix agents parser to extract from nested tools list, remove expected-fail

## Scope

| In scope | Out of scope |
|----------|-------------|
| Parser tolerance for multiple formats | Format validation/linting |
| PEG grammar docstring updates | New PEG grammar versions |
| Reference workspace format alignment | Format migration tooling |
| agents-intent nested list support | Full NLP intent extraction |

## Files to Change

- `claws-sdk/src/compile/intent/agents-intent.ts` — handle nested `- tools:` list
- `claws-sdk/src/compile/intent/tools-intent.ts` — handle table format
- `design/astro/grammars/openclaw-agents.peg` — add "emitter output" note
- `design/astro/grammars/openclaw-tools.peg` — add "emitter output" note
- `claws-sdk/tests/fixtures/oc-reference-workspace/` — align with real OC
- `claws-sdk/tests/accept/gateway/enforcement.accept.test.ts` — remove P-064 expected-fail

## Dependencies

- Anubis CP-1 (gateway harness must exist first)
- Web research on openclaw/openclaw repo format (completed 2026-04-13)

Sources:
- [AGENTS.md template](https://github.com/openclaw/openclaw/blob/main/docs/reference/AGENTS.default.md)
- [TOOLS.md template](https://github.com/openclaw/openclaw/blob/main/docs/reference/templates/TOOLS.md)
- [OpenClaw repo](https://github.com/openclaw/openclaw)
