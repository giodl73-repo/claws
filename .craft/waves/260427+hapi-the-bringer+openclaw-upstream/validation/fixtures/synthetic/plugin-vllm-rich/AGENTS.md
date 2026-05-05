---
name: vllm-agent
trust: external-plugin
plugin: vllm
sdk-version: 0.1.0
---

# vllm agent

3rd-party openclaw plugin in the `ai_ml` domain. Maturity: rich.

This plugin contributes 1 tool(s), 1 skill(s), 1 workflow(s), and a doctor contract to an openclaw workspace.

## Boundaries

- Operate only on the resources this plugin owns.
- Don't escalate to R5 tools without explicit operator approval.
- See `TOOLS.md` for the canonical tool declarations.
