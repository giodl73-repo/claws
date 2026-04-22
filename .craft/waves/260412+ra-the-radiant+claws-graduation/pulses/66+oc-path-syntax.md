---
pulse: 66
slug: oc-path-syntax
plan: claws-cap-integration
depends_on: [22]
governing_roles: [craft:architect, claws:gateway-eng]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 8
  L1_integration: 3
  L2_e2e: 1
  L3_accept: 0
test_scope:
  run:
    - "cd claws-sdk && npx vitest run --project unit --coverage"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 5
checkpoint_gate: false
---

# Pulse 66: OC Path Syntax

## Objective

Universal `oc://` path syntax for addressing any piece of the workspace. A canonical
way to reference files, sections, items, and fields within the OC workspace — used in
PatchError messages, audit events, governance warnings, chunk governance context,
API error responses, SSE events, TUI error banners, and VS Code diagnostics.

**This is a foundational pulse.** The oc:// path must exist BEFORE the chunk
assembler (pulse 23), validation layer (pulse 30), and all error-producing pulses.
Every downstream pulse that produces paths, errors, or governance references imports
from this module. No ad-hoc string paths anywhere.

Parser and formatter live in claws-sdk. Round-trip fidelity: `formatOcPath(parseOcPath(s)) === s`.

> **Extraction note**: The oc-path module is implemented in claws-sdk but designed for
> extraction to `@bic/oc-path` per CL-11. Zero `@craftworks/` imports in the
> module. All dependencies are self-contained. When extracted, claws-sdk will re-export
> from `@bic/oc-path`.

**Full syntax**: `oc://{file}[/{section}[/{item}[/{field}]]][?session={id}]`

One form. Works in URIs, HTTP, shell, YAML, logs. No escaping, no conversion.

**Coverage**: All 9 OC files + skills directory + lobster workflows + sessions:

```
Files:
  oc://SOUL.md/Boundaries                       → section of a file
  oc://SOUL.md/Boundaries/deny-rule-1            → specific item in section
  oc://TOOLS.md/Tools/send-email/risk            → field on an item
  oc://MEMORY.md/Knowledge/email                 → knowledge source
  oc://IDENTITY.md/Identity/name                 → identity field
  oc://AGENTS.md/Delegation/scout                → delegated agent
  oc://USER.md/PreAuthorizations/send-email      → standing approval
  oc://HEARTBEAT.md/Schedule/daily-triage        → cron job entry

Skills:
  oc://skills/email-drafter                      → skill directory
  oc://skills/email-drafter/SKILL.md             → skill manifest
  oc://skills/email-drafter/handler.ts           → skill handler

Lobster workflows:
  oc://lobster.yaml/steps/triage                 → workflow step
  oc://lobster.yaml/steps/triage/tools           → tools used by a step
  oc://lobster.yaml/transitions/triage-to-draft  → transition between steps

Sessions:
  oc://TOOLS.md/Tools/send-email?session=cron:daily  → session-scoped tool
  oc://sessions/cron:daily-triage                     → session itself
  oc://sessions/cron:daily-triage/tools               → session tool list
  oc://sessions/cron:daily-triage/config              → session config
```

## Deliverables

- [ ] `claws-sdk/src/workspace/oc-path.ts` — OcPath type (file, section?, item?, field?, session?), parseOcPath function, formatOcPath function, isValidOcPath guard, OcPathError for malformed input.
- [ ] `claws-sdk/tests/workspace/oc-path.unit.test.ts` — L0: 8 tests covering all parse/format cases.
- [ ] `claws-sdk/tests/workspace/oc-path.e2e.test.ts` — L2: end-to-end oc:// path usage in PatchError, audit events, and governance warnings (1)

## Acceptance Criteria

- [ ] parseOcPath handles file-only paths (`oc://SOUL.md`)
- [ ] parseOcPath handles file+section paths (`oc://SOUL.md/identity`)
- [ ] parseOcPath handles file+section+item+field paths (`oc://CONNECTIONS.md/people/alice/trust-level`)
- [ ] parseOcPath handles session-scoped paths (`oc://SOUL.md/identity?session=abc123`)
- [ ] formatOcPath produces canonical string from OcPath struct
- [ ] Round-trip: formatOcPath(parseOcPath(s)) === s for all valid paths
- [ ] parseOcPath throws OcPathError for malformed input (missing scheme, empty file)
- [ ] OcPath type exported from claws-sdk public API
- [ ] formatOcPath validates structural nesting (F-03 -- oc-path-parser-trace): item requires section, field requires item. Passing `{ file: 'TOOLS.md', field: 'risk' }` without section/item throws `OcPathError('Structural nesting violation: field requires item')`. This prevents silent round-trip corruption.
- [ ] parseOcPath handles `?session=` query parameter only (F-04 -- oc-path-parser-trace). Other API-layer params (`?at=`, `?dryRun=`) are stripped before parsing -- they are request parameters, not path components. Unknown query parameters are ignored by the parser.

## Test Gates

- [ ] L0 unit (8 tests): parse file-only, file+section, file+section+item, file+section+item+field, session-scoped paths, round-trip parse-format, malformed input rejection, edge cases (special characters in names)
- [ ] L1 integration (3 tests): OcPath used in PatchError construction, OcPath used in audit event context, OcPath used in governance warning messages
- [ ] L2 e2e (1 test): end-to-end oc:// path usage across error/audit/governance (1)
