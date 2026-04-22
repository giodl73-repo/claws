# Contributing — Windows setup

bic/claws is a Windows-first repo. CI passes Windows as the primary target;
Linux and macOS are secondary. This is historical and permanent — don't
try to redesign around it. What it means in practice: your local dev
machine should be Windows (Git Bash / MSYS2), and if something works on
Linux but is flaky on Windows, it's the Linux path that's tolerated, not
the other way around.

This guide gets a fresh clone to `claws doctor` green on a Windows box.

## Why Windows-only

The constraint is inherited from craftworks (see that repo's `CLAUDE.md`
for the original rationale). Two consequences: **all PRs must pass
Windows CI** (CRLF, path-length, `fs.watch` — write for Windows first),
and **`fs.watch` is unreliable** (the openclaw
`openclaw-file-watcher-detects-change` test is Linux/macOS-only by design).

## Required Windows configuration

### Long paths

Node.js toolchains routinely exceed the classic 260-character `MAX_PATH`.
Enable long paths at both Git and Windows layers.

```bash
git config --global core.longpaths true
```

Registry (Administrator PowerShell, run once per machine):

```
Computer\HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\FileSystem
  LongPathsEnabled (DWORD) = 1
```

Or via PowerShell:

```powershell
New-ItemProperty `
  -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem' `
  -Name 'LongPathsEnabled' -PropertyType DWORD -Value 1 -Force
```

Sign out and back in. Without this, `pnpm install` on a deep scenario
fixture path throws `EACCES` in a way that doesn't obviously name the
path-length cause.

### Line endings

```bash
git config --global core.autocrlf false
```

Files keep the line endings they were committed with. The scrubber
(`scripts/scrub-doc.mjs`) detects and preserves per-file CRLF/LF/BOM —
don't let your editor override it. If VS Code is flipping line endings,
set `"files.eol": "\n"` is **wrong** for this repo; leave it at `"auto"`
and trust the committed bytes.

### Node.js

Minimum version lives in each package's `package.json` `engines.node`
field. Check before installing:

```bash
cat packages/clawc-cli/package.json | grep -A1 engines
```

Typical floor is Node 18+. Install via the official installer or `nvm-windows`.

### Package manager

Check for `pnpm-workspace.yaml` at the repo root. If present, use `pnpm`;
otherwise npm workspaces:

```bash
# pnpm (if pnpm-workspace.yaml exists)
npm install -g pnpm
pnpm install

# npm workspaces (fallback)
npm install
```

Per CLAUDE.md: **no `npx`**. `npx` leaves orphaned processes on Windows.
Install binaries globally (`vitest`, `tsc`, `tsup`, `tsx`, `marp`, `rimraf`)
and invoke them directly.

### Shell

MSYS2 / Git Bash. Path format in bash is `/c/src/bic/claws`; in Node.js or
native tooling it's `C:\src\bic\claws` (forward slashes also accepted in
most JS APIs). The relay pattern for Windows-authenticated tools (if
you're pulling in WorkIQ or similar) lives outside this repo.

## Common Windows gotchas

### Antivirus scan latency

Defender scans every file `pnpm install` writes. Initial install is
slower than Linux — expected. If intolerable, add the repo root to
Defender's exclusion list (Settings → Virus & threat protection).

### EACCES with no obvious cause

Usually path length > 260 chars without `LongPathsEnabled`. Verify the
registry value and that you signed out after setting it.

### Editor "fixes" line endings

If the scrubber flags line-ending changes on files you didn't touch, your
editor is rewriting `\r\n` to `\n` on save. Disable autoformat for
`*.md`, `*.yaml`, `*.yml`.

### `fs.watch` tests

NTFS + Defender buffering make sub-second file-event delivery on Windows
unpredictable. Tests that need it must be marked Linux-only.

### Case-sensitivity

NTFS is case-insensitive; the accept-test scenario-loader forces
case-sensitive matching so locally-passing scenarios don't break on Linux
CI. Match directory case exactly.

## Verifying setup

```bash
claws doctor
```

On a fresh clone with no user-added atoms, expected output: all four
checks (`atoms`, `docs`, `accept`, `no-craftworks`) green, total runtime
under ~15s on Windows. If `--check no-craftworks` fails on a clean clone,
your scrub config is out of sync — file an issue, don't work around it.

## Symlinks

Rejected by design. The scenario-loader refuses symlinked scenario
directories (security + cross-platform predictability). If a fixture
needs file copying, use the `fixture-copier` utility in the accept-runner.

## Cross-references

- [`concepts--no-craftworks-gate.md`](../concepts/no-craftworks-gate.md) — walker uses `@nodelib/fs.walk`, not Windows-shell grep
- `CLAUDE.md` (craftworks monorepo) — Windows-permanent constraint rationale
- [`contributing--adding-an-atom.md`](./adding-an-atom.md) — editor cascade the scaffolder uses
