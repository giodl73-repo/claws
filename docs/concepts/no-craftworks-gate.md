# No-Craftworks Gate

**What this guide is**: how the `no-craftworks` gate enforces the invariant that bic/claws is a standalone repo — what it scans, how `.no-craftworks-allowlist.yaml` governs legitimate exemptions, the Windows-safe walker, and how to add an exemption. Read this if your PR tripped the gate or you need to add an allowlist entry.

## Why we have it

bic/claws is the runtime repo. craftworks is its lineage — the monorepo the code was lifted from via filter-repo. Once the lift is done, craftworks exists in git history and in migration narrative, not in active code.

The gate enforces this split. Active code cannot `import { ... } from '@craftworks/*'` because those packages don't exist in bic/claws's dependency graph. Narrative docs cannot casually reference "the craftworks monorepo" because that confuses contributors who only know bic/claws. Attribution, migration docs, and the scrubber's own source are legitimate exemptions — the allowlist carves them out explicitly.

Without the gate, craftworks references leak back in via copy-paste, stale templates, or unscrubbed migrations. The gate makes the drift mechanical to catch.

## What the gate scans

**In-scope files** (gate runs on these):

```
docs/**                    (except docs/contributing/migration.md)
packages/**/src/**
packages/**/test/**
devtools/**/src/**
devtools/**/test/**
scripts/**
tests/**
*.yaml, *.yml, *.json       (at any depth in-scope)
*.md                        (at any depth in-scope)
```

File extensions the scanner opens: `.ts`, `.tsx`, `.mjs`, `.js`, `.cjs`, `.json`, `.yaml`, `.yml`, `.md`.

**Out-of-scope**:

```
.git/**                    (immutable history — filter-repo rewrites were the authoritative pass)
dist/**, build/**          (generated)
node_modules/**            (vendored)
CHANGELOG.md               (see allowlist)
binary extensions          (.pdf, .png, .jpg, .gif, .ico, .woff, .woff2, .ttf, .otf)
```

Git metadata (commit messages, author/committer names, tag names) is never scanned. Those are immutable history. The gate operates only on working-tree content.

## Windows-safe walker

The walker lives at `devtools/repo-ops/src/no-craftworks/walker.ts` and uses `@nodelib/fs.walk` for cross-platform determinism. It is **not** a bash `grep -r`.

Why: Windows grep under Git Bash has inconsistent long-path support, case-folding quirks, and CRLF handling that differs from Linux CI. `@nodelib/fs.walk` gives us one walker that produces identical output on Windows and Linux. Testing the gate under `act` on Windows and Linux CI reproduces the exact same findings.

The walker's job, step by step:

```
1. Load .no-craftworks-allowlist.yaml; compile entries (regex per entry).
2. Enumerate in-scope files (glob + extension filter).
3. For each file, scan each line against the canonical regex.
4. For each match, test against allowlist: does any entry cover this path + pattern?
5. Emit structured report: { file, line, match, allowlistHit: boolean, allowlistReason }.
```

The canonical regex is locked in `CL-13-amendment-rename-to-claws.md` §Validation (3-pass form: source residue, stale-scope residue, positive allowlist). The walker runs all three passes.

## `.no-craftworks-allowlist.yaml` schema

The allowlist lives at repo root. Each entry has four fields:

```yaml
version: 1
entries:
  - path: MIGRATION.md
    pattern: 'craftworks'
    reason: |
      Root-level migration narrative explaining the lift from gim-home/craftworks
      to bic/claws. Required attribution; cannot be removed.
    reviewer: '@bic/claws-release-eng'
    expires: null    # permanent

  - path: scripts/scrub-doc.mjs
    pattern: '@craftworks/|craftworks'
    reason: |
      Scrubber script MUST contain the regex it enforces. Excluding its own
      source is required for the gate to be self-consistent.
    reviewer: '@bic/claws-release-eng'
    expires: null

  - path: docs/contributing/migration.md
    pattern: 'craftworks'
    reason: |
      Contributor-facing narrative documenting the migration origin. Required
      for git archaeology / onboarding context.
    reviewer: '@bic/claws-release-eng'
    expires: null
```

