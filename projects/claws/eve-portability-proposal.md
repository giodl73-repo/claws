# Claws <> Eve portability proposal

Date: 2026-08-21

## Proposal

Add a non-normative Claws <> Eve portability appendix to RFC 0016 after the
current Claws contract is accepted. The appendix should define a narrow mapping
between a portable Claw package and an Eve agent/template project, then validate
the mapping with one bidirectional demo:

1. Port Eve's Marketing Team template into an Awesome Claws package.
2. Port one manager-Claw pattern, preferably Delegation Coordinator or Work
   Chief of Staff, into an Eve team-style template.

This should be framed as a harness portability profile, not as a requirement
that Eve implement OpenClaw internals or that Claws adopt Eve runtime shape.

## Why now

Eve's public template shape overlaps with the strongest recent Claws work:

- Eve templates are deployable agent projects with instructions, channels,
  connections, tools, skills, and subagents.
- Eve's Marketing Team template uses a lead that routes to specialists for
  product marketing, content, social, SEO, and email, with human approval before
  irreversible publication or sending.
- Eve supports dynamic instructions, which makes the older concern about
  Claws-managed files such as `SOUL.md`, `AGENTS.md`, schemas, templates, and
  handoff docs less likely to be a structural blocker.

The Claws side now has enough proof to make the bridge concrete: Awesome Claws
has 66 packages, a contribution admission flow, regression contracts, real
screenshots, catalog explorer output, and manager/capstone Claws that already
coordinate specialist artifacts while preserving human authority.

## Proposed mapping

| Claws concept | Eve concept | Notes |
| --- | --- | --- |
| `CLAW.md` manifest and prompt body | `agent/agent.ts` plus `agent/instructions.md` | Preserve package identity, owner-visible purpose, and setup/authority summary. |
| Installed `SOUL.md` and `workspace/AGENTS.md` | Dynamic instructions and file-backed instructions | Treat as managed instruction sources, not opaque runtime state. |
| `schemas/`, `templates/`, `fixtures/`, handoff docs | Eve skills/reference files, Blob-backed state, or sandbox files | Keep schemas/templates portable and deterministic where possible. |
| `profiles/openclaw.yml` and capabilities | Eve tools, connections, channels, and approval gates | Must preserve least privilege and blocked-action disclosure. |
| Claw preview/apply consent plan | Eve human-in-the-loop approval surface | Irreversible sends, publishes, deletes, broker actions, bookings, and calendar mutations need exact owner approval. |
| Delegation Coordinator / Work Chief / Household Steward | Eve lead plus subagents | Lead routes work; specialists return artifacts; manager does not silently broaden specialist authority. |
| Awesome Claws regression and screenshot proof | Eve template validation/deploy diagnostics | The bridge should include conformance checks, not just a conversion script. |

## Likely pain points

1. **Instruction ownership:** Claws distinguish package-managed instructions
   from user-edited local preferences. Eve dynamic instructions can likely
   express this, but the mapping must preserve which text is managed, local, or
   runtime-generated.
2. **Resource materialization:** Claws package schemas, fixtures, and handoff
   templates as portable files. Eve may place equivalent material in skills,
   references, Blob state, or sandbox files; the bridge needs stable names and
   update semantics.
3. **Authority and consent:** This is the hardest boundary. Claws require exact
   preview and consent for capabilities, workspace effects, schedules, MCP
   arguments, and irreversible actions. Eve templates already use approval gates,
   but a spec must define what cannot be collapsed into a generic "tool access"
   statement.
4. **Subagent isolation:** Eve's lead/specialist model is close to manager
   Claws, but Claws proof depends on fresh bounded briefs, provenance, result
   ownership, and no unbounded recursive delegation.
5. **State and updates:** A Claw update must not silently widen capability or
   overwrite user-owned preferences. Eve template updates and deployed project
   changes need equivalent drift and review behavior for portability.
6. **Proof parity:** A bridge should prove package parse, conversion, preview,
   blocked actions, and one real template run. Without that, portability becomes
   a marketing claim rather than a contract.

## Suggested first demos

### Eve to Claw

Port the Eve Marketing Team template into an Awesome Claws package:

- Lead: marketing-team lead.
- Specialists: product marketer, content marketer, social media coordinator,
  SEO, email.
- Shared state: brand context document.
- Connections: Notion, Typefully, Resend, Slack as declared optional
  dependencies.
- Boundaries: no scheduled publish, send, delete, page move, or campaign launch
  without explicit owner approval.

### Claw to Eve

Port Delegation Coordinator or Work Chief of Staff into an Eve template:

- The lead creates self-contained briefs.
- Specialists run in fresh sessions.
- Results come back as artifacts with source/provenance references.
- The lead synthesizes conflicts and questions but does not make the final
  commitment for the accountable owner.

## Non-goals

- Do not make RFC 0016 depend on Eve.
- Do not require Eve to implement OpenClaw's SQLite lifecycle or exact package
  installer.
- Do not weaken Claws consent and provenance to fit a simpler template model.
- Do not claim automatic bidirectional conversion until at least one template
  runs through proof.

## Links

- RFC 0016 PR: https://github.com/openclaw/rfcs/pull/48
- Eve dynamic instructions: https://eve.dev/docs/instructions#dynamic-instructions
- Eve templates: https://eve.dev/templates
- Eve Marketing Team template: https://eve.dev/templates/marketing-team-eve-template
- Awesome Claws manager set: https://github.com/giodl73-repo/awesome-claws/pull/25
- Household Steward: https://github.com/giodl73-repo/awesome-claws/pull/48
- Work Chief of Staff: https://github.com/giodl73-repo/awesome-claws/pull/50
- Care/Sports/Stocks draft: https://github.com/giodl73-repo/awesome-claws/pull/51
