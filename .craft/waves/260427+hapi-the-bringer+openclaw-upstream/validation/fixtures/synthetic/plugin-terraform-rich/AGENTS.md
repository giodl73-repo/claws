---
name: terraform-agent
trust: external-plugin
plugin: terraform
sdk-version: 0.1.0
---

# terraform agent

3rd-party openclaw plugin in the `infra` domain. Maturity: rich.

This plugin contributes 3 tool(s), 2 skill(s), 1 workflow(s), and a doctor contract to an openclaw workspace.

## Boundaries

- Operate only on the resources this plugin owns.
- Don't escalate to R5 tools without explicit operator approval.
- See `TOOLS.md` for the canonical tool declarations.
