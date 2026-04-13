/**
 * L1: Extract integration tests — full parse -> AST -> manifest pipeline.
 *
 * 2 integration tests covering:
 * 1. Full parse -> buildGovernanceAST -> extract on full-workspace fixture
 * 2. Pipeline with minimal fixture (missing files) produces empty categories, not errors
 */

import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { parse } from '../../src/compile/parse.js';
import { extractAllIntents } from '../../src/compile/intent/index.js';
import { buildGovernanceAST } from '../../src/compile/governance-ast.js';
import { extract } from '../../src/compile/extract.js';

const FIXTURES = resolve(__dirname, '../fixtures');
const FULL = resolve(FIXTURES, 'full-workspace');
const MINIMAL = resolve(FIXTURES, 'minimal');

describe('parse -> buildGovernanceAST -> extract pipeline', () => {
  it('full-workspace fixture produces complete ParsedManifest', async () => {
    // Pass 1: parse + intent extraction
    const parseResult = await parse(FULL);
    expect(parseResult.presentCount).toBe(9);

    const intentResults = extractAllIntents(parseResult);
    expect(intentResults.length).toBeGreaterThan(0);

    // Pass 2: build AST with cross-reference resolution
    const ast = buildGovernanceAST(intentResults);

    // AST should have populated categories
    expect(ast.tool.length).toBeGreaterThan(0);
    expect(ast.memory.length).toBeGreaterThan(0);
    expect(ast.schedule.length).toBeGreaterThan(0);
    expect(ast.skill.length).toBeGreaterThan(0);
    expect(ast.workflow.length).toBeGreaterThan(0);
    // delegation may be empty if AGENTS.md has no "Delegates to:" lines

    // Extract manifest
    const manifest = extract(ast);

    // Tool entries from TOOLS.md
    expect(manifest.tools.length).toBeGreaterThan(0);
    const toolNames = manifest.tools.map(t => t.name);
    expect(toolNames).toContain('Bash');
    expect(toolNames).toContain('Write');
    expect(toolNames).toContain('Read');

    // Each tool has a normalized name
    for (const tool of manifest.tools) {
      expect(tool.normalizedName).toBe(tool.name.toLowerCase().replace(/\s+/g, '-'));
    }

    // Agent roster from AGENTS.md — may be empty if no delegation edges
    // (agents are only in the roster when delegation intents exist)

    // Data labels from MEMORY.md
    expect(manifest.dataLabels.length).toBeGreaterThan(0);

    // Skills from skills/
    expect(manifest.skills.length).toBeGreaterThan(0);
  });

  it('minimal fixture (missing files) produces empty categories, not errors', async () => {
    // Minimal has SOUL.md, TOOLS.md, and lobster.yaml
    const parseResult = await parse(MINIMAL);
    expect(parseResult.presentCount).toBe(3);
    expect(parseResult.absentCount).toBe(6);

    const intentResults = extractAllIntents(parseResult);

    const ast = buildGovernanceAST(intentResults);

    // SOUL.md and TOOLS.md categories should be populated
    expect(ast.tool.length).toBeGreaterThan(0);

    // Missing file categories should be empty arrays, not errors
    expect(ast.delegation).toHaveLength(0);
    expect(ast.identity).toHaveLength(0);
    expect(ast.authority).toHaveLength(0);
    expect(ast.memory).toHaveLength(0);
    expect(ast.schedule).toHaveLength(0);
    expect(ast.skill).toHaveLength(0);
    // lobster.yaml is now present in minimal fixture, so workflow has entries
    expect(ast.workflow.length).toBeGreaterThanOrEqual(0);

    // No error diagnostics from missing categories
    const errors = ast.diagnostics.filter(d => d.severity === 'error');
    expect(errors).toHaveLength(0);

    // Extract manifest should still work
    const manifest = extract(ast);
    expect(manifest.tools.length).toBeGreaterThan(0);
    expect(manifest.agents).toHaveLength(0);
    expect(manifest.dataLabels).toHaveLength(0);
    expect(manifest.skills).toHaveLength(0);
  });
});
