# Claws CLI

Experimental harness-neutral command and reference parser for portable Claw
packages. The repository does not claim or publish the unscoped `claws` npm
name; package and executable names remain development-only until maintainers
approve a release identity.

```bash
pnpm install
pnpm build
pnpm proof:pack
OPENCLAW_EXPERIMENTAL_CLAWS=1 pnpm claws-dev -- create ./financial-analyst --id financial-analyst --name "Financial Analyst" --description "Analyzes companies from primary sources." --soul ./SOUL.md --skill ./.agents/skills/research --plugin clawhub:@publisher/sec-filings@1.0.0
OPENCLAW_EXPERIMENTAL_CLAWS=1 pnpm claws-dev -- ./path/to/claw --agent openclaw --dry-run
OPENCLAW_EXPERIMENTAL_CLAWS=1 pnpm claws-dev -- ./path/to/claw --agent openclaw --yes --plan-integrity sha256:<reviewed-digest>
CLAWHUB_REGISTRY_URL=https://registry.example OPENCLAW_EXPERIMENTAL_CLAWS=1 pnpm claws-dev -- clawhub:@publisher/claw@1.0.0 --agent openclaw --dry-run
OPENCLAW_EXPERIMENTAL_CLAWS=1 pnpm claws-dev -- github:publisher/awesome-claws@0123456789abcdef0123456789abcdef01234567#claws/financial-analyst --agent openclaw --dry-run
```

The intended future command shape remains:

```text
npx <name> <claw> --agent openclaw
```

`<name>` remains unresolved until the Foundation selects or secures the npm
identity.

## Repository Boundary

- `packages/reference` owns portable manifest parsing, types, and portability
  rules. It imports no harness implementation.
- `packages/cli` owns source inspection, integrity, construction, adapter
  dispatch, and cross-harness outcome conventions. Complete-Claw source
  providers and harness adapters are separate contracts.
- The OpenClaw adapter invokes `openclaw claws ... --json` as an external
  process. It does not import OpenClaw code or recreate host policy.
- OpenClaw revalidates packages at its own trust boundary and continues to own
  consent, mutation, provenance, update, status, doctor, and removal.

## Current Scope

The current slice constructs a Claw from persona files, local skills, and exact
ClawHub skill/plugin dependencies. Local skill directories are vendored into
the package; this also provides a bounded bridge from skills installed by tools
such as the [skills.sh CLI](https://github.com/vercel-labs/skills). Construction
does not apply the result and never overwrites an existing destination.

Complete Claws resolve from local directories, exact ClawHub package
coordinates, or GitHub repositories pinned to exact 40-character commits.
ClawHub resolution verifies the official experimental feed,
downloaded artifact digest, archive limits, extracted package identity, and
portable manifest before OpenClaw receives an immutable snapshot.
`CLAWHUB_REGISTRY_URL` is required until the experimental feed is deployed. It
must select an HTTPS registry or a loopback HTTP development registry; artifact
downloads remain pinned to that origin. GitHub resolution accepts redirects
only from the API to GitHub's codeload origin and records both archive and
package integrity.

Preview returns OpenClaw's complete native plan and its `planIntegrity` value.
Apply requires explicit `--yes` plus that exact value. The adapter re-resolves
and snapshots the package, then delegates to `openclaw claws add --yes
--plan-integrity`; OpenClaw recomputes the plan and rejects stale consent before
mutation. Broader lifecycle dispatch, final naming, publication, and other
harness adapters remain deferred.

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for the source-provider, component
importer, and harness-adapter boundaries. Public skill catalogs are component
sources rather than complete-Claw registries.

## Construct From Public Skills

The current bridge uses the public skills CLI as the component resolver, then
vendors the selected directory into a Claw:

```bash
npx skills add vercel-labs/agent-skills --skill web-design-guidelines --agent universal --copy
OPENCLAW_EXPERIMENTAL_CLAWS=1 pnpm claws-dev -- create ./web-reviewer \
  --id web-reviewer \
  --name "Web Reviewer" \
  --description "Reviews web interfaces against established guidance." \
  --soul ./SOUL.md \
  --skill ./.agents/skills/web-design-guidelines
```

Repeat `--skill` to compose a set and use exact
`--plugin clawhub:<package>@<version>` coordinates for plugin dependencies. A
future direct skills.sh importer can collapse the two commands while retaining
the same vendored-byte and integrity model.

Because OpenClaw binds local development plans to the absolute package path,
the adapter atomically materializes each exact package integrity at a private,
content-addressed OS-temporary path. The immutable snapshot is reused across
preview and apply so the reviewed host digest remains valid; OpenClaw still
revalidates every byte before mutation. Snapshots expire after 24 hours, and
the cache is capped at 16 snapshots or 512 MiB while protecting recently
active operations.

The adapter never retries a timed-out apply. OpenClaw may have recorded partial
progress, so inspect `openclaw claws status` before deciding whether to resume
or remove it.

## Distribution proof

`pnpm proof:pack` builds the bundled CLI, packs it without lifecycle scripts,
checks that the tarball contains only package metadata, its README, and bundled
runtime modules, installs it offline into an isolated prefix, and executes the
installed `claws-dev` binary. It proves both the disabled experimental gate and
successful local-package inspection. Set `OPENCLAW_CLI_ENTRY` to additionally
prove a real OpenClaw dry-run through the packed binary. That optional lane
uses disposable home, state, and config paths and does not read or migrate the
operator's normal OpenClaw state.

The development artifact requires Node.js 22.22.3 or newer and an OpenClaw build
that provides the experimental `openclaw claws add --json` contract. A
configured OpenClaw entry runs with the CLI's Node executable, which must also
satisfy that OpenClaw build's supported Node range. The CLI
collects no telemetry and does not update itself; installation and updates
remain the eventual package manager's responsibility. No registry publication,
final package name, or stable compatibility promise is made by this proof.

Run `pnpm proof:private` for the complete readiness gate. See
[`CONTRIBUTING.md`](CONTRIBUTING.md) for development guidance and
[`SECURITY.md`](SECURITY.md) for private vulnerability reporting.
