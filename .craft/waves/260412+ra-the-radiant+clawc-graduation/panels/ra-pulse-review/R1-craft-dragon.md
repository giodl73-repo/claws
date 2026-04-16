---
role: craft:dragon
round: R1
wave: 260412+ra-the-radiant+claws-graduation
scope: all 59 pulses (safety invariant chain focus)
tension: "Invariant rigor > feature velocity"
cluster: A
date: 2026-04-15
---

# R1 Dragon Review: Ra Wave Safety Invariant Chain

## Executive Summary

The Ra wave designs a 59-pulse, 10-checkpoint graduation of claws from monorepo dependency to standalone product. The safety architecture is structurally sound: R5 fail-closed is introduced early (pulse 06), a centralized validation pipeline gates all writes (pulse 30), and an E2E gate (pulse 44) exercises the full enforcement chain. However, I identify **7 invariant-weakening findings** and **4 invariant-gap findings** that must be resolved before implementation. Several are severity HC-BLOCK -- load-bearing walls with cracks.

---

## Finding D-01: R5 Invariant Chain Has an Unguarded Hop at the Chunk Assembler

**Severity**: HC-BLOCK
**Pulses**: 06, 23, 25, 30
**Invariant**: R5 fail-closed must be enforced at every layer, not just compilation and write-time.

Pulse 06 establishes R5 enforcement at compile time (`compileGuard`). Pulse 30 establishes R5 enforcement at write time (`r5-validator.ts`). But pulse 23 (chunk-assembler) derives `lock.source: 'r5'` from GovernanceIR risk classification independently. There are now **three independent R5 determination points**: (1) `enforceR5()` in the compiler enforce module, (2) `r5-validator.ts` in the validation pipeline, and (3) risk classification derivation in the chunk assembler.

The invariant question: what happens if the chunk assembler classifies a tool as R4 (editable) but the validation layer classifies it as R5 (locked)? The PATCH would be rejected by the validation layer, but the TUI/CAP UI would have rendered a toggle for it -- a UX lie that erodes trust.

**Requirement**: Pulse 23 must consume R5 classification from the same GovernanceIR source that the validation layer uses. The chunk assembler must not independently derive risk -- it must read the canonical classification. Add a unit test: "tool classified R5 in GovernanceIR always produces `lock.source: 'r5'` in chunk assembly, regardless of TOOLS.md content."

---

## Finding D-02: P-272 Fleet Fail-Closed Has No Startup Enforcement

**Severity**: HC-BLOCK
**Pulses**: 30, 34, 42
**Invariant**: Fleet policy load failure = all locked (P-272).

Pulse 30 correctly specifies that missing or corrupt fleet policy fails closed at write time. Pulse 34 adds startup health check that runs a full compile. But the startup health check (pulse 34) tests compilation health, not fleet policy health. A workspace with valid OC files but a missing fleet policy would pass the startup health check (compilation succeeds -- fleet policy is only checked on writes), then serve in "healthy" mode, allowing GET requests that show tools as editable, while every PATCH would return FLEET_LOCKED.

This is the same UX lie as D-01: the read path tells users they can edit, the write path denies them. Fleet policy presence must be validated at startup, not just at write time.

**Requirement**: Pulse 34 startup health check must validate fleet policy presence/parseability. If fleet policy is required but missing/corrupt, the server must start in degraded mode. Add this to pulse 34 acceptance criteria: "missing fleet policy on startup = degraded mode, not healthy mode."

---

## Finding D-03: Onboard Content Validation Occurs After Generation, Not Before Write

**Severity**: HIGH
**Pulses**: 43, 30
**Invariant**: Secret scanning must happen before any file write.

Pulse 43 specifies three validation layers (secret scanner, size limit, injection defense) but the flow is: "accepts transcript -> validates -> extracts structured data -> generates SOUL.md + MEMORY.md seeds -> writes to workspace -> triggers initial compile." The validation is on the *input transcript*, not on the *generated output*. If the extraction/generation step introduces content that looks like a secret (e.g., extracting a base64 connection string from a legitimate transcript passage that passed the input scanner), the generated file would be written without re-scanning.

**Requirement**: Add a second validation pass on the generated SOUL.md and MEMORY.md content before writing to disk. The onboard-validator should expose a `validateGeneratedContent()` function that runs secret scanning and injection defense on the output. Add to pulse 43 acceptance criteria: "generated files are scanned for secrets before write, not just the input transcript."

---

## Finding D-04: Default Deny Rules Are Not Explicitly Immutable in the Validation Layer

**Severity**: HIGH
**Pulses**: 30, 35, 43
**Invariant**: Default deny rules must be immutable.

