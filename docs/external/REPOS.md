# OpenClaw Repos That Matter

Repos relevant to claws development — the core platform, ecosystem tools, security research, and community.

## Core Platform

| Repo | What it is | Why it matters for claws |
|------|-----------|------------------------|
| [openclaw/openclaw](https://github.com/openclaw/openclaw) | The OpenClaw Gateway — Node.js runtime, 346K stars | THE runtime claws targets. Plugin API, hook API, exec-approvals, skill loading, Gateway internals. |
| [openclaw/clawhub](https://github.com/openclaw/clawhub) | ClawHub skill registry — API + schema | ClawHub integration for `claws publish`, governance badges, skill scanning. |
| [openclaw/skills](https://github.com/openclaw/skills) | All ClawHub skill versions archived | Bulk analysis source for Q14 ecosystem mapping. Every skill ever published. |
| [openclaw/docs](https://github.com/openclaw/docs) | Official documentation | API docs for before_tool_call, exec-approvals, plugin slots, skill format. |

## Security Research

| Repo | What it is | Why it matters for claws |
|------|-----------|------------------------|
| [slowmist/openclaw-security-practice-guide](https://github.com/slowmist/openclaw-security-practice-guide) | Agent-facing security hardening guide | Security best practices that claws should enforce. CVE mapping. |
| [kcchien/clawpilot](https://github.com/kcchien/clawpilot) | Security-first agent skill for coding assistants | Advisory security tool. claws replaces the enforcement layer ClawPilot can only document. |

## Community & Ecosystem

| Repo | What it is | Why it matters for claws |
|------|-----------|------------------------|
| [VoltAgent/awesome-openclaw-skills](https://github.com/VoltAgent/awesome-openclaw-skills) | 5,198 skills curated + categorized | Cloned at `/c/src/awesome-openclaw-skills/`. Source for Q14 skill ecosystem analysis. |
| [openclaw/openclaw-node-vscode](https://marketplace.visualstudio.com/items?itemName=xiaoyaner.openclaw-node-vscode) | OC Node VS Code extension (4,200 installs) | Existing VS Code extension. claws-vscode complements at Layer 4 (governance). |

## Standards & Frameworks

| Resource | What it is | Why it matters for claws |
|----------|-----------|------------------------|
| [OWASP Agentic Top 10](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/) | 10 critical agentic AI security risks | claws's security model (Q08) maps to all 10 risks. |
| [OWASP Agentic Skills Top 10](https://owasp.org/www-project-agentic-skills-top-10/) | 10 critical skill security risks | Skill supply chain governance (G-SUPPLY). |
| [NIST AI RMF](https://www.nist.gov/artificial-intelligence/ai-risk-management-framework) | AI Risk Management Framework | Compliance framework for `claws comply`. |

## Local Clones

| Path | Repo | Status |
|------|------|--------|
| `/c/src/awesome-openclaw-skills/` | VoltAgent/awesome-openclaw-skills | Cloned (shallow) |
| `/c/src/openclaw-core/` | openclaw/openclaw | Cloned (shallow, 13,734 files) |
| `/c/src/openclaw-clawhub/` | openclaw/clawhub | Cloned (shallow) — API, schema, publishing |

## To Clone (for deeper analysis)

```bash
cd /c/src
git clone --depth 1 https://github.com/openclaw/openclaw.git openclaw-core
git clone --depth 1 https://github.com/openclaw/skills.git openclaw-skills-archive
git clone --depth 1 https://github.com/openclaw/clawhub.git openclaw-clawhub
git clone --depth 1 https://github.com/slowmist/openclaw-security-practice-guide.git openclaw-security-guide
```
