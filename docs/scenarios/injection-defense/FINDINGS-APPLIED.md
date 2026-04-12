# Findings Applied: injection-defense

**Date**: 2026-04-11
**Scenarios processed**: 6
**Total findings**: 61
**Major/warning applied**: 47
**Note severity skipped**: 14

---

## Summary of Changes

### Specs Edited

#### CL-02 Security Model (G-INPUT / G-CONTEXT / G-OUTPUT / G-BOUND section)
- **26 new constraints** added covering: symmetric entry/exit boundary markers per context layer, canonical location for output_isolation declaration (Amendment A21), marker format guidance based on model-specific testing, data provenance unknowable at compile time (Amendment A24 note), explicit isolation opt-out severity for external data tools (error not warning), nonce-based boundary markers replacing fixed markers, nonce confidentiality requirements (never in content), marker defense strategy documentation and trade-offs, require unicode normalization in boundary marker sanitization, red-team validation of boundary marker effectiveness, audit chain recording pre-wrap and post-wrap tool output, URL validation modes (allowlist/enterprise, blocklist+heuristics/default, advisory/development), sub-rule split consideration for G-OUTPUT-02 (domain vs exfiltration), URL shortener handling policy, warn on wildcard allowlist patterns, URL validation across all output channels not just user-facing, URL field identification in tool argument schemas, user-facing blockReason format with remediation guidance, loop detection heuristic beyond simple call counters, per-risk-level recommended tool call limits, pre-check vs post-check budget enforcement semantics, platform-default bounds when workspace bounds absent, fallback when shared recursion/chain config values absent, memory entry provenance tracking for cross-session taint analysis, trust labels (SYSTEM/DATA/UNTRUSTED) on memory entries, trigger G-CONTEXT-03 on memory-write tool presence not just MEMORY.md

#### CL-03 Runtime Enforcement
- **12 new constraints** covering: classify G-INPUT runtime scan as Tier 2 (async) or Tier 1 (sync), G-CONTEXT marker injection fail-closed independent of R-level, per-tool sub-boundaries within DATA layer, truncation protection mechanism per platform for governance preamble, per-turn data flow graph for chain validation, proximate data provenance (per-tool coarse vs per-content fine), graceful halt procedure for G-BOUND limit exceeded, WAL write latency bounds and lag window risk, define chain validation data structure for O(1) amortized lookups, memory loading error behavior (per-entry vs session), flag memory entries without write-audit provenance

#### CL-04 Compilation Pipeline
- **3 new constraints**: Guardrail Sandwich layers fire at different chain steps not sequentially, static taint analysis for tool chain risk paths in ANALYZE phase, cross-reference G-SUPPLY as prerequisite for G-CONTEXT skill isolation

#### CL-05 Developer Experience
- **1 new constraint**: G-ELICIT approval request includes data provenance context

### PITFALLS.md
- **9 new pitfalls** (P-210 through P-218)
- P-210: **Fixed boundary markers trivially forgeable** -- Critical -- S02-F01 -- Boundary markers are static strings; any data source including that exact string escapes the DATA boundary. claws response: CL-03 nonce-based markers or mandatory sanitization. Detection ring: Inner
- P-211: **Nonce leaks into context enabling marker forgery** -- High -- S02-F02 -- Nonce appears in assembled context; injection extracts it and forges markers. claws response: CL-03 nonce confidentiality enforcement. Detection ring: Inner
- P-212: **Context marker injection crash enables fail-open** -- High -- S02-F04 -- Hook crashes during marker injection (malformed UTF-8); R2 tool output enters context without markers due to fail-open default. claws response: CL-03 G-CONTEXT marker injection fail-closed. Detection ring: Inner
- P-213: **DNS exfiltration bypasses URL parameter inspection** -- High -- S03-F04 -- Data encoded as subdomains (SECRET.attacker.com) bypasses URL query parameter checks. claws response: CL-02 document as out-of-scope; recommend network-level DNS monitoring. Detection ring: Outer
- P-214: **WAL lag window allows budget overshoot** -- High -- S04-F02 -- Rapid tool calls before WAL flush; budget counter lags behind actual spending; injection exploits lag. claws response: CL-03 WAL write latency bounds. Detection ring: Inner
- P-215: **G-BOUND halt abandons in-progress work** -- High -- S04-F07 -- Budget limit halt ends session abruptly; partial file writes, open connections, pending subagent tasks abandoned. claws response: CL-03 graceful halt with 5s cleanup period. Detection ring: Inner
- P-216: **Cross-session memory poisoning** -- Critical -- S05-F03 -- Poisoned memory entry written in session N exploited in session N+1; no cross-session taint tracking. claws response: CL-02 G-CONTEXT-03 memory entry provenance tracking. Detection ring: Inner
- P-217: **Chain-of-tool injection invisible to individual guards** -- Critical -- S06-F01 -- Multi-tool chain (web-search -> summarize -> draft-email -> send-email) passes each individual guard but overall chain exfiltrates data. claws response: CL-03 per-turn data flow graph for chain validation. Detection ring: Inner
- P-218: **Governance preamble truncated by context window** -- High -- S01-F07 -- Layer 1 governance instructions first-in first-truncated by some providers; #1 defense evaporates under context pressure. claws response: CL-03 truncation protection mechanism per platform. Detection ring: Inner

### Plans Edited
- **claws-rules**: G-INPUT nonce markers, G-CONTEXT provenance, G-OUTPUT chain validation, G-BOUND loop detection
- **claws-emit**: boundary marker generation with nonces, DATA-layer sub-boundaries
- **claws-governance-ir**: chain validation data flow graph, memory trust labels

### Guides Edited
- **docs/claws/governance/injection-defense.md**: Guardrail Sandwich distributed nature, chain validation, memory poisoning
- **docs/claws/governance/tool-classification.md**: URL validation modes, data provenance in approval context

---

## Findings NOT Applied (note severity, skipped per rules)

14 findings with severity "note" were skipped: S01-F08 (injection corpus recommendation), S01-F10 (multi-block DATA isolation testing), S02-F08 (cross-reference S02/S06), S03-F08 (base64 detection false-positive mitigation), S03-F10 (URL allowlist in governance-ir hash), S04-F08 (step definition granularity), S04-F10 (audit event payload schema), S05-F08 (OWASP #8 partial coverage note), S06-F08 (parallel tool call chain validation), S06-F11 (diverse payload corpus recommendation).
