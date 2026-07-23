# Graduation Migration Guide

<!-- atom:claws-graduation-migration -->

This guide walks consumers through moving from the old `@bic/claws-sdk` monolith (or the internal `@bic/claws-sdk`) to the new two-package model:

- **`@bic/claws-sdk`** — free tier, MIT, curated public API (compile, governance, emit, audit, test, cache)
- **`@bic/claws-sdk`** — enterprise extension, UNLICENSED (proprietary), re-exports the compiler and adds fleet/compliance/SIEM/PRESS/RELAX/identity/budget/LSP/snapshot/context/serve modules

Both packages publish to the BIC-internal GitHub Enterprise npm registry (`https://npm.pkg.github.com`) under the `@bic` scope. The compiler is 1:1 bundled inside the SDK's dependency graph with an `integrityPins` hash, so upgrading the compiler is a signed-off act.

Pick the migration path that matches your consumption profile.

## Path A: Free tier only

You only need to compile workspaces, run governance checks, emit OC or Claude Code output, run the 12-check validator, or maintain an audit chain. You do **not** use fleet management, SIEM forwarding, compliance report generation, PRESS compression, RELAX policy evaluation, identity/SSO bridging, budget tracking, LSP, snapshots, or the `claws serve` daemon.

### Step 1 — uninstall the old package

```bash
npm uninstall @bic/claws-sdk
# or, if you were on the internal alias:
npm uninstall @bic/claws-sdk
```

### Step 2 — install the free tier compiler

```bash
npm install @bic/claws-sdk
```

### Step 3 — update imports

Swap the package name. Subpath shape is preserved: the compiler exposes `./governance`, `./emit`, `./audit`, `./test`, and `./cache`. Symbol names and signatures are unchanged.

```typescript
// before
import { compile, type CompileResult } from "@bic/claws-sdk";
import { OCEmitter } from "@bic/claws-sdk/emit";
import { AuditChain } from "@bic/claws-sdk/audit";
import { validate } from "@bic/claws-sdk/test";

// after
import { compile, type CompileResult } from "@bic/claws-sdk";
import { OCEmitter } from "@bic/claws-sdk/emit";
import { AuditChain } from "@bic/claws-sdk/audit";
import { validate } from "@bic/claws-sdk/test";
```

See `api-mapping.md` for the full symbol-by-symbol table.

### Step 4 — verify the build

```bash
npx tsc --noEmit
npm test
```

If anything resolves to a symbol that no longer exists under `@bic/claws-sdk`, it belonged to the enterprise extension. Move it back to `@bic/claws-sdk` or drop the usage. See Path B if you actually need the extension surface.

## Path B: Enterprise extension

You use fleet management (`FleetScanner`, `FleetBroadcaster`, `DriftDetector`), compliance evidence builders (SOC 2, HIPAA, EU AI Act), SIEM emitters (CEF, syslog, NDJSON), PRESS compression, RELAX evaluation, identity/SSO, budget tracking, LSP, snapshots, context DAG, or the claws server.

### Step 1 — install the SDK (only)

```bash
npm install @bic/claws-sdk
```

The SDK declares `@bic/claws-sdk` as a hard dependency with an `integrityPins` hash. Installing the SDK pulls the compiler transitively and verifies the hash; you do **not** install both packages separately.

### Step 2 — no import changes needed

Every free-tier symbol is re-exported from `@bic/claws-sdk` at the same path. Your existing imports continue to work:

```typescript
// unchanged
import { compile, type CompileResult } from "@bic/claws-sdk";
import { OCEmitter } from "@bic/claws-sdk/emit";

// enterprise-only modules (unchanged too)
import { FleetScanner, DriftDetector } from "@bic/claws-sdk/fleet";
import { SOC2EvidenceBuilder } from "@bic/claws-sdk/compliance";
import { CEFEmitter } from "@bic/claws-sdk/siem";
```

### Step 3 — verify the integrity pin

When the SDK installs, it resolves `@bic/claws-sdk` at an exact version (no caret, no tilde) and checks the `sha512` hash in `integrityPins` against the installed tarball. Any mismatch fails the install. This is R1 review gate C5.

```bash
# optional — regenerate the pin after an intentional compiler bump
cd node_modules/@bic/claws-sdk
npm run integrity:hash  # if you have a local dev copy
```

Production consumers do not need to touch this. The pin is committed.

### Step 4 — verify the build

