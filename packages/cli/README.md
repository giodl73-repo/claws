# Claws CLI

This experimental package implements the harness-neutral Claws command without
selecting or publishing its final npm identity.

```bash
OPENCLAW_EXPERIMENTAL_CLAWS=1 pnpm claws-dev -- ./path/to/claw --agent openclaw
OPENCLAW_EXPERIMENTAL_CLAWS=1 pnpm claws-dev -- create
OPENCLAW_EXPERIMENTAL_CLAWS=1 pnpm claws-dev -- create ./financial-analyst --id financial-analyst --name "Financial Analyst" --description "Analyzes companies." --soul ./SOUL.md --bootstrap ./BOOTSTRAP.md --skill ./.agents/skills/research --plugin clawhub:@publisher/sec-filings@1.0.0
OPENCLAW_EXPERIMENTAL_CLAWS=1 pnpm claws-dev -- ./path/to/claw --agent openclaw --dry-run
OPENCLAW_EXPERIMENTAL_CLAWS=1 pnpm claws-dev -- ./path/to/claw --agent openclaw --yes --plan-integrity sha256:<reviewed-digest>
OPENCLAW_EXPERIMENTAL_CLAWS=1 pnpm claws-dev -- ./path/to/claw --agent codex --target ./new-workspace --dry-run
OPENCLAW_EXPERIMENTAL_CLAWS=1 pnpm claws-dev -- ./path/to/claw --agent codex --target ./new-workspace --yes --plan-integrity sha256:<reviewed-digest>
CLAWHUB_REGISTRY_URL=https://registry.example OPENCLAW_EXPERIMENTAL_CLAWS=1 pnpm claws-dev -- clawhub:@publisher/claw@1.0.0 --agent openclaw --dry-run
OPENCLAW_EXPERIMENTAL_CLAWS=1 pnpm claws-dev -- github:publisher/awesome-claws@0123456789abcdef0123456789abcdef01234567#claws/financial-analyst --agent openclaw --dry-run
```

The short apply command is guided only when stdin and stdout are terminals: it
shows the package and host plan, asks for confirmation, then forwards the exact
preview integrity to the harness. Interactive `create` prompts for omitted
required inputs. `--json`, non-TTY execution, and explicit `--dry-run` or
`--yes --plan-integrity` retain the existing non-interactive contract.

The CLI validates local package bytes with the independent reference parser.
The OpenClaw adapter delegates through the public `openclaw claws add` process
boundary. Preview uses `--dry-run --json`; apply requires explicit `--yes` and
the exact `planIntegrity` returned by preview. It does not import OpenClaw code
or reproduce OpenClaw consent, mutation, provenance, or removal policy.

The Codex adapter is intentionally narrower. It creates a new project directory
and maps the portable `CLAW.md` prompt plus declared bootstrap instructions to
root `AGENTS.md`; ordinary declared workspace files are copied alongside it.
Preview is non-mutating and integrity-bound, apply uses create-only writes, and
an existing target is never overlaid. Foreign profiles are inert. Required
packages, MCP servers, schedules, package-root `BOOTSTRAP.md`, and an as-yet
undefined `profiles/codex.yml` contract block apply instead of being silently
dropped.

`create` writes a new, validated schema-v1 package from a `SOUL.md`, optional
`AGENTS.md` and package-root `BOOTSTRAP.md`, selected local skill directories,
exact ClawHub skill dependencies, and OpenClaw-native extensions. Local skill
bytes are copied beneath `components/skills` and mapped into the agent
workspace. Selected plugins are written to `profiles/openclaw.yml` rather than
portable `packages`. The command does not mutate a harness or overwrite an existing
destination. The `SOUL.md` input is embedded as the generated `CLAW.md` body;
packages cannot combine a non-empty body with an explicit workspace declaration
that overlaps `SOUL.md`.

Optional `profiles/<harness>.yml`, package-root `BOOTSTRAP.md`, and every
declared workspace source participate in package integrity. Foreign profiles
remain inert until their named harness adapter is selected. Assets, schemas,
references, templates, examples, and fixtures use ordinary `workspace.files`.

Exact `clawhub:<package>@<version>` sources resolve through the official
experimental Claws feed. The CLI binds feed package/version/integrity to
same-origin artifact metadata, bounded safe extraction, and the extracted
package identity before delegation. `CLAWHUB_REGISTRY_URL` is required until
that feed is deployed. OpenClaw recomputes the plan before mutation and rejects
stale consent. The Codex adapter likewise rebuilds its exact workspace plan
before creating the target. Broader lifecycle dispatch, final naming, and
publication remain deferred.

Complete Claws may also resolve from GitHub with
`github:<owner>/<repo>@<exact-commit>[#package/path]`. Branches and tags are
rejected, archive redirects are restricted to GitHub's codeload origin, and the
result records archive and package integrity. Source resolution remains
independent from harness dispatch.

The adapter uses a private, content-addressed OS-temporary snapshot because
OpenClaw includes the absolute local package path in development-plan
integrity. Snapshot creation is atomic and existing bytes are verified before
reuse; the harness then performs its own full revalidation. Snapshots expire
after 24 hours, and the cache is capped at 16 snapshots or 512 MiB while
protecting recently active operations.

A timed-out apply is an uncertain host outcome and is never retried
automatically. Check `openclaw claws status` for partial provenance before any
follow-up action.

The repository-level `pnpm proof:pack` command proves the exact bundled
artifact through an offline isolated install and the installed `claws-dev` bin.
When `OPENCLAW_CLI_ENTRY` is set, it also delegates a real OpenClaw dry-run.
That lane uses disposable OpenClaw state. The CLI emits no telemetry
and has no self-update behavior.

`--help` and `--version` are available without the experimental gate. On
Windows, the adapter can discover the installed `openclaw.cmd` from `PATH`;
`OPENCLAW_CLI_ENTRY` remains available for development checkouts and explicit
host selection.
