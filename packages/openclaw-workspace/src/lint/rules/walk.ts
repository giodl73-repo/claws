/**
 * Shared AST walker for lint rules.
 *
 * Visits every node in the document, providing the current path
 * (stringified keys + numeric array indices) for context-aware rules.
 *
 * @module @bic/openclaw-workspace/lint/rules/walk
 */

import type {
  JsoncObjectNode,
  JsoncValue,
  JsoncArrayNode,
  JsoncMember,
} from '../../ast/jsonc/ast-types.js';

export interface WalkContext {
  readonly path: readonly (string | number)[];
  readonly node: JsoncValue;
  readonly parent: JsoncValue | null;
  readonly member: JsoncMember | null;
}

export function walk(
  root: JsoncValue | null,
  visit: (ctx: WalkContext) => void,
): void {
  if (!root) return;
  walkInner(root, [], null, null, visit);
}

function walkInner(
  node: JsoncValue,
  path: (string | number)[],
  parent: JsoncValue | null,
  member: JsoncMember | null,
  visit: (ctx: WalkContext) => void,
): void {
  visit({ path: [...path], node, parent, member });
  if (node.kind === 'object') {
    for (const m of node.members) {
      path.push(m.key.value);
      walkInner(m.value, path, node, m, visit);
      path.pop();
    }
  } else if (node.kind === 'array') {
    for (let i = 0; i < node.elements.length; i++) {
      path.push(i);
      walkInner(node.elements[i]!, path, node, null, visit);
      path.pop();
    }
  }
}

export function isObject(node: JsoncValue): node is JsoncObjectNode {
  return node.kind === 'object';
}

export function isArray(node: JsoncValue): node is JsoncArrayNode {
  return node.kind === 'array';
}
