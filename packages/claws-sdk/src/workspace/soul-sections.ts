/**
 * SOUL.md section parser — decompose SOUL.md into typed `SoulSectionView[]`
 * with per-section governance context for the M365 Loop sync endpoint.
 *
 * The Loop UI renders each H2 section as an independently addressable card.
 * Cards that carry governance locks render read-only; unlocked cards accept
 * edits which the serve layer routes through the write-time validation
 * layer before committing.
 *
 * Lossless round-trip: `parse → reassemble` reproduces the original file
 * byte-for-byte. BOM and CRLF are preserved; YAML frontmatter and trailing
 * whitespace survive. Parsing runs on a LF-normalised copy with byte-offset
 * slicing to capture each section's exact span; the final reassembly
 * restores the original BOM + EOL style.
 *
 * Governance context enrichment inspects `GovernanceIR.intents`: DenyIntents
 * whose `target` matches `SOUL.{sectionId}` (case-insensitive) contribute
 * to `denyRuleCount`; `compilerInjected` is true when any such rule id
 * starts with `G-` (compiler-injected convention); `lockSource` is derived
 * most-restrictive-wins: R5 > fleet (rule id `FLEET-*`) > governance > none.
 *
 * @module claws-sdk/workspace/soul-sections
 */

import type { DenyIntent, GovernanceIR } from '../ir/index.js';
import type { SoulSection } from '@bic/openclaw-workspace/path';

/** Source of the lock that prevents a Loop edit from being committed. */
export type SoulLockSource = 'r5' | 'fleet' | 'governance' | 'none';

/** Governance context attached to each parsed SOUL section. */
export interface SoulGovernanceContext {
  readonly denyRuleCount: number;
  readonly compilerInjected: boolean;
  readonly lockSource: SoulLockSource;
}

/** Parsed SOUL section. */
export interface SoulSectionView {
  /** Stable id: slug(heading) with a `-{n}` disambiguator for duplicates. */
  readonly id: string;
  /** Section heading text (without the `## ` prefix). */
  readonly heading: string;
  /** Section body (heading line excluded) — LF-normalised. */
  readonly content: string;
  /** 1-based line number of the heading in the source file. */
  readonly line: number;
  /** Governance context for Loop rendering. */
  readonly governanceContext: SoulGovernanceContext;
}

/**
 * Parsed SOUL.md file — preamble plus the ordered section list plus the
 * original EOL shape. `shape` is opaque to callers; it is carried through
 * so {@link reassembleSoulSections} can restore CRLF/BOM/trailing-EOL.
 */
export interface SoulSectionsParse {
  /** Bytes before the first H2 heading — LF-normalised, BOM stripped. */
  readonly preamble: string;
  readonly sections: readonly SoulSectionView[];
  readonly shape: EolShape;
}

/** Internal EOL shape witness. */
export interface EolShape {
  readonly bom: string;
  readonly eol: '\r\n' | '\n';
  readonly trailingEol: boolean;
}

const BOM = '\uFEFF';

function slugify(heading: string): string {
  const normalized = heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized.length > 0 ? normalized : 'section';
}

function detectEol(raw: string): EolShape {
  const hasBom = raw.startsWith(BOM);
  const body = hasBom ? raw.slice(1) : raw;
  const eol: '\r\n' | '\n' = body.includes('\r\n') ? '\r\n' : '\n';
  return {
    bom: hasBom ? BOM : '',
    eol,
    trailingEol: body.endsWith('\n'),
  };
}

/**
 * Parse SOUL.md raw bytes into preamble + ordered `SoulSectionView[]`.
 *
 * Empty or preamble-only files return `{ preamble, sections: [] }`.
 * Governance context defaults to `{ 0, false, 'none' }` when no IR is
 * supplied.
 */
export function parseSoulSections(
  soul: SoulSection,
  ir?: GovernanceIR,
): SoulSectionsParse {
  const raw = soul.raw;
  const shape = detectEol(raw);
  const afterBom = shape.bom.length > 0 ? raw.slice(shape.bom.length) : raw;
  const normalised = afterBom.replace(/\r\n/g, '\n');

  // Collect line starts so we can address line N's byte offset directly.
  const lineStarts: number[] = [0];
  for (let i = 0; i < normalised.length; i++) {
    if (normalised.charCodeAt(i) === 10 /* \n */) lineStarts.push(i + 1);
  }

  const headingLines: number[] = [];
  for (let n = 0; n < lineStarts.length; n++) {
    const start = lineStarts[n]!;
    if (
      normalised.charCodeAt(start) === 35 /* # */ &&
      normalised.charCodeAt(start + 1) === 35 /* # */ &&
      normalised.charCodeAt(start + 2) === 32 /* space */
    ) {
      headingLines.push(n);
    }
  }

  // Preamble runs from byte 0 to the start of the first heading line (or
  // full file when no headings). Sliced directly so trailing blank lines
  // survive verbatim.
  const preambleEnd =
    headingLines.length === 0 ? normalised.length : lineStarts[headingLines[0]!]!;
  const preamble = normalised.slice(0, preambleEnd);

  const seen = new Map<string, number>();
  const sections: SoulSectionView[] = [];
  const denyByTarget = indexDenyIntents(ir);

  for (let n = 0; n < headingLines.length; n++) {
    const headLine = headingLines[n]!;
    const sectionStart = lineStarts[headLine]!;
    const sectionEnd =
      n + 1 < headingLines.length ? lineStarts[headingLines[n + 1]!]! : normalised.length;

    // The heading line spans from sectionStart to the first `\n` (or
    // sectionEnd if the line has no newline, which only happens for a
    // file that ends on the heading line with no trailing EOL).
    const headLineEnd = findLineEnd(normalised, sectionStart, sectionEnd);
    const headingText = normalised.slice(sectionStart + 3, headLineEnd).trim();
    // Body is the bytes between the heading's newline and the section's
    // end (exclusive). When the heading line has no newline (EOF case),
    // the body is empty.
    const bodyStart = headLineEnd < sectionEnd ? headLineEnd + 1 : sectionEnd;
    const content = normalised.slice(bodyStart, sectionEnd);

    const baseId = slugify(headingText);
    const dupes = seen.get(baseId) ?? 0;
    seen.set(baseId, dupes + 1);
    const id = dupes === 0 ? baseId : `${baseId}-${String(dupes + 1)}`;

    sections.push({
      id,
      heading: headingText,
      content,
      line: headLine + 1,
      governanceContext: deriveContext(id, denyByTarget),
    });
  }

  return { preamble, sections, shape };
}

