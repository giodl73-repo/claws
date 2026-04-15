# OC Reference Workspace

Your agent has 12 tools. Some read files. Some send emails. One triggers deployments to production. Right now, nothing stops any of them from running whenever they want.

**Governance** is the set of rules that controls which tools can run, when they need approval, and what gets logged. It is the difference between "the agent sent an email I never saw" and "the agent drafted an email, showed it to me, and waited for my sign-off."

**claws** reads your workspace files, finds the gaps, and generates the enforcement code. You write the rules in plain Markdown. claws compiles them into a Gateway plugin that runs in your OC runtime.

## Try It

```bash
# 1. Check this workspace for governance violations
claws check .
#    Expected: 7 violations (deny-constraint conflicts, trust-tier mismatches)

# 2. Build a Gateway plugin from this workspace
claws build .
#    Expected: gateway-plugin.ts, governance-manifest.json, 3 governed skills

# 3. Compare before and after governance
claws test --sim
#    Expected: side-by-side showing 0 rules vs 29 rules, 0 audit vs full audit
```

## File-by-File Walkthrough

### SOUL.md -- What the agent must never do

Three deny constraints:
1. **Never access production** -- forces all data queries through the analytics replica
2. **Never send without approval** -- blocks emails and messages until a manager signs off
3. **Never impersonate** -- prevents the agent from pretending to be a team member

Also restricts which AI models the agent can use (gpt-4o and claude-3.5-sonnet only).

**Governance pattern:** Deny constraints are absolute. They override tool permissions. If TOOLS.md says `send-email` is allowed and SOUL.md says "never send without approval," the deny constraint wins. This is intentional -- it creates violations that claws surfaces.

### TOOLS.md -- 12 tools across 5 risk tiers

| Tier | Tools | What happens |
|------|-------|-------------|
| R1 | web-search, web-scrape | Audit-only. Logged, never blocked. |
| R2 | file-read, file-list | Audit-only. Logged, never blocked. file-read has an explicit audit-only rule for non-blocking audit-chain testing. |
| R3 | file-write, calendar-read | Gated. Requires team-lead approval. |
| R4 | db-query, api-call | Gated. Requires manager approval. |
| R5 | send-email, send-slack, shell-exec, deploy-trigger | Closed. Requires exec approval + elicitation. deploy-trigger also requires dual-approval. |

**Governance pattern:** Risk tiers map to fail modes. R1-R2 fail open (if governance breaks, the tool still works). R3-R4 are gated (approval required, configurable). R5 fails closed (if governance breaks, the tool is blocked).

**Intentional violations:** `shell-exec` and `deploy-trigger` are R5 tools in a T2 workspace. claws flags these as trust-tier violations. The fix is either to raise the trust tier or remove the tools.

### AGENTS.md -- 2 subagents with scoped delegation

- **research-agent**: R1-R3 tools. Read-only operations. Cannot send emails or trigger deployments.
- **action-agent**: R3-R5 tools. Can write files, query databases, and send emails. R5 tools require elicitation.

**Governance pattern:** Delegation scope limits what a subagent can do. The primary agent owns R5 capability but delegates it selectively. claws verifies that delegation scopes align with the workspace trust tier.

**Intentional violation:** action-agent delegates R5 tools, but the workspace is T2. claws flags this as a delegation-scope mismatch.

### IDENTITY.md -- Who this agent is

L2 identity with HMAC-signed tokens and fleet membership. The fleet ID (`acme-eng-fleet`) enables centralized policy distribution. The workspace ID (`ws-ref-001`) is unique within the fleet.

### USER.md -- Who the agent acts for

On-behalf-of (OBO) scope for email and calendar. The agent can read calendar events and draft emails, but sending requires approval per the SOUL constraints.

### MEMORY.md -- What the agent remembers

INTERNAL data classification with 30-day retention. The agent does not store CONFIDENTIAL or RESTRICTED data. Audit trails are retained for 90 days after memory purge.

### HEARTBEAT.md -- Health checks

Hourly schedule: flush audit events, re-validate identity tokens, report tool usage. The on-start checks verify that SOUL constraints are loaded and the audit endpoint is reachable.

### Skills

Three skills at different governance tiers:

| Skill | Tier | Governance | Key rule |
|-------|------|-----------|----------|
| `web-lookup` | R1 | Audit only | Logged, never blocked |
| `summarize` | R3 | Audit + approval | Manager must approve file writes |
| `email-drafter` | R5 | Audit + approval + elicitation | Exec approval, user reviews draft before send |

Each skill's `SKILL.md` includes a `governance` section in its frontmatter. When published with `claws publish`, skills earn a governance-verified badge at their risk tier.

### lobster.yaml -- 3-step workflow

A research-draft-review pipeline that chains the three skills. Demonstrates how governance flows through multi-step workflows: R1 research has no gate, R3 drafting needs approval, R5 email dispatch needs exec sign-off and elicitation.

### openclaw.json -- OC platform config

Standard OC workspace configuration: name, version, entrypoint, skill and workflow references.

### claws.json -- Governance config

Trust tier T2 with no suppressions. Fail modes configured per risk tier (R1-R2 open, R3-R4 gated, R5 closed). Full audit level.

## Adoption Tier Mapping

| Adoption Tier | What you get | Fixture skills |
|---------------|-------------|---------------|
| **Tier 1: Audit** | Every tool call is logged. No blocking. You can see what happened after the fact. | `web-lookup` (R1 audit-only) |
| **Tier 2: Gated** | High-risk tools require approval before execution. Audit is still on. | `summarize` (R3 audit + approval) |
| **Tier 3: Governed** | Full governance: audit, approval, elicitation, deny-constraint enforcement, delegation scoping. | `email-drafter` (R5 full governance) |

## Before/After Comparison

The `before-claws/` directory contains the same 12 tools with zero governance. Compare:

```
BEFORE                                 AFTER
12 tools, 0 governance                 12 tools, 29 rules applied
send-email: ALLOWED (no gate)          send-email: BLOCKED (R5, elicit required)
db-query: ALLOWED (no audit)           db-query: GATED (R4, approval needed)
web-search: ALLOWED                    web-search: ALLOWED (R1, audit logged)
0 violations, 0 audit entries          7 violations, full audit chain
```

See `before-claws/README.md` for the full zero-governance story.