Pulse 51 mentions that "R5 deny rules cannot be removed -- they render as locked" in the TUI. Pulse 35 says "Locked sections (r5, fleet, governance) reject PATCH with appropriate PatchError." But pulse 30 (the validation layer -- the single enforcement point) does not explicitly list "default deny rule immutability" as a validation check. The validation pipeline checks R5 tool locks, fleet locks, and governance deny rules. But there is no validator that specifically prevents removal of default/compiler-injected deny rules from SOUL.md.

The TUI hides the edit affordance (pulse 51), but the HTTP API is the real boundary. A direct PATCH to `/api/loop/soul` could attempt to remove a compiler-injected deny rule. Without an explicit validator in the pipeline, this depends on the governance-validator catching it indirectly -- which is not guaranteed.

**Requirement**: Pulse 30 must add a `deny-rule-immutability-validator.ts` that explicitly blocks removal of compiler-injected and R5 deny rules through any write path. This must be in the validation pipeline, not just in TUI rendering. Add L0 test: "PATCH to remove compiler-injected deny rule returns GOVERNANCE_DENIED."

---

## Finding D-05: Trust Escalation JWT Does Not Specify Key Distribution

**Severity**: HIGH
**Pulses**: 39
**Invariant**: JWT verification must be complete -- all 5 checks must be mechanically enforceable.

Pulse 39 specifies all 5 JWT checks (signature, audience, subject, expiry, one-time nonce). The implementation is well-specified at the verification side. However, the pulse does not specify where the JWT signing key comes from. The trust-manager needs a public key to verify signatures. Key management questions:

1. Is the signing key the same Ed25519 keypair from pulse 04 (local crypto)? If so, the "manager approval" is self-signed -- the user can forge their own approval JWT.
2. If the signing key is from an external authority (AAD/Entra, fleet admin), the key distribution mechanism must be specified.
3. If the key is from fleet policy, then P-272 fail-closed applies -- missing fleet policy means no verification key means no escalation. This is actually correct behavior but must be documented.

Without key provenance, the 5-check JWT verification is security theater -- you can check a signature perfectly but it means nothing if the signer is the same party requesting escalation.

**Requirement**: Pulse 39 must specify key provenance for JWT verification. If local-only (free tier), document that T1+ escalation requires fleet policy with an external signing authority. If the free tier supports only T0->T1 (self-service, no JWT), document why. Add to acceptance criteria: "JWT signing key provenance is documented and tested."

---

## Finding D-06: TUI Does Not Verify Server Identity

**Severity**: MEDIUM
**Pulses**: 45, 49, 54, 56
**Invariant**: The TUI must trust the server for governance decisions.

The TUI architecture is correct in principle: it is a consumer of `claws serve` and does not implement its own governance logic. All governance decisions flow from the server. However, the TUI connects to `localhost:3939` without any authentication or server identity verification. The specification says:

- Pulse 45: "check if claws serve is running on :3939"
- Pulse 45: HTTP client with "base URL config"

If another process binds to port 3939 before `claws serve` starts, the TUI would connect to it and display whatever governance data it provides. An adversarial local process could make R5 tools appear as R1, making the user believe they can safely enable dangerous tools. The real server would still reject the PATCH, but the UX confusion is a social engineering vector.

**Requirement**: Add a server identity handshake to the TUI startup. The simplest approach: `GET /api/health` must return a `serverType: 'claws-serve'` field that the TUI verifies. This is not cryptographic identity, but it prevents accidental connection to unrelated HTTP servers. Add to pulse 45 acceptance criteria: "TUI verifies server identity via /health response before rendering."

---

## Finding D-07: Validation Pipeline Short-Circuit Masks Compound Violations

**Severity**: MEDIUM
**Pulses**: 30, 44
**Invariant**: Error paths must be exhaustive.

Pulse 30 explicitly specifies "Pipeline short-circuits on first failure -- no unnecessary validators run." But pulse 44 (E2E gate) specifies S24: "compound violation returns all errors." These are contradictory. If the pipeline short-circuits on the first R5_LOCKED failure, the FLEET_LOCKED and GOVERNANCE_DENIED errors are never computed for the same edit.

S24 acceptance test expects compound violations, but the pipeline design prevents them.

**Requirement**: Clarify the design intent. Either: (a) the pipeline runs all validators and collects all errors (supporting S24 but at the cost of running validators after a known rejection), or (b) the pipeline short-circuits and S24 is reworded to "compound violation scenario is reported incrementally -- user fixes one, sees the next." My recommendation: option (a). A user who sees only "R5_LOCKED" won't know their edit also violates fleet policy. Show all failures at once so the user understands the full picture. Change pulse 30 to remove short-circuit behavior.

