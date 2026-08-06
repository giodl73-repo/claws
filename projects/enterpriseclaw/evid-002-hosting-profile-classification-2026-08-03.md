# EVID-002 Hosting Profile Classification

## Mission

Prove that OpenClaw can publish optional, versioned hosting postures and
package-installed conformance evidence without creating a second readiness
evaluator or moving host, tenant, fleet, or release authority into the fork.

## Actual Upstream Feature PRs

| PR | Delivers | Unique EVID-002 source | Classification |
| --- | --- | ---: | --- |
| [openclaw/openclaw#113422](https://github.com/openclaw/openclaw/pull/113422) | Four optional profiles: `local`, `container`, `reverse-proxy`, and `node-mode`; canonical profile selection; profile-aware `/readyz`; package-installed scenarios | 39 commits after #113421 | Admit as the profile-definition and runtime-observation source |
| [openclaw/openclaw#114636](https://github.com/openclaw/openclaw/pull/114636) | Inert catalog inspection, one-shot live validation, and versioned package release-conformance evidence | 3 commits after #113422 | Admit as the operator and release-evidence source |

Both PRs remain open upstream. They are one dependency-ordered feature stack,
but they retain separate source identities and queue entries.

## Classification Decision

- Name the next bounded evidence slice **EVID-002 — Hosting Profile
  Conformance**.
- Admit #113422 followed by #114636 only as `evidence-only`.
- Keep runtime and release authority `none`.
- Preserve unprofiled OpenClaw behavior as the compatibility baseline.
- Reuse the canonical readiness result; do not create another evaluator.
- Treat the generated conformance artifact as portable release evidence, not a
  signed attestation or enterprise assurance result.
- Keep Lobster ownership out of the profile definitions. Lobster may consume
  profile readiness for allocation, routing, rollout, and repair.

## FACES Review

### Frame

Working readiness owners already produce canonical conditions. The missing
shared capability is a supported composition for common hosting postures plus
proof that a packaged release implements that composition. Runtime owners
retain readiness meaning; hosts retain lifecycle and recovery; Lobster retains
managed deployment and fleet decisions.

### Audit

#113422 is a 39-commit, 44-file unique delta after #113421. #114636 adds three
facility commits across 20 unique files. The stack is opt-in, preserves
unprofiled behavior, uses ordinary `/readyz`, and separates structural
conformance from current readiness.

An exact replay probe from landed EVID-001 reached the first #113422 commit,
`fd9b01661f6ac820a618b3ea4e486ad70846cc77`, and conflicted only in:

- `docs/cli/gateway.md`
- `src/cli/gateway-cli/run-options.ts`

This is bounded current-tree CLI/documentation drift suitable for an explicit
B3 resolution. It does not justify changing the pinned baseline or rewriting
the source generation.

### Compare

- **Reuse:** RFC 0018 readiness conditions, owner identities, canonical
  projections, and `/readyz`.
- **Adapt:** existing CLI status/inspection and package Docker evidence.
- **Avoid:** private Lobster readiness evaluators, profile inheritance, host
  assertions, runtime attestation, or another lifecycle owner.

### Evaluate

- **Gateway owner:** acceptable only because profile selection is optional,
  legacy behavior remains unchanged, and profile validation consumes one
  canonical readiness result.
- **Lobster container operator:** the four profiles provide useful host-facing
  `200`/`503` semantics and recovery proof without transferring lifecycle
  authority into OpenClaw.
- **Skeptical founder:** acceptable because the feature is useful locally,
  removable by selecting no profile, and contains no Lobster or tenant model.
- **Release/security:** the package artifact is useful evidence but must not be
  described as signed, tamper-proof, retained assurance.

### Slice

The decisive evidence surface is
`lobster.exa.hosting-profile-conformance.v1`:

1. inspect the immutable four-profile catalog;
2. validate one structurally conformant but intentionally not-ready result;
3. validate one matching ready result;
4. reject profile/version/schema/required-condition mismatch;
5. verify the complete package scenario artifact;
6. preserve unprofiled compatibility;
7. record exact deletion of fork profile catalog/validation slices after
   upstream adoption.

## Next Step

Create `lobster/evid-002-hosting-profiles` from landed
`lobster/integration`, add exact queue entries for #113422 and #114636, bind
every replay conflict to a B3 disposition, implement the decisive fixture, and
open one evidence-admission PR. Stop again before granting release or runtime
authority.
