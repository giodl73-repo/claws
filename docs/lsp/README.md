# @bic/openclaw-lsp

Language Server Protocol implementation for OpenClaw workspaces.
Surfaces governance state in editors: diagnostics, hover, code
actions, and the governance badge that shows each skill's ring
level (DECLARED / TYPED / VERIFIED).

## Two-letter code

**LS** — package primary. Sub-specs: **LSP** (protocol), **LSB**
(governance badge), **LSE** (error contract).

## Stability

- **Stability tier**: Alpha
- **Upstream target**: none (internal only despite `openclaw-*` namespace)

## Contents

### Specs

- [LS-lsp.md](./specs/LS-lsp.md) — primary spec
- [LSP-protocol.md](./specs/LSP-protocol.md)
- [LSB-governance-badge.md](./specs/LSB-governance-badge.md)
- [LSE-error-contract.md](./specs/LSE-error-contract.md)

### Guides

- [badge-lifecycle.md](./guides/badge-lifecycle.md)
- [error-messages.md](./guides/error-messages.md)

### Pitfalls

- [badge.md](./pitfalls/badge.md)

## Quick links

- [ATOMS.md](./ATOMS.md)
- [CHANGELOG.md](./CHANGELOG.md)
