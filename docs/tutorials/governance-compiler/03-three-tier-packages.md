# Lesson 3: Three-Tier Packages

<!-- atoms: three-tier-packages, tier-adoption, dotnet-for-oc -->

claws provides shared libraries for OpenClaw developers -- the ".NET for OC." Three package tiers serve different audiences and trust levels.

## What You'll Learn

- How the three tiers (@openclaw, @claws, @craftworks) work together
- How to install and use shared libraries from each tier
- How tier adoption creates the upgrade funnel from free tools to enterprise

## Prerequisites

- A workspace with governance from [Lesson 1](01-init-and-first-check.md)

## Step by Step

### 1. Three tiers, three audiences

claws packages are organized into three tiers:

```
  @openclaw/*       Community-contributed, fully open
       ↓ uses
  @claws/*          Shared libraries by claws team
       ↓ uses
  @craftworks/*     Internal toolchain (not in OC output)
```

| Tier            | Scope                | Published by | Trust           | Cost     |
| --------------- | -------------------- | ------------ | --------------- | -------- |
| `@openclaw/*`   | Contributed packages | Community    | Peer-reviewed   | Free     |
| `@claws/*`      | Shared libraries     | claws team   | Signed releases | Free     |
| `@craftworks/*` | Internal toolchain   | Craftworks   | Internal only   | Licensed |

The key rule: **@craftworks/ never appears in generated code.** Everything claws emits uses @openclaw/ or @claws/ packages. This means OC developers can read and understand the generated code without knowing anything about craftworks internals.

### 2. Install a @claws package

@claws packages are the shared libraries. They provide common governance patterns:

```bash
claws add @claws/input-sanitizer
```

```
  FETCH    @claws/input-sanitizer@2.1.0
  VERIFY   signature: valid (Ed25519)
  INSTALL  plugins/claws-input-sanitizer/

  Installed @claws/input-sanitizer@2.1.0
  Provides: 3 governance rules (G-INPUT-SQL, G-INPUT-XSS, G-INPUT-INJECT)
```

The package adds governance rules that claws evaluates during `claws check`. Each package is signed -- claws verifies the Ed25519 signature before installation.

### 3. Install a @openclaw package

@openclaw packages are community-contributed tools and skills:

```bash
claws add @openclaw/web-search
```

```
  FETCH    @openclaw/web-search@1.3.0
  VERIFY   peer review: 3/3 reviewers approved
  INSTALL  skills/web-search/

  Installed @openclaw/web-search@1.3.0
  Provides: 1 skill (web-search)
```

@openclaw packages go through peer review rather than signature verification. The review count is shown during installation so you can assess trust.

### 4. The ".NET for OC" model

claws provides 11+ shared libraries that serve as the standard library for OpenClaw agents:

| Library          | Purpose                       | Package                 |
| ---------------- | ----------------------------- | ----------------------- |
| Input sanitizer  | Validate and clean user input | @claws/input-sanitizer  |
| Output validator | Check agent output format     | @claws/output-validator |
| Trust manager    | OBO delegation enforcement    | @claws/trust-manager    |
| Budget tracker   | Token consumption tracking    | @claws/budget-tracker   |
| Audit logger     | Structured audit trail        | @claws/audit-logger     |
| Risk classifier  | Tool risk classification      | @claws/risk-classifier  |

These libraries handle cross-cutting concerns that every agent workspace needs. Like .NET provides System.IO and System.Security for C# apps, @claws packages provide governance primitives for OC agents.

### 5. The adoption funnel

The three tiers create a natural adoption path:

```
  Free: @openclaw/* packages
    → Shared governance: @claws/* libraries
      → Compiler: claws init + claws check
        → Fleet: claws fleet scan
          → Enterprise: licensed @craftworks/* toolchain
```

A developer starts with free @openclaw packages, discovers @claws governance libraries, adopts the claws compiler for automated checking, scales to fleet management, and eventually evaluates the full craftworks enterprise toolchain.

Each tier is independently useful. You can use @openclaw packages without claws. You can use @claws libraries without the fleet scanner. The tiers compose but don't require each other.

### 6. Check tier compatibility

Verify that your workspace's packages are compatible:

```bash
claws doctor --packages
```

```
  PACKAGES  3 installed
    @claws/input-sanitizer    2.1.0   compatible
    @claws/trust-manager      1.0.0   compatible
    @openclaw/web-search      1.3.0   compatible

  VERSION   claws 0.5.0
    @claws/* requires >= 0.4.0          OK
    @openclaw/* no version constraint   OK

  All packages compatible.
```

`claws doctor --packages` checks that installed packages are compatible with the current claws version and with each other. Version constraints prevent breaking changes from silently degrading governance.

## What You Learned

- Three package tiers (@openclaw, @claws, @craftworks) serve different audiences
- @craftworks/ never appears in generated code -- OC developers only see @openclaw/ and @claws/
- @claws packages are Ed25519-signed; @openclaw packages are peer-reviewed
- The 11+ shared libraries are the ".NET for OC" -- standard governance primitives
- The tier model creates a natural adoption funnel from free tools to enterprise

## Next

[Lesson 4: Governance Plugins](04-governance-plugins.md) shows how to write custom governance rules.
