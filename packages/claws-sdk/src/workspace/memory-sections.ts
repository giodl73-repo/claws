/**
 * Memory section decomposition for the Loop sync endpoint (Pulse 36).
 *
 * MEMORY.md is decomposed into `MemoryLoopSection[]` — a richer view
 * than the generic {@link SectionBase} used by the chunk assembler. Each
 * section carries an address-stable `id`, its original heading, its raw
 * body, and an `entryCount` that rolls up list items plus sub-section
 * entries so the Loop UI can render "Memory / Feedback (N entries)"
 * without re-scanning the body.
 *
 * Lossless round-trip: calling {@link reassembleMemorySections} with the
 * parse result reproduces the input file byte-for-byte (BOM, CRLF, and
 * trailing whitespace preserved). The parser never rewrites tables,
 * sub-section separators, or inter-section whitespace — it only carves
 * the file at H2 boundaries and records where each slice starts.
 *
 * Section `id` is the slugified heading (`memory-index`, `feedback`,
 * `project`, `reference`, ...) so the Loop PATCH surface can address a
 * section without leaking the raw heading text — and so two parses of
 * the same file agree on the id even if the heading's trailing
 * whitespace differs between reads.
 *
 * @module claws-sdk/workspace/memory-sections
 */

/**
 * A single H2 slice of MEMORY.md addressable by the Loop sync endpoint.
 *
 * `content` is the slice of the source file from the H2 heading line up
 * to (but not including) the next H2 heading — i.e. the heading line
 * itself PLUS the body. This shape is what reassembly needs to
 * byte-for-byte round-trip the input; downstream consumers that only
 * want the body should slice off the first line themselves.
 */
export interface MemoryLoopSection {
  /** Stable slug derived from the heading — used as the PATCH address. */
  readonly id: string;
  /** Section heading text (without the `## ` prefix). */
  readonly heading: string;
  /** Raw slice of source content starting at the `## ` line. */
  readonly content: string;
  /** Top-level list items + sub-section H3 entries under this section. */
  readonly entryCount: number;
}

/** Result of parsing MEMORY.md into Loop-addressable sections. */
export interface ParsedMemorySections {
  /** Everything before the first H2 heading — preserved verbatim. */
  readonly preamble: string;
  /** H2 sections in document order. */
  readonly sections: readonly MemoryLoopSection[];
  /** The original source content, byte-for-byte. */
  readonly raw: string;
}

/**
 * Derive a stable slug from an H2 heading.
 *
 * Lower-cased, non-alphanumeric runs collapse to a single `-`, leading
 * and trailing dashes are stripped. Matches the casual convention in
 * MEMORY.md where headings like `## Feedback` and `## Project` are
 * referenced as `feedback` / `project` throughout the codebase.
 */
export function memorySectionId(heading: string): string {
  let slug = heading.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  let start = 0;
  while (start < slug.length && slug.charCodeAt(start) === 45) start += 1;
  let end = slug.length;
  while (end > start && slug.charCodeAt(end - 1) === 45) end -= 1;
  slug = slug.slice(start, end);
  return slug.length > 0 ? slug : 'section';
}

/**
 * Count entries under a section body.
 *
 * Entries are:
 *   - top-level list items (`- ` or `* ` at column 0)
 *   - H3 sub-sections (`### Heading`)
 *
 * Indented (nested) list items are sub-entries, not top-level entries,
 * and do not bump the count. Empty sections return 0.
 */
export function countMemoryEntries(body: string): number {
  let count = 0;
  for (const line of body.split('\n')) {
    if (line.startsWith('- ') || line.startsWith('* ')) {
      count += 1;
    } else if (line.startsWith('### ')) {
      count += 1;
    }
  }
  return count;
}

/**
 * Parse MEMORY.md into Loop-addressable sections.
 *
 * The input is carved at every `^## ` line. The preamble is everything
 * before the first H2 (including an H1 heading and any intro text).
 * Each section's `content` is the slice from its `## ` line up to the
 * next `## ` line or end of file — concatenating `preamble` with every
 * section's `content` in order reproduces the input byte-for-byte.
 *
 * An empty input yields `preamble = ''` and `sections = []`.
 */
export function parseMemorySections(raw: string): ParsedMemorySections {
  if (raw.length === 0) {
    return { preamble: '', sections: [], raw };
  }

  // Split preserving line endings so reassembly round-trips CRLF files.
  const lines = raw.split(/(\r?\n)/);
  // lines is [text, sep, text, sep, ..., text]; odd indices are separators.

  const sectionStarts: { headingText: string; startIndex: number }[] = [];
  for (let i = 0; i < lines.length; i += 2) {
    const line = lines[i]!;
    if (line.startsWith('## ')) {
      sectionStarts.push({
        headingText: line.slice(3).trim(),
        startIndex: i,
      });
    }
  }

  const preambleEnd =
    sectionStarts.length > 0 ? sectionStarts[0]!.startIndex : lines.length;
  const preamble = lines.slice(0, preambleEnd).join('');

  const sections: MemoryLoopSection[] = [];
  for (let idx = 0; idx < sectionStarts.length; idx++) {
    const current = sectionStarts[idx]!;
    const next = sectionStarts[idx + 1];
    const endIndex = next !== undefined ? next.startIndex : lines.length;
    const content = lines.slice(current.startIndex, endIndex).join('');
    // Body = content with the heading line (+ its separator) stripped.
    const body = lines.slice(current.startIndex + 2, endIndex).join('');
    sections.push({
      id: memorySectionId(current.headingText),
      heading: current.headingText,
      content,
      entryCount: countMemoryEntries(body),
    });
  }

  return { preamble, sections, raw };
}

/**
 * Reassemble parsed sections back into a single MEMORY.md string.
 *
 * The contract is the inverse of {@link parseMemorySections}: the
 * concatenation of `preamble` and every section's `content` in order
 * is the original file. No normalisation, no separator insertion.
 */
export function reassembleMemorySections(
  parsed: ParsedMemorySections,
  replacements: ReadonlyMap<string, string> = new Map(),
): string {
  let out = parsed.preamble;
  for (const section of parsed.sections) {
    const replacement = replacements.get(section.id);
    out += replacement !== undefined ? replacement : section.content;
  }
  return out;
}
