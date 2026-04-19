/**
 * L0 unit tests for `buildWorkspaceSchema` — pure projection, no I/O.
 *
 * Pulse 64 acceptance: 6 scenarios covering present/missing files, empty
 * workspace, section parsing, session inclusion, and compilation status.
 *
 * CAP subsections (Knowledge Sources, Entitlements, Deny Rules) live
 * under IDENTITY.md since CP-5 M01 and route via the section override
 * map.
 */

import { describe, expect, it } from 'vitest';
import { buildWorkspaceSchema } from '../../src/workspace/schema-builder.js';
import type {
  CompilationStatus,
  ViolationState,
  WorkspaceSessionInfo,
} from '../../src/workspace/schema-types.js';
import {
  OC_PARSED_FILES,
  type SectionBase,
  type WorkspaceState,
} from '@bic/openclaw-workspace/path';

function section(
  preamble: string,
  sections: ReadonlyArray<{ heading: string; body?: string; line?: number }>,
): SectionBase {
  return {
    raw: preamble,
    preamble,
    sections: sections.map((s, i) => ({
      heading: s.heading,
      body: s.body ?? '',
      line: s.line ?? i + 1,
    })),
  };
}

/** Build a full WorkspaceState with every slot populated. */
function fullWorkspace(): WorkspaceState {
  return {
    workspaceRoot: '/ws',
    soul: section('Persona preamble.', [{ heading: 'Purpose' }, { heading: 'Boundaries' }]),
    memory: section('', [{ heading: 'Personal' }, { heading: 'Shared' }]),
    identity: section('', [
      { heading: 'Organization' },
      { heading: 'RBAC' },
      { heading: 'M365' },
      { heading: 'Deny Rules' },
      { heading: 'Knowledge Sources' },
      { heading: 'Entitlements' },
    ]),
    tools: section('', [{ heading: 'bash' }, { heading: 'web_fetch' }]),
    agents: section('', [{ heading: 'planner' }]),
    user: section('', [{ heading: 'Contact' }]),
    heartbeat: section('', [{ heading: 'On Start' }]),
  };
}

/** Minimal workspace: only SOUL.md present (other slots null). */
function minimalWorkspace(): WorkspaceState {
  return {
    workspaceRoot: '/ws',
    soul: section('Only soul exists.', []),
    memory: null,
    identity: null,
    tools: null,
    agents: null,
    user: null,
    heartbeat: null,
  };
}

describe('buildWorkspaceSchema', () => {
  it('emits one FileSchema per canonical OC file with all present', () => {
    const schema = buildWorkspaceSchema(fullWorkspace());

    expect(schema.schemaVersion).toBe(1);
    expect(schema.workspaceRoot).toBe('/ws');
    expect(schema.files.map((f) => f.name)).toEqual([...OC_PARSED_FILES]);
    for (const file of schema.files) {
      expect(file.exists).toBe(true);
      expect(file.hasViolation).toBe(false);
    }
    expect(schema.sessions).toEqual([]);
    expect(schema.compilation.kind).toBe('uncompiled');
    expect(schema.violationState.kind).toBe('clean');
  });

  it('marks missing optional files as exists: false with empty sections', () => {
    const schema = buildWorkspaceSchema(minimalWorkspace());

    const byName = new Map(schema.files.map((f) => [f.name, f]));
    expect(byName.get('SOUL.md')!.exists).toBe(true);
    expect(byName.get('MEMORY.md')!.exists).toBe(false);
    expect(byName.get('MEMORY.md')!.sections).toEqual([]);
    expect(byName.get('IDENTITY.md')!.exists).toBe(false);
    // Missing files still appear — partners rely on exists: false, not 404.
    expect(schema.files).toHaveLength(OC_PARSED_FILES.length);
  });

  it('empty workspace (SOUL.md only, no H2 sections) yields exists: true with empty sections', () => {
    const ws = minimalWorkspace();
    const schema = buildWorkspaceSchema(ws);

    const soul = schema.files.find((f) => f.name === 'SOUL.md')!;
    expect(soul.exists).toBe(true);
    expect(soul.sections).toEqual([]);
  });

  it('maps sections to chunk endpoints using overrides and primary-chunk fallback', () => {
    const schema = buildWorkspaceSchema(fullWorkspace());

    const identity = schema.files.find((f) => f.name === 'IDENTITY.md')!;
    // IDENTITY.md sections — each has an explicit override in
    // SECTION_CHUNK_OVERRIDES covering both the "classic" sections and the
    // CAP subsections that migrated from standalone files.
    const org = identity.sections.find((s) => s.heading === 'Organization')!;
    expect(org.chunk).toEqual({ tab: 'general', section: 'identity' });
    expect(org.editable).toBe(true);

    const rbac = identity.sections.find((s) => s.heading === 'RBAC')!;
    expect(rbac.chunk).toEqual({ tab: 'preferences', section: 'prefs' });
    expect(rbac.editable).toBe(true);

    const m365 = identity.sections.find((s) => s.heading === 'M365')!;
    expect(m365.chunk).toEqual({ tab: 'groups', section: 'membership' });

    // Migrated CAP subsections:
    const knowledge = identity.sections.find((s) => s.heading === 'Knowledge Sources')!;
    expect(knowledge.chunk).toEqual({ tab: 'memory', section: 'knowledge' });
    expect(knowledge.editable).toBe(true);

    // Entitlements is read-only — chunk present, editable=false.
    const ent = identity.sections.find((s) => s.heading === 'Entitlements')!;
    expect(ent.chunk).toEqual({ tab: 'entitlements', section: 'grants' });
    expect(ent.editable).toBe(false);

    // Deny Rules is governance-only — no chunk, editable=false.
    const deny = identity.sections.find((s) => s.heading === 'Deny Rules')!;
    expect(deny.chunk).toBeUndefined();
    expect(deny.editable).toBe(false);

    // SOUL.md falls through to primary chunk 'preferences' with slugified heading.
    const soul = schema.files.find((f) => f.name === 'SOUL.md')!;
    const purpose = soul.sections.find((s) => s.heading === 'Purpose')!;
    expect(purpose.chunk).toEqual({ tab: 'preferences', section: 'purpose' });
    expect(purpose.editable).toBe(true);
  });

  it('includes the supplied sessions verbatim', () => {
    const sessions: WorkspaceSessionInfo[] = [
      { id: 'sess-1', label: 'cron:daily', startedAt: '2026-04-17T00:00:00.000Z' },
      { id: 'sess-2' },
    ];
    const schema = buildWorkspaceSchema(fullWorkspace(), { sessions });
    expect(schema.sessions).toEqual(sessions);
  });

  it('surfaces compilation status and violation state, marking violating files', () => {
    const compilation: CompilationStatus = {
      kind: 'stale',
      compiledAt: '2026-04-17T01:02:03.000Z',
      hash: 'sha256-abc',
    };
    const violationState: ViolationState = {
      kind: 'degraded',
      pendingViolations: ['SOUL.md', 'TOOLS.md'],
    };
    const schema = buildWorkspaceSchema(fullWorkspace(), { compilation, violationState });

    expect(schema.compilation).toEqual(compilation);
    expect(schema.violationState).toEqual(violationState);

    const byName = new Map(schema.files.map((f) => [f.name, f]));
    expect(byName.get('SOUL.md')!.hasViolation).toBe(true);
    expect(byName.get('TOOLS.md')!.hasViolation).toBe(true);
    expect(byName.get('MEMORY.md')!.hasViolation).toBe(false);
  });
});
