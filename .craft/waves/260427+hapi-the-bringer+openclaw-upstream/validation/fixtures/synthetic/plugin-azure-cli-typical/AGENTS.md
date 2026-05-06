---
name: azure-cli-agent
trust: external-plugin
plugin: azure-cli
sdk-version: 0.1.0
---

# azure-cli agent

3rd-party openclaw plugin in the `infra` domain. Maturity: typical.

This plugin contributes 2 tool(s), 2 skill(s) to an openclaw workspace.

## Boundaries

- Operate only on the resources this plugin owns.
- Don't escalate to R5 tools without explicit operator approval.
- See `TOOLS.md` for the canonical tool declarations.
