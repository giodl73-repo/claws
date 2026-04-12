# Boss's OpenClaw Operational Tooling — Raw Input

**Source**: User-provided summary of boss's actual OpenClaw operational setup (2026-04-11)
**Context**: This is what an advanced OpenClaw operator built because the platform's built-in tooling is insufficient.

## Key Artifacts

### Upgrade Safety Stack
- `config/patches.json` — 8 active patches re-applied after every upgrade (BB reply, WA react, BB debounce, webhook routes, status scope, msg buttons, WA listeners, SecretRef workaround)
- `config/config-baseline.json` — known-good snapshot for drift detection
- `scripts/smoke-test-plugins.sh` — authoritative plugin smoke test (10 passed, 0 failed)
- `scripts/check-status.sh` — host-level health (gateway/BB/Docker/Messages/Tailscale/SSH)
- Rule: NEVER `openclaw update --tag main|beta|dev` (broke install 2026-04-04)

### Security & Drift
- `config/exec-approvals.json` — dual verification: repo vs live, at-rest vs in-motion
- `config/trusted-senders.json` — SPF/DKIM/DMARC allowlist
- `/debug-exec` — exec allowlist vs TOOLS.md drift audit
- `/debug-approvals` — runtime approval history (denied, timed out)

### Upgrade Lifecycle
- `/openclaw-upgrade` skill: backup → update → RE-APPLY PATCHES → smoke test → KB refresh
- `/openclaw-release` skill: check releases, summarize changes vs your config
- `openclaw-backup` wraps `openclaw backup create` → ~/lobster-backups/, auto-verify, prune >7d

### Diagnostics (12 debug commands)
- `/debug-status` — full system health
- `/debug-logs` — JSONL log search
- `/debug-investigate` — autonomous incident correlation
- `/debug-message` — end-to-end message trace
- `/debug-session` — session state
- `/debug-cron` — cron config + history
- `/debug-bb`, `/debug-whatsapp`, `/debug-travel-hub`, `/debug-homeclaw` — per-channel
- `/debug-exec` — exec drift
- `/debug-approvals` — approval history
- `/debug-agent` — agent inspection

### Known Pain Points (from user)
- Plugin/messaging ALWAYS breaks on upgrade
- 8 patches must be re-applied after every upgrade
- Agent self-reports are unreliable — must use smoke tests
- LCM dormancy incident (2026-03-17 → 04-04): upgrade silently reset plugins.slots.contextEngine
- Config baseline diff catches what patches miss (different failure classes)
