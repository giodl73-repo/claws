# Findings Applied: obo-elicitation

**Date**: 2026-04-11
**Scenarios processed**: 8
**Total findings**: 80
**Major/warning applied**: 68
**Note severity skipped**: 12

---

## Summary of Changes

### Specs Edited

#### CL-02 Security Model (G-ELICIT section)
- **38 new constraints** added covering: approval request minimum context fields (tool name, risk, action summary, identity), approval token binding to invocation parameters (tool + params + timestamp hash), missing approval key deny-default behavior, token-to-audit-entry linkage, inline approval UX disambiguation, multi-user approver identity verification, approval token expiry window (60s validity), algorithm-agnostic token signing (HMAC-SHA256 + Ed25519), AbortSignal support detection for deny-on-timeout, elicitation request deduplication within timeout window, elicitation request rate limiting (max N per minute per agent), post-denial cooldown period, transitive OBO delegation blocking with minimum L1 identity, delegation definition scope, re-approval by different agent policy, separate OBO hop counter vs A2A chain depth, R5 pre-authorization strength warning, structured pre-authorization in USER.md frontmatter, pre-authorization expiry and staleness detection (90-day default), GovernanceIR pre-authorized vs ungoverned distinction, claws.json vs USER.md precedence for elicitation, three-source precedence ordering (SOUL.md deny > claws.json > USER.md), USER.md modification as OBO action, fleet policy vs USER.md pre-auth precedence, standing approval compile-time condition validation, unconditional R5 standing approval warning/error, overlapping standing approval detection, tool parameter schema for standing approval matching, multi-tool approval mode (serialized vs batched), immediate vs transactional execution after approval, partial approval response format, per-turn R5 request limit, per-tool individual approval tokens, multi-tool approval correlation ID, approval request ordering by risk level, modified re-request visibility after denial, constant-time token signature verification, approval key isolation from agent tools, forgery detection as security incident, approval token nonce for replay prevention, dual-key verification during rotation grace period, opaque forgery rejection response, progressive escalation for repeated forgery, token encryption for A2A transit, complete parameter set hashing, context-dependent classification (conditional R5 from DM/private target), GovernanceIR conditional classification rules, TOOLS.md context_parameters for OBO classification, missing context defaults to R5/OBO, max-risk rule scoped to context, context elevation reason in approval request, context-specific standing approvals

#### CL-03 Runtime Enforcement
- **6 new constraints** covering: TOCTOU check between approval and execution, dynamic agent OBO delegation enforcement, deny response delivery guarantee (5s internal timeout), clock integrity for standing approval time windows, proximate vs original sender in A2A trust evaluation

#### CL-04 Compilation Pipeline
- **2 new constraints**: deny-on-timeout unconditionally generated in EMIT, FE6 compile-time nested OBO delegation detection

#### CL-01 CLI Surface & Schema
- **2 new constraints**: standing approval condition validation in claws.json schema, USER.md structured OBO scope format

#### CL-05 Developer Experience
- **3 new constraints**: standing approval expiry warning in health check, recompilation drift detection for standing approval currency, standing approval as SCHEDULE-NO-APPROVAL solution documentation

### PITFALLS.md
- **12 new pitfalls** (P-190 through P-201)
- P-190: **Approval token parameter TOCTOU** -- Critical -- S01-F06 -- Approval token only binds to tool name; parameters changed between approval and execution. claws response: CL-03 runtime parameter match check. Detection ring: Inner
- P-191: **Stale approval token replay** -- High -- S01-F09 -- Approval token has no expiry; reuse hours later after network retry. claws response: CL-02 G-ELICIT 60s validity window. Detection ring: Inner
- P-192: **Platform approve-on-timeout override failure** -- Critical -- S02-F01 -- Platform defaults to approve-on-timeout; claws AbortSignal override fails on unsupported version, R5 tool executes without approval. claws response: CL-02 AbortSignal support detection, refuse to register. Detection ring: Inner
- P-193: **Duplicate approval requests from agent retry** -- High -- S02-F02 -- Agent framework timeout shorter than elicitation timeout; duplicate approval requests confuse user. claws response: CL-02 G-ELICIT request deduplication. Detection ring: Inner
- P-194: **Approval fatigue flood attack** -- High -- S02-F06 -- Malicious agent floods user with R5 approval requests; user auto-approves or stops reading. claws response: CL-02 G-ELICIT rate limiting. Detection ring: Inner
- P-195: **Deny response delivery failure** -- High -- S02-F09 -- Timeout fires but deny response fails to reach Gateway (network partition); tool call hangs indefinitely. claws response: CL-03 internal 5s delivery timeout + Gateway fallback. Detection ring: Inner
- P-196: **Transitive OBO via relay agent pattern** -- Critical -- S03-F05 -- Agent A has OBO approval, produces output; Agent B reads output and independently invokes same OBO tool, bypassing single-hop limit. claws response: CL-02 per-invocation approval regardless of delegation path. Detection ring: Inner
- P-197: **USER.md prompt injection pre-auth escalation** -- Critical -- S04-F07 -- Prompt injection causes agent to modify USER.md, adding pre-authorization for tools user never intended. claws response: CL-02 G-ELICIT USER.md modification as R5 action. Detection ring: Inner
- P-198: **Stale standing approval after revocation** -- High -- S05-F05 -- Standing approval removed from config but compiled handler not redeployed; old approval remains active. claws response: CL-05 drift detection for standing approval currency. Detection ring: Middle
- P-199: **Clock manipulation for standing approval bypass** -- High -- S05-F03 -- System clock manipulated (NTP poisoning, VM time drift); R5 tool executes outside authorized time window. claws response: CL-03 monotonic clock + trusted wall-clock verification. Detection ring: Inner
- P-200: **Timing side-channel on token verification** -- High -- S07-F01 -- Token signature comparison short-circuits on first byte mismatch; attacker incrementally guesses correct signature. claws response: CL-02 constant-time comparison (crypto.timingSafeEqual). Detection ring: Compile-time
- P-201: **Approval key accessible to agent tools** -- Critical -- S07-F02 -- Approval key stored in agent-accessible path (checked into git, env var, readable config); attacker forges valid tokens. claws response: CL-02 key isolation from agent tool paths. Detection ring: Outer

### Plans Edited
- **claws-governance-ir**: conditional classification IR schema, per-invocation approval structure
- **claws-rules**: OBO delegation chain enforcement, rate limiting, deduplication
- **claws-emit**: deny-on-timeout unconditional generation, standing approval handlers
- **claws-parse**: USER.md structured frontmatter for OBO scope, context_parameters extraction

### Guides Edited
- **docs/claws/governance/obo-boundary.md**: standing approval, conditional classification, multi-tool approval
- **docs/claws/governance/elicitation-gate.md**: token binding, TOCTOU defense, forgery detection
- **docs/claws/getting-started/claws-json.md**: standing approval schema, rate limiting config

---

## Findings NOT Applied (note severity, skipped per rules)

12 findings with severity "note" were skipped: S01-F08 (mode-dependent timeouts), S02-F08 (scheduled execution interaction), S03-F09 (self-delegation edge case), S04-F09 (structured YAML frontmatter preference), S05-F10 (conditional standing approval documentation), S06-F09 (R5 request frequency health metric), S07-F10 (PKI non-repudiation), S08-F10 (generalized context-dependent framework).