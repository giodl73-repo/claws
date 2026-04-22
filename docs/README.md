# Guides — reader entry point

This directory holds the 15 narrative guides that document the bic/claws
governance model: what atoms are, how decisions flow through providers, how
the E2E sim harness proves it, and how a contributor adds a new atom or
scrubs migrated content. These guides are authored in-wave and migrate to
`docs/clawc/{concepts,governance,testing,contributing,host-presets}/` at
CP-5. See **Cross-reference conventions** below for what that migration
means for links you find in the guides.

## Reader path for a new engineer

If you are joining bic/claws and want the shortest route to end-to-end
understanding, read these four in order:

1. **[concepts--atoms-registry.md](./concepts/atoms-registry.md)** — the
   13-field schema and the oracle invariant that every other gate consults.
2. **[governance--approval-flow.md](./governance/approval-flow.md)** — the
   canonical walkthrough: agent → provider → supervisor → companion,
   including the 8-field `ApprovalHandle` and the audit cross-links.
3. **[testing--e2e-harness.md](./testing/e2e-harness.md)** — how the sim
   stands the loop up with real `snap serve`, real generated plugin, real
   CLI, mocked host + companion.
4. **[contributing--adding-an-atom.md](./contributing/adding-an-atom.md)** —
   the 3-file PR shape and `claws make atom` scaffolder.

After those four, the rest of the guides are depth on specific surfaces.

## Concepts

The invariants the oracle enforces and the test system that proves them.

- **[concepts--atoms-registry.md](./concepts/atoms-registry.md)** — the
  oracle both gates validate against.
- **[concepts--doc-validation.md](./concepts/doc-validation.md)** — 11
  surfaces, 17 gap types, the gap detector, and `--fix` modes.

- **[concepts--accept-test-system.md](./concepts/accept-test-system.md)** —
  manifest + scenario + 7 runners + orphan sweep.
- **[concepts--no-craftworks-gate.md](./concepts/no-craftworks-gate.md)** —
  scope, allowlist, CODEOWNERS, exit code 2.

## Governance

How a decision is made, routed, and cross-linked in the audit chain.

- **[governance--approval-flow.md](./governance/approval-flow.md)** —
  authority on **OC-7 envelope stickiness**, **G-CHAIN propagation**, and
  the **audit cross-link** schema.
- **[governance--decision-vocabulary.md](./governance/decision-vocabulary.md)** —
  authority on the **4 verbs**, the **composition rule**, and the **risk
  tier × sensitivity** interaction.
- **[governance--file-ingest-review.md](./governance/file-ingest-review.md)** —
  `FileIngestProvider` peer path, `modify.redirectPath` safety, and the
  stage → promote lifecycle.

## Testing + presets

The sim harness and the three host presets that parameterize it.

- **[testing--e2e-harness.md](./testing/e2e-harness.md)** — hybrid-fidelity
  harness, fixtures, teardown, debug dumps.
- **[testing--host-presets.md](./testing/host-presets.md)** — authority on
  the **three-layer composition**; matrix dispatcher and why there are
  three presets.
- **[host-presets--openclaw.md](./host-presets/openclaw.md)** — Layer 1+3;
  zero-Microsoft-infra adopter shape.
- **[host-presets--lobster.md](./host-presets/lobster.md)** — Layer 1+2+3;
  sidecar snap + HTTP supervisor.
- **[host-presets--aether.md](./host-presets/aether.md)** — Layer 1+2+3;
  multi-tenant host-proxy; tenancy at host layer, not at snap.

## Contributing

How to add an atom, scrub migrated content, and get a Windows box green.

- **[contributing--adding-an-atom.md](./contributing/adding-an-atom.md)** —
  the 3-file PR shape + `claws make atom` scaffolder.
- **[contributing--doc-scrub-checklist.md](./contributing/doc-scrub-checklist.md)** —
  5-step protocol for migrated content.
- **[contributing--windows-setup.md](./contributing/windows-setup.md)** —
  LongPaths, `core.autocrlf`, Node, pnpm, common gotchas.

## Migration footnote

The double-dash filename convention (`concepts--atoms-registry.md`,
`host-presets--aether.md`) is a wave-only artifact. At migration, the
`{prefix}--{name}.md` shape becomes `docs/clawc/{prefix}/{name}.md`. If
you see a guide with a sibling cross-reference that uses the flat
`./sibling.md` form, that's the form that will survive the migration
after the path rewrite — don't rewrite them to the post-migration shape
by hand.
