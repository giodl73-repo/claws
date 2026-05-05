---
doc: R3-claws-platform-eng
round: 3
panel: cp-3-fork-prep
reviewer: platform-eng
created: 2026-05-04
---

# R3 — claws-platform-eng panel review

**Tension**: Fleet consistency > Workspace autonomy.
**Seat**: I run 47 agent workspaces. The fleet is the unit of management; an
individual workspace getting it "right" doesn't help me if the other 46 drift.
The five substrate packages give me good per-workspace primitives — but
fleet-scale verbs (`broadcast`, `drift`, `comply --fleet`, fleet-aggregator)
are entirely absent from the substrate layer, and several per-workspace
choices preempt the fleet posture I'd otherwise impose on top.

## Fleet frame (what I'm scoring against)

Three rings I run on cadence: `claws watch` (every workspace, daily); `claws
doctor --post-upgrade --fleet` (monthly); `claws drift` (weekly). Every
substrate CLI here is a per-workspace primitive that one of those three
rings needs to call across 47 paths. My questions: do they compose? Do
exit codes / output / config aggregate cleanly?

## Per-substrate findings

### `oc-paths-substrate` (`openclaw-path`)
- **NIT** — `--cwd` flag for the workspace directory is the **only** CLI
  in the bundle that takes the workspace via flag rather than positional.
  pinch / lkg / policy take positional `<workspace-dir>`. For a fleet
  loop (`for ws in workspaces; do openclaw-path ... --cwd "$ws"; done`)
  this is a small papercut, but consistency with the others would be
  better. (`src/cli/index.ts:174-178`)
- **WARN** — `--file` overrides the path-derived FS location entirely.
  Across a fleet, operators may inadvertently address a file inside a
  *different* workspace than the OcPath's `file` slot implies. No
  guard rejects `--file` pointing outside `--cwd`. (`src/cli/index.ts:173-178`)
- **NIT** — exit-code semantics for `find` with zero matches is `1`
  ("no findings"), conflicting with `0 = clean` in pinch/lkg. Operators
  scripting against multiple CLIs will trip on this.

### `pinch` (`openclaw-lint`)
- **WARN** — `--severity-min` filters at OUTPUT time but does NOT change
  exit code semantics: a workspace with 100 `info` findings exits 0,
  same as a clean workspace. For fleet drift detection I want a knob
  that says "exit 1 if any finding meets `severity-min`." Currently
  the only way is to filter *and then* check stdout. (`src/cli/index.ts:170-201`)
- **NIT** — `--severity <id>=<level>` overrides take a different syntax
  shape than `--skip <id>` / `--only <pat>`. Fleet config templates are
  harder to parameterize. Consider a homogeneous repeatable form.

### `oc-paths-doctor` (no CLI)
- **BLOCK** — there is no `openclaw-doctor` bin. The package ships
  adapter-only and slots into the host's existing `openclaw doctor`
  flow via `registerDoctorHealthContribution`. The user prompt named
  "4 CLIs" — the fourth doesn't exist as a standalone bin in this
  bundle. **Fleet consequence**: I cannot run a uniform
  `for ws in 47; do openclaw-doctor ...; done` because the package
  has no bin. I have to drive the host's `openclaw` umbrella per
  workspace and pray its CLI ergonomics match the substrate CLIs.
  Either ship a thin `openclaw-doctor` bin that mirrors lkg/policy
  ergonomics, OR explicitly document that doctor is host-only and
  remove it from the "4 CLIs" framing.

### `lkg-recovery-substrate` (`openclaw-lkg`)
- **WARN** — `lkg-health.json` lives at `<root>/.openclaw/lkg-health.json`
  per workspace (`src/extensions/lkg-fs/store.ts:105`). There is no
  fleet-roll-up shape: an operator running 47 workspaces gets 47
  separate state files with no namespace key. Pitfall **L-102**
  (`PITFALLS.md:82`) acknowledges this as DEFERRED — but for a fleet
  audit I need a tenant/workspace-keyed shared store, OR the substrate
  must offer a `--state-dir` override so I can point all 47 at one
  central directory and namespace by workspace path. Without that,
  any "fleet LKG dashboard" requires me to build a sidecar aggregator.
- **WARN** — `FsLKGStore` tenant isolation is **CALLER-contractual**,
  not enforced (L-004, `PITFALLS.md:25`). The contract says "instantiate
  one store per tenant scope" — fine — but nothing in the package
  prevents two stores with overlapping `root` paths from colliding on
  the same `.lkg` companion files. For 47 workspaces under a shared
  parent dir (a common deployment shape), this is a footgun.
- **NIT** — `openclaw-lkg observe` takes `--root` for the workspace
  base, but `status` / `list-trackers` take a positional `<workspace-dir>`.
  Pick one shape.

