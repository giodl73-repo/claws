# @bic/claws-serve

The 43-route HTTP + SSE daemon that hosts claws as a network service.
Workspace introspection endpoints, snapshot lifecycle endpoints,
approval channels, and Cap-surface integration.

## Two-letter code

**SV** — package primary. Sub-specs: **SVR** (REST API), **SVI**
(workspace introspect), **SVC** (Cap surfaces).

## Stability

- **Stability tier**: Alpha
- **Upstream target**: none (internal HTTP daemon)

## Contents

### Specs

- [SV-serve.md](./specs/SV-serve.md) — primary spec
- [SVR-rest-api.md](./specs/SVR-rest-api.md)
- [SVI-workspace-introspect.md](./specs/SVI-workspace-introspect.md)
- [SVC-cap-surfaces.md](./specs/SVC-cap-surfaces.md)

### Guides

- [cap-integration.md](./guides/cap-integration.md)
- [session-model.md](./guides/session-model.md)

### Pitfalls

- [trust.md](./pitfalls/trust.md)

## Quick links

- [ATOMS.md](./ATOMS.md)
- [CHANGELOG.md](./CHANGELOG.md)