| Field      | Meaning                                                                                     |
|------------|---------------------------------------------------------------------------------------------|
| `path`     | Glob or literal path. Globs (`devtools/repo-ops/src/**`) match subtrees.                    |
| `pattern`  | Regex the entry allows. The gate only suppresses matches against this specific pattern.     |
| `reason`   | Why this exemption exists. Multi-line prose. Audited during stale-audit.                    |
| `reviewer` | GitHub team that must approve edits. Must match a team in `.github/CODEOWNERS`.             |
| `expires`  | ISO-8601 date or `null` for permanent. `--stale-audit` surfaces entries past expiry.        |

Legitimate exemptions fall into four categories: (1) attribution / migration narrative (`MIGRATION.md`, `LICENSE`, `NOTICE`, `docs/contributing/migration.md`), (2) the gate's own source (`devtools/repo-ops/src/no-craftworks/**`), (3) the scrubber's own source (`scripts/scrub-doc.mjs`, `devtools/repo-ops/src/scrubber/**`), (4) test fixtures that assert the gate fires (`devtools/repo-ops/test/**`).

## CODEOWNERS gate on allowlist edits

`.github/CODEOWNERS`:

```
/.no-craftworks-allowlist.yaml    @bic/claws-release-eng
```

Only the `@bic/claws-release-eng` team can approve allowlist edits. This matches the 2-maintainer boundary-critical rule from CL-13 §9: an allowlist entry is a boundary decision, so it gets boundary-level review.

A contributor who needs an exemption opens a PR that edits the allowlist; a release-eng reviewer reviews the `reason` field for legitimacy; merge is gated on their approval.

## Exit code 2 — why it's distinct

`claws doctor` exit codes:

```
0 — all checks pass
1 — gap failure (doc / accept / atoms)
2 — no-craftworks violation
3 — infrastructure error (walker crash, missing config)
```

`no-craftworks` violations get their own exit code because SIEM triage treats them differently from generic gate failures. Exit code 1 ("a doc is missing a required surface") is a routine CI failure — assign to the PR author. Exit code 2 ("active code references craftworks") is a boundary violation — escalate to release-eng because it may indicate an unscrubbed migration or an import someone snuck in.

CI workflows map the exit code to separate badges + SIEM alert classes so the right eyes land on each.

## `--stale-audit` mode

```bash
claws doctor --check no-craftworks --stale-audit
```

Runs monthly via GitHub Actions cron, not on every PR. It flags allowlist entries with one of:

- `expires` date has passed — entry should be removed or re-justified
- Zero active matches against the entry's pattern — the exemption is no longer needed (the files no longer contain the forbidden string)

The audit outputs a PR draft that release-eng reviews + merges. This prevents the allowlist from growing permanently: every entry is pressured toward removal unless it's genuinely permanent attribution.

## Adding a legitimate exemption — the 5 steps

1. **Confirm the exemption is necessary**. Can the content be scrubbed instead? Does the file really need to reference craftworks, or is a neutral phrasing sufficient? If the latter, scrub + don't add an entry.

2. **Draft the entry** in `.no-craftworks-allowlist.yaml`. Use the narrowest `path` glob that covers your case — prefer `path: docs/foo/bar.md` over `path: docs/**`. Use the narrowest `pattern` — prefer `pattern: 'craftworks-lineage'` over `pattern: 'craftworks'`. Include a full multi-line `reason` that a future maintainer can evaluate for staleness.

3. **Set `expires`** if this is temporary (e.g., a migration-window carve-out). Permanent attribution entries (`LICENSE`, `NOTICE`) set `expires: null`. When in doubt, set an expiry and renew.

4. **Open a PR**. CI runs `claws doctor --check no-craftworks` to verify the entry compiles + covers the intended matches. Mention `@bic/claws-release-eng` in the PR description so the CODEOWNERS review is front-of-mind.

5. **Merge after release-eng approval**. If the entry is rejected, the alternative is scrubbing the file — never routing around the gate.

## Cross-references

- [concepts--doc-validation.md](./doc-validation.md) — companion gate (exit code 1)
- [concepts--atoms-registry.md](./atoms-registry.md) — `atom:no-craftworks-gate` is an ops atom with `scenario-source: unit-test`
- `docs/specs/CL-13-repo-boundary.md` §Validation — the 3-pass canonical residue regex
- `docs/specs/CL-13-repo-boundary.md` §N.4 — no-craftworks gate authority
- `docs/contributing/migration.md` — allowlist-protected migration narrative
