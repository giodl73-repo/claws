---
name: extension-pattern-skill
description: The bundle-style plugin pattern — skills as Markdown-based prompt extensions; SKILL.md schema, four-tier source precedence, gating, vs code plugins, vs MCP
type: skunkworks-spec
applies_to: openclaw-core
source_version: HEAD 5e8cc1d9c (audit baseline)
authored: 2026-04-28
---

# Extension pattern — skills (bundle plugins)

## Why this is its own pattern

`VISION.md`: *"Prefer bundle-style plugins when they can express the
capability. They have a smaller, more stable interface and better
security boundaries."*

Skills are the canonical bundle-style plugin: declarative, manifest-
driven, **read-only**. No runtime hooks, no service registration, no
config schema. They are documentation packaged as a plugin slot.
Distinct from code plugins ([`plugin-model.md`](plugin-model.md)) and
from MCP servers ([`mcp.md`](mcp.md)).

## What a skill is

A **skill** is a Markdown-based prompt extension that teaches an agent
how and when to use external tools. Each skill is a directory
containing `SKILL.md` (YAML frontmatter + body). The body is free-form
prose: when to use, when not to use, setup, common commands, templates.

Three roles:

| Role | What it does |
|---|---|
| **Prompt extension** | Skill body injected into system prompt at session start. Agent reads as context before LLM responds. |
| **Gating + discovery** | Metadata flags (`requires.bins`, `requires.env`, `requires.config`) filter at load time. Agent only sees skills whose dependencies are satisfied. |
| **Tool catalog UI** | Skills surface in slash-command interfaces (`/skills list`, `/skills show github`) and macOS Skills picker. |

Critical distinction: **skills are not tools.** The `github` skill
doesn't register `gh` — it teaches the agent that `gh` exists and how
to invoke it. The skill is knowledge; the tool is mechanism.

## Discovery — four-tier precedence

OpenClaw scans for skills from multiple sources in precedence order
(highest first):

| Tier | Source | Use case |
|---|---|---|
| 1 | `<workspace>/skills/` | Workspace-specific overrides. |
| 2 | `<workspace>/.agents/skills/` | Project-agent skills. |
| 3 | `~/.agents/skills/` | Personal-agent skills. |
| 4 | `~/.openclaw/skills/` | User-managed skills. |
| 5 | bundled (shipped with OpenClaw) | ~57 baseline skills. |
| 6 | plugin-bundled (manifest `skills` field) | Plugin-shipped skills. |
| 7 | `skills.load.extraDirs` | Config-declared extra dirs. |

**Workspace skills win.** Easy to override bundled skills without
editing OpenClaw source. Also a footgun: an accidental workspace skill
silently shadows a plugin skill.

## Manifest field — `skills: string[]`

`src/plugins/manifest.ts:325`. Plugins declare paths relative to the
plugin root:

```jsonc
{
  "id": "browser",
  "skills": ["./skills"]
}
```

Path semantics:

- Single dir with a `SKILL.md` → registers that skill.
- Parent dir of subdirs → registers each subdir as a skill.
- **No glob support.** Paths must be exact.

A plugin shipping `./skills/browser-automation/SKILL.md` registers via
`"skills": ["./skills"]` (parent) — the loader walks subdirs.

## When skills activate

```
plugin enabled → skills eligible
session starts → eligible skills filtered (gating)
                → snapshot taken (frozen for session lifetime)
runtime watcher → hot-reload mid-session if SKILL.md changes
```

**Skills snapshot per session.** Changes to `SKILL.md` or config don't
take effect until the next session. The optional skills watcher
hot-reloads mid-session.

## SKILL.md schema

### Required frontmatter

```yaml
---
name: github
description: Use gh for GitHub issues, PR status, CI/logs, comments, reviews, releases, and API queries.
---
```

### Optional frontmatter

```yaml
homepage: https://wttr.in/:help
metadata: { "openclaw": { "emoji": "☔", "requires": { "bins": ["curl"] }, "install": [...] } }
user-invocable: true
disable-model-invocation: false
command-dispatch: tool
command-tool: my_tool
command-arg-mode: raw
```