### `policy-substrate` (`openclaw-policy`)
- **BLOCK** — no fleet command. `openclaw-policy check <workspace>`
  runs per workspace; I script the loop myself. For 47 workspaces I
  want `openclaw-policy check --fleet <root-of-roots>` (or equivalent)
  that returns a fleet-summary payload (per-ws integrity / drift /
  shape-hash) in one JSON envelope. Today that's shell glue. The
  substrate is intentionally per-workspace by design (POL-061), but
  shipping a `--fleet` aggregator at the CLI level (even a thin
  for-loop wrapper that produces one JSON envelope) would close the
  gap without rewiring the substrate.
- **WARN** — `requires.sdkVersion` on `PolicyGeneratorSpec`
  (`registry.ts:35-37`) is accepted but never validated against
  `SDK_VERSION = '0.1.0'`. Same pattern in `OcPathFixerSpec.requires`
  (oc-doctor types.ts:256). When I roll a SDK bump across 47
  workspaces, mismatched plugin packs will silently pass registration
  and fail at runtime in ways the registry could have caught.
  Fleet-upgrade reliability needs registration-time enforcement.
- **NIT** — `policyId` rotates on every regen because `generatedAt`
  is in the body (POL-011). My fleet audit's "are these 47 policies
  the same shape?" must use `computePolicyShapeHash` — but the CLI
  doesn't print the shape hash on `generate`, only on `check`. Add
  `--print-shape-hash` to `generate` and the fleet diff is one
  `jq | sort -u | wc -l`.

## Fleet-cross-cutting

### 1. CLI ergonomics consistency (Concern #1)
Mostly good — all four CLIs converge on `--json/--human` TTY-aware
output, same exit-code family (`0/1/2`), same sentinel-scrub primitive,
same EPIPE guard pattern (lkg + policy; pinch + path don't install
the pipe guard — **WARN** on pinch + path: `for ws in 47; do
openclaw-lint run "$ws" --json; done | head -1` will crash mid-loop
on Windows). Drifts:
- workspace-dir input: `--cwd` (path) vs positional (others).
- `--skip` parsing: pinch wants exact rule IDs; lkg auto-detects
  globs by `*` or `/`. Two different mental models for the same flag
  name. **WARN**.
- pipe-guard installed on lkg + policy, absent on pinch + path. **WARN**.

### 2. workspace.json governance (Concern #2)
- **GOOD** — additive-section schema (`config.ts:7-9`) is exactly the
  right shape for a fleet template. I can `cp workspace.json` across
  47 workspaces without schema rewrites; each substrate reads its
  own slice.
- **WARN** — there is no schema-version field. When SDK_VERSION bumps
  and a section's shape changes, I have no way to detect a stale
  workspace.json across the fleet other than running each substrate
  and watching for cast failures. Add `workspace.json` schemaVersion.
- **WARN** — defaults are scattered: `policy.generator` defaults to
  `'md'` inside `runCmdGenerate`, `lkg.skip` defaults to `[]` inside
  the resolver, etc. Operators templating workspace.json have no
  single "print all defaults" command. Add one (`openclaw-path
  workspace defaults`?) so my fleet template generator can emit a
  fully-populated baseline.

### 3. LKG fingerprint consistency (Concern #3)
- **WARN** — fingerprints (`makeFingerprint` in `lkg-fs/fingerprint.ts`)
  are deterministic per byte-stream — good. But the per-workspace
  state file with no fleet roll-up means an audit of "do all 47
  workspaces have the same `gateway.jsonc` fingerprint?" requires
  walking 47 trees and parsing 47 `.openclaw/lkg-health.json` files.
  Worth a `--state-dir` override + a `fleet-status` aggregator
  subcommand (or a separate aggregator package — fine either way).

### 4. Drift detection at scale (Concern #4)
- **BLOCK** — covered above. `openclaw-policy check` is the only
  drift verb in the bundle, and it's per-workspace. No fleet summary.
  The CI/CD pipeline pattern I run (`claws drift` on a weekly cron)
  needs a single command that returns a structured fleet report.
  Without it, my drift detection is a bash script the user is
  responsible for keeping in sync with substrate output shape.

