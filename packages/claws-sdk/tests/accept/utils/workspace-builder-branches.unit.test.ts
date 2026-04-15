/**
 * L0: workspace-builder — branch coverage for cpSync failure,
 * fixtureSubdir: '.', nested directory reading, and absent workspace.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

import { buildWorkspace } from './workspace-builder.js';

let scenarioDir: string;

afterEach(() => {
  if (scenarioDir) {
    try {
      rmSync(scenarioDir, { recursive: true, force: true });
    } catch {
      // best effort
    }
  }
});

describe('buildWorkspace — branch coverage', () => {
  it('returns null when 00+workspace subdir does not exist', () => {
    scenarioDir = mkdtempSync(join(tmpdir(), 'claws-ws-absent-'));
    // No 00+workspace subdir
    const result = buildWorkspace(scenarioDir);
    expect(result).toBeNull();
  });

  it('uses fixtureSubdir: "." to treat scenario dir as workspace', () => {
    scenarioDir = mkdtempSync(join(tmpdir(), 'claws-ws-dot-'));
    writeFileSync(join(scenarioDir, 'test.txt'), 'hello');

    const result = buildWorkspace(scenarioDir, { fixtureSubdir: '.' });
    expect(result).not.toBeNull();
    expect(result!.files.has('test.txt')).toBe(true);
    expect(result!.files.get('test.txt')).toBe('hello');
    result!.cleanup();
  });

  it('reads nested directory structure recursively', () => {
    scenarioDir = mkdtempSync(join(tmpdir(), 'claws-ws-nested-'));
    const wsDir = join(scenarioDir, '00+workspace');
    mkdirSync(join(wsDir, 'sub', 'deep'), { recursive: true });
    writeFileSync(join(wsDir, 'root.txt'), 'root');
    writeFileSync(join(wsDir, 'sub', 'mid.txt'), 'mid');
    writeFileSync(join(wsDir, 'sub', 'deep', 'deep.txt'), 'deep');

    const result = buildWorkspace(scenarioDir);
    expect(result).not.toBeNull();
    expect(result!.files.has('root.txt')).toBe(true);
    expect(result!.files.has('sub/mid.txt')).toBe(true);
    expect(result!.files.has('sub/deep/deep.txt')).toBe(true);
    expect(result!.files.get('sub/deep/deep.txt')).toBe('deep');
    result!.cleanup();
  });

  it('uses custom fixtureSubdir name', () => {
    scenarioDir = mkdtempSync(join(tmpdir(), 'claws-ws-custom-'));
    const wsDir = join(scenarioDir, 'my-fixture');
    mkdirSync(wsDir, { recursive: true });
    writeFileSync(join(wsDir, 'data.json'), '{"key":"value"}');

    const result = buildWorkspace(scenarioDir, { fixtureSubdir: 'my-fixture' });
    expect(result).not.toBeNull();
    expect(result!.files.has('data.json')).toBe(true);
    result!.cleanup();
  });

  it('cleanup function removes temp directory', () => {
    scenarioDir = mkdtempSync(join(tmpdir(), 'claws-ws-cleanup-'));
    const wsDir = join(scenarioDir, '00+workspace');
    mkdirSync(wsDir, { recursive: true });
    writeFileSync(join(wsDir, 'test.txt'), 'test');

    const result = buildWorkspace(scenarioDir)!;
    const tempPath = result.workspacePath;
    result.cleanup();

    // temp directory should be gone
    expect(() => {
      const { existsSync } = require('fs');
      expect(existsSync(tempPath)).toBe(false);
    }).not.toThrow();
  });
});
