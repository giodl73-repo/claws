---
name: typical-workspace-agent
trust: internal-trusted
sdk-version: 0.1.0
---

# Agent

The canonical "good shape" openclaw workspace. Full set of MD authoring
files + a gateway.jsonc + policy.jsonc + 2 skill subdirectories. The
substrate train should produce ZERO noisy findings against this fixture.
If it does, that's a real bug.

## Boundaries

- Don't read files outside the workspace root.
- Don't shell out to commands that aren't on the allowlisted PATH.
- Don't send messages to addresses not on the IDENTITY-declared allowlist.
- Don't escalate to R5 tools without explicit operator approval.

## Tools

See TOOLS.md for the canonical declarations.

## Memory

See MEMORY.md for the index of memory entries.