### `metadata` block

**Must be valid JSON on a single line** — multiline objects fail
parsing. Encodes openclaw-specific gates:

| Field | Type | Purpose |
|---|---|---|
| `emoji` | string | Shown in macOS Skills UI picker. |
| `homepage` | string | Clickable "Website" link. |
| `os` | `("darwin"|"linux"|"win32")[]` | OS allowlist. Absent = all OSes. |
| `always` | boolean | Skip all gates; always eligible. |
| `requires.bins` | string[] | Binaries that must exist on `PATH`. |
| `requires.anyBins` | string[] | At least one must exist. |
| `requires.env` | string[] | Env vars must exist (or be supplied via `skills.entries.<name>.env`). |
| `requires.config` | string[] | Config paths that must be truthy. |
| `primaryEnv` | string | Env var associated with `skills.entries.<name>.apiKey`. |
| `install` | object[] | Installer specs (brew/node/go/download) for the macOS UI. |

### Eligibility rules

A skill is **ineligible** if any of:

- `requires.bins` missing from `PATH`,
- `requires.env` not set in env *and* not supplied via `skills.entries.<name>.env`,
- `requires.config` paths falsy,
- agent's `agents.list[id].skills` allowlist excludes it,
- `skills.entries.<name>.enabled: false`.

## Bundled skills inventory (representative)

| Skill | Purpose | Gate |
|---|---|---|
| `github` | `gh` CLI for PRs, issues, CI runs | requires `gh` |
| `weather` | `curl + wttr.in` weather lookup | requires `curl` |
| `coding-agent` | delegate to Codex/Claude Code/Pi | requires one of `[claude, codex, opencode, pi]` |
| `healthcheck` | host security audit workflow | none |
| `summarize` | URL/PDF/YouTube summarization | requires `summarize` binary |
| `browser-automation` (from `browser` plugin) | multi-step browser control | `user-invocable: false` |
| `acp-router` (from `acpx` plugin) | route coding-harness requests (Pi/Claude Code/Codex ACP) | none |

Total ~57 bundled.

## Three flavors of skill

### Core-bundled

Ship with OpenClaw under `/skills/` in source. Cover baseline UX. Per
`VISION.md`: *"We still ship some bundled skills for baseline UX. New
skills should be published through ClawHub first, not added to core
by default."*

### Plugin-bundled

Plugin declares `skills: [paths]` in manifest. Examples:

| Plugin | Skill |
|---|---|
| `browser` | `./skills/browser-automation/` |
| `acpx` | `./skills/acp-router/` |
| `diffs` | `./skills/` |

Load when the plugin is enabled. Same gating + precedence rules. A
workspace skill with the same name overrides.

### ClawHub-distributed

`openclaw skills install <slug>` downloads to `<workspace>/skills/`.
ClawHub provides provenance, security review, publisher vetting,
discovery without bloating core.

## Skill vs code plugin

| Aspect | Skill | Code plugin |
|---|---|---|
| Interface | Declarative YAML + Markdown | TypeScript module |
| Security boundary | Read-only; no runtime execution | Full runtime in gateway process |
| Config schema | Minimal metadata gates | Full JSON Schema validation |
| When it runs | Loaded at session start, prompt-injected, never executes | Loaded at activation, registers hooks/tools/providers |
| Capabilities | Prompt extension only | Tools, hooks, providers, channels, speech, realtime voice |
| Discovery cost | File I/O + text parse | Runtime code import + init |
| Coupling | Decoupled from runtime | Tightly coupled to plugin SDK |
| Maintenance burden | Low (stable format) | High (must track SDK changes) |
| What agent sees | Skill text in system prompt | Registered tools + hook side effects |

**Trade-offs:**

Skills *gain* — small attack surface, stable format, fast discovery,
simple authoring (no SDK), better precedence control.

Skills *lose* — no tools/hooks/providers, stateless, no capability
negotiation, no in-process API.

Use a **code plugin** when you need: runtime hooks, in-process services,
stateful integrations, negotiated capabilities (tool-result middleware).

Use a **skill** for: external CLI patterns, prompt prose, procedural
workflows, anything that's documentation rather than code.

