/**
 * Error code registry for claws diagnostics.
 *
 * Codes follow the pattern OC-POLICY-E{NNN} where:
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
 * Every code OC-POLICY-E001 through OC-POLICY-E099 is allocated.
 * Unassigned codes within a range use a placeholder description
 * so the registry has no gaps.
 */
export const ERROR_CODES: ReadonlyMap<string, ErrorCodeEntry> = new Map<string, ErrorCodeEntry>([
  // ── Config (E001-E009) ──────────────────────────────────────────────
  ['OC-POLICY-E001', { code: 'OC-POLICY-E001', description: 'Invalid claws.json: malformed JSON or schema violation', category: 'config' }],
  ['OC-POLICY-E002', { code: 'OC-POLICY-E002', description: 'Missing required field in claws.json', category: 'config' }],
  ['OC-POLICY-E003', { code: 'OC-POLICY-E003', description: 'Unknown platform in claws.json', category: 'config' }],
  ['OC-POLICY-E004', { code: 'OC-POLICY-E004', description: 'Invalid trust tier value (must be 1-5)', category: 'config' }],
  ['OC-POLICY-E005', { code: 'OC-POLICY-E005', description: 'Config file version mismatch', category: 'config' }],
  ['OC-POLICY-E006', { code: 'OC-POLICY-E006', description: 'Invalid suppress rule pattern in claws.json', category: 'config' }],
  ['OC-POLICY-E007', { code: 'OC-POLICY-E007', description: 'Reserved config error (E007)', category: 'config' }],
  ['OC-POLICY-E008', { code: 'OC-POLICY-E008', description: 'Reserved config error (E008)', category: 'config' }],
  ['OC-POLICY-E009', { code: 'OC-POLICY-E009', description: 'Reserved config error (E009)', category: 'config' }],

  // ── Workspace (E010-E019) ───────────────────────────────────────────
  ['OC-POLICY-E010', { code: 'OC-POLICY-E010', description: 'No claws.json found in workspace or any parent directory', category: 'workspace' }],
  ['OC-POLICY-E011', { code: 'OC-POLICY-E011', description: 'Workspace root could not be determined', category: 'workspace' }],
  ['OC-POLICY-E012', { code: 'OC-POLICY-E012', description: 'Sidecar directory .claws/ is missing or corrupt', category: 'workspace' }],
  ['OC-POLICY-E013', { code: 'OC-POLICY-E013', description: 'Multiple claws.json files found in hierarchy (ambiguous workspace)', category: 'workspace' }],
  ['OC-POLICY-E014', { code: 'OC-POLICY-E014', description: 'Workspace lock file conflict', category: 'workspace' }],
  ['OC-POLICY-E015', { code: 'OC-POLICY-E015', description: 'Reserved workspace error (E015)', category: 'workspace' }],
  ['OC-POLICY-E016', { code: 'OC-POLICY-E016', description: 'Reserved workspace error (E016)', category: 'workspace' }],
  ['OC-POLICY-E017', { code: 'OC-POLICY-E017', description: 'Reserved workspace error (E017)', category: 'workspace' }],
  ['OC-POLICY-E018', { code: 'OC-POLICY-E018', description: 'Reserved workspace error (E018)', category: 'workspace' }],
  ['OC-POLICY-E019', { code: 'OC-POLICY-E019', description: 'Reserved workspace error (E019)', category: 'workspace' }],

  // ── Compile pipeline (E020-E029) ────────────────────────────────────
  ['OC-POLICY-E020', { code: 'OC-POLICY-E020', description: 'Compilation failed (general pipeline error)', category: 'compile' }],
  ['OC-POLICY-E021', { code: 'OC-POLICY-E021', description: 'No governance source files found in workspace', category: 'compile' }],
  ['OC-POLICY-E022', { code: 'OC-POLICY-E022', description: 'Intent extraction failed for one or more source files', category: 'compile' }],
  ['OC-POLICY-E023', { code: 'OC-POLICY-E023', description: 'AST construction failed', category: 'compile' }],
  ['OC-POLICY-E024', { code: 'OC-POLICY-E024', description: 'Capability manifest extraction failed', category: 'compile' }],
  ['OC-POLICY-E025', { code: 'OC-POLICY-E025', description: 'Conflict detection found irreconcilable conflicts', category: 'compile' }],
  ['OC-POLICY-E026', { code: 'OC-POLICY-E026', description: 'IR serialization failed', category: 'compile' }],
  ['OC-POLICY-E027', { code: 'OC-POLICY-E027', description: 'Compiler version mismatch (cached IR is stale)', category: 'compile' }],
  ['OC-POLICY-E028', { code: 'OC-POLICY-E028', description: 'Reserved compile error (E028)', category: 'compile' }],
  ['OC-POLICY-E029', { code: 'OC-POLICY-E029', description: 'Reserved compile error (E029)', category: 'compile' }],

  // ── Parse (E030-E039) ───────────────────────────────────────────────
  ['OC-POLICY-E030', { code: 'OC-POLICY-E030', description: 'Source file could not be read (permission denied or encoding error)', category: 'parse' }],
  ['OC-POLICY-E031', { code: 'OC-POLICY-E031', description: 'Malformed markdown frontmatter in source file', category: 'parse' }],
  ['OC-POLICY-E032', { code: 'OC-POLICY-E032', description: 'Source file exceeds maximum size limit', category: 'parse' }],
  ['OC-POLICY-E033', { code: 'OC-POLICY-E033', description: 'Circular include detected in source files', category: 'parse' }],
  ['OC-POLICY-E034', { code: 'OC-POLICY-E034', description: 'Invalid source file path (contains disallowed characters)', category: 'parse' }],
  ['OC-POLICY-E035', { code: 'OC-POLICY-E035', description: 'Source file encoding is not UTF-8', category: 'parse' }],
  ['OC-POLICY-E036', { code: 'OC-POLICY-E036', description: 'Reserved parse error (E036)', category: 'parse' }],
  ['OC-POLICY-E037', { code: 'OC-POLICY-E037', description: 'Reserved parse error (E037)', category: 'parse' }],
  ['OC-POLICY-E038', { code: 'OC-POLICY-E038', description: 'Reserved parse error (E038)', category: 'parse' }],
  ['OC-POLICY-E039', { code: 'OC-POLICY-E039', description: 'Reserved parse error (E039)', category: 'parse' }],

  // ── Governance (E040-E049) ──────────────────────────────────────────
  ['OC-POLICY-E040', { code: 'OC-POLICY-E040', description: 'Governance rule evaluation failed', category: 'governance' }],
  ['OC-POLICY-E041', { code: 'OC-POLICY-E041', description: 'Unknown governance rule referenced in suppress list', category: 'governance' }],
  ['OC-POLICY-E042', { code: 'OC-POLICY-E042', description: 'Governance rule conflict (two rules contradict)', category: 'governance' }],
  ['OC-POLICY-E043', { code: 'OC-POLICY-E043', description: 'Custom governance rule has invalid schema', category: 'governance' }],
  ['OC-POLICY-E044', { code: 'OC-POLICY-E044', description: 'Governance registry initialization failed', category: 'governance' }],
  ['OC-POLICY-E045', { code: 'OC-POLICY-E045', description: 'Reserved governance error (E045)', category: 'governance' }],
  ['OC-POLICY-E046', { code: 'OC-POLICY-E046', description: 'Reserved governance error (E046)', category: 'governance' }],
  ['OC-POLICY-E047', { code: 'OC-POLICY-E047', description: 'Reserved governance error (E047)', category: 'governance' }],
  ['OC-POLICY-E048', { code: 'OC-POLICY-E048', description: 'Reserved governance error (E048)', category: 'governance' }],
  ['OC-POLICY-E049', { code: 'OC-POLICY-E049', description: 'Reserved governance error (E049)', category: 'governance' }],

  // ── Emit / codegen (E050-E059) ──────────────────────────────────────
  ['OC-POLICY-E050', { code: 'OC-POLICY-E050', description: 'No emit adapter found for target platform', category: 'emit' }],
  ['OC-POLICY-E051', { code: 'OC-POLICY-E051', description: 'Artifact write failed (disk full or permission denied)', category: 'emit' }],
  ['OC-POLICY-E052', { code: 'OC-POLICY-E052', description: 'Emitted artifact failed validation', category: 'emit' }],
  ['OC-POLICY-E053', { code: 'OC-POLICY-E053', description: 'Platform adapter returned empty artifact set', category: 'emit' }],
  ['OC-POLICY-E054', { code: 'OC-POLICY-E054', description: 'Template rendering failed during emit', category: 'emit' }],
  ['OC-POLICY-E055', { code: 'OC-POLICY-E055', description: 'Reserved emit error (E055)', category: 'emit' }],
  ['OC-POLICY-E056', { code: 'OC-POLICY-E056', description: 'Reserved emit error (E056)', category: 'emit' }],
  ['OC-POLICY-E057', { code: 'OC-POLICY-E057', description: 'Reserved emit error (E057)', category: 'emit' }],
  ['OC-POLICY-E058', { code: 'OC-POLICY-E058', description: 'Reserved emit error (E058)', category: 'emit' }],
  ['OC-POLICY-E059', { code: 'OC-POLICY-E059', description: 'Reserved emit error (E059)', category: 'emit' }],

  // ── Build (E060-E069) ───────────────────────────────────────────────
  ['OC-POLICY-E060', { code: 'OC-POLICY-E060', description: 'Build pipeline failed (general)', category: 'build' }],
  ['OC-POLICY-E061', { code: 'OC-POLICY-E061', description: 'Build cache is corrupt or unreadable', category: 'build' }],
  ['OC-POLICY-E062', { code: 'OC-POLICY-E062', description: 'Build target not supported on this platform', category: 'build' }],
  ['OC-POLICY-E063', { code: 'OC-POLICY-E063', description: 'Build timed out', category: 'build' }],
  ['OC-POLICY-E064', { code: 'OC-POLICY-E064', description: 'Reserved build error (E064)', category: 'build' }],
  ['OC-POLICY-E065', { code: 'OC-POLICY-E065', description: 'Reserved build error (E065)', category: 'build' }],
  ['OC-POLICY-E066', { code: 'OC-POLICY-E066', description: 'Reserved build error (E066)', category: 'build' }],
  ['OC-POLICY-E067', { code: 'OC-POLICY-E067', description: 'Reserved build error (E067)', category: 'build' }],
  ['OC-POLICY-E068', { code: 'OC-POLICY-E068', description: 'Reserved build error (E068)', category: 'build' }],
  ['OC-POLICY-E069', { code: 'OC-POLICY-E069', description: 'Reserved build error (E069)', category: 'build' }],

  // ── Check (E070-E079) ───────────────────────────────────────────────
  ['OC-POLICY-E070', { code: 'OC-POLICY-E070', description: 'Check pipeline failed (general)', category: 'check' }],
  ['OC-POLICY-E071', { code: 'OC-POLICY-E071', description: 'Check output format not recognized', category: 'check' }],
  ['OC-POLICY-E072', { code: 'OC-POLICY-E072', description: 'Reserved check error (E072)', category: 'check' }],
  ['OC-POLICY-E073', { code: 'OC-POLICY-E073', description: 'Reserved check error (E073)', category: 'check' }],
  ['OC-POLICY-E074', { code: 'OC-POLICY-E074', description: 'Reserved check error (E074)', category: 'check' }],
  ['OC-POLICY-E075', { code: 'OC-POLICY-E075', description: 'Reserved check error (E075)', category: 'check' }],
  ['OC-POLICY-E076', { code: 'OC-POLICY-E076', description: 'Reserved check error (E076)', category: 'check' }],
  ['OC-POLICY-E077', { code: 'OC-POLICY-E077', description: 'Reserved check error (E077)', category: 'check' }],
  ['OC-POLICY-E078', { code: 'OC-POLICY-E078', description: 'Reserved check error (E078)', category: 'check' }],
  ['OC-POLICY-E079', { code: 'OC-POLICY-E079', description: 'Reserved check error (E079)', category: 'check' }],

  // ── Init (E080-E089) ────────────────────────────────────────────────
  ['OC-POLICY-E080', { code: 'OC-POLICY-E080', description: 'Init failed: workspace already initialized', category: 'init' }],
  ['OC-POLICY-E081', { code: 'OC-POLICY-E081', description: 'Init failed: could not write claws.json (permission denied)', category: 'init' }],
  ['OC-POLICY-E082', { code: 'OC-POLICY-E082', description: 'Init failed: template not found', category: 'init' }],
  ['OC-POLICY-E083', { code: 'OC-POLICY-E083', description: 'Init failed: sidecar scaffold error', category: 'init' }],
  ['OC-POLICY-E084', { code: 'OC-POLICY-E084', description: 'Reserved init error (E084)', category: 'init' }],
  ['OC-POLICY-E085', { code: 'OC-POLICY-E085', description: 'Uninstall failed', category: 'init' }],
  ['OC-POLICY-E086', { code: 'OC-POLICY-E086', description: 'Reserved init error (E086)', category: 'init' }],
  ['OC-POLICY-E087', { code: 'OC-POLICY-E087', description: 'Reserved init error (E087)', category: 'init' }],
  ['OC-POLICY-E088', { code: 'OC-POLICY-E088', description: 'Reserved init error (E088)', category: 'init' }],
  ['OC-POLICY-E089', { code: 'OC-POLICY-E089', description: 'Reserved init error (E089)', category: 'init' }],

  // ── Reserved (E090-E099) ────────────────────────────────────────────
  ['OC-POLICY-E090', { code: 'OC-POLICY-E090', description: 'Reserved (E090)', category: 'reserved' }],
  ['OC-POLICY-E091', { code: 'OC-POLICY-E091', description: 'Reserved (E091)', category: 'reserved' }],
  ['OC-POLICY-E092', { code: 'OC-POLICY-E092', description: 'Reserved (E092)', category: 'reserved' }],
  ['OC-POLICY-E093', { code: 'OC-POLICY-E093', description: 'Reserved (E093)', category: 'reserved' }],
  ['OC-POLICY-E094', { code: 'OC-POLICY-E094', description: 'Reserved (E094)', category: 'reserved' }],
  ['OC-POLICY-E095', { code: 'OC-POLICY-E095', description: 'Reserved (E095)', category: 'reserved' }],
  ['OC-POLICY-E096', { code: 'OC-POLICY-E096', description: 'Reserved (E096)', category: 'reserved' }],
  ['OC-POLICY-E097', { code: 'OC-POLICY-E097', description: 'Reserved (E097)', category: 'reserved' }],
  ['OC-POLICY-E098', { code: 'OC-POLICY-E098', description: 'Reserved (E098)', category: 'reserved' }],
  ['OC-POLICY-E099', { code: 'OC-POLICY-E099', description: 'Reserved (E099)', category: 'reserved' }],
]);

/**
 * Look up an error code in the registry.
 *
 * @returns The error code entry, or undefined if not found.
 */
export function lookupErrorCode(code: string): ErrorCodeEntry | undefined {
  return ERROR_CODES.get(code);
}
