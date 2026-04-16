# Panel Review: Architect on Upstream Governance Spec

**Type**: spec
**Role**: craft/architect
**Domain lens**: claws
**Round**: 1
**Files reviewed**:
1. `docs/claws/ecosystem/openclaw-governance-spec.md`
2. `docs/claws/ecosystem/approval-event-schema.md`
3. `.craft/plans/claws-upstream-contrib.md`
4. `.craft/plans/claws-aether-integration.md`
5. `docs/claws/presentations/why-claws.md`

**Date**: 2026-04-15

---

## Findings

### Major (M)

| # | File | Line/Section | Finding | Suggested fix |
|---|------|-------------|---------|---------------|
| M1 | `openclaw-governance-spec.md` | Line 19, Abstract | The spec asserts "No `@craftworks/*` or `@claws/*` imports" but the `ShellExecProvider` reference implementation (line 306-369) uses `readFileSync` with no import statement. An OC community reader cannot tell whether this is `node:fs` or a Craftworks helper. For a standalone spec, every import must be explicit. | Add `import { readFileSync } from 'node:fs';` to the ShellExecProvider example. Every code block in the canonical spec must be copy-paste runnable with only `@openclaw/*` + Node.js built-ins. |
| M2 | `approval-event-schema.md` | Line 14 vs `openclaw-governance-spec.md` Line 585-589 | The design rationale uses `{ allowed: true, requiresExternalApproval: true }` (line 14, 31-37) but the canonical spec uses `{ decision: 'allow', requiresExternalApproval: true }`. The `AuthorizationDecision` type on line 106-150 of the canonical spec has a `decision` field, not an `allowed` boolean. The design doc uses the wrong shape — a community member reading both files sees a contradiction. | Update `approval-event-schema.md` lines 14, 31-37, and the "Relationship to Existing Specs" diagram (lines 232-256) to use `{ decision: 'allow' }` / `{ decision: 'deny' }` matching the canonical `AuthorizationDecision` type. |
| M3 | `claws-aether-integration.md` | H3 validations (lines 29-32) | The plan's validation bullets use `{ allowed: true, requiresExternalApproval: true }` and `{ allowed: false }` — same stale shape as the design rationale. But `AuthorizationDecision.decision` is a string union `'allow' | 'deny' | 'review' | 'modify'`, not a boolean `allowed`. This leaks an internal draft convention into the plan that tracks the upstream spec. | Replace all `allowed: true/false` references in the plan with `decision: 'allow'` / `decision: 'deny'` to match the canonical `AuthorizationDecision` type. |
| M4 | `openclaw-governance-spec.md` | Section 8, line 960-1012 | `@openclaw/approval-events` package section shows the directory layout as `packages/approval-events/` with `schema/approval-request.json` and `schema/approval-response.json` — but there is no JSON Schema definition anywhere in the spec. The canonical spec defines TypeScript interfaces only. A community member implementing in Python, Go, or Rust needs the JSON Schema. The package promises cross-language validation but does not deliver the schema content. | Either inline the JSON Schema for both events in Section 8 or explicitly mark them as "to be generated from TypeScript types" with a generation strategy (e.g., `typescript-json-schema` or `zod-to-json-schema`). A "reference only" note is insufficient — the schema IS the cross-language contract. |

### Warning (W)

| # | File | Line/Section | Finding | Suggested fix |
|---|------|-------------|---------|---------------|
| W1 | `openclaw-governance-spec.md` | Section 3, line 615-698 | `@openclaw/audit-chain` has the richest API surface of all 6 packages (~20KB) with `open`, `append`, `verify`, `query`, `export`, `prune`, and WAL. This is more responsibility than any other package in the set. `export()` supports 4 formats (SARIF, CEF, JSON, syslog) — the same 4 formats that `@openclaw/siem-emitter` handles. Two packages own format serialization independently. A new contributor would ask: "Why does audit-chain export SARIF when siem-emitter already does SARIF?" | Either (a) audit-chain delegates export to siem-emitter as a peer dependency (preserving "zero dependencies" for audit-chain by making it optional), or (b) the spec explicitly states why both packages need independent format serialization (e.g., audit-chain exports historical chains, siem-emitter emits live events — different semantics). The current spec is silent on overlap. |
| W2 | `openclaw-governance-spec.md` | Section 1, line 171-174 | `preAuthorize()` is documented as "MUST be deterministic" and "MUST complete within 100ms" and "MUST NOT call external services." These are strong runtime contracts but the interface is a plain TypeScript `interface` with no enforcement mechanism. A provider that violates the 100ms SLA degrades the entire Gateway. The ProviderRegistry should document a timeout/circuit-breaker strategy for misbehaving providers. | Add a "Provider SLA enforcement" subsection to the ProviderRegistry spec: if a provider exceeds 100ms, the registry treats it as a provider exception and applies the fail-mode table (Section "Fail-Mode Specification"). This makes the SLA enforceable, not just advisory. |
| W3 | `claws-upstream-contrib.md` | H1, line 16 | Headline 1 describes "5 runtime packages" but the plan now covers 6 packages (the 6th being `@openclaw/approval-events`). The headline count is stale. The Scope section (lines 72-111) correctly lists all 6, but the executive summary is wrong. | Update H1 to "6 runtime packages" and add `@openclaw/approval-events` to the H1 package enumeration list. |
| W4 | `claws-aether-integration.md` | Line 38 | The summary references `@openclaw/audit-chain infrastructure from Thoth CP-5` for blob signature verification. This creates a runtime dependency arrow from the Aether adapter (Python, `blob_mount.py`) to a TypeScript npm package. The dependency crosses language boundaries without explanation. A new contributor would not understand how a Python adapter calls a TypeScript verification function. | Clarify the integration strategy: is blob verification (a) a Node.js sidecar called by the Python adapter, (b) a Python re-implementation of the same algorithm, or (c) a polyglot shared library? The plan must name the specific integration pattern. |
| W5 | `why-claws.md` | Lines 707-729 (Slide: "Upstream: What We Give Back") | The "CONTRIBUTE (19)" list counts 10 items visually, not 19. The "(19)" count appears aspirational and cannot be verified from the slide content. The canonical spec defines 6 packages + GuardrailProvider + ShellExecProvider = 8 concrete deliverables. The deck inflates the number without backing. | Either enumerate all 19 items (expand the list) or adjust the count to match what is actually listed. Overcounting erodes credibility with an OC audience that can count. |
| W6 | `openclaw-governance-spec.md` | Section 5, lines 773-828 | `@openclaw/identity-bridge` claims "Zero dependencies (token validation is signature-check only)" but OIDC token validation requires fetching the JWKS endpoint to get signing keys. Either the package caches JWKS at startup (which is a network call) or it expects pre-loaded keys. The "zero external service calls" claim needs qualification. | Add a `configure()` or constructor parameter for pre-loaded JWKS keys and document that the bridge does NOT fetch keys at runtime. If it does fetch, it is not zero-dependency and not deterministic — which matters if used inside a GuardrailProvider's `preAuthorize()` path. |