### 5. Audit chain at fleet scale (Concern #5)
- **WARN** — `LKGAuditSink` and the doctor `onMutation` hook
  (`oc-doctor/types.ts:94`) both emit per-workspace. Across 47
  workspaces × N fixers × M observations this is a firehose. The
  contract is that audit MUST NOT fail the fix, which is correct,
  but the substrate offers no batch / stream / subscribe primitive
  for a fleet aggregator. Hosts wire up their own. For 47 workspaces
  I'll need to write that aggregator myself, against an unstable
  contract surface (the audit envelope shape isn't versioned).
  Recommend: stamp the audit envelope with a `schemaVersion` field
  so my aggregator survives substrate bumps.

### 6. Sentinel rotation (Concern #6)
- **BLOCK** — `REDACTED_SENTINEL = '__OPENCLAW_REDACTED__'` is a
  module-level constant (`sentinel.ts:25`). Every substrate, every
  CLI, every plugin imports the same literal. There is no per-tenant
  rotation surface — and pitfall L-102 / threat-model discussions
  flag this as v1+. Fleet operators **want it now**: if the sentinel
  literal leaks (it's shipped in source, search-indexed across the
  org), a hostile actor can DoS my fleet by writing the sentinel
  into any tracked file. Per-tenant sentinel rotation lets me invalidate
  the leaked literal across just the affected workspaces without a
  fleet-wide upgrade. **Concrete ask**: thread a `getSentinel()`
  callback through `guardSentinel` / `containsSentinel`, default it
  to the module constant for back-compat, and let hosts plumb a
  per-tenant value. Even a Phase-1 affordance (read from
  `workspace.json.sentinel.literal`) closes the BLOCK.

### 7. Multi-tenant LKG store namespace (Concern #7)
- **WARN** — covered under lkg-recovery-substrate above. L-004 makes
  it a CALLER concern; for 47 workspaces with overlapping FS roots
  (the actual fleet shape) this is too thin. Either (a) the store
  takes a `tenantId` opaque-string and namespaces companion paths
  (`AGENTS.md.lkg-tenant-A`), OR (b) the store rejects construction
  if its `root` overlaps another live store's `root` (process-local
  collision detection). Today the contract just says "don't do that."

### 8. Tier classification at fleet scale (Concern #8)
- **WARN** — `FixerTier` (`oc-doctor/types.ts:212`) is exactly the
  knob I want, but `enabledTiers` is **only** a `DoctorContext` field
  on the host adapter — there's no CLI flag in any of the four bins
  to set it. I cannot say `openclaw-doctor --tier=additive` across
  47 workspaces. Recommend: thread `--tier <set>` (or `--allow-tier
  additive`, repeatable) through the host's doctor invocation and
  through any future `openclaw-doctor` bin. Until then, fleet-wide
  policy "additive only in CI, regenerative requires human approval"
  is per-host-implementation, not contract.

### 9. Upgradability (Concern #9)
- **WARN** — `SDK_VERSION = '0.1.0'` is hardcoded in each substrate's
  `index.ts` and never compared against plugin `requires.sdkVersion`
  declarations. Plugins can declare what they were authored against
  but the registries don't reject mismatches. Fleet upgrade
  reliability requires this gate to fire at registration, not at
  runtime when the call shape diverges. **Concrete ask**: in
  `registerLintRule` / `registerPolicyGenerator` /
  `ocPathFixerContribution`, compare `spec.requires?.sdkVersion`
  against the local `SDK_VERSION` and at minimum warn (better:
  reject behind a host-supplied strict flag).

## Fleet ask list (in priority order)

1. **(BLOCK)** Decide the `openclaw-doctor` story: ship a bin that
   matches lkg/policy ergonomics, OR remove it from the "4 CLIs"
   framing and document doctor as host-only.
2. **(BLOCK)** Sentinel rotation: even a Phase-1 `workspace.json`-driven
   override closes the largest fleet exposure.
3. **(BLOCK)** Fleet-summary verb on `openclaw-policy check` (and ideally
   `openclaw-lkg status`) so weekly drift cron returns one JSON envelope
   for 47 workspaces.
4. **(WARN)** SDK_VERSION enforcement at registration time across all
   four registries.
5. **(WARN)** workspace.json `schemaVersion` field + a "print all
   defaults" command for fleet-template generation.
6. **(WARN)** Audit-envelope `schemaVersion` so my aggregator survives
   substrate bumps.
7. **(WARN)** `FsLKGStore` tenant-isolation: either `tenantId` namespacing
   OR process-local root-overlap rejection.
8. **(WARN)** `--tier` CLI flag wired through to `enabledTiers`.
9. **(WARN)** Pipe-guard parity (pinch + path) + `--severity-min` exit-code
   semantics in pinch + `--state-dir` override on lkg.
10. **(NIT)** Workspace-dir input convention: pick positional or `--cwd`
    and apply it to all four CLIs.

The substrate is good per-workspace. It is not yet a fleet product —
which is fine if that's the intent and the gap-closing work lives in
`@bic/claws-action` and a sibling aggregator package. If the substrate
intends to be the fleet's surface, the BLOCKs above are non-negotiable.
