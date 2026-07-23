# Skill Security Guard Extension

## Summary

A useful security extension would combine two capabilities in one package:

1. Runtime protection inside the live prompt/tool loop, where the system is exposed to XPIA, malicious instructions, untrusted retrieved content, and risky tool calls.
2. Ahead-of-time scanning and evaluation of Skills before they are installed, enabled, merged, or used in production.

The core idea is a **Skill Security Guard**: a policy-backed firewall for agent Skills that can evaluate risk before use and enforce protections during execution.

## Why both modes matter

Ahead-of-time scanning can tell us whether a Skill appears safe based on its instructions, permissions, manifest, dependencies, and behavior under test. That is useful for review, CI, governance, and install-time decisions.

Runtime enforcement is still necessary because even a safe Skill can encounter malicious content later. Prompt injection, compromised webpages, poisoned retrieved documents, malicious repository files, or unexpected tool outputs can all influence the live agent loop. The guard needs to protect the system at the moment decisions are made.

In short: **AOT scanning tells us whether a Skill looks safe. Runtime enforcement protects us when the Skill encounters unsafe content or behaves unexpectedly.**

## Runtime protection

Inside the actual prompt loop, the extension would act as a policy layer between Skills, model reasoning, context sources, and tools.

| Surface                   | Protection                                                                                                                                                          |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prompt and context intake | Label untrusted content, detect XPIA-style instructions, and prevent retrieved/web/user-file text from overriding system or developer policy.                       |
| Tool calls                | Gate risky operations such as shell execution, network access, file writes, credential access, browser automation, cross-workspace reads, and repository mutations. |
| Data egress               | Run DLP and pre-send checks before messages, uploads, API calls, PR comments, file writes, or external tool calls.                                                  |
| Human approval            | Require human-in-the-loop approval for high-risk actions, especially when untrusted content influenced the plan.                                                    |
| Audit and provenance      | Record what content influenced the action, what policy fired, and why an action was allowed, blocked, or escalated.                                                 |

## Ahead-of-time Skill scanning

Before a Skill is installed or enabled, the extension could evaluate the Skill and produce a risk report.

| Scan target        | Checks                                                                                                                                                    |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Skill instructions | Prompt-injection patterns, privilege escalation language, hidden exfiltration behavior, and instructions that attempt to override higher-priority policy. |
| Tool permissions   | Excessive filesystem, shell, network, browser, repository, or credential access.                                                                          |
| Data handling      | Whether the Skill can access secrets, private files, copied prompts, user data, or external content.                                                      |
| Behavioral evals   | Red-team prompts that test whether the Skill follows unsafe instructions, leaks data, or abuses tools.                                                    |
| Supply chain       | Manifest integrity, provenance, version pinning, unexpected scripts, binaries, or dependency changes.                                                     |

## Product shape

The most valuable version is not just a static scanner. It should be a **policy-backed Skill firewall** with both review-time and runtime controls.

Potential commands and surfaces:

1. `openclaw skills scan <skill>` — produce a human-readable and machine-readable risk report.
2. `openclaw skills install --enforce-policy <skill>` — block, warn, or require approval based on policy.
3. CI integration — fail PRs that add unsafe Skills, expand permissions, or change sensitive behavior without review.
4. Runtime guardrails — enforce the same policy during live agent execution.
5. Enterprise policy packs — support org-specific rules for privacy, compliance, egress, secrets, approvals, and audit retention.

## Example policy outcomes

| Scenario                                                                              | Outcome                                                                             |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Skill requests shell and network access but does not declare why                      | Block install or require security review.                                           |
| Skill reads a user-provided document that contains instructions to exfiltrate secrets | Label as untrusted content and prevent the instruction from influencing tool calls. |
| Skill attempts to write to a repository file after reading untrusted web content      | Require approval and include provenance in the approval prompt.                     |
| Skill prepares to send content externally                                             | Run DLP/pre-send checks and block sensitive data egress.                            |
| Skill adds a new dependency with install scripts                                      | Flag in CI and require review.                                                      |

## Positioning

This extension would make Skills safer for both open-source and enterprise environments. It would help individual users understand Skill risk, help maintainers review Skill changes, and help organizations enforce policy without disabling the benefits of extensibility.

The framing is simple:

**Scan Skills before trust. Guard Skills during use. Audit what happened afterward.**
