/**
 * Extract phase — lift declarative intent out of the parsed workspace into
 * PolicyIR draft form. The Analyze phase later checks this draft for
 * governance-fatal invariants.
 */

import type { AstBlock, WorkspaceAst } from '@bic/openclaw-workspace/ast';

import type {
  Capability,
  DenyRule,
  PolicyIR,
  ProvenanceSource,
  RiskLevel,
  ToolSpec,
} from '../types/index.js';
import type { ParsedFile } from './parse.js';

export interface ExtractedDraft {
  soul: PolicyIR['soul'];
  tools: PolicyIR['tools'];
  skills: PolicyIR['skills'];
  agents: PolicyIR['agents'];
  user: PolicyIR['user'];
  governance: PolicyIR['governance'];
  identity: PolicyIR['identity'];
}

// Regexes in this module were refactored in 2026-04-19 to eliminate
// polynomial-backtracking risk flagged by CodeQL (`js/polynomial-redos`).
// We replaced lazy-quantifier + trailing-whitespace patterns with
// deterministic string-operation extraction. Each parser now advances
// linearly through bounded single-line input with no regex-engine
// backtracking.

function isHtab(ch: string | undefined): boolean {
  return ch === ' ' || ch === '\t';
}

function trimTabsAndSpaces(s: string): string {
  let start = 0;
  let end = s.length;
  while (start < end && isHtab(s[start])) start++;
  while (end > start && isHtab(s[end - 1])) end--;
  return s.slice(start, end);
}

export function extractDenyRules(parsed: ParsedFile): DenyRule[] {
  if (parsed.kind !== 'soul') return [];
  const block = findBlock(parsed.ast, 'Boundaries');
  if (!block) return [];
  const rules: DenyRule[] = [];
  let idx = 0;
  for (const line of block.bodyLines) {
    // Match `[-*] + 1+ tab/space + content` deterministically:
    // identify prefix, then slice + trim. No regex backtracking.
    const leadCh = line[0];
    if (leadCh !== '-' && leadCh !== '*') continue;
    if (!isHtab(line[1])) continue;
    // Skip any additional leading whitespace after the bullet.
    let i = 2;
    while (isHtab(line[i])) i++;
    const content = trimTabsAndSpaces(line.slice(i));
    if (!content) continue;
    rules.push({
      id: `SOUL-${++idx}`,
      pattern: toPattern(content),
      reason: content,
      severity: 'review',
    });
  }
  return rules;
}

export function extractArgsFrom(section: string): Record<string, ProvenanceSource[]> {
  const out: Record<string, ProvenanceSource[]> = {};
  let currentKey: string | null = null;
  let sources: ProvenanceSource[] = [];
  for (const line of section.split(/\r?\n/)) {
    // Match `  (2+ whitespace) key: [val,val,...]` without regex-engine
    // backtracking. Scan leading whitespace → colon → brackets → tail.
    let i = 0;
    while (isHtab(line[i])) i++;
    if (i < 2) continue;
    const colonIdx = line.indexOf(':', i);
    if (colonIdx <= i) continue;
    const key = line.slice(i, colonIdx);
    if (!/^\w+$/.test(key)) continue; // anchored, bounded-length
    // Skip whitespace after colon, then require `[`.
    let j = colonIdx + 1;
    while (isHtab(line[j])) j++;
    if (line[j] !== '[') continue;
    // Find closing bracket; tail must be whitespace-only to EOL.
    const closeIdx = line.indexOf(']', j + 1);
    if (closeIdx === -1) continue;
    const tail = line.slice(closeIdx + 1);
    if (trimTabsAndSpaces(tail).length !== 0) continue;
    const inner = line.slice(j + 1, closeIdx);
    if (currentKey !== null) out[currentKey] = sources;
    currentKey = key;
    sources = inner
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map(parseSource);
  }
  if (currentKey !== null) out[currentKey] = sources;
  return out;
}

