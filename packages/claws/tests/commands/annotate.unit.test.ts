/**
 * L0: annotate command — heuristic governance annotation wiring + JSON/text output.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

// ── SDK mocks ───────────────────────────────────────────────────────────────

const mockAnnotateDirectory = vi.fn();
const mockFormatAnnotation = vi.fn();

vi.mock('@bic/claws-sdk/annotate', () => ({
  annotateDirectory: (...args: unknown[]) => mockAnnotateDirectory(...args),
  formatAnnotation: (...args: unknown[]) => mockFormatAnnotation(...args),
}));

// ── Imports (after mocks) ───────────────────────────────────────────────────

import { runAnnotate } from '../../src/commands/annotate.js';

// ── Helpers ─────────────────────────────────────────────────────────────────

const jsonOpts = { json: true, dryRun: false } as const;
const textOpts = { json: false, dryRun: false } as const;
const dryRunJsonOpts = { json: true, dryRun: true } as const;
const dryRunTextOpts = { json: false, dryRun: true } as const;

function resetMocks() {
  vi.restoreAllMocks();
  mockAnnotateDirectory.mockReset();
  mockFormatAnnotation.mockReset();
}

function makeAnnotation(overrides: Record<string, unknown> = {}) {
  return {
    name: 'my-skill',
    riskClass: 2,
    riskConfidence: 0.876,
    obo: { detected: true, matchedPatterns: ['pattern-a'] },
    dataClassification: 'internal',
    evidence: ['heuristic-1'],
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('claws annotate', () => {
  afterEach(() => { resetMocks(); });

  it('returns 0 and prints annotations (text)', async () => {
    const annotation = makeAnnotation();
    mockAnnotateDirectory.mockResolvedValue({
      annotations: [annotation],
      modifiedFiles: ['skills/my-skill.yaml'],
    });
    mockFormatAnnotation.mockReturnValue('  my-skill  R2  0.88  obo=true');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runAnnotate('/skills', textOpts);
      expect(code).toBe(0);
      expect(mockAnnotateDirectory).toHaveBeenCalledWith('/skills', { dryRun: false });
      const output = logSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Applied annotations:');
      expect(output).toContain('my-skill  R2  0.88  obo=true');
      expect(output).toContain('1 skill(s) analyzed.');
      expect(output).toContain('1 file(s) updated.');
    } finally { logSpy.mockRestore(); }
  });

  it('returns 0 and outputs JSON on success', async () => {
    const annotation = makeAnnotation();
    mockAnnotateDirectory.mockResolvedValue({
      annotations: [annotation],
      modifiedFiles: ['skills/my-skill.yaml'],
    });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runAnnotate('/skills', jsonOpts);
      expect(code).toBe(0);
      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('ok');
      expect(parsed.dryRun).toBe(false);
      expect(parsed.annotations).toHaveLength(1);
      expect(parsed.annotations[0].name).toBe('my-skill');
      expect(parsed.annotations[0].risk).toBe('R2');
      expect(parsed.annotations[0].riskConfidence).toBe(0.88);
      expect(parsed.annotations[0].obo).toBe(true);
      expect(parsed.annotations[0].oboPatterns).toEqual(['pattern-a']);
      expect(parsed.annotations[0].dataClassification).toBe('internal');
      expect(parsed.modifiedFiles).toEqual(['skills/my-skill.yaml']);
    } finally { logSpy.mockRestore(); }
  });

  it('returns 0 with dry-run label (text)', async () => {
    const annotation = makeAnnotation();
    mockAnnotateDirectory.mockResolvedValue({
      annotations: [annotation],
      modifiedFiles: [],
    });
    mockFormatAnnotation.mockReturnValue('  my-skill  R2');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runAnnotate('/skills', dryRunTextOpts);
      expect(code).toBe(0);
      expect(mockAnnotateDirectory).toHaveBeenCalledWith('/skills', { dryRun: true });
      const output = logSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Proposed annotations (dry-run):');
      expect(output).not.toContain('file(s) updated');
    } finally { logSpy.mockRestore(); }
  });

  it('returns 0 with dry-run in JSON', async () => {
    const annotation = makeAnnotation();
    mockAnnotateDirectory.mockResolvedValue({
      annotations: [annotation],
      modifiedFiles: [],
    });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runAnnotate('/skills', dryRunJsonOpts);
      expect(code).toBe(0);
      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.dryRun).toBe(true);
    } finally { logSpy.mockRestore(); }
  });

  it('returns 0 with "No skills found" when empty (text)', async () => {
    mockAnnotateDirectory.mockResolvedValue({ annotations: [], modifiedFiles: [] });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runAnnotate('/skills', textOpts);
      expect(code).toBe(0);
      const output = logSpy.mock.calls.flat().join(' ');
      expect(output).toContain('No skills found in directory.');
    } finally { logSpy.mockRestore(); }
  });

  it('returns 0 with empty annotations JSON when empty', async () => {
    mockAnnotateDirectory.mockResolvedValue({ annotations: [], modifiedFiles: [] });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runAnnotate('/skills', jsonOpts);
      expect(code).toBe(0);
      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('ok');
      expect(parsed.annotations).toHaveLength(0);
      expect(parsed.message).toBe('No skills found');
    } finally { logSpy.mockRestore(); }
  });

  it('returns 3 and prints error when SDK throws (text)', async () => {
    mockAnnotateDirectory.mockRejectedValue(new Error('ENOENT'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runAnnotate('/bad-dir', textOpts);
      expect(code).toBe(3);
      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Cannot read skill directory: /bad-dir');
    } finally { errorSpy.mockRestore(); }
  });

  it('returns 3 and outputs JSON error when SDK throws', async () => {
    mockAnnotateDirectory.mockRejectedValue(new Error('ENOENT'));
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runAnnotate('/bad-dir', jsonOpts);
      expect(code).toBe(3);
      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('error');
      expect(parsed.message).toContain('Cannot read skill directory: /bad-dir');
    } finally { logSpy.mockRestore(); }
  });

  it('does not print "file(s) updated" in text when no files modified and not dry-run', async () => {
    const annotation = makeAnnotation();
    mockAnnotateDirectory.mockResolvedValue({
      annotations: [annotation],
      modifiedFiles: [],
    });
    mockFormatAnnotation.mockReturnValue('  my-skill  R2');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runAnnotate('/skills', textOpts);
      expect(code).toBe(0);
      const output = logSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Applied annotations:');
      expect(output).not.toContain('file(s) updated');
    } finally { logSpy.mockRestore(); }
  });
});