/**
 * Reassemble a parsed SOUL.md back into a single file. `parse → reassemble`
 * is byte-for-byte when the caller does not mutate the sections in between.
 */
export function reassembleSoulSections(parse: SoulSectionsParse): string {
  const { shape } = parse;
  let out = parse.preamble;
  const lastIdx = parse.sections.length - 1;
  for (let i = 0; i < parse.sections.length; i++) {
    const s = parse.sections[i]!;
    out += `## ${s.heading}`;
    // A non-final section MUST be terminated with `\n` so the following
    // heading starts on a new line. The final section keeps whatever
    // trailing-EOL contract the file itself had.
    const isLast = i === lastIdx;
    if (s.content.length === 0) {
      if (!isLast || shape.trailingEol) out += '\n';
    } else {
      out += '\n' + s.content;
      const needsTrailEol = !isLast || shape.trailingEol;
      if (needsTrailEol && !s.content.endsWith('\n')) out += '\n';
    }
  }

  if (shape.eol === '\r\n') out = out.replace(/\n/g, '\r\n');
  return shape.bom + out;
}

/**
 * Replace a single section's content in place, producing a new
 * `SoulSectionsParse`. The heading is preserved; only body bytes change.
 * Reassembly of the returned parse is lossless for every untouched section.
 *
 * @throws {SoulSectionError} when the id is not present in the parse.
 */
export function replaceSectionContent(
  parse: SoulSectionsParse,
  id: string,
  newContent: string,
): SoulSectionsParse {
  const idx = parse.sections.findIndex((s) => s.id === id);
  if (idx === -1) {
    throw new SoulSectionError(
      `SOUL.md section not found: ${id}`,
      'SOUL_SECTION_NOT_FOUND',
      id,
    );
  }
  const current = parse.sections[idx]!;
  const normalised = newContent.replace(/\r\n/g, '\n');
  const updated: SoulSectionView = { ...current, content: normalised };
  const sections = parse.sections.slice();
  sections[idx] = updated;
  return { preamble: parse.preamble, sections, shape: parse.shape };
}

/**
 * Error raised by {@link replaceSectionContent} when the target id does
 * not exist. The serve layer maps this to a 404 PatchError envelope.
 */
export class SoulSectionError extends Error {
  readonly code: string;
  readonly sectionId: string;

  constructor(message: string, code: string, sectionId: string) {
    super(message);
    this.name = 'SoulSectionError';
    this.code = code;
    this.sectionId = sectionId;
  }
}

// ── Internal helpers ───────────────────────────────────────────────────

function findLineEnd(s: string, start: number, end: number): number {
  for (let i = start; i < end; i++) {
    if (s.charCodeAt(i) === 10) return i;
  }
  return end;
}

function indexDenyIntents(ir: GovernanceIR | undefined): Map<string, DenyIntent[]> {
  const byTarget = new Map<string, DenyIntent[]>();
  if (ir === undefined) return byTarget;
  for (const intent of ir.intents) {
    if (intent.kind !== 'deny') continue;
    const match = /^SOUL\.(.+)$/.exec(intent.target);
    if (match === null) continue;
    const sectionId = match[1]!.toLowerCase();
    const list = byTarget.get(sectionId);
    if (list === undefined) byTarget.set(sectionId, [intent]);
    else list.push(intent);
  }
  return byTarget;
}

function deriveContext(
  sectionId: string,
  denyByTarget: Map<string, DenyIntent[]>,
): SoulGovernanceContext {
  const denies = denyByTarget.get(sectionId.toLowerCase()) ?? [];
  if (denies.length === 0) {
    return { denyRuleCount: 0, compilerInjected: false, lockSource: 'none' };
  }
  const compilerInjected = denies.some((d) => d.ruleId.startsWith('G-'));
  const lockSource = classifyLock(denies);
  return { denyRuleCount: denies.length, compilerInjected, lockSource };
}

function classifyLock(denies: readonly DenyIntent[]): SoulLockSource {
  for (const d of denies) {
    if (d.level === 5) return 'r5';
  }
  for (const d of denies) {
    if (d.ruleId.startsWith('FLEET-')) return 'fleet';
  }
  return 'governance';
}
