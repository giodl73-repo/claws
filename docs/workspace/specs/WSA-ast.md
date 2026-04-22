# WSA — Workspace AST

**Sub-spec of**: [WS-workspace.md](./WS-workspace.md)

## Typed AST shape

```ts
interface WorkspaceAST {
  readonly agentsMd: AgentsFile | null;
  readonly toolsMd: ToolsFile | null;
  readonly claudeMd: PromptFile | null;
  readonly claws: ClawsJson | null;
  readonly skills: SkillsDir | null;
  readonly hooks: HooksConfig | null;
  readonly commands: CommandsDir | null;
  readonly scripts: ScriptsDir | null;
  readonly readme: PromptFile | null;
  readonly unknownFiles: ReadonlyArray<UnknownFile>;
}
```

Each of the 9 top-level slots is **optional** — a workspace missing
`TOOLS.md` yields `toolsMd: null`, not an error. Consumers that need a
specific file assert presence explicitly.

`unknownFiles` captures any file the parser does not recognise. The
parser is open-ended: it preserves unknown files verbatim so the
emitter can round-trip them (see [WSE-emitter.md](./WSE-emitter.md)).

## Markdown file contract

AGENTS.md, CLAUDE.md, and README.md are **open-ended markdown**, not
rigid schemas. The parser tokenises them into a paragraph-level
structure (`{ heading?, body, sourceRange }[]`) sufficient for
line-addressable edits, but does NOT impose a fixed section set. A
workspace that invents a new section is valid; tools that expect a
specific section look it up by heading text and handle absence.

## TOOLS.md schema

TOOLS.md IS a rigid schema — it declares the tools a policy compiles.
The parser validates:

- Heading hierarchy: `## {tool-name}` at H2, `### args_from` optional
- Risk tier annotation: `<!-- risk:R1 -->` through `<!-- risk:R5 -->`
- Classification chain: `args_from: {other-tool}` produces a G-CHAIN
  edge (see policy spec `POC-compiler.md`)

Malformed TOOLS.md → `ToolsFileParseError { reason, sourceRange }`.

## Traversal API

```ts
function walkAst(ast: WorkspaceAST, visitor: AstVisitor): void;
```

Visitor methods: `visitAgentsMd`, `visitToolsMd`, etc. Return `false`
from any visitor to stop the walk. Source ranges are stable across
parse+emit round-trips — linters can use them to point at the exact
byte offset of a finding.
