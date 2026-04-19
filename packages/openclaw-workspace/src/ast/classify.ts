/**
 * classify(path) — map a filesystem path or basename to its
 * WorkspaceFileKind, or `null` if the path doesn't belong to the OC
 * workspace registry.
 *
 * @module @bic/openclaw-workspace/ast/classify
 */

import type { WorkspaceFileKind } from './grammars.generated.js';

const BASENAME_MAP: Record<string, WorkspaceFileKind> = {
  'SOUL.md': 'soul',
  'TOOLS.md': 'tools',
  'AGENTS.md': 'agents',
  'MEMORY.md': 'memory',
  'IDENTITY.md': 'entities',
  'USER.md': 'entities',
  'HEARTBEAT.md': 'tasks',
  'lobster.yaml': 'config',
};

export function classify(path: string): WorkspaceFileKind | null {
  const normalized = path.replace(/\\/g, '/');
  const base = normalized.slice(normalized.lastIndexOf('/') + 1);
  if (base in BASENAME_MAP) return BASENAME_MAP[base]!;
  if (normalized.includes('/skills/') || normalized.startsWith('skills/')) {
    return 'skills';
  }
  if (normalized.includes('/workflows/') || normalized.startsWith('workflows/')) {
    return 'workflows';
  }
  if (normalized.includes('/roles/') || normalized.startsWith('roles/')) {
    return 'roles';
  }
  if (normalized.includes('/governance/') || normalized.startsWith('governance/')) {
    return 'governance';
  }
  return null;
}