---

## Finding D-08: P-270 Default-to-R5 Not Tested in the Compile Pipeline

**Severity**: MEDIUM
**Pulses**: 06, 10, 12, 25
**Invariant**: Tools without explicit risk classification default to R5.

Pulse 25 states the P-270 invariant clearly: "tools without an explicit risk classification default to R5." This is tested at the chunk/route level (pulse 25 unit tests). But P-270 should also be enforced in the compile pipeline:

- Pulse 10 (eval-validator) check #4 is "R5 fail-closed compliance" -- but the check list does not mention P-270 specifically.
- Pulse 12 (compile-pipeline-e2e) tests R5 enforcement on conflicting governance rules, but not on unclassified tools.

An unclassified tool should trigger the R5 fail-closed guard at compile time, not just at chunk assembly time.

**Requirement**: Add P-270 enforcement to pulse 06 (R5 fail-closed): "unclassified tool in workspace triggers R5 treatment in enforceR5." Add a unit test to pulse 06: "tool without explicit risk classification is treated as R5 by enforceR5." Add an E2E test to pulse 12: "workspace with unclassified tool compiles with R5 classification, not fail-open."

---

## Finding D-09: No Validation on Code Action Edits Before Apply

**Severity**: MEDIUM
**Pulses**: 58, 30
**Invariant**: Write-time validation must gate every file write, including LSP code actions.

Pulse 58 specifies code actions that produce edits ("Add elicitation gate", "Add deny rule"). These are cross-file edits that modify TOOLS.md and SOUL.md. The pulse says "code actions that produce edits go through the write-time validation layer" and "preview validation via serve compile." However, the mechanism is not explicit:

- Does the code action send the edit as a PATCH to `claws serve`, which routes it through the validation pipeline?
- Or does the code action apply the workspace edit directly via the LSP/VS Code API, bypassing the validation pipeline?

If the latter, the validation pipeline invariant (pulse 30: "all write paths route through this single validation pipeline BEFORE writing") is violated. VS Code workspace edits applied via `WorkspaceEdit` API bypass the serve validation pipeline entirely -- they write directly to disk, and the next file-watcher event triggers a recompile that may fail.

**Requirement**: Pulse 58 must explicitly state that code action edits are sent as PATCH requests to `claws serve`, not applied as VS Code workspace edits. The LSP code action should return a `Command` that triggers the PATCH, not a `WorkspaceEdit`. Add to acceptance criteria: "code action edits route through serve validation pipeline, not direct file writes."

---

## Finding D-10: ANSI Sanitization Only in TUI, Not in LSP/Webview

**Severity**: LOW
**Pulses**: 49, 56, 59
**Invariant**: User-provided text must be sanitized before rendering in any surface.

Pulse 49 correctly adds ANSI escape sequence sanitization for the TUI. But chunks contain user-provided text (SOUL.md persona, TOOLS.md descriptions, MEMORY.md entries). This same text flows to:

1. VS Code diagnostics (pulse 56) -- diagnostic messages rendered in the editor
2. VS Code webview (pulse 59) -- HTML rendering of chunk data
3. VS Code hover text (implied by pulse 57 lock indicator hover)

The webview is an HTML context, so ANSI escapes are harmless but HTML injection (`<script>` tags, `onclick` handlers) is the real risk. Pulse 59 does not mention HTML sanitization of chunk data before rendering in the webview.

**Requirement**: Pulse 59 must add HTML sanitization of all chunk string fields before rendering in the webview. Pulse 56 should sanitize diagnostic messages. Add to pulse 59 acceptance criteria: "all chunk string data is HTML-escaped before rendering in webview." This is defense-in-depth -- the server should sanitize too, but the rendering layer must not trust the transport.

---

## Finding D-11: Rollback Audit Entry Could Itself Fail

**Severity**: LOW
**Pulses**: 34
**Invariant**: Atomic rollback must not leave the system in an unrecoverable state.

Pulse 34 specifies atomic rollback on compilation failure (P-274): "restore OC file from pre-edit snapshot, log rollback to audit trail, return COMPILATION_FAILED PatchError with rollback confirmation." But the audit log write could fail (disk full, permission error, WAL corruption). If the rollback succeeds but the audit write fails, the system is in a correct but unaudited state. The pulse defines `ROLLBACK_FAILED` as a PatchError code, but the scenario where rollback succeeds + audit fails is not covered.

**Requirement**: Clarify in pulse 34: if rollback succeeds but audit write fails, the response should still be COMPILATION_FAILED (not ROLLBACK_FAILED), with an additional warning field indicating the audit write failure. The file state is correct (rolled back), the audit gap is the secondary concern. Add a unit test: "rollback succeeds but audit write fails returns COMPILATION_FAILED with audit warning, not ROLLBACK_FAILED."

