# Upstream Contribution Strategy

How claws contributes governance capabilities back to the OpenClaw ecosystem via @openclaw/* packages.

## Overview

claws is built on top of the OpenClaw specification. Where it extends OC with governance capabilities, those extensions are packaged as @openclaw/* npm packages that any OC implementation can consume. This upstream contribution strategy ensures that claws's governance innovations benefit the broader ecosystem, not just claws users.

## Contribution Model

```
  claws-internal feature
       │
       ▼
  [Stabilize in claws]    → prove the feature works
       │
       ▼
  [Extract to @openclaw/*] → package as reusable module
       │
       ▼
  [Upstream proposal]      → RFC to OpenClaw maintainers
       │
       ▼
  [Accepted / Forked]      → merged upstream or maintained as extension
```

## Package Scope

| Package | What It Provides |
|---------|-----------------|
| @openclaw/governance-types | TypeScript types for governance IR |
| @openclaw/policy-parser | YAML policy rule parser |
| @openclaw/audit-chain | CGR hash chain implementation |
| @openclaw/capability-scan | Workspace capability manifest builder |

## Design Principle

Upstream packages are dependency-free and OC-native. They do not import from claws-sdk or craftworks-sdk. They can be consumed by any OC implementation without adopting the full claws toolchain.

## Related

- [The .NET for OpenClaw](dotnet-for-oc.md) -- claws's relationship to OC
- [Three-Tier Packages](three-tier-packages.md) -- package architecture
- `design/claws/ATOMS.md` -- C91 `atom:upstream-contrib`
