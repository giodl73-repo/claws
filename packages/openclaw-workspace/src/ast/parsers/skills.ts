/**
 * Structured parser for SKILL.md per `openclaw-skills.peg`.
 *
 * Top-level: required YAML frontmatter (delimited by `---`) + markdown
 * body. Frontmatter keys are categorized:
 *   - structured: name, description, tier, tools, trigger_phrases,
 *     param_set, param_inline
 *   - opaque: anything else (preserved verbatim for round-trip)
 *
 * Soft-error policy: never throws. Missing required keys (name,
 * description) become Diagnostic warnings. Invalid `tier` values
 * become warnings (and `tier` is set to null).
 *
 * `tools:` and `trigger_phrases:` are YAML list items — sub-bulleted
 * under the key with `- value` per line. The base markdown parser
 * collects the frontmatter as flat key:value entries, which loses the
 * list structure. So we re-parse the raw frontmatter range here to
 * recover lists.
 *
 * @module @bic/openclaw-workspace/ast/parsers/skills
 */

import type { BaseAst, Diagnostic, SkillsAst } from '../ast-types.js';

const STRUCTURED_KEYS = new Set([
  'name',
  'description',
  'tier',
  'tools',
  'trigger_phrases',
  'param_set',
  'param_inline',
]);

const FENCE = '---';

export function parseSkillsKind(base: BaseAst, diagnostics: Diagnostic[]): SkillsAst {
  // Re-scan the raw source so we can pick up YAML list items (sub-
  // bulleted under tools: / trigger_phrases:), which the base parser's
  // flat-key extraction drops.
  const lines = base.raw.split(/\r?\n/);
  const fmRange = locateFrontmatter(lines);

  let name: string | null = null;
  let description: string | null = null;
  let tier: 'T1' | 'T2' | 'T3' | null = null;
  const tools: string[] = [];
  const triggerPhrases: string[] = [];
  let paramSet: string | null = null;
  let paramInline: string | null = null;
  const opaque: Array<{ key: string; value: string }> = [];

  if (fmRange === null) {
    diagnostics.push({
      line: 1,
      message: 'SKILL.md is missing required YAML frontmatter (--- ... ---)',
      severity: 'warning',
    });
  } else {
    const { start, end } = fmRange;
    const seenKeys = new Set<string>();
    let i = start;
    while (i < end) {
      const line = lines[i]!;
      const lineNum = i + 1; // 1-based

      // Blank line — skip.
      if (line.trim().length === 0) {
        i++;
        continue;
      }

      // Top-level key:value — parse `key:` plus optional inline value.
      const m = /^([a-zA-Z_][a-zA-Z0-9_-]*)\s*:\s*(.*)$/.exec(line);
      if (m === null) {
        diagnostics.push({
          line: lineNum,
          message: `unrecognized frontmatter line: ${JSON.stringify(line.slice(0, 80))}`,
          severity: 'warning',
        });
        i++;
        continue;
      }
      const key = m[1]!;
      const inlineValue = m[2]!.trim();

      // Duplicate-key detection — first-seen wins, second emits warning
      // (matches MEMORY.md duplicate-entry behavior for consistency).
      if (seenKeys.has(key)) {
        diagnostics.push({
          line: lineNum,
          message: `duplicate frontmatter key '${key}' (first-seen value retained)`,
          severity: 'warning',
        });
        // Skip the duplicate's value/list to keep parser advancing.
        if (inlineValue.length > 0) {
          i++;
          continue;
        }
        let j = i + 1;
        while (j < end) {
          const next = lines[j]!;
          if (/^\s+-\s+/.test(next) || next.trim().length === 0) {
            j++;
          } else {
            break;
          }
        }
        i = j;
        continue;
      }
      seenKeys.add(key);

      // Inline-style: `key: value`
      if (inlineValue.length > 0) {
        const value = unquote(inlineValue);
        switch (key) {
          case 'name':
            name = value;
            break;
          case 'description':
            description = value;
            break;
          case 'tier':
            if (value === 'T1' || value === 'T2' || value === 'T3') {
              tier = value;
            } else {
              diagnostics.push({
                line: lineNum,
                message: `invalid tier value '${value}'; expected T1, T2, or T3`,
                severity: 'warning',
              });
            }
            break;
          case 'param_set':
            paramSet = value;
            break;
          case 'param_inline':
            paramInline = value;
            break;
          default:
            opaque.push({ key, value });
            break;
        }
        i++;
        continue;
      }

      // List-style: `key:` followed by `  - item` lines.
      const listItems: string[] = [];
      let j = i + 1;
      while (j < end) {
        const next = lines[j]!;
        const itemMatch = /^\s+-\s+(.*)$/.exec(next);
        if (itemMatch === null) {
          if (next.trim().length === 0) {
            j++;
            continue;
          }
          break;
        }
        listItems.push(unquote(itemMatch[1]!.trim()));
        j++;
      }

      switch (key) {
        case 'tools':
          tools.push(...listItems);
          break;
        case 'trigger_phrases':
          triggerPhrases.push(...listItems);
          break;
        default:
          // Not a known list-shaped key — record the empty value as
          // opaque so we don't lose the user's intent.
          opaque.push({ key, value: '' });
          for (const item of listItems) opaque.push({ key: `${key}[]`, value: item });
          break;
      }

      // After consuming list items (or none), advance past the key line.
      // If `j` advanced (items found), it now points just past the
      // last item; otherwise `j === i + 1` and we want the same.
      i = j;
    }

    if (name === null) {
      diagnostics.push({
        line: start + 1,
        message: "SKILL.md is missing required 'name' frontmatter key",
        severity: 'warning',
      });
    }
    if (description === null) {
      diagnostics.push({
        line: start + 1,
        message: "SKILL.md is missing required 'description' frontmatter key",
        severity: 'warning',
      });
    }
  }

  // Body is everything after the frontmatter; if no frontmatter, body
  // is the entire file (degenerate but tolerable).
  const body =
    fmRange === null
      ? base.raw
      : lines.slice(fmRange.end + 1).join('\n').replace(/^\n+/, '').replace(/\n+$/, '');

  return {
    ...base,
    kind: 'skills',
    skill: {
      name,
      description,
      tier,
      tools,
      triggerPhrases,
      paramSet,
      paramInline,
      opaque,
      body,
    },
  };

  // -- helpers ---------------------------------------------------------
  function locateFrontmatter(
    lines: readonly string[],
  ): { start: number; end: number } | null {
    if (lines.length < 2) return null;
    // Tolerate a UTF-8 BOM on the first line so files saved with BOM
    // still parse. `parseBase` does not strip BOM (it treats `raw` as
    // bytes), so we compare against `FENCE` after a local strip.
    const first = lines[0]!.replace(/^﻿/, '');
    if (first !== FENCE) return null;
    for (let k = 1; k < lines.length; k++) {
      if (lines[k] === FENCE) return { start: 1, end: k };
    }
    diagnostics.push({
      line: 1,
      message: 'SKILL.md frontmatter opens with --- but never closes',
      severity: 'warning',
    });
    return null;
  }
}

function unquote(value: string): string {
  if (value.length >= 2) {
    const first = value.charCodeAt(0);
    const last = value.charCodeAt(value.length - 1);
    if (first === last && (first === 34 || first === 39)) {
      // ASCII " (34) or ' (39)
      return value.slice(1, -1);
    }
  }
  return value;
}