## Skill ↔ agent harness interplay

Insertion mechanism: `formatSkillsForPrompt()` (in `pi-coding-agent`)
builds compact XML:

```xml
<skills>
  <skill>
    <name>github</name>
    <description>Use gh for GitHub issues, PR status, CI/logs, …</description>
    <location>/path/to/skills/github</location>
  </skill>
  <!-- … -->
</skills>
```

Injected once per session into the system prompt. Agents treat skills
as part of system context, not as executable tools.

**Skills do not appear in `tools.allow` or `tools.deny`.** They are
not tools. Agents do not call `/skill invoke github` — they read the
text and decide to run `gh pr view` (which is a `bash` tool call).

Slash-command exposure: skills marked `user-invocable: true` surface
in `/skills list` and `/skills show <name>`. User-facing affordances,
not agent-used commands.

## Skill ↔ MCP overlap

| | Skill | MCP server |
|---|---|---|
| Surface | Static prompt text | Dynamic tool catalog |
| Discovery | Session start; frozen snapshot | Real-time `listTools()` |
| Invocation | Agent runs an external CLI | Agent calls a tool over MCP transport |
| State | Stateless documentation | Server-side state possible |

A capability might fit both — e.g., weather. MCP path: register a
weather tool via MCP server. Skill path: document `curl + wttr.in`.
Coexistence is fine; pick by need (real-time discovery → MCP; CLI
documentation → skill).

## The bundle-plugin pattern, abstracted

A bundle-style plugin:

1. Declarative manifest lists what's offered.
2. Static resources (skills, MCP server configs, LSP defaults) are read-only files.
3. Activation gates (env, bins, config) control when resources load.
4. Minimal interface — manifest parse + file I/O. No runtime code execution at discovery.
5. Tight security boundary — no arbitrary code at load.

Why preferred (`VISION.md`): smaller interface, better security,
faster discovery, stable evolution, reduced maintenance complexity.

## Footguns

1. **Skill name should match dir name.** `name` field is used for allowlists + precedence; misalignment causes confusing override behavior. Not enforced.
2. **Metadata is single-line JSON only.** Multiline YAML fails parsing.
3. **`requires.bins` checked on the host.** Sandboxed agents need binaries inside the container — install via `agents.defaults.sandbox.docker.setupCommand`.
4. **Workspace skills override everything.** An accidental workspace skill silently shadows. Check precedence first when debugging missing skills.
5. **Agent allowlists are restrictive, not additive.** `agents.list[id].skills` *replaces* `agents.defaults.skills`. Omit the field to inherit defaults.
6. **Snapshot is per-session.** SKILL.md or config edits don't take effect until next session (or watcher hot-reload).
7. **Plugin skills load only when plugin enabled.** Disabled plugin → its skills hidden even if binaries present.
8. **`primaryEnv` config key uses skill name, not env-var name.** `skills.entries.my-skill.apiKey`, not `skills.entries.GEMINI_API_KEY`.
9. **Env injection is session-scoped.** `skills.entries.<name>.env` injects into `process.env` only during the agent turn.
10. **No manifest-time validation of `skills` paths.** Missing/broken skill dirs surface at session start, not at plugin load.

## Files I'd link from any skill PR

1. `VISION.md` — bundle-vs-code policy + skills bundling strategy.
2. `docs/tools/skills.md` — comprehensive skills guide.
3. `docs/plugins/manifest.md:179` — `skills` manifest field.
4. `skills/github/SKILL.md` — tool-centric exemplar.
5. `extensions/acpx/skills/acp-router/SKILL.md` — plugin-bundled exemplar (harness routing).
6. `extensions/browser/skills/browser-automation/SKILL.md` — plugin-bundled procedural exemplar.
7. `src/plugins/manifest.ts:325+` — `skills: string[]` schema.

## Read next

- [`plugin-model.md`](plugin-model.md) — code plugins (the alternative).
- [`extension-pattern-tool.md`](extension-pattern-tool.md) — how a skill's referenced CLI surfaces as a tool.
- [`mcp.md`](mcp.md) — the dynamic-catalog alternative.