export function extractTools(parsed: ParsedFile): ToolSpec[] {
  if (parsed.kind !== 'tools') return [];
  const block = findBlock(parsed.ast, 'Tools');
  if (!block) return [];
  const tools: ToolSpec[] = [];
  const body = block.bodyLines.join('\n');
  const blocks = body.split(/\n(?=###\s)/);
  for (const sub of blocks) {
    // First line: `### name [# meta]` — scan linearly.
    const nlIdx = sub.indexOf('\n');
    const firstLine = nlIdx === -1 ? sub : sub.slice(0, nlIdx);
    if (!firstLine.startsWith('###')) continue;
    let i = 3;
    if (!isHtab(firstLine[i])) continue;
    while (isHtab(firstLine[i])) i++;
    const nameStart = i;
    while (i < firstLine.length) {
      const ch = firstLine[i]!;
      const code = ch.charCodeAt(0);
      // [\w-] class: letters, digits, underscore, hyphen
      const isNameChar =
        (code >= 0x30 && code <= 0x39) || // 0-9
        (code >= 0x41 && code <= 0x5a) || // A-Z
        (code >= 0x61 && code <= 0x7a) || // a-z
        code === 0x5f ||                   // _
        code === 0x2d;                     // -
      if (!isNameChar) break;
      i++;
    }
    const name = firstLine.slice(nameStart, i);
    if (!name) continue;
    // Optional: ` # meta`
    let meta = '';
    while (isHtab(firstLine[i])) i++;
    if (firstLine[i] === '#') {
      i++;
      while (isHtab(firstLine[i])) i++;
      meta = trimTabsAndSpaces(firstLine.slice(i));
    } else if (i < firstLine.length && !isHtab(firstLine[i])) {
      // Trailing garbage is not a valid tool header.
      continue;
    }
    const riskLevel = clampRisk(meta);
    const capabilities = extractCapabilities(meta);
    // Find `args_from:` section in the sub-block without lazy lookahead.
    const marker = 'args_from:';
    const markerIdx = sub.indexOf(marker);
    const tool: ToolSpec = { name, riskLevel, capabilities };
    if (markerIdx !== -1) {
      let k = markerIdx + marker.length;
      while (isHtab(sub[k])) k++;
      if (sub[k] === '\n') {
        k++;
        // End at next `\n###` header or end-of-section.
        let endIdx = sub.indexOf('\n###', k);
        if (endIdx === -1) endIdx = sub.length;
        const argsBody = sub.slice(k, endIdx);
        if (argsBody) tool.argsFrom = extractArgsFrom(argsBody);
      }
    }
    tools.push(clampIrreversibleExternal(tool));
  }
  return tools;
}

export function clampIrreversibleExternal(tool: ToolSpec): ToolSpec {
  if (tool.capabilities.includes('IRREVERSIBLE_EXTERNAL') && tool.riskLevel < 5) {
    return { ...tool, riskLevel: 5 };
  }
  return tool;
}

export function extractCapabilities(meta: string): Capability[] {
  const tokens = meta.split(/[,\s]+/).map((t) => t.trim().toUpperCase());
  const known: Capability[] = [
    'READ',
    'WRITE',
    'COMMUNICATE',
    'IRREVERSIBLE_EXTERNAL',
    'FLEET_PRIVILEGED',
    'IDENTITY',
  ];
  return known.filter((c) => tokens.includes(c));
}

function findBlock(ast: WorkspaceAst, heading: string): AstBlock | undefined {
  return ast.blocks.find((b) => b.heading === heading);
}

function clampRisk(meta: string): RiskLevel {
  const m = /R([0-5])/.exec(meta);
  if (!m || !m[1]) return 1;
  return Number(m[1]) as RiskLevel;
}

function parseSource(token: string): ProvenanceSource {
  if (token === 'user_prompt' || token === 'agent_literal') return token;
  const optMatch = /^tool_output\.([\w-]+)(\?)?$/.exec(token);
  if (optMatch && optMatch[1]) {
    const src: ProvenanceSource = { tool_output: optMatch[1] };
    if (optMatch[2]) src.optional = true;
    return src;
  }
  const memMatch = /^memory\.(PUBLIC|INTERNAL|CONFIDENTIAL|RESTRICTED)$/.exec(token);
  if (memMatch && memMatch[1]) {
    return { memory: memMatch[1] as ProvenanceSource extends { memory: infer S } ? S : never };
  }
  return 'user_prompt';
}

function toPattern(reason: string): string {
  const first = reason.split(/[.,;:]/)[0] ?? reason;
  const keywords = first
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 3);
  return keywords.length > 0 ? `*${keywords.join('*')}*` : '*';
}
