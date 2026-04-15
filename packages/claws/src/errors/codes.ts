/**
 * Error code registry for claws diagnostics.
 *
 * Codes follow the pattern CLAWS-E{NNN} where:
 * - E001-E009: config errors
 * - E010-E019: workspace errors
 * - E020-E029: compile pipeline errors
 * - E030-E039: parse errors
 * - E040-E049: governance errors
 * - E050-E059: emit/codegen errors
 * - E060-E069: build errors
 * - E070-E079: check errors
 * - E080-E089: init errors
 * - E090-E099: reserved
 *
 * @module claws-cli/errors/codes
 */

/**
 * Domain category for an error code.
 */
export type ErrorCategory = 'config' | 'parse' | 'compile' | 'governance' | 'emit' | 'workspace' | 'build' | 'check' | 'init' | 'reserved';

/**
 * Entry in the error code registry.
 */
export interface ErrorCodeEntry {
  readonly code: string;
  readonly description: string;
  readonly category: ErrorCategory;
}

/**
 * Authoritative error code registry.
 *
 * Every code CLAWS-E001 through CLAWS-E099 is allocated.
 * Unassigned codes within a range use a placeholder description
 * so the registry has no gaps.
 */
export const ERROR_CODES: ReadonlyMap<string, ErrorCodeEntry> = new Map<string, ErrorCodeEntry>([
  // ── Config (E001-E009) ──────────────────────────────────────────────
  ['CLAWS-E001', { code: 'CLAWS-E001', description: 'Invalid claws.json: malformed JSON or schema violation', category: 'config' }],
  ['CLAWS-E002', { code: 'CLAWS-E002', description: 'Missing required field in claws.json', category: 'config' }],
  ['CLAWS-E003', { code: 'CLAWS-E003', description: 'Unknown platform in claws.json', category: 'config' }],
  ['CLAWS-E004', { code: 'CLAWS-E004', description: 'Invalid trust tier value (must be 1-5)', category: 'config' }],
  ['CLAWS-E005', { code: 'CLAWS-E005', description: 'Config file version mismatch', category: 'config' }],
  ['CLAWS-E006', { code: 'CLAWS-E006', description: 'Invalid suppress rule pattern in claws.json', category: 'config' }],
  ['CLAWS-E007', { code: 'CLAWS-E007', description: 'Reserved config error (E007)', category: 'config' }],
  ['CLAWS-E008', { code: 'CLAWS-E008', description: 'Reserved config error (E008)', category: 'config' }],
  ['CLAWS-E009', { code: 'CLAWS-E009', description: 'Reserved config error (E009)', category: 'config' }],

  // ── Workspace (E010-E019) ───────────────────────────────────────────
  ['CLAWS-E010', { code: 'CLAWS-E010', description: 'No claws.json found in workspace or any parent directory', category: 'workspace' }],
  ['CLAWS-E011', { code: 'CLAWS-E011', description: 'Workspace root could not be determined', category: 'workspace' }],
  ['CLAWS-E012', { code: 'CLAWS-E012', description: 'Sidecar directory .claws/ is missing or corrupt', category: 'workspace' }],
  ['CLAWS-E013', { code: 'CLAWS-E013', description: 'Multiple claws.json files found in hierarchy (ambiguous workspace)', category: 'workspace' }],
  ['CLAWS-E014', { code: 'CLAWS-E014', description: 'Workspace lock file conflict', category: 'workspace' }],
  ['CLAWS-E015', { code: 'CLAWS-E015', description: 'Reserved workspace error (E015)', category: 'workspace' }],
  ['CLAWS-E016', { code: 'CLAWS-E016', description: 'Reserved workspace error (E016)', category: 'workspace' }],
  ['CLAWS-E017', { code: 'CLAWS-E017', description: 'Reserved workspace error (E017)', category: 'workspace' }],
  ['CLAWS-E018', { code: 'CLAWS-E018', description: 'Reserved workspace error (E018)', category: 'workspace' }],
  ['CLAWS-E019', { code: 'CLAWS-E019', description: 'Reserved workspace error (E019)', category: 'workspace' }],

  // ── Compile pipeline (E020-E029) ────────────────────────────────────
  ['CLAWS-E020', { code: 'CLAWS-E020', description: 'Compilation failed (general pipeline error)', category: 'compile' }],
  ['CLAWS-E021', { code: 'CLAWS-E021', description: 'No governance source files found in workspace', category: 'compile' }],
  ['CLAWS-E022', { code: 'CLAWS-E022', description: 'Intent extraction failed for one or more source files', category: 'compile' }],
  ['CLAWS-E023', { code: 'CLAWS-E023', description: 'AST construction failed', category: 'compile' }],
  ['CLAWS-E024', { code: 'CLAWS-E024', description: 'Capability manifest extraction failed', category: 'compile' }],
  ['CLAWS-E025', { code: 'CLAWS-E025', description: 'Conflict detection found irreconcilable conflicts', category: 'compile' }],
  ['CLAWS-E026', { code: 'CLAWS-E026', description: 'IR serialization failed', category: 'compile' }],
  ['CLAWS-E027', { code: 'CLAWS-E027', description: 'Compiler version mismatch (cached IR is stale)', category: 'compile' }],
  ['CLAWS-E028', { code: 'CLAWS-E028', description: 'Reserved compile error (E028)', category: 'compile' }],
  ['CLAWS-E029', { code: 'CLAWS-E029', description: 'Reserved compile error (E029)', category: 'compile' }],

  // ── Parse (E030-E039) ───────────────────────────────────────────────
  ['CLAWS-E030', { code: 'CLAWS-E030', description: 'Source file could not be read (permission denied or encoding error)', category: 'parse' }],
  ['CLAWS-E031', { code: 'CLAWS-E031', description: 'Malformed markdown frontmatter in source file', category: 'parse' }],
  ['CLAWS-E032', { code: 'CLAWS-E032', description: 'Source file exceeds maximum size limit', category: 'parse' }],
  ['CLAWS-E033', { code: 'CLAWS-E033', description: 'Circular include detected in source files', category: 'parse' }],
  ['CLAWS-E034', { code: 'CLAWS-E034', description: 'Invalid source file path (contains disallowed characters)', category: 'parse' }],
  ['CLAWS-E035', { code: 'CLAWS-E035', description: 'Source file encoding is not UTF-8', category: 'parse' }],
  ['CLAWS-E036', { code: 'CLAWS-E036', description: 'Reserved parse error (E036)', category: 'parse' }],
  ['CLAWS-E037', { code: 'CLAWS-E037', description: 'Reserved parse error (E037)', category: 'parse' }],
  ['CLAWS-E038', { code: 'CLAWS-E038', description: 'Reserved parse error (E038)', category: 'parse' }],
  ['CLAWS-E039', { code: 'CLAWS-E039', description: 'Reserved parse error (E039)', category: 'parse' }],

  // ── Governance (E040-E049) ──────────────────────────────────────────
  ['CLAWS-E040', { code: 'CLAWS-E040', description: 'Governance rule evaluation failed', category: 'governance' }],
  ['CLAWS-E041', { code: 'CLAWS-E041', description: 'Unknown governance rule referenced in suppress list', category: 'governance' }],
  ['CLAWS-E042', { code: 'CLAWS-E042', description: 'Governance rule conflict (two rules contradict)', category: 'governance' }],
  ['CLAWS-E043', { code: 'CLAWS-E043', description: 'Custom governance rule has invalid schema', category: 'governance' }],
  ['CLAWS-E044', { code: 'CLAWS-E044', description: 'Governance registry initialization failed', category: 'governance' }],
  ['CLAWS-E045', { code: 'CLAWS-E045', description: 'Reserved governance error (E045)', category: 'governance' }],
  ['CLAWS-E046', { code: 'CLAWS-E046', description: 'Reserved governance error (E046)', category: 'governance' }],
  ['CLAWS-E047', { code: 'CLAWS-E047', description: 'Reserved governance error (E047)', category: 'governance' }],
  ['CLAWS-E048', { code: 'CLAWS-E048', description: 'Reserved governance error (E048)', category: 'governance' }],
  ['CLAWS-E049', { code: 'CLAWS-E049', description: 'Reserved governance error (E049)', category: 'governance' }],

  // ── Emit / codegen (E050-E059) ──────────────────────────────────────
  ['CLAWS-E050', { code: 'CLAWS-E050', description: 'No emit adapter found for target platform', category: 'emit' }],
  ['CLAWS-E051', { code: 'CLAWS-E051', description: 'Artifact write failed (disk full or permission denied)', category: 'emit' }],
  ['CLAWS-E052', { code: 'CLAWS-E052', description: 'Emitted artifact failed validation', category: 'emit' }],
  ['CLAWS-E053', { code: 'CLAWS-E053', description: 'Platform adapter returned empty artifact set', category: 'emit' }],
  ['CLAWS-E054', { code: 'CLAWS-E054', description: 'Template rendering failed during emit', category: 'emit' }],
  ['CLAWS-E055', { code: 'CLAWS-E055', description: 'Reserved emit error (E055)', category: 'emit' }],
  ['CLAWS-E056', { code: 'CLAWS-E056', description: 'Reserved emit error (E056)', category: 'emit' }],
  ['CLAWS-E057', { code: 'CLAWS-E057', description: 'Reserved emit error (E057)', category: 'emit' }],
  ['CLAWS-E058', { code: 'CLAWS-E058', description: 'Reserved emit error (E058)', category: 'emit' }],
  ['CLAWS-E059', { code: 'CLAWS-E059', description: 'Reserved emit error (E059)', category: 'emit' }],

  // ── Build (E060-E069) ───────────────────────────────────────────────
  ['CLAWS-E060', { code: 'CLAWS-E060', description: 'Build pipeline failed (general)', category: 'build' }],
  ['CLAWS-E061', { code: 'CLAWS-E061', description: 'Build cache is corrupt or unreadable', category: 'build' }],
  ['CLAWS-E062', { code: 'CLAWS-E062', description: 'Build target not supported on this platform', category: 'build' }],
  ['CLAWS-E063', { code: 'CLAWS-E063', description: 'Build timed out', category: 'build' }],
  ['CLAWS-E064', { code: 'CLAWS-E064', description: 'Reserved build error (E064)', category: 'build' }],
  ['CLAWS-E065', { code: 'CLAWS-E065', description: 'Reserved build error (E065)', category: 'build' }],
  ['CLAWS-E066', { code: 'CLAWS-E066', description: 'Reserved build error (E066)', category: 'build' }],
  ['CLAWS-E067', { code: 'CLAWS-E067', description: 'Reserved build error (E067)', category: 'build' }],
  ['CLAWS-E068', { code: 'CLAWS-E068', description: 'Reserved build error (E068)', category: 'build' }],
  ['CLAWS-E069', { code: 'CLAWS-E069', description: 'Reserved build error (E069)', category: 'build' }],

  // ── Check (E070-E079) ───────────────────────────────────────────────
  ['CLAWS-E070', { code: 'CLAWS-E070', description: 'Check pipeline failed (general)', category: 'check' }],
  ['CLAWS-E071', { code: 'CLAWS-E071', description: 'Check output format not recognized', category: 'check' }],
  ['CLAWS-E072', { code: 'CLAWS-E072', description: 'Reserved check error (E072)', category: 'check' }],
  ['CLAWS-E073', { code: 'CLAWS-E073', description: 'Reserved check error (E073)', category: 'check' }],
  ['CLAWS-E074', { code: 'CLAWS-E074', description: 'Reserved check error (E074)', category: 'check' }],
  ['CLAWS-E075', { code: 'CLAWS-E075', description: 'Reserved check error (E075)', category: 'check' }],
  ['CLAWS-E076', { code: 'CLAWS-E076', description: 'Reserved check error (E076)', category: 'check' }],
  ['CLAWS-E077', { code: 'CLAWS-E077', description: 'Reserved check error (E077)', category: 'check' }],
  ['CLAWS-E078', { code: 'CLAWS-E078', description: 'Reserved check error (E078)', category: 'check' }],
  ['CLAWS-E079', { code: 'CLAWS-E079', description: 'Reserved check error (E079)', category: 'check' }],

  // ── Init (E080-E089) ────────────────────────────────────────────────
  ['CLAWS-E080', { code: 'CLAWS-E080', description: 'Init failed: workspace already initialized', category: 'init' }],
  ['CLAWS-E081', { code: 'CLAWS-E081', description: 'Init failed: could not write claws.json (permission denied)', category: 'init' }],
  ['CLAWS-E082', { code: 'CLAWS-E082', description: 'Init failed: template not found', category: 'init' }],
  ['CLAWS-E083', { code: 'CLAWS-E083', description: 'Init failed: sidecar scaffold error', category: 'init' }],
  ['CLAWS-E084', { code: 'CLAWS-E084', description: 'Reserved init error (E084)', category: 'init' }],
  ['CLAWS-E085', { code: 'CLAWS-E085', description: 'Uninstall failed', category: 'init' }],
  ['CLAWS-E086', { code: 'CLAWS-E086', description: 'Reserved init error (E086)', category: 'init' }],
  ['CLAWS-E087', { code: 'CLAWS-E087', description: 'Reserved init error (E087)', category: 'init' }],
  ['CLAWS-E088', { code: 'CLAWS-E088', description: 'Reserved init error (E088)', category: 'init' }],
  ['CLAWS-E089', { code: 'CLAWS-E089', description: 'Reserved init error (E089)', category: 'init' }],

  // ── Reserved (E090-E099) ────────────────────────────────────────────
  ['CLAWS-E090', { code: 'CLAWS-E090', description: 'Reserved (E090)', category: 'reserved' }],
  ['CLAWS-E091', { code: 'CLAWS-E091', description: 'Reserved (E091)', category: 'reserved' }],
  ['CLAWS-E092', { code: 'CLAWS-E092', description: 'Reserved (E092)', category: 'reserved' }],
  ['CLAWS-E093', { code: 'CLAWS-E093', description: 'Reserved (E093)', category: 'reserved' }],
  ['CLAWS-E094', { code: 'CLAWS-E094', description: 'Reserved (E094)', category: 'reserved' }],
  ['CLAWS-E095', { code: 'CLAWS-E095', description: 'Reserved (E095)', category: 'reserved' }],
  ['CLAWS-E096', { code: 'CLAWS-E096', description: 'Reserved (E096)', category: 'reserved' }],
  ['CLAWS-E097', { code: 'CLAWS-E097', description: 'Reserved (E097)', category: 'reserved' }],
  ['CLAWS-E098', { code: 'CLAWS-E098', description: 'Reserved (E098)', category: 'reserved' }],
  ['CLAWS-E099', { code: 'CLAWS-E099', description: 'Reserved (E099)', category: 'reserved' }],
]);

/**
 * Look up an error code in the registry.
 *
 * @returns The error code entry, or undefined if not found.
 */
export function lookupErrorCode(code: string): ErrorCodeEntry | undefined {
  return ERROR_CODES.get(code);
}
