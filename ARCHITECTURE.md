# Architecture

Claws separates portable composition from transport and execution. A source
provider obtains one immutable Claw package. The reference parser validates the
same package format regardless of its source. A harness adapter then asks the
selected host to preview or apply it under that host's own policy.

```text
component sources                 complete-Claw sources
-----------------                 ---------------------
local SKILL.md ----\              local directory -----\
skills.sh / Git ----> create ---> Claw package ---------> reference parser
exact packages -----/              ClawHub coordinate --/         |
                                   GitHub commit -------/          v
                                                          harness adapter
                                                   /             |             \
                                             OpenClaw     Codex workspace   future Hermes
```

These are deliberately independent extension points:

1. **Component importers** select material used to construct a Claw. The
   current `create` command vendors local skill directories, records exact
   ClawHub skill dependencies, and writes selected plugins into the
   conventional OpenClaw profile. A skill installed with the
   [skills.sh CLI](https://github.com/vercel-labs/skills) can therefore be
   selected as a local directory. Direct skills.sh and other catalog importers
   can be added later by resolving and vendoring the selected bytes.
2. **Source providers** resolve complete Claw coordinates. Built-ins cover a
   local directory, an exact ClawHub package version, and a GitHub repository at
   an exact 40-character commit. A provider returns verified package bytes and
   provenance; it cannot change parsing, consent, or mutation policy.
3. **Harness adapters** translate a validated package into a host-native plan.
   OpenClaw delegates to its native Claws lifecycle. Codex creates a new project
   workspace from the portable prompt, bootstrap instructions, and declared
   files. Hermes or another harness can implement the same boundary without
   importing OpenClaw or changing the portable parser.

The distinction follows existing ecosystems. The skills.sh CLI resolves skills
from Git repositories and local paths. The
[Hermes Skills System](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/skills.md)
exposes multiple discovery sources, including skills.sh, GitHub taps, ClawHub,
LobeHub, and browse.sh, while keeping installation in its own host. Those are
useful component catalogs; they are not registries of complete Claw packages.

## Trust Contract

- Remote complete-Claw coordinates are immutable: exact semantic versions with
  verified ClawHub integrity, or exact Git commit hashes with archive integrity.
- Construction copies local skill bytes into the output package. Later changes
  to the source directory cannot silently alter that package.
- The portable parser accepts only schema version 1 and no provider-specific
  behavior. Conventional profiles and package-root `BOOTSTRAP.md` are
  integrity-bound package bytes; the selected harness interprets them.
- Application assets are ordinary declared workspace files. Their directory
  names do not grant execution or context-loading behavior.
- A non-empty `CLAW.md` body is the portable agent prompt. It is mutually
  exclusive with an explicit workspace target that conflicts with `SOUL.md`.
- The harness remains authoritative for capability disclosure, consent,
  mutation, provenance, and removal.
- An adapter must fail closed when a package requires semantics it cannot
  represent. The bounded Codex adapter ignores foreign profiles but blocks
  Codex profiles and required host behavior whose contract is not yet defined.
- Mutable catalog aliases such as `latest` may help discovery, but must resolve
  to immutable bytes before preview and must not cross the consent boundary.

## Incubation Limits

- Interactive presentation is a CLI-client concern. It may collect construction
  inputs and confirm the exact harness-native preview, but it cannot reinterpret
  the package, plan, consent digest, or host policy.
- `create` only builds a new directory and never applies the result. In a TTY it
  may prompt for omitted required values; JSON and non-TTY use remain explicit.
- Direct skills.sh, LobeHub, browse.sh, and Git importers are not implemented.
  Use their own tooling to place a skill locally, then pass that directory to
  `--skill`.
- Referenced portable skills currently use exact ClawHub coordinates. Native
  plugins belong to `profiles/<harness>.yml`; the OpenClaw constructor accepts
  exact ClawHub plugin coordinates and emits `profiles/openclaw.yml`.
- GitHub is currently a complete-Claw transport, not a general dependency
  declaration inside `CLAW.md`.
- Codex support is currently a create-only portable-core workspace adapter. It
  requires `--target` to name a nonexistent directory, writes project
  `AGENTS.md` plus declared workspace files, and does not install dependencies
  or mutate global config.
