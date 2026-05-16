# OpenClaw Workspace Fix Principles

This note captures the operating model for choosing and sequencing small OpenClaw fixes around workspace/bootstrap files such as `SOUL.md`, `IDENTITY.md`, `AGENTS.md`, and `MEMORY.md`.

## Problem frame

The recurring issue clusters are not independent bugs. They mostly come from unclear or inconsistent handling of workspace-file lifecycle, diagnostics, context budgeting, edit/write status, and trust boundaries. Prefer fixes that improve one of those shared mechanisms over narrow one-off patches.

## Shared solution principles

| Principle | What it solves | Current fix targets |
|---|---|---|
| Single bootstrap context contract | Defines when `SOUL.md`, `IDENTITY.md`, `AGENTS.md`, and `MEMORY.md` are loaded, reloaded, resumed, compacted, and de-duplicated. | Resume/reset bugs, inconsistent instruction following. Avoid duplicating issues that already have active PRs. |
| Provenance and diagnostics | Every injected or skipped workspace file should have visible source, path, status, and warning behavior. | False warnings, silent ignored files, truncation visibility. |
| Stable ordering and budgeting | Bootstrap files should have deterministic priority and repeatable warnings when context budget pressure changes. | `AGENTS.md` / `MEMORY.md` truncation, one-shot warnings. |
| Lifecycle rehydration | Required workspace context should be restored after resume, heartbeat, reset, or compaction without duplicate bloat. | `SOUL.md` / `IDENTITY.md` lost after reload. |
| Edit/write status normalization | Distinguish unsupported, skipped, failed, succeeded, and succeeded-with-warning states. | Feishu `AGENTS.md` false failure warnings. |
| Boundary and security model | Workspace files should respect isolation, symlink, trust, and cross-workspace boundaries consistently. | Privacy leaks, symlink behavior, trust boundary bugs. |

## Selection order

1. Fix diagnostics/status correctness first, because users and reviewers need reliable signals before deeper lifecycle changes are trusted.
2. Fix context budgeting/truncation correctness next, because deterministic ordering and repeatable warnings create the foundation for safe bootstrap behavior.
3. Fix broader lifecycle/memory behavior after the observable system is trustworthy, especially where behavior is policy-heavy or hard to prove from one issue.

## Current candidate queue

| Priority | Issue | Why |
|---:|---|---|
| 1 | `openclaw/openclaw#80066` | Narrow false-warning/status bug around `AGENTS.md` edits; likely small blast radius and easy real-behavior proof. |
| 2 | `openclaw/openclaw#78211` | Truncation warning behavior; reinforces diagnostics plus stable budgeting. |
| 3 | `openclaw/openclaw#76838` | Longer-lived `MEMORY.md` behavior; likely broader and more policy-sensitive, so defer until diagnostics are stronger. |

Avoid opening duplicate PRs for workspace/bootstrap issues with active fixes already found: `#80374`, `#81710`, `#75187`, `#29387`, `#38622`, `#77831`, `#80613`, and `#70573`.
