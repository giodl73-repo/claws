# External Context: Managed Agent Platforms

Seven major platforms compete in the managed agent space. None provides a compilation or governance layer.

## Platforms

| Platform | CLI | Workspace Format | Self-Hosted | Governance/Compliance |
|----------|-----|-----------------|-------------|----------------------|
| **Anthropic Managed Agents** (beta) | `ant` (Go) | JSON/YAML API params | No | Sandbox only -- no guardrail API |
| **OpenAI Agents SDK** (GA) | None (SDK-driven) | Python/JS code + YAML | Yes (SDK) | Parallel guardrails (input/output validation) |
| **Google Vertex AI / ADK** (GA) | gcloud | Code-first (Python) | Yes (ADK) | Callbacks + responsible AI filters + A2A protocol |
| **AWS Bedrock Agents** (GA) | AWS CLI | Console/CloudFormation | No | Best-in-class: 6 policies incl. Cedar real-time tool interception |
| **Microsoft Agent Framework** (v1.0) | VS Code ext | .NET/Python code | Azure-dependent | Middleware pipeline (closest to hook semantics) |
| **LangGraph Cloud** (GA) | langgraph CLI | Graph definitions (Python/TS) | Yes (free Lite tier) | LangSmith tracing; no built-in policy enforcement |
| **CrewAI** (v1.10) | crewai CLI | Python decorators + YAML | Yes | None built-in |

**OpenClaw** occupies a separate category: local-first, MIT-licensed, 100K+ GitHub stars. Uses 12 Markdown workspace files (SOUL.md, AGENTS.md, HEARTBEAT.md, etc.) with model-agnostic routing and 25+ messaging connectors. No governance, no sandbox (CVE-2026-25253, CVSS 8.8 RCE), no compile-time validation.

## Governance Gaps

- **Anthropic**: No guardrail API in beta. Security hooks are lossy -- workspaces with `canBlock` hooks lose enforcement entirely.
- **OpenAI**: Guardrails exist but are parallel/non-blocking, not compile-time enforced.
- **Google**: Callbacks and evaluation framework, but no sealed deployment or audit trail.
- **AWS**: Strongest runtime guardrails (Cedar), but AWS-locked and no compile-time layer.
- **Microsoft**: Middleware pipeline is extensible but has no built-in guardrail library.
- **LangGraph/CrewAI**: Observability only; no policy enforcement.
- **OpenClaw**: Zero governance -- full system access, no audit trail, no sealed artifacts.

No platform offers compile-time governance, sealed deployment with integrity verification, budget management, or cross-platform audit trails. This is the gap CraftWorks fills as a compilation and governance layer above all runtimes.
