# Experiment a: Reverse-Engineer the Upgrade Script

**Method**: web-search + design analysis
**Date**: 2026-04-11

> **Source**: Live web search (April 2026). URLs cited were publicly accessible at time of search.

---

## The OpenClaw Upgrade Reality

### Breaking change frequency

**3 breaking releases in under 90 days** in Q1 2026 alone (v2026.3.2, v2026.3.8, v2026.3.13). The v2026.3.22 release had **13 breaking changes and 45 new features** in a single release. v2026.4.2 delivered 2 more breaking changes + 50+ bug fixes. v2026.4.5 caused **10 gateway restarts in ~8 hours** from post-upgrade regressions.

This is not an edge case. This is the cadence. The boss's upgrade script exists because it HAS to.

### What breaks on upgrade

| Category | What breaks | Frequency | Example |
|----------|-----------|-----------|---------|
| **Config schema** | Keys renamed, nested, or removed | Every major release | `allow → enabled`, TTS provider configs nested |
| **Plugin paths** | Extension layout changes, source paths not migrated | ~quarterly | `extensions/acpx → dist/extensions/acpx` (#53273) |
| **Security defaults** | Stricter defaults break existing setups | ~quarterly | Plaintext WebSocket to LAN IPs now blocked |
| **Skill loading** | Custom skills fail to load after upgrade | ~monthly | v2026.1.30 skill loading regression (#8290) |
| **Gateway auth** | Token handling changes, proxy config | ~quarterly | trusted-proxy rejects mixed shared-token configs |
| **Env var prefix** | Legacy prefixes removed | One-time | CLAWDBOT_*/MOLTBOT_* → OPENCLAW_* |
| **State directory** | Legacy directory migration removed | One-time | ~/.moltbot → ~/.openclaw manual migration |
| **Subagent timing** | Timeout defaults change, cause cascade | Post-v2026.4.5 | 119 announce timeouts in one day, iMessage stops |

### What `openclaw doctor` does today

`openclaw doctor` is the built-in repair + migration tool. It checks:

1. **Service health**: PID, last exit status, is service actually running?
2. **Port collisions**: Gateway port 18789 availability
3. **Config audit**: Supervisor config (launchd/systemd/schtasks), best-practice checks
4. **Security warnings**: Open DM policies, local token mode, auth metadata drift
5. **System integration**: Workspace file size, memory embedding provider readiness
6. **Legacy migration**: Environment variable prefixes, state directory paths

### What `openclaw doctor` does NOT do (the gaps)

1. **`--fix` is unreliable**: Reports legacy config keys but doesn't actually fix them. Users must manually edit openclaw.json. (#62095)
2. **No pre-upgrade snapshot**: No automatic backup before migration. Users must manually stop gateway + archive ~/.openclaw/.
3. **No rollback**: If doctor breaks something, no undo. Community requested auto-rollback (#14526, #21488).
4. **No skill/plugin compatibility check**: Doctor doesn't verify if installed skills work with the new version.
5. **No governance**: Doctor checks toolchain health, not policy compliance. `openclaw security audit --deep` is a SEPARATE command that checks auth config, port exposure, DM policy — but it's diagnostic, not prescriptive.
6. **No drift detection**: Doctor doesn't compare current state to a known-good baseline.
7. **No fleet awareness**: Doctor is single-workspace. No way to doctor 47 workspaces at once.

### Community demand signals

| Issue | Stars/Reactions | What they want |
|-------|----------------|---------------|
| #14526 | Safer self-update | Pre-update backup + health check + auto-rollback/restore |
| #6477 | Auto-backup config | Automatic backup before doctor --fix and upgrades |
| #21488 | Dead man's switch | Built-in rollback if post-upgrade health check fails |
| #62095 | Post-upgrade stability | Doctor --fix should actually fix things |

The community is literally asking for glint.

---

## The Upgrade Script (Reconstructed)

Based on the web research, the boss's script likely does this:

```bash
#!/bin/bash
# === Pre-Upgrade ===
# 1. Stop gateway (consistent snapshot)
openclaw gateway stop

# 2. Backup everything (GPG-encrypted for credential safety)
tar czf ~/backups/openclaw-$(date +%Y%m%d).tar.gz ~/.openclaw/
gpg --encrypt --recipient self ~/backups/openclaw-$(date +%Y%m%d).tar.gz

# 3. Record current state
openclaw config get > /tmp/pre-upgrade-config.json
openclaw skills list > /tmp/pre-upgrade-skills.txt

# === Upgrade ===
# 4. Run the upgrade
npm install -g openclaw@latest

# === Post-Upgrade ===
# 5. Run doctor (with skepticism — --fix doesn't always work)
openclaw doctor --fix
# 5a. Manually fix what doctor missed
# (boss probably has sed/jq commands here for known renames)

# 6. Security drift review
openclaw security audit --deep
# 6a. Compare to pre-upgrade baseline
diff /tmp/pre-upgrade-config.json <(openclaw config get)

# 7. Skill compatibility check
openclaw skills list > /tmp/post-upgrade-skills.txt
diff /tmp/pre-upgrade-skills.txt /tmp/post-upgrade-skills.txt

# 8. Restart gateway
openclaw gateway start

# 9. Verify health
sleep 5
openclaw gateway status
# probably curl the health endpoint too

# 10. If broken: manual rollback from backup
```

10 steps. Manual. Platform-specific. No governance. No fleet support.

---

## Mapping to glint

| Script step | What it does | glint equivalent | Improvement |
|-------------|-------------|-----------------|-------------|
| 1. Stop gateway | Consistent snapshot state | N/A (glint governs files, not runtime) | Runtime management stays with `openclaw` |
| 2. Backup ~/.openclaw/ | Archive credentials + state | `glint snap save pre-upgrade` | Named, versioned, instant. No GPG needed — secrets in `.glint/secrets/vault.enc` already encrypted |
| 3. Record current state | Baseline for diff | `glint snap save` captures IR + policy state | Semantic snapshot, not file-level |
| 4. npm install upgrade | Install new version | N/A (platform upgrade, not glint's job) | glint detects post-upgrade state changes |
| 5. doctor --fix | Config migration | `glint doctor --post-upgrade` | **Actually works.** Compile-time validation, not runtime guessing |
| 5a. Manual fixes | What doctor missed | `glint pinch --fix` | Automated remediation based on policy rules |
| 6. Security audit | Check auth, ports, DM policy | `glint pinch` (includes security policy rules) | Compile-time, prescriptive, not just diagnostic |
| 6a. Drift comparison | Diff pre/post config | `glint diff pre-upgrade HEAD` | Semantic diff, not text diff |
| 7. Skill compat | Check skills still load | `glint pinch` (G2 skill policy rules) | Validates skill governance at compile time |
| 8. Restart gateway | Apply changes | N/A (runtime) | Not glint's job |
| 9. Verify health | Is it working? | `glint doctor` | Cross-platform health check |
| 10. Rollback | Restore from backup | `glint snap restore pre-upgrade` | Named restore, semantic (not file-level), instant |

### The glint upgrade flow (replacing the script)

```bash
# Before upgrade (1 command replaces steps 1-3)
glint snap save pre-upgrade --pinch

# [user upgrades OpenClaw: npm install -g openclaw@latest]

# After upgrade (1 command replaces steps 5-9)
glint doctor --post-upgrade
  ✓ Platform: OpenClaw v2026.4.9 (was v2026.4.5)
  ✓ Config schema: 2 migrations applied (allow→enabled, tts nesting)
  ✓ Skill compatibility: 12/12 skills valid
  ✗ Security: 1 finding — plaintext WS to LAN IP now blocked
    → Run 'glint pinch --fix' to remediate

glint pinch --fix
  Fixed 1 violation: updated gateway bind to loopback
  All 15 policy checks passed.

# If broken (1 command replaces step 10)
glint snap restore pre-upgrade
  Restored governance state to pre-upgrade snapshot.
```

**3 commands replace a 10-step script.** And the inner ring (`glint watch`) means most drift is caught BEFORE the upgrade — the upgrade just needs platform-specific migration.

### Gaps glint fills that NO OpenClaw tool fills

| Gap | Today | With glint |
|-----|-------|-----------|
| **Pre-upgrade governance snapshot** | Manual tar+GPG | `glint snap save --pinch` (governance-validated snapshot) |
| **Config migration that works** | doctor --fix is unreliable | `glint doctor --post-upgrade` (compile-time, deterministic) |
| **Skill policy validation** | Manual testing | `glint pinch` (G2 rules validate skills against policy) |
| **Semantic pre/post diff** | `diff` on JSON dumps | `glint diff pre-upgrade HEAD` (IR-level semantic diff) |
| **Named rollback** | Restore from tar archive | `glint snap restore pre-upgrade` |
| **Fleet upgrade** | Run script on each workspace manually | `glint doctor --post-upgrade --fleet` |
| **Continuous governance** | Only runs at upgrade checkpoint | `glint watch` (every save), `glint pinch --staged` (every commit) |

### The "dead man's switch" pattern

Community issue #21488 asks for: "if post-upgrade health check fails, auto-rollback." In glint:

```bash
glint snap save pre-upgrade --pinch && \
  npm install -g openclaw@latest && \
  glint doctor --post-upgrade && \
  glint pinch || \
  glint snap restore pre-upgrade
```

If doctor or pinch fails, auto-restore. This is the dead man's switch — built from existing commands, no new infrastructure.

---

## Key Finding

**The upgrade script is 10 manual steps that glint reduces to 3 commands.** But the bigger insight: if `glint watch` runs continuously, 7 of those 10 steps become unnecessary. The only upgrade-specific steps are: (1) snapshot before, (2) doctor after (platform migration), (3) restore if broken. Everything else — drift detection, security audit, skill validation, config compliance — should already be passing because glint caught issues on every save.

The boss's upgrade script is a symptom of governance running at checkpoints instead of continuously.
