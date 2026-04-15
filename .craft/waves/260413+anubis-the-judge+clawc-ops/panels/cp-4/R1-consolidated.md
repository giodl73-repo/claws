# CP-4 Consolidated Review — Round 1

**Panel**: claws:gateway-eng, claws:ciso, craft:architect, claws:skill-author, claws:founder
**Type**: impl
**Round**: 1
**Date**: 2026-04-13

## Raw Totals

| Role | Major | Warning | Note |
|------|-------|---------|------|
| gateway-eng | 5 | 9 | 8 |
| ciso | 9 | 10 | 10 |
| architect | 3 | 7 | 7 |
| skill-author | 5 | 8 | 6 |
| founder | 5 | 9 | 9 |
| **Total raw** | **27** | **43** | **40** |

## Deduplicated Majors (12 unique after consolidation)

### M1 — Ceremony shares printed to stdout, defeating M-of-N security model
**Consensus: 3 roles** (ciso M6+M7, skill-author M1, founder M1)
- All N shares printed to one terminal/JSON stream
- Ceremony key generated in CLI, never registered in key registry
- Shares of an orphaned key with no system identity
**Fix**: SDK `initCeremony()` that generates+registers+splits; write each share to separate file; never print share data to stdout

### M2 — Fleet policy hardcoded permissive — governance gate broken
**Consensus: 3 roles** (skill-author M4, founder M2, ciso W9)
- `readFleetPublishPolicy(undefined)` always returns defaults
- `requireVerifiedPublish: true` can never be enforced
- Enterprise governance story is dead code
**Fix**: Load fleet policy from workspace config (claws.json) and pass to `readFleetPublishPolicy`

### M3 — Registry write not atomic — crash can corrupt registry.json
**Consensus: 3 roles** (gateway-eng M5, ciso M3, founder W9)
- `writeFile` truncates-then-writes; crash mid-write loses all key metadata
- Concurrent `registerKey` calls can overwrite each other
**Fix**: Write-to-temp-then-rename pattern; use file lock for concurrent access

### M4 — PBKDF2 iterations 100k below OWASP 2023 minimum of 600k
**Consensus: 3 roles** (ciso M1, gateway-eng W7, founder W6)
- Single-dev mode protects root key material with weak derivation
- Solo developers most likely to use weak passphrases
**Fix**: Increase to 600,000 iterations

### M5 — Business logic in annotate CLI adapter
**Single role** (architect M1) — clear architectural violation
- `parseSkillFrontmatter`, `injectAnnotations`, directory scan in claws-cli
- Keys, new, publish adapters correctly delegate to SDK; annotate does not
**Fix**: Move orchestration to SDK `annotateDirectory()`, CLI renders result

### M6 — CI signing key bypasses revocation check and has no validation
**Single role** (ciso M8+M9) — security hole
- `CLAWS_CI_SIGNING_KEY` env var accepted without format/length validation
- CI path never checks key registry for revocation status
**Fix**: Validate key format; check registry revocation status for CI keys

### M7 — @bic/claws-skill-kit package does not exist
**Single role** (founder M4) — adoption funnel broken
- Typed/verified scaffold templates import from `@bic/claws-skill-kit`
- Package not published; generated code won't compile
**Fix**: Ship the package, or generate plain TS for typed tier until it exists

### M8 — EnvStorage.write mutates process.env — volatile key material
**Consensus: 3 roles** (founder M5, ciso W4, skill-author N2)
- Key material vanishes when CLI process exits
- Registry entry persists but material is gone — silent failure on next use
**Fix**: Print env var assignment for shell profile; or write to `.env` file

### M9 — Lock file has no staleness check — can permanently brick rotation
**Consensus: 2 roles** (gateway-eng M2, ciso W2)
- Process crash leaves lock file forever
- No PID/timestamp check to detect stale locks
**Fix**: Write PID+timestamp to lock; auto-clean stale locks (process dead or >10min)

### M10 — Rollback uses non-null assertion on potentially null key material
**Consensus: 2 roles** (ciso M4, architect W6)
- If storage returns null, rollback writes "null" as key material
- Corrupts key silently during error recovery
**Fix**: Guard with null check before rotation begins; refuse to rotate if rollback impossible

### M11 — Hardcoded version string '0.36.0' across 4+ modules
**Consensus: 3 roles** (architect M2, skill-author W4, founder W5)
- Duplicated in remediation.ts, snapshot modules, compile cache
- Version bump must find and update each copy
**Fix**: Single canonical version constant imported everywhere

### M12 — Revocation is metadata-only — key material not destroyed
**Single role** (ciso W5) — elevated to M due to security impact
- Revoking a key only flips a registry flag
- Actual key material remains in storage, usable by filesystem access
**Fix**: Delete/overwrite key material from storage backend on revocation

## Strong Warnings (not blocking but should fix)

| # | Finding | Roles |
|---|---------|-------|
| W1 | Re-sign ALL .sig files on rotation regardless of signing key identity | ciso W6, founder W1 |
| W2 | Manifest uses HMAC (symmetric) not Ed25519 — third parties can't verify | ciso W7, founder W2 |
| W3 | Publish version is timestamp, not semver | founder M3, skill-author W8 |
| W4 | Badge reads SKILL.md but scaffold generates skill.yaml — badge always null | skill-author W2 |
| W5 | Windows file permissions (chmod 0o600) is no-op on NTFS | ciso M2 |
| W6 | Cross-domain deep imports bypass barrel exports | architect W1+W2 |
| W7 | Publish fetch has no timeout/abort — can hang indefinitely | gateway-eng M4 |
| W8 | GF(256) tables computed eagerly at module load | gateway-eng M3 |
| W9 | Heuristic engine is anglophone-only — no i18n for tool name patterns | founder W3 |
| W10 | `claws keys` description says "generate, list" but has 5 subcommands | skill-author W3, founder W8 |
| W11 | Presentation logic (formatKeysTable) in SDK instead of CLI | architect W3 |
| W12 | Two-phase commit treats only HTTP 200 as success, not 2xx | founder W7 |

## Summary

**12 Major findings** require fixes before CP-4 can merge. The top 4 are consensus findings flagged by 3+ roles:
1. Ceremony security model (shares to stdout)
2. Fleet policy dead code (governance gate broken)
3. Registry atomicity (crash corruption risk)
4. PBKDF2 iterations (below OWASP minimum)

No architectural rewrites needed — all fixes are localized. Recommend dispatching fix agents for all 12 Majors, then R2 verification review.
