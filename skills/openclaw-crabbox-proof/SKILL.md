---
name: openclaw-crabbox-proof
description: Gather WSL and Crabbox before/after evidence for OpenClaw fixes. Use when asked to repro with WSL/Crabbox, collect external proof, prepare real behavior proof, or verify a branch outside the local checkout.
---

# OpenClaw Crabbox Proof

Use this skill for external behavior evidence. Crabbox proof should be
self-contained, deterministic, and safe to paste into a PR body.

## Proof standard

Collect evidence that shows:

1. `origin/main` or the pre-fix state fails for the targeted behavior.
2. The patched branch passes for the same behavior.
3. Guardrails remain intact for adjacent sensitive behavior.
4. No real credentials, private services, or user data are required unless the
   user explicitly approves them.

## Preferred proof shape

Use a temp workspace and temp data. For OpenClaw source proof, prefer a script
that:

- Installs or bootstraps Node/pnpm if the Crabbox image lacks them.
- Runs the same probe against a clean `origin/main` clone.
- Runs the same probe against the synced patched checkout.
- Prints machine-readable markers such as `before_status=1` and
  `after_status=0`.

## Commands

```powershell
wsl -d Ubuntu-24.04 -- bash -lc 'cd /root/src/openclaw-branches/base && /root/src/openclaw-branches/crabbox/bin/crabbox run -class beast -script /path/to/proof.sh'
```

If a lease is stuck in bootstrap with SSH ports closed for several minutes, stop
that run and retry on a smaller or different class. Do not wait indefinitely.

## PR body fields

After proof passes, use `skills\openclaw-pr-loop\references\real-behavior-proof.md`
for exact labels.
