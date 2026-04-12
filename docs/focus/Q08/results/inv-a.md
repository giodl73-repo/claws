# Experiment a: OpenClaw Security Landscape

**Method**: web-search + design analysis
**Date**: 2026-04-11

> **Source**: Live web search (April 2026).

---

## The Security Crisis

### By the numbers (April 2026)

| Metric | Value | Source |
|--------|-------|--------|
| Tracked CVEs | **138** (7 Critical, 49 High) | GitHub Security Advisory |
| Exposed instances | **135,000+** (63% vulnerable) | DEV Community analysis |
| Malicious skills in ClawHub | **1,467 of 3,984** (37%) | Snyk audit |
| Active malicious payloads | **76 confirmed** | Snyk, 8 still live |
| GitHub stars | 346,000+ | — |
| Monthly active users | 3.2M+ | — |

### Critical CVEs

| CVE | CVSS | Attack | Impact |
|-----|------|--------|--------|
| CVE-2026-25253 | 8.8 | RCE via gatewayUrl parameter leak in Control UI | Full agent takeover |
| CVE-2026-24763 | High | Command injection | Arbitrary code execution |
| CVE-2026-26322 | High | SSRF | Internal network access |
| CVE-2026-26329 | High | Path traversal | Local file reads |
| CVE-2026-30741 | High | Prompt-injection-driven code execution | Agent hijack |
| ClawJacked | High | WebSocket hijack of localhost agents | Silent agent takeover from browser |

### The Trust Model Problem

OpenClaw's security model is **"personal assistant"** — one trusted operator, potentially many agents. The fundamental assumption: "if someone can modify Gateway host state/config, treat them as a trusted operator."

This assumption breaks in enterprise:
- **Multi-tenant**: Multiple users share agents
- **Fleet**: Agents managed centrally, operated by many
- **A2A**: Agents talk to each other with no identity boundary
- **Supply chain**: 37% of ClawHub skills are malicious

### ClawPilot