```bash
npx tsc --noEmit
npm test
```

## Path C: Cherry-pick dialect packages

You want the smallest possible footprint and only need one or two dialects (for example, an OpenClaw extension that needs audit-chain but not the compiler). Use the Tier 1 `@openclaw/*` and Tier 2 `@claws/*` packages instead of either `@bic/*` package.

### When to pick this path

- You are an OC developer, not a claws user
- You want MIT-licensed primitives without the compiler pipeline
- Your bundle size budget is tight (each `@openclaw/*` package is under 20 KB)
- You do not need `compile()` or `GovernanceIR`

### Available Tier 1 / Tier 2 packages

| Package                     | Purpose                        | Size   |
| --------------------------- | ------------------------------ | ------ |
| `@openclaw/audit-chain`     | Hash-chained audit trails      | ~20 KB |
| `@openclaw/budget-meter`    | Token/cost controls            | ~8 KB  |
| `@openclaw/identity-bridge` | OIDC/SAML SSO                  | ~3 KB  |
| `@openclaw/siem-emitter`    | SARIF/CEF/JSON/syslog          | ~5 KB  |
| `@openclaw/secret-scanner`  | Credential leak detection      | ~4 KB  |
| `@claws/relax`              | Policy expression engine       | ~25 KB |
| `@claws/audit`              | Standalone audit trail         | ~15 KB |
| `@claws/security`           | Input sanitization             | ~12 KB |
| `@claws/budget`             | Skill budget controls          | ~8 KB  |
| `@bic/claws-skill-kit`      | `skill()` factory + decorators | ~35 KB |

See `docs/claws/architecture/three-tier-packages.md` for the full tier map.

### Cherry-pick example

```typescript
// before: pulling the whole SDK for one helper
import { AuditChain } from "@bic/claws-sdk/audit";

// after: use the OC-native package
import { AuditChain } from "@openclaw/audit-chain";
```

The `@bic/claws-sdk` `AuditChain` and the `@openclaw/audit-chain` `AuditChain` are behaviorally equivalent for the Tier 1 surface. The compiler version also exposes Ed25519-signed entries and the chain-validation pipeline — if you need those, stay on `@bic/claws-sdk`.

## Decision tree

```
Do you call compile() or read GovernanceIR?
├── no ──── Path C (cherry-pick @openclaw/* or @claws/*)
└── yes
    │
    Do you use fleet/compliance/SIEM/PRESS/RELAX/identity/budget/LSP/snapshot/context/serve?
    ├── no ──── Path A (free tier, @bic/claws-sdk only)
    └── yes ─── Path B (enterprise, @bic/claws-sdk — pulls compiler transitively)
```

## Rollback

If the migration surfaces a regression, the old imports keep working as long as the package is still installed. `@bic/claws-sdk` is a superset of `@bic/claws-sdk` — rolling back from Path A to Path B is an install-only change:

```bash
npm uninstall @bic/claws-sdk
npm install @bic/claws-sdk
# no code changes required
```

Rolling back from Path B to the pre-split monolith is not supported — the monolith is archived.

## Breaking changes at 1.0.0

None, intentionally. The graduation release preserves every public symbol's name, signature, and subpath. The only change is the package the symbol lives in. The migration test suite (`packages/@bic/claws-sdk/tests/`) verifies that both packages agree on the free-tier surface.

Future breaking changes will follow semver: the `api-baseline.json` diff check (`scripts/check-api-diff.ts`) blocks any publish that breaks the contract without a major version bump.

## For CI/CD

If your pipeline runs `claws pinch --ci`, `claws comply --sign`, or `claws drift`, no changes are required. The CLI binary (`claws-cli`) delegates to whichever package is installed. See `docs/claws/fleet/` for the fleet-eng CI patterns.

## Questions

- **Does `@bic/claws-sdk` publish publicly?** No. Both `@bic/*` packages publish to the BIC-internal GitHub Enterprise registry. See `project_claws_no_public_publish` for the single-scope policy.
- **Can I use both packages in the same project?** No. `@bic/claws-sdk` already depends on `@bic/claws-sdk`. Installing both produces a duplicate-module warning. Pick one.
- **Is the free tier feature-frozen?** No. Bug fixes and additive changes ship as minor releases. Breaking changes require a major bump and a migration note here.
- **Where do I file bugs?** `microsoft.ghe.com/bic-internal/claws/issues`.
