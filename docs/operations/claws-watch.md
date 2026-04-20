# How do I get continuous governance?

<!-- atom:claws-watch (C80) -->

> **Status: Design** -- this guide describes planned functionality.
> Implementation has not started. See `design/claws/CLAUDE.md` for current status.

You know `claws build` and `claws pinch`. You run them manually. That works
until you forget. `claws watch` is the inner ring -- it runs both on every
file save, automatically, in under a second.

## Run it

```
$ claws watch

  Watching: SOUL.md, AGENTS.md, TOOLS.md, agents.yaml, claws.json
  Platform: OpenClaw (detected)

  09:14:02  SOUL.md changed
            Built (847 tokens)  Pinched (0 violations)           0.4s

  09:17:31  TOOLS.md changed
            Built (912 tokens)  Pinched (0 violations)           0.3s

  09:23:14  TOOLS.md changed
            Built (945 tokens)
            G-CLASS  tool "send-email" is R5 but workspace is T2  FAIL
              Fix: raise trustTier to 3 in claws.json, or remove the tool
                                                                  0.5s

  09:23:48  claws.json changed
            Built (945 tokens)  Pinched (0 violations)           0.3s
```

File changed. Built. Pinched. Pass or fail in under a second. You never leave
your editor. You never run a command manually. You see violations the moment
you introduce them, not after the next upgrade breaks something.

This is what replaces the manual security review.

## What it watches

claws watches every file it compiles from: SOUL.md, TOOLS.md, AGENTS.md,
agents.yaml, claws.json, `.claws/policies/*.yaml`, and any file referenced
in your governance config. It uses `fs.watch` where available and falls back
to polling (1s interval) on platforms that need it.

Multiple saves within 300ms are batched into a single recompile. Rapid
save-save-save produces one build, not three.

## The pre-commit backstop

`claws watch` catches violations while you edit. But what if you close the
terminal, edit in another tool, or just forget to start watch? The pre-commit
hook is the backstop:

```bash
# .git/hooks/pre-commit (or husky/lint-staged)
claws pinch --staged --quiet
```

In practice:

```
$ git add TOOLS.md
$ git commit -m "add send-email tool"

  claws pinch --staged
  G-CLASS  tool "send-email" is R5 but workspace is T2         FAIL
    Fix: raise trustTier to 3 in claws.json, or remove the tool

  Commit blocked. Fix the violation and try again.
```

`--staged` checks only the files you're committing. `--quiet` suppresses
passing rules so clean commits are silent. A governed commit takes 0.2s
longer than an ungoverned one.

## Watch + pre-commit together

The inner ring is two layers:

| Layer | Trigger | Catches | Latency |
|-------|---------|---------|---------|
| `claws watch` | File save | Issues during editing | <1s |
| `claws pinch --staged` | Git commit | Issues that slipped past watch | <0.3s |

Watch is continuous feedback. The pre-commit hook is the safety net. Together
they catch 70% of all governance issues before code leaves the workspace.
The other 30% is caught by the middle ring (upgrade) and outer ring (fleet).

## Stopping watch

`Ctrl+C` stops it. No cleanup needed. No daemon running in the background.
Start it again with `claws watch`. State lives in `.claws/cache/` so
restarts are instant -- only changed files recompile.

## When to use watch vs manual pinch

| Situation | Use |
|-----------|-----|
| Active development session | `claws watch` |
| Quick one-off check | `claws pinch` |
| Before committing | `claws pinch --staged` (hook) |
| CI pipeline | `claws pinch --diff $BASE` |

Watch is for humans editing files. Pinch is for automation and spot checks.
Both run the same governance rules at the same speed.

## Scenario-Driven Additions

### From three-rings scenarios (50 findings applied)
- File-save trigger mode distinct from --staged: watch fires on filesystem save events, not git stage events; both are inner ring but have different detection characteristics
- Rapid file-save batch window (300ms): multiple saves within 300ms are coalesced into a single recompile to prevent wasted builds during fast edits
- Windows file watcher event deduplication: Windows FSEvents may fire duplicate events for a single save; the watcher deduplicates before triggering a build
- Cascading re-checks after fix edits: when watch detects a violation and the user fixes it, the re-check covers cross-file dependencies that may have been affected
- Single-instance watcher enforcement via PID file prevents orphaned watcher processes from accumulating on Windows when terminals close without cleanup (P-169)
- Watch-mode output format: append-style (new results below old) rather than overwrite, preserving violation history in the terminal
