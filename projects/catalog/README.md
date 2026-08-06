# Catalog Project

Use this area for OpenClaw command catalog work: read-only CLI inventory,
command-owned metadata, live node observations, explicitly scoped prompt
projection, generated command docs, optional evidence consumers, and RFC/PR
coordination.

## Active Notes

| Area                      | File                     |
| ------------------------- | ------------------------ |
| Session handoff           | `SESSION.md`             |
| OpenClaw PR-stack history | `../openclaw/SESSION.md` |

## Active Work

| Repo          | PR / Issue                           | Branch                                    | Status           | Purpose                                                                                         |
| ------------- | ------------------------------------ | ----------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------- |
| OpenClaw RFCs | `openclaw/rfcs#32`                   | `codex/cli-catalog-overlay-rfc`           | Open             | RFC for the catalog view, review stack, and implementation boundaries.                          |
| OpenClaw      | `openclaw/openclaw#100960`           | `user/giodl/cli-catalog-review-hardening` | Open             | Initial `commands list` and `commands inspect` implementation.                                  |
| OpenClaw      | `openclaw/openclaw#104158`-`#104160` | `user/giodl/commands-upstream-*`          | Draft            | Live node inventory, explicit prompt projection, and generated docs.                            |
| OpenClaw fork | `giodl73-repo/openclaw#30`-`#32`     | `user/giodl/commands-*`                   | Draft prototypes | Internal policy evidence, drift, and bounded-search projections; not callable product surfaces. |
| OpenClaw fork | `giodl73-repo/openclaw#11`-`#29`     | historical branches                       | Preserved        | Earlier catalog and command-inventory comparisons; non-normative.                               |

## Related Areas

- `projects/openclaw/README.md` for general OpenClaw PR/RFC coordination.
- `projects/feeds/README.md` for feed/trust work that may consume catalog
  metadata later.
- `projects/pr-loop/README.md` for PR stack operations and CI handoffs.
