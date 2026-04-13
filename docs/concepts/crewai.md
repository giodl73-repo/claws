# Platform: CrewAI

<!-- atom:platform-crewai (C11) -->

## Overview

CrewAI is a multi-agent orchestration framework with hierarchical delegation. claws detects CrewAI workspaces via configuration files (`crewai.yaml`, `crew.yaml`, or `pyproject.toml` with CrewAI sections), emits Python guard code using the shared guard package, and maps CrewAI's delegation model to claws's A2A governance rules. Memory governance from `MEMORY.md` is also translated to CrewAI's memory system.

---

## Detection

CrewAI detection checks multiple configuration filenames because the framework's config format has evolved:

| Marker | Status |
|--------|--------|
| `crewai.yaml` | Current primary config |
| `crew.yaml` | Known alternative filename |
| `pyproject.toml` (with `[tool.crewai]`) | Package-embedded config |

P-242 (CrewAI config format evolution breaks detection) drives the multi-filename approach. Hardcoding a single filename would cause detection failures when CrewAI changes conventions. claws checks all known filenames and raises a diagnostic if multiple are present with conflicting content.

The `targets.crewai.version` field in `claws.json` enables version-targeted emission, so claws generates config compatible with the specific CrewAI release the developer uses.

---

## Delegation Mapping

CrewAI's core feature is hierarchical delegation -- a manager agent delegates tasks to worker agents. claws maps this to the A2A governance model:

| CrewAI concept | claws governance rule |
|----------------|----------------------|
| Manager delegates to worker | G-A2A-DELEGATE with per-tool ceiling |
| Worker uses tool | G-A2A-TRUST with delegation-only trust level |
| Hierarchical crew | Delegation depth limit (default 10) |
| Task routing | Delegation map with per-invocation check |

**Hierarchical delegation cycle detection**: CrewAI allows complex delegation chains. claws's compile-time analysis detects cycles in the delegation graph that would cause infinite task forwarding. A cycle is a compile-time error, not a warning.

**Per-tool delegation ceiling**: delegation ceilings are applied per tool, not per risk level. A manager may delegate R3 tools but not R5 tools to the same worker. This granularity prevents the implicit-all-delegation pitfall (P-208) where `tools: all` silently includes R5/OBO tools.

---

## Guard Config Location

CrewAI guard configuration can be placed in a separate file or injected into the existing CrewAI config. claws defaults to a separate guard config file (`.claws/crewai/guards.py`) to maintain the lossless guarantee -- the original `crewai.yaml` is never modified. The guard file is imported by the developer's crew definition.

---

## Memory Governance

CrewAI supports agent memory (short-term, long-term, entity memory). claws maps `MEMORY.md` governance rules to CrewAI's memory system:

| MEMORY.md directive | CrewAI enforcement |
|--------------------|-------------------|
| Data classification labels | Memory partition by classification level |
| Retention policy | Memory TTL configuration |
| Cross-agent memory sharing | Memory scope restricted to delegation chain |

Memory governance prevents a worker agent from reading memory entries written by agents outside its delegation chain. This maps to the G-A2A-FLOW transitive label propagation model -- data classification flows through the delegation graph.

---

## Python Guard Package

CrewAI shares the `claws-guard` Python package with LangGraph. The same `@before_tool` decorator, deny/allow/elicit primitives, and audit logging work across both frameworks. Framework-specific adapters handle the differences in tool invocation mechanics.

```python
from claws_guard import before_tool, deny
from claws_guard.crewai import crew_context

@before_tool("send_slack_message")
def guard_slack(ctx):
    crew = crew_context(ctx)
    if crew.delegation_depth > crew.max_depth:
        return deny(reason="Delegation depth exceeded")
```

---

## Scenario Sources

- **S07**: CrewAI detection, delegation mapping, memory governance
- **S07-F05**: CrewAI config format evolution breaks detection (P-242)
- **S07-F07**: Tool extraction from crewai.yaml (note, skipped)
- **S07-F09**: CrewAI memory governance mapping (note, skipped)
- Platform-detection FINDINGS-APPLIED.md: CL-04 (hierarchical cycle detection, guard config location, memory governance mapping), CL-06 (shared Python guard package, per-platform OBO context), CL-01 (config filename variants, version field)

---

## Related Concepts

- [LangGraph](langgraph.md) -- shares the Python guard package
- [A2A Boundary](../governance/a2a-boundary.md) -- trust taxonomy and delegation rules
- [Fleet Security](../fleet/fleet-security.md) -- cross-workspace delegation concerns
