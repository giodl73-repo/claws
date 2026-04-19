import { describe, expect, it } from 'vitest';
import { WorkspaceError } from '../../src/path/index.js';

describe('WorkspaceError', () => {
  it('carries workspaceRoot and default code', () => {
    const err = new WorkspaceError('SOUL missing', '/x');
    expect(err.workspaceRoot).toBe('/x');
    expect(err.code).toBe('WORKSPACE_SOUL_MISSING');
    expect(err.name).toBe('WorkspaceError');
    expect(err).toBeInstanceOf(Error);
  });

  it('accepts custom code', () => {
    const err = new WorkspaceError('boom', '/x', 'CUSTOM_CODE');
    expect(err.code).toBe('CUSTOM_CODE');
  });
});
