# Lossless Round-Trip

<!-- atom:lossless-roundtrip (C54) -->

claws never modifies your workspace source files. This is not a design preference. It is the trust contract.

## The invariant

```
read(file) -> IR -> emit(IR) === file
```

Every workspace source file that claws reads is returned byte-for-byte identical after compilation. SOUL.md, AGENTS.md, TOOLS.md, IDENTITY.md, USER.md, MEMORY.md, HEARTBEAT.md, your skills, your lobster.yaml -- all untouched. claws reads them, extracts intent, builds an IR, and emits governance artifacts alongside them. The originals are never written to.

**Note**: `claws init` does modify 3 configuration files -- `openclaw.json` (to register the governance plugin), `exec-approvals.json` (to sync allowlists), and `.gitignore` (to add `.claws/` exclusions). Originals are backed up to `~/.claws-backups/<timestamp>/` before modification. The invariant applies to the 9 workspace source files listed above -- claws never modifies those.

## Add-only architecture

claws's output is strictly additive. Here is what a workspace looks like before and after `claws init` + `claws build`:

```
Before claws                         After claws
my-agent/                           my-agent/
  SOUL.md             <-- yours       SOUL.md             <-- untouched
  AGENTS.md           <-- yours       AGENTS.md           <-- untouched
  TOOLS.md            <-- yours       TOOLS.md            <-- untouched
  skills/             <-- yours       skills/             <-- untouched
  lobster.yaml        <-- yours       lobster.yaml        <-- untouched
                                      claws.json          <-- NEW: governance config
                                      .claws/             <-- NEW: compiled artifacts
                                      skills/claws-governance/  <-- NEW: advisory skill
                                      plugins/claws-governance/ <-- NEW: enforcement plugin
                                      exec-approvals.json       <-- NEW: host-level backup
                                      lobster.compiled.yaml     <-- NEW: governed workflow
```

Every new file lives in a claws-namespaced location. The governance skill is in `skills/claws-governance/`, not mixed into your existing skills. The plugin is in `plugins/claws-governance/`, not injected into your code. The compiled workflow is `lobster.compiled.yaml`, not a modification of your `lobster.yaml`.

## Parser architecture

claws's GovernanceIR follows the same architectural pattern as FormaIR (Spec 109): a stable pivot between analysis and emission that is serializable, inspectable, diffable, and cacheable. The parse framework itself follows FORMA (Spec 115) -- the 3-phase parse architecture the astro compiler uses. FORMA is the parser framework; FormaIR is the IR it produces. claws's GovernanceAST is a new ~200-node-type AST with governance-specific semantics -- it does not inherit FORMA's format-preserving round-trip because claws never re-emits source files. The round-trip is trivially lossless because the write path does not exist for source files.

The GovernanceAST produced by Phase 1 (PARSE) captures the semantic content of your workspace files without storing their formatting, whitespace, or comments. This is intentional -- claws needs to understand what your files mean, not reproduce how they look. The originals serve that purpose, unchanged.

**Internal normalization vs file mutation** (P-100, P-101): The parser performs two normalization steps internally: UTF-8 BOM stripping and CRLF-to-LF line ending normalization. These transformations are applied to the in-memory read buffer only -- the original files on disk are never modified. This means the GovernanceIR hash is computed from normalized content (ensuring cross-platform determinism between Windows CRLF and Linux LF), while the source files retain their original encoding and line endings. The round-trip is technically not byte-for-byte between the normalized internal representation and the original file -- but the original file is never re-emitted, so no round-trip occurs on the source file path. The normalization is a read-path operation that produces a stable, platform-independent internal representation.

## The `rm -rf` test

```bash
rm -rf .claws claws.json skills/claws-governance plugins/claws-governance \
       exec-approvals.json lobster.compiled.yaml
```

After this command, your workspace is exactly what it was before claws was ever installed. No modified configs. No leftover references. No broken imports. No orphaned hooks. The Gateway starts and runs as if claws never existed.

This is the **reversibility contract**: governance is always removable. No workspace is permanently changed by claws. The founder's question -- "can the user uninstall this?" -- has a concrete answer: yes, and it is one `rm -rf` away.

`claws uninstall` does this more carefully (backing up audit chains to `~/.claws-audit-archive/`, restoring original `openclaw.json` from `~/.claws-backups/`), but the principle is the same: removal is complete and the workspace is restored.

## Why this matters

### For the gateway-eng

Gateway stability depends on predictability. If a governance tool modifies `openclaw.json`, existing plugin registrations, or tool configurations, every upgrade is a risk. claws's add-only architecture means the Gateway's existing configuration is never touched. The governance plugin is registered alongside existing plugins, not injected into them. Uninstalling governance is removing files, not reverting modifications.

### For the founder

The 13,729 skill authors in the OC ecosystem chose an open platform because it is simple: a folder with markdown files IS the agent. If governance modifies those files -- adding frontmatter, injecting markers, rewriting sections -- the simplicity is lost. The author opens their SOUL.md and finds content they did not write. That erosion of ownership is how open-source trust dies.

claws respects what the community built. Your SOUL.md is yours. Your skills are yours. Governance is a layer that sits beside your work, not on top of it.

## Backup architecture

Even `claws init` is cautious. When it creates `claws.json` or modifies `openclaw.json` (to register the governance plugin), it:

1. Backs up the original to `~/.claws-backups/<timestamp>/` (outside `.claws/`)
2. Records the backup location in `.claws/meta.json`
3. Ensures `claws uninstall` can restore the exact original

Backups live outside `.claws/` so that `rm -rf .claws` does not destroy restore files. The audit chain is archived to `~/.claws-audit-archive/` on uninstall because compliance requires audit trails to survive governance removal.

## The compile contract

The GovernanceIR serialized to `.claws/compiled/governance-ir.json` is a function of your workspace files and your `claws.json` policy. It is deterministic: same inputs, same IR, same output. The `hash` field in the IR enables incremental recompilation -- if your files have not changed, `claws build` is a no-op.

This determinism is part of the trust model. You can inspect the IR (`claws inspect`), diff two IRs (`claws diff`), and verify that the compiled output matches your intent. Nothing hidden, nothing opaque.

## Scenario-Driven Additions

### From lossless-roundtrip scenarios (32 findings applied)
- Write-allow-list in EMIT phase explicitly enumerates which paths the compiler may create; any write outside the list is a bug
- Two hash types: raw-byte SHA-256 for lossless verification (proves files unchanged) vs normalized-content hash for IR caching (ensures cross-platform determinism)
- BOM preservation: UTF-8/UTF-16 BOMs are stripped from the in-memory read buffer but never removed from disk; binary comparison tests verify BOM round-trip
- CRLF handling: mixed line endings (CRLF/LF/CR) are normalized to LF internally; generated output line endings match workspace convention or force LF
- Deterministic serialization: sorted-key JSON via replacer function, lexicographic file path ordering, GovernanceIR hash excludes timestamps and ambient state
- Compiled workflow detection in PARSE prevents feedback loops (compiled .yaml fed back as source)
- Crash safety: atomic staging directory with explicit unhandled-exception cleanup path

## One sentence

claws adds governance to your workspace without changing a single byte of what you already have, and removing claws returns your workspace to exactly what it was.
