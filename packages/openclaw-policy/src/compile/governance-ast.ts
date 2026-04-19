/**
 * Governance AST — lightweight typed view of governance declarations
 * (delegation maps, architecture boundaries, sensitivity propagation).
 */

import type { Boundary, Edge, GovernanceRule, Sensitivity } from '../types/index.js';

export interface GovernanceAst {
  delegations: Array<{ from: string; to: string; scope: string }>;
  boundaries: Boundary[];
  edges: Edge[];
  rules: GovernanceRule[];
  surface: string[];
}

export function buildGovernanceAst(sections: Record<string, string>): GovernanceAst {
  return {
    delegations: parseDelegations(sections['Delegation'] ?? ''),
    boundaries: parseBoundaries(sections['Boundaries'] ?? ''),
    edges: parseEdges(sections['Propagation'] ?? ''),
    rules: [],
    surface: parseSurface(sections['Governance'] ?? ''),
  };
}

function parseDelegations(body: string): GovernanceAst['delegations'] {
  const out: GovernanceAst['delegations'] = [];
  for (const line of body.split(/\r?\n/)) {
    const m = /^[-*]\s+(\w+)\s+->\s+(\w+)(?:\s+\((.+)\))?/.exec(line);
    if (m && m[1] && m[2]) {
      out.push({ from: m[1], to: m[2], scope: m[3] ?? '' });
    }
  }
  return out;
}

function parseBoundaries(body: string): Boundary[] {
  const out: Boundary[] = [];
  for (const line of body.split(/\r?\n/)) {
    const m = /^[-*]\s+(\w+)\s+([\|:])\s+(\w+)/.exec(line);
    if (m && m[1] && m[2] && m[3]) {
      out.push({
        from: m[1],
        to: m[3],
        kind: m[2] === '|' ? 'isolation' : 'delegation',
      });
    }
  }
  return out;
}

function parseEdges(body: string): Edge[] {
  const out: Edge[] = [];
  for (const line of body.split(/\r?\n/)) {
    const m = /^[-*]\s+(\w+)\s+=>\s+(\w+)\s*:\s*(PUBLIC|INTERNAL|CONFIDENTIAL|RESTRICTED)/.exec(
      line,
    );
    if (m && m[1] && m[2] && m[3]) {
      out.push({ from: m[1], to: m[2], sensitivity: m[3] as Sensitivity });
    }
  }
  return out;
}

function parseSurface(body: string): string[] {
  const out: string[] = [];
  for (const line of body.split(/\r?\n/)) {
    const m = /^[-*]\s+`([^`]+)`/.exec(line);
    if (m && m[1]) out.push(m[1]);
  }
  return out;
}