[ClawPilot](https://github.com/kcchien/clawpilot) is a security-first agent skill for AI coding assistants. It bundles reference files covering:
- Configuration hardening
- CVE database with OWASP mapping
- Cloud deployment security patterns
- OpenClaw architecture knowledge

ClawPilot is **advisory** — it teaches coding assistants about OC security. It does NOT enforce governance. It's documentation-as-skill, not compile-time enforcement. glint replaces the enforcement gap that ClawPilot can only document.

---

## OWASP Agentic Top 10 (2026)

The authoritative framework. 100+ experts, peer-reviewed.

| # | Risk | OC exposure | glint coverage (current) | glint coverage (proposed Q12h) |
|---|------|------------|------------------------|-------------------------------|
| 1 | **Excessive Agency** — agent has more permissions than needed | HIGH: default config grants broad tool access | Partial (T0-T4 trust tiers) | Full (per-tool classification, G-CLASS) |
| 2 | **Inadequate Access Control** — no fine-grained permissions | HIGH: per-agent allowlists but coarse | Partial (G3 rule) | Full (capability matrix, G-PERM) |
| 3 | **Prompt Injection** — malicious input steers agent | CRITICAL: CVE-2026-30741, link preview exfil | None | Partial (compile-time patterns, G-INJECT) |
| 4 | **Tool Misuse** — agent uses tools beyond intended scope | HIGH: no per-action control | Partial (FE5 trust-tier ACL) | Full (elicitation gates, G-ELICIT) |
| 5 | **Insecure Inter-Agent Communication** — A2A attacks | CRITICAL: no agent identity, no trust boundary | None | Full (A2A policy, G-A2A) |
| 6 | **Unreliable Output** — agent produces incorrect/harmful output | MEDIUM: no output validation | None | Partial (output guards, G-OUTPUT) |
| 7 | **Insufficient Monitoring** — no audit trail | HIGH: basic logging only | Full (audit chain, SIEM) | Full (+ incident classification) |
| 8 | **Memory Poisoning** — adversary corrupts persistent memory | HIGH: no memory integrity | None | Partial (memory policy, G-MEMORY) |
| 9 | **Supply Chain** — malicious skills/plugins | CRITICAL: 37% of skills malicious | Partial (G2 skill governance) | Full (skill signing, G-SUPPLY) |
| 10 | **Cascading Hallucination** — agent chains amplify errors | MEDIUM: no chain validation | None | Partial (chain validation, G-CHAIN) |

### Coverage gap summary

- **Current glint (Q12a-Q12g)**: Covers 3 of 10 partially, 1 fully
- **Proposed Q12h**: Covers 7 of 10 fully, 3 partially
- **Fundamentally outside compile-time scope**: Prompt injection (can only mitigate, not prevent), output reliability (runtime), memory poisoning (runtime)

---

## OC Exec Approvals (Current Human-in-the-Loop)

OpenClaw's exec approval system:

| Feature | How it works | Limitation |
|---------|-------------|-----------|
| Per-agent allowlists | Each agent has its own approved commands | Coarse — per-tool, not per-action |
| Ask mode | Agent requests approval before exec | Interactive only — no async/timeout |
| Approval delivery | Discord/Telegram /approve | Platform-dependent |
| Deny behavior | Blocks command + wipes cached output | Good — prevents replay |
| Scope | Host exec only | Doesn't cover A2A, API calls, OBO actions |

**What's missing**:
1. No compile-time enforcement — approvals are runtime-only
2. No per-action granularity — "can run curl" vs "can run curl to this endpoint"
3. No OBO concept — no distinction between "agent runs command" vs "agent acts as user"
4. No A2A approval — no gate between agents
5. No timeout/deny-default — no policy for what happens when approval isn't answered
6. Drifts from documentation (PITFALL P-008)

---

## Attack Taxonomy

| Class | Sub-class | Example | Compile-time defensible? |
|-------|-----------|---------|------------------------|
| **Tool escalation** | Horizontal | Agent uses tool beyond intended scope | Yes — per-tool classification |
| | Vertical | Agent escalates from T2 to T3 tool | Yes — trust tier enforcement |
| **A2A attacks** | Lateral movement | Compromised Agent A pivots through Agent B | Yes — A2A trust policy |
| | Delegation abuse | Agent A asks Agent B to act with user's creds | Yes — OBO policy |
| | Transitive trust | A trusts B, B trusts C, so A trusts C (unintended) | Yes — trust chain limits |
| **Prompt injection** | Direct | Malicious user input steers agent | Partial — input validation rules |
| | Indirect | Malicious content in fetched data steers agent | Partial — context isolation |
| | Via skill | Malicious skill contains injection payload | Yes — skill validation |
| **Data exfiltration** | Via tool | Agent sends data through an allowed tool | Partial — output guards |
| | Via link preview | Agent generates URL that leaks data | Yes — URL generation rules |
| | Via A2A | Agent passes data to another agent that exfils | Yes — A2A data flow labels |
| **Supply chain** | Malicious skill | 37% of ClawHub skills have flaws | Yes — skill signing + scanning |
| | Dependency poison | Skill dependency includes malicious code | Partial — dep scanning |
| **Impersonation (OBO)** | Send-as-user | Agent sends email as the user | Yes — elicitation gate |
| | Post-as-user | Agent posts to Slack/Teams as user | Yes — elicitation gate |
| | Transact-as-user | Agent makes payment with user's auth | Yes — elicitation gate |
| **Config manipulation** | Self-modification | Agent modifies its own governance config | Yes — config immutability rule |
| | Drift | Config changes between governance checks | Yes — drift detection |

### What's compile-time defensible (glint scope)

**14 of 17 sub-classes are partially or fully defensible at compile time.** The 3 that aren't (direct prompt injection, indirect prompt injection, dependency poisoning) require runtime defense — but compile-time patterns can REDUCE the surface.

---

## Key Finding

The OWASP Agentic Top 10 is the authoritative framework. glint currently covers 3 of 10 risks partially. Q12h should raise that to 7 of 10 fully covered. The three hardest (prompt injection, output reliability, memory poisoning) require runtime defense but compile-time patterns can reduce the surface. The biggest gap is A2A — zero current coverage for the #5 risk.

ClawPilot is advisory documentation, not enforcement. glint replaces the enforcement layer that ClawPilot can only describe.
