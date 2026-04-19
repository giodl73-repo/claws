// AUTO-GENERATED — do not edit by hand.
// Regenerate with: node scripts/generate-grammars.mjs
//
// Source: design/astro/grammars/openclaw-*.peg (11 files)
// Each grammar is embedded verbatim as a string constant.

export type WorkspaceFileKind =
  | 'agents'
  | 'config'
  | 'entities'
  | 'governance'
  | 'memory'
  | 'roles'
  | 'skills'
  | 'soul'
  | 'tasks'
  | 'tools'
  | 'workflows';

export const WORKSPACE_FILE_KINDS: readonly WorkspaceFileKind[] = [
  'agents',
  'config',
  'entities',
  'governance',
  'memory',
  'roles',
  'skills',
  'soul',
  'tasks',
  'tools',
  'workflows',
] as const;

export const grammars: Record<WorkspaceFileKind, string> = {
  agents: `# openclaw-agents.peg — Tier 3 PEG Grammar for OpenClaw AGENTS.md format
#
# NOTE: This grammar describes claws init --template emitter output.
#       Parsers accept broader input (nested lists, comma-separated, prose).
#
# Parent grammars: none (standalone section format)
#
# Authority: This grammar defines the OpenClaw AGENTS.md format
#            (Spec 103 §3.7). The emitter in
#            compiler-sdk/src/astro/emit/platforms/openclaw/oc-emit-agents.ts
#            MUST conform to this grammar.
#
# Ordered choice convention: PEG \`/\` is ordered (first match wins).
#   Agent fields: required (description, model) before optional.
#
# Authority hierarchy: design/astro/grammars/openclaw-agents.peg (this file)
#   > compiler-sdk/src/astro/emit/platforms/openclaw/oc-emit-agents.ts
#
# ReDoS safe: YES — line-oriented, no nested quantifiers.
#
# Known Divergences: none
# ---

# ── Top-level ────────────────────────────────────────────────────────────
# AGENTS.md: one or more agent sections, each with ## heading.

OCAgents        <- BlankLine* AgentSection (BlankLine+ AgentSection)* BlankLine* !.

# ── Agent Section ────────────────────────────────────────────────────────
# Each agent: ## Title Case Name, followed by key-value fields.

AgentSection    <- AgentHeading BlankLine* AgentField+
AgentHeading    <- '## ' AgentName EOL
AgentName       <- (!EOL .)+

# ── Agent Fields ─────────────────────────────────────────────────────────
# Dash-prefixed key: value lines. Tools use nested sub-list.

AgentField      <- DescriptionField / ModelField / ToolsField
                 / WorkingDirField / CustomInstrField
                 / GenericField

DescriptionField   <- '- description: ' FieldValue EOL
ModelField         <- '- model: ' FieldValue EOL
WorkingDirField    <- '- working_directory: ' FieldValue EOL
CustomInstrField   <- '- custom_instructions: ' FieldValue EOL

# ── Tools list ───────────────────────────────────────────────────────────
# Nested list under "- tools:" key.

ToolsField      <- '- tools:' EOL ToolItems
ToolItems       <- ToolItem+
ToolItem        <- SP+ '- ' FieldValue EOL

# ── Generic field ────────────────────────────────────────────────────────
# Extensibility: any dash-prefixed key: value line.

GenericField    <- '- ' KeyName ':' SP* FieldValue EOL
KeyName         <- [a-zA-Z_] [a-zA-Z0-9_-]*

# ── Value types ──────────────────────────────────────────────────────────

FieldValue      <- (!EOL .)+

# ── Terminals ────────────────────────────────────────────────────────────

BlankLine       <- SP* EOL
SP              <- ' ' / '\\t'
EOL             <- '\\r\\n' / '\\n' / '\\r' / !.
`,
  config: `# openclaw-config.peg — Tier 3 PEG Grammar for OpenClaw openclaw.json format
#
# Parent grammars: config-section.peg (Tier 1)
#
# Authority: This grammar specializes config-section.peg for the OpenClaw
#            openclaw.json project config (Spec 103 §4.1). The emitter in
#            compiler-sdk/src/astro/emit/platforms/openclaw/oc-emit-config.ts
#            MUST conform to this grammar.
#
# Ordered choice convention: PEG \`/\` is ordered (first match wins).
#   Top-level keys: structured keys before opaque passthrough.
#
# Authority hierarchy: design/astro/grammars/openclaw-config.peg (this file)
#   > design/astro/grammars/config-section.peg (Tier 1 parent)
#   > compiler-sdk/src/astro/emit/platforms/openclaw/oc-emit-config.ts
#
# ReDoS safe: YES — JSON structure is parsed by language-specific parser.
#   This grammar describes the expected shape, not recursive JSON parsing.
#
# Known Divergences: none
# ---

# ── Top-level ────────────────────────────────────────────────────────────
# openclaw.json: JSON object with structured project configuration.

OCConfig        <- SP* '{' BlankLine* ConfigField* SP* '}' BlankLine* !.

# ── Config fields ────────────────────────────────────────────────────────
# Known structured keys. JSON parsing is delegated to JSON.parse;
# this grammar documents the expected key schema.

ConfigField     <- NameField / VersionField / ModelField / OptLevelField
                 / RoutingField / AgentsField / SecurityField / RuntimeField
                 / OpaqueField / BlankLine

NameField       <- SP* '"name"' SP* ':' SP* JsonString Comma? EOL
VersionField    <- SP* '"version"' SP* ':' SP* JsonString Comma? EOL
ModelField      <- SP* '"model"' SP* ':' SP* JsonString Comma? EOL
OptLevelField   <- SP* '"opt_level"' SP* ':' SP* JsonNumber Comma? EOL
RoutingField    <- SP* '"routing"' SP* ':' SP* JsonValue Comma? EOL
AgentsField     <- SP* '"agents"' SP* ':' SP* JsonValue Comma? EOL
SecurityField   <- SP* '"security"' SP* ':' SP* JsonValue Comma? EOL
RuntimeField    <- SP* '"runtime"' SP* ':' SP* JsonValue Comma? EOL

OpaqueField     <- SP* JsonString SP* ':' SP* JsonValue Comma? EOL

# ── JSON primitives ──────────────────────────────────────────────────────
# Simplified JSON value recognition (full parsing delegated to JSON.parse).

JsonValue       <- JsonString / JsonNumber / JsonBool / JsonNull
                 / JsonObject / JsonArray
JsonString      <- '"' (!'"' .)* '"'
JsonNumber      <- '-'? [0-9]+ ('.' [0-9]+)?
JsonBool        <- 'true' / 'false'
JsonNull        <- 'null'
JsonObject      <- '{' (!'}' .)* '}'
JsonArray       <- '[' (!']' .)* ']'
Comma           <- SP* ','

# ── Terminals ────────────────────────────────────────────────────────────

BlankLine       <- SP* EOL
SP              <- ' ' / '\\t'
EOL             <- '\\r\\n' / '\\n' / '\\r' / !.
`,
  entities: `# openclaw-entities.peg — Tier 3 PEG Grammar for OpenClaw entity sections
#
# Parent grammars: entity-block.peg (Tier 1)
#
# Authority: This grammar specializes entity-block.peg for OpenClaw's
#            entity definitions within workspace documents. Entities in
#            OpenClaw follow the same H2 + bold-label pattern as Tier 1
#            but are constrained to OC-specific source types and field
#            conventions.
#
# Ordered choice convention: PEG \`/\` is ordered (first match wins).
#   Source types: OC-specific (dataverse, sharepoint, m365) before generic.
#
# Authority hierarchy: design/astro/grammars/openclaw-entities.peg (this file)
#   > design/astro/grammars/entity-block.peg (Tier 1 parent)
#
# ReDoS safe: YES — line-oriented, no nested quantifiers.
#
# Known Divergences: none
# ---

# ── Top-level ────────────────────────────────────────────────────────────
# OpenClaw entity: H2 heading + description + labels + optional fields.

OCEntity        <- BlankLine* EntityHeading BlankLine* Description? LabelSection* FieldSection? BlankLine* !.

# ── Heading ──────────────────────────────────────────────────────────────

EntityHeading   <- '## ' EntityName EOL
EntityName      <- (!EOL .)+

# ── Description ──────────────────────────────────────────────────────────

Description     <- DescLine+
DescLine        <- !BoldLabelStart !HeadingStart !BulletStart NonBlankLine

# ── Label sections ───────────────────────────────────────────────────────
# OC entities use Source, Type, Key, Constraints labels.

LabelSection    <- SourceLabel / TypeLabel / KeyLabel / ConstraintLabel
                 / GenericBoldLabel / BlankLine

SourceLabel     <- '**Source**:' SP* OCSourceValue EOL
OCSourceValue   <- DataverseSource / M365Source / ApiSource / RawSource
DataverseSource <- 'dataverse' (SP+ (!EOL .)+)?
M365Source      <- ('sharepoint' / 'teams' / 'email' / 'm365') (SP+ (!EOL .)+)?
ApiSource       <- ('api' / 'graphql' / 'rest' / 'database') (SP+ (!EOL .)+)?
RawSource       <- (!EOL .)+

TypeLabel       <- '**Type**:' SP* TypeValue EOL
TypeValue       <- 'record' / 'event' / 'aggregate' / 'reference' / 'view'
                 / (!EOL .)+

KeyLabel        <- '**Key**:' SP* CommaSepList EOL
ConstraintLabel <- '**Constraints**:' SP* ProseValue EOL

# ── Field section ────────────────────────────────────────────────────────

FieldSection    <- FieldHeading BlankLine* FieldList
FieldHeading    <- H3 'Fields' ':'? EOL
FieldList       <- (FieldItem / BlankLine)*
FieldItem       <- BulletMarker SP+ FieldName SP* '(' FieldType ')' FieldDesc? EOL
                 / BulletMarker SP+ FieldName SP* FieldDesc? EOL
FieldName       <- [a-zA-Z_] [a-zA-Z0-9_.-]*
FieldType       <- (!(')' / EOL) .)+
FieldDesc       <- SP* ('—' / '--' / '-') SP* (!EOL .)+

# ── Shared ───────────────────────────────────────────────────────────────

GenericBoldLabel <- '**' LabelName '**:' SP* ProseValue EOL
LabelName       <- (!('**') .)+
CommaSepList    <- ValueItem (',' SP* ValueItem)*
ValueItem       <- (!(',' / EOL) .)+
ProseValue      <- (!EOL .)*
BoldLabelStart  <- '**' (!('**') .)+ '**:'
HeadingStart    <- '#'+ SP
BulletStart     <- BulletMarker SP+
BulletMarker    <- '-' / '*'
H3              <- '### ' SP*
NonBlankLine    <- (!EOL .)+ EOL
BlankLine       <- SP* EOL
SP              <- ' ' / '\\t'
EOL             <- '\\r\\n' / '\\n' / '\\r' / !.
`,
  governance: `# openclaw-governance.peg — Tier 3 PEG Grammar for OpenClaw governance sections
#
# Parent grammars: task-block.peg (Tier 1), tool-grant.peg (Tier 1)
#
# Authority: This grammar specializes policy-block.ts and tool-grant.peg
#            for OpenClaw governance: policies, permissions, and security
#            boundaries. Governance combines policy rules with tool grants
#            and security configuration.
#
# Ordered choice convention: PEG \`/\` is ordered (first match wins).
#   Section types: policies before permissions before config.
#
# Authority hierarchy: design/astro/grammars/openclaw-governance.peg (this file)
#   > design/astro/grammars/task-block.peg (Tier 1 parent)
#   > design/astro/grammars/tool-grant.peg (Tier 1 parent)
#   > compiler-sdk/src/astro/forma/primitives/policy-block.ts
#
# ReDoS safe: YES — line-oriented, no nested quantifiers.
#
# Known Divergences: none
# ---

# ── Top-level ────────────────────────────────────────────────────────────
# Governance: H2 sections for policies, permissions, and security config.

OCGovernance    <- BlankLine* GovernanceSection+ BlankLine* !.

# ── Section dispatch ─────────────────────────────────────────────────────

GovernanceSection <- PolicySection / PermissionSection / SecuritySection
                   / GenericSection / BlankLine

# ── Policy section ───────────────────────────────────────────────────────
# Numbered policy items with condition/action labels.

PolicySection   <- PolicyHeading BlankLine* PolicyItem+
PolicyHeading   <- '## ' 'Policies' EOL

PolicyItem      <- NumberedH3 BlankLine* PolicyBody BlankLine*
NumberedH3      <- '### ' PolicyNumber '. ' PolicyName EOL
PolicyNumber    <- [0-9]+
PolicyName      <- (!EOL .)+

PolicyBody      <- (PolicyLabel / BlankLine)*
PolicyLabel     <- ConditionLabel / ActionLabel / ScopeLabel
                 / SeverityLabel / GenericBoldLabel

ConditionLabel  <- '**' ConditionKey '**:' SP* ProseValue EOL
ConditionKey    <- 'Condition' / 'When'
ActionLabel     <- '**' ActionKey '**:' SP* ProseValue EOL
ActionKey       <- 'Action' / 'Then'
ScopeLabel      <- '**Scope**:' SP* ProseValue EOL
SeverityLabel   <- '**Severity**:' SP* SeverityValue EOL
SeverityValue   <- 'error' / 'warning' / 'info'

# ── Permission section ───────────────────────────────────────────────────
# Tool permission grants (reuses tool-grant.peg structure).

PermissionSection <- PermissionHeading BlankLine* PermissionItem+
PermissionHeading <- '## ' 'Permissions' EOL

PermissionItem  <- PermItemHeading BlankLine* PermItemBody BlankLine*
PermItemHeading <- '### ' ToolRef EOL
ToolRef         <- (!EOL .)+

PermItemBody    <- (PermLabel / BlankLine)*
PermLabel       <- PermissionLabel / PermScopeLabel / GenericBoldLabel

PermissionLabel <- '**Permission**:' SP* PermissionValue EOL
PermissionValue <- 'deny' / 'read-only' / 'execute' / 'allow'
PermScopeLabel  <- '**Scope**:' SP* ScopeValue EOL
ScopeValue      <- RoleScope / TaskScope / WorkspaceScope / RawScope
RoleScope       <- 'role:' ScopeTarget
TaskScope       <- 'task:' ScopeTarget
WorkspaceScope  <- 'workspace'
ScopeTarget     <- [a-zA-Z0-9_-]+
RawScope        <- (!EOL .)+

# ── Security section ─────────────────────────────────────────────────────

SecuritySection <- SecurityHeading BlankLine* SecurityBody
SecurityHeading <- '## ' 'Security' EOL
SecurityBody    <- (SecurityLabel / BlankLine)*
SecurityLabel   <- ClassLabel / TrustLabel / GenericBoldLabel

ClassLabel      <- '**Classification**:' SP* ClassValue EOL
ClassValue      <- 'public' / 'internal' / 'confidential' / 'restricted'
TrustLabel      <- '**Trust**:' SP* TrustValue EOL
TrustValue      <- 'trusted' / 'untrusted' / 'sandboxed'

# ── Generic fallback ─────────────────────────────────────────────────────

GenericSection  <- H2 HeadingText EOL SectionBody
SectionBody     <- (!H2Start AnyLine)*

# ── Shared ───────────────────────────────────────────────────────────────

GenericBoldLabel <- '**' LabelName '**:' SP* ProseValue EOL
LabelName       <- (!('**') .)+
ProseValue      <- (!EOL .)+
HeadingText     <- (!EOL .)+
AnyLine         <- (!EOL .)* EOL
H2              <- '## ' SP*
H2Start         <- '## '
BlankLine       <- SP* EOL
SP              <- ' ' / '\\t'
EOL             <- '\\r\\n' / '\\n' / '\\r' / !.
`,
  memory: `# openclaw-memory.peg — Tier 3 PEG Grammar for OpenClaw MEMORY.md format
#
# Parent grammars: memory-block.peg (Tier 1), frontmatter.peg (Tier 1)
#
# Authority: This grammar specializes memory-block.peg for the OpenClaw
#            memory format (Spec 103 §7.1). The emitter in
#            compiler-sdk/src/astro/emit/platforms/openclaw/oc-emit-memory.ts
#            MUST conform to this grammar.
#
# Ordered choice convention: PEG \`/\` is ordered (first match wins).
#   Scope values: most-specific first.
#
# Authority hierarchy: design/astro/grammars/openclaw-memory.peg (this file)
#   > design/astro/grammars/memory-block.peg (Tier 1 parent)
#   > compiler-sdk/src/astro/emit/platforms/openclaw/oc-emit-memory.ts
#
# ReDoS safe: YES — line-oriented, no nested quantifiers.
#
# Known Divergences: none
# ---

# ── Top-level ────────────────────────────────────────────────────────────
# MEMORY.md: optional frontmatter + H2 memory entry sections.
# Ephemeral: memory/{key}.md files follow the same section structure.

OCMemory        <- BlankLine* Frontmatter? BlankLine* MemoryEntry+ BlankLine* !.

# ── Frontmatter ─────────────────────────────────────────────────────────
# Optional YAML frontmatter for file-level scope.

Frontmatter     <- FenceOpen FrontmatterBody FenceClose
FenceOpen       <- '---' EOL
FenceClose      <- '---' EOL
FrontmatterBody <- ScopeKey*
ScopeKey        <- 'scope:' SP* ScopeValue EOL

# ── Memory entry ─────────────────────────────────────────────────────────
# H2 heading + prose content. Key derived from heading (title-to-kebab).

MemoryEntry     <- EntryHeading BlankLine* EntryContent BlankLine*
EntryHeading    <- '## ' EntryName EOL
EntryName       <- (!EOL .)+

EntryContent    <- (!H2Start ContentLine)*
ContentLine     <- (!EOL .)* EOL

# ── Scope values ─────────────────────────────────────────────────────────
# 5-tier scope system: project > wave > role > task > ephemeral

ScopeValue      <- 'project' / 'wave' / 'role' / 'task' / 'ephemeral'
                 / (!EOL .)+                           # extensible fallback

# ── Terminals ────────────────────────────────────────────────────────────

H2Start         <- '## '
BlankLine       <- SP* EOL
SP              <- ' ' / '\\t'
EOL             <- '\\r\\n' / '\\n' / '\\r' / !.
`,
  roles: `# openclaw-roles.peg — Tier 3 PEG Grammar for OpenClaw AGENTS.md format
#
# Parent grammars: role-block.peg (Tier 1)
#
# Authority: This grammar specializes role-block.peg for the OpenClaw
#            AGENTS.md format (Spec 103 §3.7). The emitter in
#            compiler-sdk/src/astro/emit/platforms/openclaw/oc-emit-agents.ts
#            MUST conform to this grammar.
#
# Ordered choice convention: PEG \`/\` is ordered (first match wins).
#   Agent fields: structured keys (description, model, tools) before generic.
#
# Authority hierarchy: design/astro/grammars/openclaw-roles.peg (this file)
#   > design/astro/grammars/role-block.peg (Tier 1 parent)
#   > compiler-sdk/src/astro/emit/platforms/openclaw/oc-emit-agents.ts
#
# ReDoS safe: YES — line-oriented, no nested quantifiers.
#
# Known Divergences: none
# ---

# ── Top-level ────────────────────────────────────────────────────────────
# AGENTS.md contains one or more H2 agent sections.

OCAgents        <- BlankLine* AgentSection+ BlankLine* !.

# ── Agent section ────────────────────────────────────────────────────────
# Each agent: H2 heading + bullet list of key-value fields.

AgentSection    <- AgentHeading BlankLine* AgentBody BlankLine*
AgentHeading    <- '## ' AgentName EOL
AgentName       <- (!EOL .)+

# ── Agent body ───────────────────────────────────────────────────────────
# Structured bullet fields in YAML-like list format.

AgentBody       <- AgentField*
AgentField      <- DescField / ModelField / ToolsField
                 / WorkDirField / CustomField / GenericField / BlankLine

DescField       <- BulletMarker SP+ 'description:' SP+ ProseValue EOL
ModelField      <- BulletMarker SP+ 'model:' SP+ ProseValue EOL
WorkDirField    <- BulletMarker SP+ 'working_directory:' SP+ ProseValue EOL
CustomField     <- BulletMarker SP+ 'custom_instructions:' SP+ ProseValue EOL

ToolsField      <- BulletMarker SP+ 'tools:' EOL ToolItems
ToolItems       <- (ToolItem / BlankLine)+
ToolItem        <- SP+ BulletMarker SP+ ProseValue EOL

GenericField    <- BulletMarker SP+ FieldKey ':' SP+ ProseValue EOL
FieldKey        <- [a-zA-Z_] [a-zA-Z0-9_-]*

# ── Shared ───────────────────────────────────────────────────────────────

ProseValue      <- (!EOL .)+
BulletMarker    <- '-' / '*'
BlankLine       <- SP* EOL
SP              <- ' ' / '\\t'
EOL             <- '\\r\\n' / '\\n' / '\\r' / !.
`,
  skills: `# openclaw-skills.peg — Tier 3 PEG Grammar for OpenClaw SKILL.md format
#
# Parent grammars: skill-block.peg (Tier 1), frontmatter.peg (Tier 1)
#
# Authority: This grammar specializes skill-block.peg for the OpenClaw
#            SKILL.md format (Spec 103 §5.1). The emitter in
#            compiler-sdk/src/astro/emit/platforms/openclaw/oc-emit-skill.ts
#            MUST conform to this grammar.
#
# Ordered choice convention: PEG \`/\` is ordered (first match wins).
#   Frontmatter keys: structured keys before opaque passthrough.
#
# Authority hierarchy: design/astro/grammars/openclaw-skills.peg (this file)
#   > design/astro/grammars/skill-block.peg (Tier 1 parent)
#   > compiler-sdk/src/astro/emit/platforms/openclaw/oc-emit-skill.ts
#
# ReDoS safe: YES — line-oriented, no nested quantifiers.
#
# Known Divergences: none
# ---

# ── Top-level ────────────────────────────────────────────────────────────
# OpenClaw skills use YAML frontmatter + markdown body.

OCSkill         <- BlankLine* Frontmatter BlankLine* Body BlankLine* !.

# ── YAML Frontmatter ────────────────────────────────────────────────────
# Delimited by --- lines. Contains structured skill metadata.

Frontmatter     <- FenceOpen FrontmatterBody FenceClose
FenceOpen       <- '---' EOL
FenceClose      <- '---' EOL

FrontmatterBody <- FrontmatterLine*
FrontmatterLine <- NameKey / DescKey / TierKey / ToolsKey / TriggerKey
                 / ParamSetKey / ParamInlineKey / OpaqueKey

NameKey         <- 'name:' SP* QuotedOrBare EOL
DescKey         <- 'description:' SP* QuotedOrBare EOL
TierKey         <- 'tier:' SP* TierValue EOL
TierValue       <- 'T1' / 'T2' / 'T3'
ToolsKey        <- 'tools:' EOL YamlListItems
TriggerKey      <- 'trigger_phrases:' EOL YamlListItems
ParamSetKey     <- 'param_set:' SP* QuotedOrBare EOL
ParamInlineKey  <- 'param_inline:' SP* (!EOL .)+ EOL

OpaqueKey       <- KeyName ':' SP* (!EOL .)* EOL
KeyName         <- [a-zA-Z_] [a-zA-Z0-9_-]*

# ── YAML list items ─────────────────────────────────────────────────────

YamlListItems   <- (YamlListItem / BlankLine)+
YamlListItem    <- SP+ '-' SP+ QuotedOrBare EOL

# ── Body ─────────────────────────────────────────────────────────────────
# Markdown instruction content after frontmatter.

Body            <- BodyLine*
BodyLine        <- (!EOL .)* EOL

# ── Value types ──────────────────────────────────────────────────────────

QuotedOrBare    <- QuotedString / BareValue
QuotedString    <- '"' (!'"' .)* '"' / "'" (!"'" .)* "'"
BareValue       <- (!EOL .)+

# ── Terminals ────────────────────────────────────────────────────────────

BlankLine       <- SP* EOL
SP              <- ' ' / '\\t'
EOL             <- '\\r\\n' / '\\n' / '\\r' / !.
`,
  soul: `# openclaw-soul.peg — Tier 3 PEG Grammar for OpenClaw SOUL.md format
#
# NOTE: This grammar describes claws init --template emitter output.
#       Parsers accept broader input (keyword-anchored, natural language, prose).
#
# Parent grammars: frontmatter.peg (Tier 1)
#
# Authority: This grammar specializes frontmatter.peg for the OpenClaw
#            SOUL.md format (Spec 103 §4.1). The emitter in
#            compiler-sdk/src/astro/emit/platforms/openclaw/oc-emit-soul.ts
#            MUST conform to this grammar.
#
# Ordered choice convention: PEG \`/\` is ordered (first match wins).
#   Top-level: frontmatter before persona body.
#
# Authority hierarchy: design/astro/grammars/openclaw-soul.peg (this file)
#   > design/astro/grammars/frontmatter.peg (Tier 1 parent)
#   > compiler-sdk/src/astro/emit/platforms/openclaw/oc-emit-soul.ts
#
# ReDoS safe: YES — line-oriented, no nested quantifiers.
#
# Known Divergences: none
# ---

# ── Top-level ────────────────────────────────────────────────────────────
# OpenClaw SOUL.md: optional YAML frontmatter, persona body, optional
# ## Boundaries section.

OCSoul          <- BlankLine* Frontmatter? BlankLine* PersonaBody? BlankLine* BoundariesSection? BlankLine* !.

# ── YAML Frontmatter ────────────────────────────────────────────────────
# Optional frontmatter preserves round-trip fidelity (T5 in emitter).

Frontmatter     <- FenceOpen FrontmatterBody FenceClose
FenceOpen       <- '---' EOL
FenceClose      <- '---' EOL

FrontmatterBody <- FrontmatterLine*
FrontmatterLine <- OpaqueKey

OpaqueKey       <- KeyName ':' SP* (!EOL .)* EOL
KeyName         <- [a-zA-Z_] [a-zA-Z0-9_-]*

# ── Persona Body ────────────────────────────────────────────────────────
# Freeform markdown persona text. Stops before ## Boundaries heading.

PersonaBody     <- PersonaLine+
PersonaLine     <- !BoundariesHeading (!EOL .)+ EOL

# ── Boundaries Section ──────────────────────────────────────────────────
# ## Boundaries heading followed by bullet list of boundary items.

BoundariesSection <- BoundariesHeading BlankLine* BoundaryList
BoundariesHeading <- '## Boundaries' EOL
BoundaryList      <- BoundaryItem+
BoundaryItem      <- '- ' BoundaryText EOL
BoundaryText      <- (!EOL .)+

# ── Terminals ────────────────────────────────────────────────────────────

BlankLine       <- SP* EOL
SP              <- ' ' / '\\t'
EOL             <- '\\r\\n' / '\\n' / '\\r' / !.
`,
  tasks: `# openclaw-tasks.peg — Tier 3 PEG Grammar for OpenClaw task sections
#
# Parent grammars: task-block.peg (Tier 1)
#
# Authority: This grammar specializes task-block.peg for OpenClaw task
#            definitions. OC tasks follow the same numbered-H2 + bold-label
#            pattern but are constrained to OC-specific lifecycle labels
#            (boot tasks, heartbeat checks).
#
# Ordered choice convention: PEG \`/\` is ordered (first match wins).
#   Task types: boot/heartbeat before generic task.
#
# Authority hierarchy: design/astro/grammars/openclaw-tasks.peg (this file)
#   > design/astro/grammars/task-block.peg (Tier 1 parent)
#   > compiler-sdk/src/astro/emit/platforms/openclaw/oc-emit-lifecycle.ts
#
# ReDoS safe: YES — line-oriented, no nested quantifiers.
#
# Known Divergences: none
# ---

# ── Top-level ────────────────────────────────────────────────────────────
# OC tasks: lifecycle entries (boot/heartbeat) emitted as H2 sections.

OCTasks         <- BlankLine* Frontmatter? BlankLine* TaskEntry+ BlankLine* !.

# ── Frontmatter ─────────────────────────────────────────────────────────
# HEARTBEAT.md uses TTL in frontmatter.

Frontmatter     <- FenceOpen FrontmatterBody FenceClose
FenceOpen       <- '---' EOL
FenceClose      <- '---' EOL
FrontmatterBody <- TtlKey*
TtlKey          <- 'ttl:' SP* IntValue EOL

# ── Task entry ───────────────────────────────────────────────────────────
# Each lifecycle entry: H2 heading + prose content.

TaskEntry       <- TaskHeading BlankLine* TaskContent BlankLine*

TaskHeading     <- NumberedH2 / PlainH2
NumberedH2      <- '## ' TaskNumber '. ' TaskName EOL
PlainH2         <- '## ' TaskName EOL
TaskNumber      <- [0-9]+
TaskName        <- (!EOL .)+

TaskContent     <- (TaskLabel / ContentLine / BlankLine)*

# ── Labels ───────────────────────────────────────────────────────────────
# OC lifecycle tasks may include role, schedule, and gate labels.

TaskLabel       <- RoleLabel / ScheduleLabel / GateLabel / GenericBoldLabel

RoleLabel       <- '**Role**:' SP* ProseValue EOL
ScheduleLabel   <- '**Schedule**:' SP* ProseValue EOL
GateLabel       <- '**Gate**:' SP* GateValue EOL

GateValue       <- GateCondition (SP* '|' SP* 'Otherwise:' SP* FailurePath)?
GateCondition   <- (!(SP* '|' SP* 'Otherwise:') !EOL .)+
FailurePath     <- (!EOL .)+

# ── Shared ───────────────────────────────────────────────────────────────

GenericBoldLabel <- '**' LabelName '**:' SP* ProseValue EOL
LabelName       <- (!('**') .)+
ContentLine     <- !H2Start !BoldLabelStart (!EOL .)+ EOL
ProseValue      <- (!EOL .)+
IntValue        <- [0-9]+
BoldLabelStart  <- '**' (!('**') .)+ '**:'
H2Start         <- '## '
BlankLine       <- SP* EOL
SP              <- ' ' / '\\t'
EOL             <- '\\r\\n' / '\\n' / '\\r' / !.
`,
  tools: `# openclaw-tools.peg — Tier 3 PEG Grammar for OpenClaw TOOLS.md format
#
# NOTE: This grammar describes claws init --template emitter output.
#       Parsers accept broader input (section format, table format, prose).
#
# Parent grammars: tool-grant.peg (Tier 1), table-extract.peg (Tier 2)
#
# Authority: This grammar specializes tool-grant.peg for the OpenClaw
#            TOOLS.md format (Spec 103 §4.2.5). The emitter in
#            compiler-sdk/src/astro/emit/platforms/openclaw/oc-emit-tools.ts
#            MUST conform to this grammar.
#
# Ordered choice convention: PEG \`/\` is ordered (first match wins).
#
# Authority hierarchy: design/astro/grammars/openclaw-tools.peg (this file)
#   > design/astro/grammars/tool-grant.peg (Tier 1 parent)
#   > design/astro/grammars/table-extract.peg (Tier 2 parent)
#   > compiler-sdk/src/astro/emit/platforms/openclaw/oc-emit-tools.ts
#
# ReDoS safe: YES — line-oriented table row parsing, no nested quantifiers.
#
# Known Divergences: none
# ---

# ── Top-level ────────────────────────────────────────────────────────────
# TOOLS.md: H2 heading + markdown table of tool guidance.

OCTools         <- BlankLine* ToolHeading BlankLine* ToolTable BlankLine* !.

# ── Heading ──────────────────────────────────────────────────────────────

ToolHeading     <- '## ' 'Tool Guidance' EOL

# ── Table ────────────────────────────────────────────────────────────────
# Standard markdown table: header row, separator, data rows.

ToolTable       <- HeaderRow SeparatorRow DataRow*

HeaderRow       <- '|' SP* 'Tool' SP* '|' SP* 'Guidance' SP* '|' EOL
SeparatorRow    <- '|' SepCell '|' SepCell '|' EOL
SepCell         <- SP* '-'+ SP*

DataRow         <- '|' SP* ToolCell SP* '|' SP* GuidanceCell SP* '|' EOL

# ── Cells ────────────────────────────────────────────────────────────────
# Tool name in backticks; guidance is prose (pipes escaped as \\|).

ToolCell        <- '\`' ToolName '\`'
ToolName        <- [a-zA-Z0-9_-]+
GuidanceCell    <- (EscapedPipe / !('|' / EOL) .)*
EscapedPipe     <- '\\\\|'

# ── Terminals ────────────────────────────────────────────────────────────

BlankLine       <- SP* EOL
SP              <- ' ' / '\\t'
EOL             <- '\\r\\n' / '\\n' / '\\r' / !.
`,
  workflows: `# openclaw-workflows.peg — Tier 3 PEG Grammar for OpenClaw workflow sections
#
# Parent grammars: task-block.peg (Tier 1), stage-block.peg (Tier 2)
#
# Authority: This grammar specializes workflow-block.ts for OpenClaw
#            workflow definitions. OC workflows use numbered steps within
#            named spaces, with sequential numbering validation.
#
# Ordered choice convention: PEG \`/\` is ordered (first match wins).
#
# Authority hierarchy: design/astro/grammars/openclaw-workflows.peg (this file)
#   > design/astro/grammars/task-block.peg (Tier 1 parent)
#   > compiler-sdk/src/astro/forma/primitives/workflow-block.ts
#
# ReDoS safe: YES — line-oriented, no nested quantifiers.
#   Step numbering validation is semantic, not syntactic.
#
# Known Divergences: none
# ---

# ── Top-level ────────────────────────────────────────────────────────────
# Workflows: H2 space headings containing numbered steps.

OCWorkflows     <- BlankLine* WorkflowSpace+ BlankLine* !.

# ── Workflow space ───────────────────────────────────────────────────────
# Each space: H2 heading (optionally suffixed "Space") + numbered steps.

WorkflowSpace   <- SpaceHeading BlankLine* SpaceBody BlankLine*
SpaceHeading    <- '## ' SpaceName EOL
SpaceName       <- (!EOL .)+

SpaceBody       <- (WorkflowStep / StepContent / BlankLine)*

# ── Workflow step ────────────────────────────────────────────────────────
# Numbered steps: "1. Step Name" followed by bold-label body.

WorkflowStep    <- StepNumber '.' SP+ StepName EOL
StepNumber      <- [0-9]+
StepName        <- (!EOL .)+

StepContent     <- StepLabel / ProseContent
StepLabel       <- RoleLabel / SkillLabel / GateLabel / GenericBoldLabel
ProseContent    <- !H2Start !NumberedStep (!EOL .)+ EOL

RoleLabel       <- '**Role**:' SP* ProseValue EOL
SkillLabel      <- '**Skills**:' SP* CommaSepList EOL
GateLabel       <- '**Gate**:' SP* ProseValue EOL

# ── Shared ───────────────────────────────────────────────────────────────

NumberedStep    <- [0-9]+ '.' SP+
GenericBoldLabel <- '**' LabelName '**:' SP* ProseValue EOL
LabelName       <- (!('**') .)+
CommaSepList    <- ValueItem (',' SP* ValueItem)*
ValueItem       <- (!(',' / EOL) .)+
ProseValue      <- (!EOL .)+
H2Start         <- '## '
BlankLine       <- SP* EOL
SP              <- ' ' / '\\t'
EOL             <- '\\r\\n' / '\\n' / '\\r' / !.
`,
};