---

## Invariant Chain Trace: R5 Through the Wave

Tracing R5 fail-closed enforcement across all 59 pulses:

| Layer | Pulse | R5 Mechanism | Status |
|-------|-------|-------------|--------|
| Compile-time | 06 | `enforceR5()` rejects ambiguous/conflicting governance | SOLID -- acceptance test for non-bypassability |
| Compile-time | 10 | Validator check #4: R5 fail-closed compliance | SOLID -- mirrors enforceR5 logic |
| Compile-time | 12 | E2E: broken governance triggers R5 denial | SOLID -- tested end-to-end |
| Emit-time | 07, 08 | OC + CC emitters call `compileGuard` before emit | SOLID -- guard is the gate |
| Chunk assembly | 23 | `lock.source: 'r5'` derived from GovernanceIR | WEAK -- see D-01 |
| Chunk API | 25 | P-270: unclassified defaults to R5 | PARTIAL -- see D-08 |
| Write-time | 30 | `r5-validator.ts` in validation pipeline | SOLID -- blocks R5 tool toggle |
| PATCH routes | 31 | Routes through validation pipeline | SOLID -- delegates to 30 |
| Allow-all | 33 | R5 tools silently excluded from bulk enable | SOLID -- P-282 explicit |
| Loop soul sync | 35 | Locked sections reject PATCH | PARTIAL -- see D-04 |
| Trust escalation | 39 | JWT 5-check verification | PARTIAL -- see D-05 (key provenance) |
| Onboard | 43 | Content validation before write | PARTIAL -- see D-03 |
| E2E gate | 44 | S21-S24 policy violation tests | WEAK -- see D-07 (compound) |
| TUI connections | 47, 48 | R5 tools rendered without toggle | SOLID -- defense-in-depth |
| TUI PATCH | 49 | R5 rejection renders human message | SOLID -- error mapping |
| TUI soul editor | 51 | R5 deny rules render as immutable | SOLID -- rendering only |
| LSP code actions | 58 | Code actions validate via serve | UNCLEAR -- see D-09 |

**Overall R5 chain verdict**: The compile-time and write-time enforcement layers are well-designed. The gaps are at the boundaries: chunk assembly (D-01), startup (D-02), and cross-surface consistency (D-09). None of these are fatal to the design, but each represents a wall with a crack. Fix them before implementation.

---

## Summary of Findings

| ID | Severity | Pulse(s) | Finding |
|----|----------|----------|---------|
| D-01 | HC-BLOCK | 06, 23, 25, 30 | R5 classification divergence between chunk assembler and validation layer |
| D-02 | HC-BLOCK | 30, 34, 42 | Fleet fail-closed (P-272) not enforced at server startup |
| D-03 | HIGH | 43, 30 | Onboard secret scanning on input only, not generated output |
| D-04 | HIGH | 30, 35, 43 | No explicit validator for deny rule immutability in pipeline |
| D-05 | HIGH | 39 | JWT signing key provenance unspecified -- 5-check verification meaningless without it |
| D-06 | MEDIUM | 45, 49, 54, 56 | TUI connects to unverified localhost server |
| D-07 | MEDIUM | 30, 44 | Validation pipeline short-circuit contradicts compound violation test S24 |
| D-08 | MEDIUM | 06, 10, 12, 25 | P-270 default-to-R5 not tested in compile pipeline |
| D-09 | MEDIUM | 58, 30 | VS Code code action edits may bypass serve validation pipeline |
| D-10 | LOW | 49, 56, 59 | HTML injection risk in VS Code webview -- no sanitization specified |
| D-11 | LOW | 34 | Rollback-succeeds-but-audit-fails scenario unhandled |

**HC-BLOCK count**: 2
**HIGH count**: 3
**MEDIUM count**: 4
**LOW count**: 2

---

## Disposition

**REVISE** -- The 2 HC-BLOCK findings (D-01, D-02) must be addressed in pulse amendments before implementation begins. The 3 HIGH findings (D-03, D-04, D-05) should be addressed in the pulse specifications. The MEDIUM and LOW findings can be tracked as implementation-time requirements but should be documented in the pulse files now.

The overall architecture is sound. The separation between compile-time enforcement (pulse 06), write-time validation (pulse 30), and UI rendering (pulses 45-55) is the correct layered defense pattern. The invariant chain holds at each individual layer. The findings above are about gaps *between* layers -- the seams where one layer's assumptions don't match another's guarantees. Fix the seams and this wave lands clean.
