# Agent Memory in Apps & Agents: Paper Outline

## Purpose

Prepare the July 6, 2026 XAI Harness / Tools / Skills presentation:

> Agent Memory in Apps & Agents: State of the Art and Microsoft's Path Forward

The paper should describe the industry landscape, assess current architectures
such as Claude Code, OpenClaw, Hermes, and Microsoft Apps & Agents, then propose
a direction for shared memory services that can travel with a user across
Microsoft agent experiences.

## Work-Back

| Date | Output |
| --- | --- |
| 2026-06-23 | Reviewable outline |
| 2026-06-26 | First draft paper |
| 2026-06-29 to 2026-07-03 | Iteration window |
| 2026-07-06 | Presentation to Apps and Agent LT |

## Proposed Paper Shape

1. Executive summary
   - Memory is becoming foundational for long-horizon agents.
   - The current landscape is fragmented across local files, vector indexes,
     app-specific state, and emerging memory services.
   - Microsoft can differentiate with a governed shared memory substrate that
     spans Apps, Agents, MCS, Scout, and future harnesses.

2. Vocabulary and design dimensions
   - Working context vs durable memory.
   - Episodic memory, semantic memory, preferences, commitments, skills, and
     knowledge bases.
   - Agent-private, app-private, team/shared, and user-global scopes.
   - Recall-time injection vs tool-mediated retrieval vs autonomous memory
     agents.

3. Industry and peer landscape
   - Claude Code: repo-local instructions and resumable agent context; validate
     current memory specifics before citing.
   - OpenClaw: file-backed durable memory, SQLite/hybrid retrieval, pluggable
     memory backends, active memory, and memory wiki layer.
   - Hermes: validate architecture and ownership before citing.
   - Cowork/MCS/Scout: internal Microsoft inventory required.

4. OpenClaw architecture case study
   - User-editable durable memory in `MEMORY.md` and `memory/*.md`.
   - Default `memory-core` backend with SQLite, FTS5/BM25, embeddings, hybrid
     ranking, optional sqlite-vec.
   - QMD sidecar backend for local-first advanced retrieval, reranking, query
     expansion, extra paths, and transcript indexing.
   - Active Memory plugin: blocking recall sub-agent for eligible interactive
     persistent sessions.
   - Dreaming and Memory Wiki as consolidation/provenance layers.
   - Security boundary: workspace memory files are trusted operator state, not
     an adversarial sandbox.

5. Microsoft current-state inventory
   - Apps memory capabilities by product and user scope.
   - Agent framework/harness memory primitives.
   - Existing compliance and governance systems that must own policy.
   - Gaps: cross-app portability, provenance, user controls, consent, audit,
     conflict handling, and retention.

6. Design principles for a unified memory ecosystem
   - Durable, inspectable, and user-controllable.
   - Scoped by user, tenant, app, agent, channel, and purpose.
   - Retrieval as a policy-governed service, not hidden prompt glue.
   - Explicit provenance and source freshness.
   - Strong delete/export/retention semantics.
   - Memory writes should have trust levels and promotion gates.
   - Shared substrate should support private app memory and user-global memory.

7. Proposed Microsoft direction
   - Memory service with typed records, embeddings, retrieval, policy checks,
     lifecycle management, and audit.
   - Client SDK / agent runtime contract for write, search, get, update,
     suppress, delete, and cite.
   - Per-experience recall adapters that translate shared memory into the local
     agent's prompt/tool model.
   - Initial POC: global user memory between MCS and Scout with narrow schema
     for preferences, working commitments, and durable project facts.

8. Risks and open questions
   - Privacy surprises from cross-experience memory.
   - Over-recall, stale recall, and false personalization.
   - Enterprise data boundaries and tenant policy conflicts.
   - Identity linking across app surfaces and delegated agents.
   - Memory poisoning and source authority.
   - Latency/cost of recall in interactive paths.

## First-Draft Inputs Needed

| Input | Owner / source | Status |
| --- | --- | --- |
| Cowork memory strategy summary | Gio / Eduardo / Omar thread | Needed |
| MCS memory/state architecture | MCS owner | Needed |
| Scout memory/state architecture | Scout owner | Needed |
| Hermes memory architecture | Hermes owner | Needed |
| Microsoft Apps & Agents memory inventory | Selcuk / topic team | Needed |
| OpenClaw source-grounded assessment | `openclaw-memory-assessment.md` | Seeded |

## POC Candidate: MCS + Scout Global User Memory

Start deliberately narrow:

- Shared record types: user preferences, durable project facts, explicit
  user-approved commitments.
- Scope: single test tenant, named users, explicit opt-in, transparent recall
  diagnostics.
- Access model: agent/app declares purpose and receives policy-filtered
  results, with citations/provenance.
- Write model: explicit user confirmation or high-confidence promoted summaries
  with review/delete support.
- Success metrics: useful recall rate, false recall rate, latency, user trust,
  admin policy coverage, export/delete correctness.
