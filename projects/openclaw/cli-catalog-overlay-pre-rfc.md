# CLI Catalog Overlay Pre-RFC

Status: draft
Area: OpenClaw prompt mechanics
Last updated: 2026-07-07

## Summary

OpenClaw should add a read-only `openclaw catalog` command over existing
command and tool metadata so prompts, docs, audits, tests, and operator tooling
can reuse the same source instead of hardcoding mechanical command knowledge.
OpenClaw already has internal command catalogs, descriptors, route metadata,
plugin descriptors, and tool surfaces. What is missing today is a user-facing
command that joins them into one structured inventory.

The catalog is metadata only. It does not add a new dispatcher, execution
surface, runtime hook, gateway plugin, policy engine, or expression language.
Execution remains with the existing CLI commands and tools.

Current review surface:

- RFC branch:
  https://github.com/giodl73-repo/rfcs/blob/codex/cli-catalog-overlay-rfc/rfcs/0010-cli-catalog-overlay.md
- Draft implementation PR:
  https://github.com/openclaw/openclaw/pull/100960
- Implementation branch:
  https://github.com/giodl73-repo/openclaw/tree/user/giodl/cli-catalog-review-hardening

## Catalog Shape

The prototype hierarchy rationalizes the existing metadata owners:

- `cli.descriptors`: existing top-level/core and sub-CLI descriptors.
- `cli.commandRoutes`: existing command-path routing and startup-policy entries.
- `cli.routedOperations`: mechanical fast-path route IDs and command paths.
- `cli.runtimeCommands`: runtime Commander-tree entries for the current
  invocation.
- `cli.pluginCommands`: opt-in plugin CLI descriptor entries.
- `agentToolSurfaces`: explicit metadata only for tool-backed or non-CLI model
  surfaces without an owning descriptor or route.
- `promptProjection`: lean model-facing subset.

The explicit ownerless adapter surfaces are currently `skill_workshop`,
`session_status`, `sessions_spawn`, and `process`. Command-level surfaces such
as `gateway` should be described by their owning CLI descriptors instead of a
parallel adapter entry.

## Principles

- Bounded operations stay bounded.
- Existing command/tool surfaces own validation, permissions, confirmation,
  execution, and output.
- The prompt consumes a lean projection, not the full catalog.
- Humans and automation use `openclaw catalog list --json` for the full
  hierarchy.
- The catalog can describe risk, confirmation, effect mode, and route policy,
  but it does not enforce policy.

## Full Integration Plan

The catalog should become the shared metadata source for mechanical OpenClaw
surfaces, not just prompt text. Integrate it through narrow consumers that prove
value while existing command and tool implementations keep owning execution.

1. Prompt routing: keep the system prompt on the lean projection only.
2. Reference docs: generate user-facing and maintainer-facing catalog docs from
   `buildCatalogList()`.
3. Audit and policy inventory: report mutating surfaces, confirmation-required
   surfaces, config-guard bypasses, and route-policy keys without enforcing
   policy in the catalog.
4. Test matrix generation: derive routed-operation smoke-test candidates and
   coverage gaps from `cli.routedOperations`.
5. Operator and admin views: expose catalog data to diagnostics, debug views,
   and future admin surfaces so they do not scrape help text.
6. Drift guards: check descriptor presence, route-definition alignment,
   generated docs, prompt projection size, and catalog JSON shape.
7. Future automation adapters: if justified, select catalog entries and call
   the existing command/tool implementation; do not add a new catalog dispatcher
   until a concrete consumer needs it.

## PR Sequence

The draft implementation PR contains the compressed review stack:

1. Foundation catalog view: `buildCatalogList()`, `openclaw catalog list`,
   static descriptor and route metadata, ownerless adapters, JSON/Markdown
   output.
2. Dynamic inventory and operator lenses: runtime commands, plugin descriptors,
   `catalog audit`, `catalog test-matrix`, and `catalog summary`.
3. Prompt projection: lean prompt routing surface with tool filtering and
   prompt budget guard.
4. Schema fixtures: checked JSON contract fixtures.
5. Generated reference docs: generated `docs/cli/catalog.md`, docs map, and
   glossary updates.
6. Hardening and consumer boundary: richer runtime/plugin metadata, advisory
   report artifacts, metadata preservation through plugin normalization, and a
   CLI-first consumer contract.

The current upstream draft PR keeps this together for directional review. If
maintainers prefer smaller review units, split along the six bullets above.

## Latest Decisions

- This is additive: there is no `openclaw catalog` command on current
  `origin/main`.
- The closest existing source is `cliCommandCatalog`, but it owns startup and
  route policy, not a joined user-facing inventory.
- Catalog metadata belongs on existing owning descriptors/routes/plugin
  descriptors where possible.
- Explicit adapter entries are an exception path for ownerless tool-backed
  surfaces, not a parallel registry.
- Downstream consumers should rely on `openclaw catalog ... --json` until
  package exports are intentionally added.

5. Catalog operator view: diagnostics/admin/debug output that reuses catalog
   data instead of hardcoded command inventories or help-text scraping.
6. Catalog automation adapter, if justified: select an existing command/tool
   from catalog metadata while execution stays with the existing surface.
