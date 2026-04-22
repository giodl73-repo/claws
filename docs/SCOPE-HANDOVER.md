# Scope Handover — `@bic/openclaw-*` → `@openclaw/*`

## Summary

The 5 upstream-shape packages currently publish under `@bic/openclaw-*`
(Microsoft-internal GPR). They are designed to be byte-identical to a
future `@openclaw/*` public publish on the npm registry, pending Peter
greenlight on the upstream-contrib plan.

This doc is the handover playbook for when that greenlight happens.

## Packages affected

The 5 `packages/openclaw-*` publish targets:

| Current (@bic) | Target (@openclaw) | Source |
|---|---|---|
| `@bic/openclaw-workspace` | `@openclaw/workspace` | `packages/openclaw-workspace/` |
| `@bic/openclaw-guardrails` | `@openclaw/guardrails` | `packages/openclaw-guardrails/` |
| `@bic/openclaw-policy` | `@openclaw/policy` | `packages/openclaw-policy/` |
| `@bic/openclaw-snap` | `@openclaw/snap` | `packages/openclaw-snap/` |
| `@bic/openclaw-lsp` | `@openclaw/lsp` | `packages/openclaw-lsp/` |

## What changes mechanically

**Only the package scope.** The src/ trees, test fixtures, docs, and
API surface stay byte-identical. The flip affects:

- `package.json` → `"name"` field: `@bic/openclaw-*` → `@openclaw/*`
- `package.json` → `publishConfig` → registry URL
- Cross-package imports within openclaw-* → scope prefix only
- `exports` map → unchanged (relative paths)
- `bin` entries → unchanged

## What does NOT change

- Source code (`src/**/*.ts`)
- Tests
- Types surface
- Contract-test output (Ra's "scope-flip-byte-identical" invariant)
- Version number (publish continues from the current version)

The BIC-internal tier (`@bic/claws-*`) is NOT affected. Those packages
stay `@bic` permanently — they're Microsoft-internal enterprise product,
never upstream.

## Pre-flip checks

Before pulling the trigger:

1. **Peter's greenlight is recorded** — written approval on the
   upstream-contrib plan, in writing (Teams, email, or signed doc)
2. **Ra's byte-identical contract passes** — the scope-flip test from
   Ra wave verifies the diff between `@bic` and `@openclaw` tarballs
   is ONLY the scope rename
3. **Public npm registry auth is set up** — separate from GHE Packages
4. **OSS license is in place** — each openclaw-* package has a clean
   MIT (or equivalent) license in `LICENSE`
5. **No `@craftworks/` references** — already enforced by `no-craftworks.yml`
6. **No `@bic/claws-*` imports** — openclaw-* upstream-purity
   invariant from CP-2 pulse 06

## Execution (when greenlit)

This is NOT automated today. When the flip happens, the playbook is:

```bash
# 1. Create scope-flip PR from main
git checkout -b flip/openclaw-scope

# 2. Rewrite package.json name fields + publishConfig
for pkg in packages/openclaw-*/; do
  node -e "
    const fs = require('fs');
    const j = JSON.parse(fs.readFileSync('$pkg/package.json', 'utf8'));
    j.name = j.name.replace(/^@bic\//, '@openclaw/');
    j.publishConfig = { registry: 'https://registry.npmjs.org/', access: 'public' };
    fs.writeFileSync('$pkg/package.json', JSON.stringify(j, null, 2) + '\n');
  "
done

# 3. Rewrite cross-package imports within openclaw-* src/ trees
grep -rl '@bic/openclaw-' packages/openclaw-*/src/ \
  | xargs sed -i 's|@bic/openclaw-|@openclaw/|g'

# 4. Verify byte-identical contract
npm run test  # assuming a scope-flip contract test exists
bash scripts/residue-grep.sh --mode=ci  # 0 violations

# 5. Build + publish
npm ci
npm run build
for pkg in packages/openclaw-*/; do
  (cd "$pkg" && npm publish --access public --registry=https://registry.npmjs.org/)
done
```

## Verification after flip

1. Fresh install from public npm works:
   ```bash
   mkdir /tmp/openclaw-check && cd /tmp/openclaw-check
   npm init -y
   npm install @openclaw/workspace
   node -e "const w = require('@openclaw/workspace'); console.log(w)"
   ```
2. GPR `@bic/openclaw-*` packages stay available for backward compat
   (mark as deprecated with migration instructions after the public
   flip stabilizes)
3. Downstream `@bic/claws-*` packages still import `@openclaw/*` cleanly

## What's NOT in scope for the handover

- Moving the repo to public GitHub — out of scope; stays internal on
  GHE per CLAUDE.md public-release-boundary rule
- OSS governance (issues, PRs from external contributors) — separate
  plan, owned by Peter's team
- Renaming `@bic/claws-*` — those stay BIC permanently
- Documentation site migration — future wave
