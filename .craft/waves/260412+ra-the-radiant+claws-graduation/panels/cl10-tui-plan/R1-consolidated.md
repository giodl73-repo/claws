# R1 Consolidated — claws-tui Plan Review

**Panel**: cl10-tui-plan
**Type**: plan
**Round**: 1
**Date**: 2026-04-15
**Roles**: architect (D), navigator (E), dragon (A)

---

## Totals

| Role      | Critical | Major  | Warning | Notes | Total  |
| --------- | -------- | ------ | ------- | ----- | ------ |
| architect | 0        | 4      | 4       | 3     | 11     |
| navigator | 0        | 6      | 6       | 0     | 12     |
| dragon    | 2        | 5      | 6       | 0     | 13     |
| **Raw**   | **2**    | **15** | **16**  | **3** | **36** |
| **Dedup** | **2**    | **8**  | **10**  | **3** | **23** |

---

## Consensus Findings

### CONSENSUS-1: Package boundary — separate claws-tui/ vs subcommand in claws-cli

**Flagged by**: architect (M2)
**Severity**: Major — architectural decision needed

Architect recommends: TUI belongs as `claws tui` subcommand in claws-cli with Ink
lazy-loaded. Separate package adds unnecessary CI/build overhead. Counter: separate
package keeps claws-cli lightweight (no Ink dependency for non-TUI users).

**Decision needed**: separate package vs lazy-loaded subcommand.

### CONSENSUS-2: 8 pulses is undersized

**Flagged by**: architect (M4)
**Severity**: Major

15 screens + 14 PATCH interactions + SSE + demo mode in 8 pulses. Pulses 3, 4, 6
are "Heavy" and should be split. Realistic: 10-12 pulses.

### CONSENSUS-3: Demo mode needs guided walkthrough + read-only fixture

**Flagged by**: navigator (F04), dragon (C-01)
**Severity**: Critical (dragon) / Major (navigator)

Two issues:

- Dragon: fixture workspace is writable — user can bypass governance by editing it
- Navigator: fixture loads but there's no guided walkthrough, just a data dump

**Fix**: (1) Demo fixture is read-only (tmpdir copy, or in-memory). (2) Demo includes
a 5-7 step guided sequence: see governance → toggle tool → hit R5 rejection →
edit soul → see deny rule warning → view trust → view audit.

### CONSENSUS-4: R5 lock rendering — absent toggle, not disabled toggle

**Flagged by**: dragon (C-02)
**Severity**: Critical

A disabled toggle can still be focused and "activated" via keyboard in some terminal
libraries. R5 tools should render with no toggle at all — just a lock icon. This is
defense-in-depth: even if someone patches the TUI, the server rejects the PATCH.

### CONSENSUS-5: No startup handling when claws serve isn't running

**Flagged by**: navigator (F11), architect (W4)
**Severity**: Major

`claws tui` with no server = crash. First-run failure path. Must detect, show
helpful error ("Run `claws serve` first"), optionally auto-start serve.

### CONSENSUS-6: Error banners need next-action guidance

**Flagged by**: navigator (F03)
**Severity**: Major

"R5_NON_NEGOTIABLE" is a code, not guidance. Partners will copy this terse UX.
Each error must include a human sentence: "This tool acts on your behalf (R5).
Approval is required on every call and cannot be disabled."

### CONSENSUS-7: Soul Editor needs visual language for deny rules

**Flagged by**: navigator (F07), dragon (M-04)
**Severity**: Major

SOUL.md text contains deny rules, instructions, and compiler-injected rules mixed
together. The editor needs visual annotation: deny rules highlighted, compiler-
injected rules shown as locked/dimmed, governance context inline.

### CONSENSUS-8: SSE not authenticated

**Flagged by**: dragon (M-02)
**Severity**: Major

SSE /api/events has no auth. Anyone on localhost can subscribe. For a local dev
tool this is acceptable. For a networked deployment, it's a governance event leak.

**Fix**: Document that claws serve binds 127.0.0.1 by default (safe). When --host
0.0.0.0 is used, SSE requires bearer token auth.

---

## Priority Actions

### Must-Fix

1. **CONSENSUS-3**: Demo fixture read-only + guided walkthrough
2. **CONSENSUS-4**: R5 lock = no toggle, not disabled toggle
3. **CONSENSUS-2**: Expand from 8 to 10-12 pulses
4. **CONSENSUS-5**: Graceful startup without claws serve
5. **CONSENSUS-6**: Error banners with human guidance
6. **CONSENSUS-7**: Soul Editor deny rule visual language

### Should-Fix

7. **CONSENSUS-1**: Decide package boundary (recommend: lazy subcommand)
8. **CONSENSUS-8**: SSE auth for non-localhost
9. Navigator F01: Group 15 screens by experience (not flat tabs)
10. Navigator F02: Screen order follows progressive disclosure
11. Dragon W-01: Sanitize ANSI escape sequences in chunk data

---

## Verdict

Strong plan concept — the TUI as API validation surface is high-leverage. The
critical fixes are the demo mode security (read-only fixture) and R5 rendering
(absent toggle). The pulse count needs expansion. With these addressed, the plan
is ready for implementation.
