---
name: mfa-yubikey-agent
trust: external-plugin
plugin: mfa-yubikey
sdk-version: 0.1.0
---

# mfa-yubikey agent

3rd-party openclaw plugin in the `security` domain. Maturity: typical.

This plugin contributes 2 tool(s), 2 skill(s) to an openclaw workspace.

## Boundaries

- Operate only on the resources this plugin owns.
- Don't escalate to R5 tools without explicit operator approval.
- See `TOOLS.md` for the canonical tool declarations.