### Notes (N)

| # | File | Line/Section | Finding |
|---|------|-------------|---------|
| N1 | `openclaw-governance-spec.md` | Line 106, `AuthorizationOutcome` | The `modify` outcome is the most architecturally complex: the provider rewrites tool arguments, which means the provider must understand tool argument schemas. This creates an implicit coupling between providers and MCP tool schemas. The spec does not discuss how providers discover argument schemas or how `modifiedArguments` is validated against the tool's expected inputs. Worth a follow-up design note. |
| N2 | `openclaw-governance-spec.md` | Section 10, Delivery Roadmap | Wave 1 deliverables (lines 1046-1054) list `@openclaw/approval-events` in Week 2 and `@openclaw/audit-chain` in Week 4, but the plan file (`claws-upstream-contrib.md`) lists the spec PR + 3 packages in Wave 1 without mentioning `approval-events` by name in the wave breakdown (H3, line 26). Minor sequencing drift between the two documents. |
| N3 | `claws-aether-integration.md` | Lines 108-138, Contract schema | The `host-approval-policies.json` schema includes `compilerVersion` field. This is a Craftworks-internal concept. An OC community consumer of this file would not know what "0.36.0" means. If this artifact is meant to be OC-portable (as the plan states on line 176), the compiler version field should be either removed or generalized to `generatorVersion` with no assumption about claws. |

---

## Lens Checklist

| Verify item | Pass? | Notes |
|-------------|-------|-------|
| SDK-owns-logic boundary respected | PASS | All 6 `@openclaw/*` packages are runtime primitives with no compiler logic. The contribute/keep boundary (Section 9) correctly places guard passes, RELAX, and CGR in the "keep" column. No SDK business logic leaks into contributed packages. |
| Dependency arrows point inward | WARN | Overall direction is correct (CLI -> SDK -> types), but W4 identifies an unexplained cross-language dependency (Python adapter -> TypeScript audit-chain). W1 identifies a potential overlap where audit-chain and siem-emitter independently own format serialization, creating ambiguous ownership. |
| Module responsibilities clear from location | PASS | The 6 packages have clear names that map to single responsibilities. `audit-chain` = integrity, `budget-meter` = cost control, `identity-bridge` = auth, `siem-emitter` = SOC output, `secret-scanner` = credential detection, `approval-events` = approval protocol. |
| One responsibility per module | WARN | `@openclaw/audit-chain` carries both chain integrity AND multi-format export (W1). This is two responsibilities. The chain is the core; export is a convenience that overlaps with `siem-emitter`. Consider whether export should be a separate concern. |
| Boundaries self-explanatory | PASS | Section 9 (Contribute/Keep Boundary) is the clearest part of the spec. An OC community member reading only the canonical spec would understand what is contributed vs. proprietary. The boundary holds at the architectural level. |

---

## Summary

The layered composition model (provider -> registry -> host gate -> approval events) is structurally sound and well-documented. The contribute/keep boundary holds cleanly at the architecture level — no `@craftworks/*` or `@claws/*` imports leak into the contributed surface. The primary structural risks are: (1) a stale `allowed: true/false` convention in two supporting documents that contradicts the canonical `decision` field in `AuthorizationDecision`, creating confusion for anyone reading across files; (2) the `@openclaw/audit-chain` package carrying both chain integrity and multi-format export, overlapping with `siem-emitter` without explicit justification; and (3) the missing JSON Schema content that the `approval-events` package promises for cross-language validation but does not deliver in the spec. Fixing M2/M3 (decision field consistency) and M4 (JSON Schema) before the spec PR ships is essential — an OC reviewer will catch both immediately.
