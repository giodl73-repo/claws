/**
 * L0 Unit: Verify all claws-sdk imports use `import type` (no value imports).
 *
 * The skill-kit must only import types from claws-sdk — never runtime values.
 * This ensures skill-kit works standalone without claws-sdk installed.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const SRC_DIR = resolve(__dirname, '../../src');

/**
 * Recursively collect all .ts files under a directory.
 */
function collectTsFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...collectTsFiles(full));
    } else if (full.endsWith('.ts') && !full.endsWith('.d.ts')) {
      results.push(full);
    }
  }
  return results;
}

/**
 * Check if a line is a value import (not `import type`) from claws-sdk.
 */
function isValueImportFromClawsSdk(line: string): boolean {
  const trimmed = line.trim();
  // Must be an import line referencing claws-sdk
  if (!trimmed.startsWith('import') || !trimmed.includes('claws-sdk')) {
    return false;
  }
  // import type { ... } from '...' — allowed
  if (trimmed.startsWith('import type ')) {
    return false;
  }
  // import { type Foo, type Bar } from '...' — check if ALL imports are type-only
  const braceMatch = trimmed.match(/import\s*\{([^}]+)\}\s*from/);
  if (braceMatch) {
    const imports = braceMatch[1]!.split(',').map((s) => s.trim());
    const allTypeOnly = imports.every((imp) => imp.startsWith('type '));
    if (allTypeOnly) {
      return false;
    }
    return true;
  }
  // Any other import from claws-sdk is a value import
  return true;
}

describe('import type-only from claws-sdk', () => {
  const tsFiles = collectTsFiles(SRC_DIR);

  it('found source files to check', () => {
    expect(tsFiles.length).toBeGreaterThan(0);
  });

  it('all claws-sdk imports use `import type`', () => {
    const violations: string[] = [];

    for (const file of tsFiles) {
      const content = readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (isValueImportFromClawsSdk(lines[i]!)) {
          const relative = file.replace(SRC_DIR, 'src');
          violations.push(`${relative}:${i + 1}: ${lines[i]!.trim()}`);
        }
      }
    }

    expect(
      violations,
      `Found value imports from claws-sdk (must use \`import type\`):\n${violations.join('\n')}`,
    ).toHaveLength(0);
  });
});
