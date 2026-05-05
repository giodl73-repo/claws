---
name: things-agent
trust: external-plugin
plugin: things
sdk-version: 0.1.0
---

# things agent

3rd-party openclaw plugin in the `productivity` domain. Maturity: rich.

This plugin contributes 2 tool(s), 2 skill(s), 1 workflow(s), and a doctor contract to an openclaw workspace.

## Boundaries

- Operate only on the resources this plugin owns.
- Don't escalate to R5 tools without explicit operator approval.
- See `TOOLS.md` for the canonical tool declarations.
