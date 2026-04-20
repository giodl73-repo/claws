# residue-grep — 3-pass migration residue scanner

The `residue-grep` scanner enforces three invariants that keep `claws` free of
`craftworks` residue and of cross-scope leakage between `@bic/clawc-*` and
`@bic/openclaw-*` packages. It runs as a pre-commit hook locally and as CI gate
on every PR.

Spec: **CL-13 v1.7 §Validation** (3-pass regex amendment).

## What each pass catches

| Pass | Pattern | Scope | Rationale |
|------|---------|-------|-----------|
| 1. Source residue | `@craftworks/(clawc-\|agent-sdk\|compiler-sdk\|craftworks-sdk)` | All tracked files (minus allowlist) | Any live import of the craftworks scope is an escaped migration artifact. |
| 2. Cross-scope leak | `@bic/clawc-*` | `packages/openclaw-*/src/**` + `packages/openclaw-*/package.json` `dependencies` | OpenClaw packages must not depend on clawc-* in production code. `devDependencies` is carved out (test-only deps never ship). |
| 3. Allowlist enforcement | `@bic/openclaw-{name}` | All tracked files | The `openclaw` scope is a closed set: `workspace`, `guardrails`, `policy`, `snap`. Unknown names fail. |

## What to do on violation

**Don't add to the allowlist reflexively.** The allowlist exists for exempting
migration-era historical files (wave dirs, design-era docs, attribution
mailmap, negative-grep infra), not for convenience. A new allowlist entry
must go through the `clawc-repo-steward` approval gate and ship with a
≥ 20-char `reason` and an `approvedBy` signature.

**Instead**:

- **Pass 1 hit**: rewrite the import to `@bic/claws-sdk` (or the replacement
  mapping in CL-13 §6). If the file should never have landed, delete it.
- **Pass 2 hit** in `packages/openclaw-*/src/`: either move the consumer
  out of the openclaw scope or invert the dependency. Production openclaw
  code never imports clawc.
- **Pass 2 hit** in `packages/openclaw-*/package.json` `dependencies`: move
  the entry to `devDependencies` if it is genuinely test-only; otherwise
  remove it and find a cross-scope-safe alternative.
- **Pass 3 hit**: the scope is closed. If you need a new openclaw package,
  that is a scope-expansion decision — not an allowlist exception. Open a
  CL-13 amendment proposal.

## How the two enforcement surfaces chain

```
┌──────────────────────┐      ┌────────────────────────────┐
│  git commit (local)  │──▶── │ .git/hooks/pre-commit       │
│                      │      │   → scripts/residue-grep.sh │
│                      │      │     --mode=staged           │
└──────────────────────┘      └────────────┬────────────────┘
                                           │ reject → commit refused
                                           ▼
                              (contributor fixes or --no-verify)
                                           │
                                           ▼
┌──────────────────────┐      ┌────────────────────────────┐
│  git push → PR       │──▶── │ .github/workflows/         │
│                      │      │   no-craftworks.yml        │
│                      │      │   → scripts/residue-grep.sh│
│                      │      │     --mode=ci              │
└──────────────────────┘      └────────────┬────────────────┘
                                           │ reject → PR check red
                                           ▼
                              (posts violation list as PR comment)
```

The local hook is advisory (can be bypassed with `--no-verify`); CI is
mandatory (merge-blocking check).

## Installing the hook

After cloning:

```bash
bash scripts/install-hooks.sh
```

Re-run any time `scripts/hooks/*.template` changes.

## Running ad-hoc

```bash
# Against staged files (what the pre-commit hook does):
bash scripts/residue-grep.sh --mode=staged

# Against the full tracked tree (what CI does):
bash scripts/residue-grep.sh --mode=ci
```

Exits `0` on no violations, `1` on any unallowlisted hit.

## Drift protection

The regex patterns are inline in `scripts/residue-grep.sh`, but a matching
validator in `craftworks` (`tools/migration/residue-grep-validator.ts`)
parses the bash script and asserts the three patterns are the exact CL-13
v1.7 strings. Any drift — intentional or accidental — fails the validator's
unit tests and is caught before the bash script can land in `claws`.
