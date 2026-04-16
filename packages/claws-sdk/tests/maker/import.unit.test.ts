/**
 * L0 unit tests for maker import engine.
 *
 * P28: .claws/ structure created, original files untouched.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, readFile, readdir, rm, stat, cp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';

import { makerImport } from '../../src/maker/import.js';

const FIXTURE_DIR = join(__dirname, '..', 'fixtures', 'ungoverned-skill');

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'claws-import-unit-'));
  // Copy fixture to temp dir so we don't pollute the fixture
  await cp(FIXTURE_DIR, tempDir, { recursive: true });
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf-8').digest('hex');
}

describe('.claws/ structure created', () => {
  it('creates .claws/ directory with governance.yaml, manifest.yaml, decorators.ts', async () => {
    const result = await makerImport({ skillDir: tempDir });

    // .claws/ directory exists
    const clawsDir = join(tempDir, '.claws');
    const clawsStat = await stat(clawsDir);
    expect(clawsStat.isDirectory()).toBe(true);

    // All 3 governance files created
    expect(result.createdFiles).toContain('.claws/governance.yaml');
    expect(result.createdFiles).toContain('.claws/manifest.yaml');
    expect(result.createdFiles).toContain('.claws/decorators.ts');

    // Files exist on disk
    const clawsEntries = await readdir(clawsDir);
    expect(clawsEntries.sort()).toEqual(['decorators.ts', 'governance.yaml', 'manifest.yaml']);

    // governance.yaml has expected content
    const governance = await readFile(join(clawsDir, 'governance.yaml'), 'utf-8');
    expect(governance).toContain('name: send-invoice');
    expect(governance).toContain('tier:');
    expect(governance).toContain('risk: R');

    // manifest.yaml has file entries
    const manifest = await readFile(join(clawsDir, 'manifest.yaml'), 'utf-8');
    expect(manifest).toContain('skill: send-invoice');
    expect(manifest).toContain('path: SKILL.md');
    expect(manifest).toContain('path: handler.ts');
    expect(manifest).toContain('hash:');

    // decorators.ts has suggestions
    const decorators = await readFile(join(clawsDir, 'decorators.ts'), 'utf-8');
    expect(decorators).toContain('@Risk');
  });

  it('reports skill name from SKILL.md frontmatter', async () => {
    const result = await makerImport({ skillDir: tempDir });
    expect(result.name).toBe('send-invoice');
  });

  it('records original files in manifest with correct hashes', async () => {
    const skillMdContent = await readFile(join(tempDir, 'SKILL.md'), 'utf-8');
    const handlerContent = await readFile(join(tempDir, 'handler.ts'), 'utf-8');

    const result = await makerImport({ skillDir: tempDir });

    const skillEntry = result.manifest.find(m => m.path === 'SKILL.md');
    expect(skillEntry).toBeDefined();
    expect(skillEntry!.hash).toBe(sha256(skillMdContent));
    expect(skillEntry!.role).toBe('skill-md');

    const handlerEntry = result.manifest.find(m => m.path === 'handler.ts');
    expect(handlerEntry).toBeDefined();
    expect(handlerEntry!.hash).toBe(sha256(handlerContent));
    expect(handlerEntry!.role).toBe('handler');
  });

  it('throws when .claws/ already exists', async () => {
    // First import
    await makerImport({ skillDir: tempDir });

    // Second import should fail
    await expect(
      makerImport({ skillDir: tempDir }),
    ).rejects.toThrow('already imported');
  });

  it('throws when skill directory does not exist', async () => {
    await expect(
      makerImport({ skillDir: join(tempDir, 'nonexistent') }),
    ).rejects.toThrow('does not exist');
  });
});

describe('classifyFileRole coverage', () => {
  it('classifies handler.js as handler role', async () => {
    const skillDir = await mkdtemp(join(tmpdir(), 'claws-import-js-'));
    try {
      await writeFile(join(skillDir, 'SKILL.md'), [
        '---',
        'name: js-handler',
        'description: A skill with JS handler',
        '---',
        '',
        '# JS Handler',
      ].join('\n'), 'utf-8');
      await writeFile(join(skillDir, 'handler.js'), 'module.exports = {};', 'utf-8');

      const result = await makerImport({ skillDir });
      const handlerEntry = result.manifest.find(m => m.path === 'handler.js');
      expect(handlerEntry).toBeDefined();
      expect(handlerEntry!.role).toBe('handler');
    } finally {
      await rm(skillDir, { recursive: true, force: true });
    }
  });

  it('classifies .yaml and .yml files as config role', async () => {
    const skillDir = await mkdtemp(join(tmpdir(), 'claws-import-yaml-'));
    try {
      await writeFile(join(skillDir, 'SKILL.md'), [
        '---',
        'name: yaml-skill',
        'description: Skill with config files',
        '---',
        '',
        '# YAML Skill',
      ].join('\n'), 'utf-8');
      await writeFile(join(skillDir, 'config.yaml'), 'key: value', 'utf-8');
      await writeFile(join(skillDir, 'settings.yml'), 'setting: true', 'utf-8');
      await writeFile(join(skillDir, 'data.json'), '{}', 'utf-8');

      const result = await makerImport({ skillDir });
      const yamlEntry = result.manifest.find(m => m.path === 'config.yaml');
      expect(yamlEntry).toBeDefined();
      expect(yamlEntry!.role).toBe('config');

      const ymlEntry = result.manifest.find(m => m.path === 'settings.yml');
      expect(ymlEntry).toBeDefined();
      expect(ymlEntry!.role).toBe('config');

      const jsonEntry = result.manifest.find(m => m.path === 'data.json');
      expect(jsonEntry).toBeDefined();
      expect(jsonEntry!.role).toBe('config');
    } finally {
      await rm(skillDir, { recursive: true, force: true });
    }
  });

  it('classifies unknown file extensions as other role', async () => {
    const skillDir = await mkdtemp(join(tmpdir(), 'claws-import-other-'));
    try {
      await writeFile(join(skillDir, 'SKILL.md'), [
        '---',
        'name: other-skill',
        'description: Skill with misc files',
        '---',
        '',
        '# Other Skill',
      ].join('\n'), 'utf-8');
      await writeFile(join(skillDir, 'notes.txt'), 'some notes', 'utf-8');

      const result = await makerImport({ skillDir });
      const txtEntry = result.manifest.find(m => m.path === 'notes.txt');
      expect(txtEntry).toBeDefined();
      expect(txtEntry!.role).toBe('other');
    } finally {
      await rm(skillDir, { recursive: true, force: true });
    }
  });
});

describe('import with no OBO and no data labels', () => {
  it('produces governance.yaml with obo: false and no data_labels', async () => {
    const skillDir = await mkdtemp(join(tmpdir(), 'claws-import-noobo-'));
    try {
      await writeFile(join(skillDir, 'SKILL.md'), [
        '---',
        'name: list-items',
        'description: List items from a catalog',
        '---',
        '',
        '# List Items',
        '',
        'A simple listing tool.',
      ].join('\n'), 'utf-8');
      await writeFile(join(skillDir, 'handler.ts'), [
        'export async function handler() {',
        '  return ["item1", "item2"];',
        '}',
      ].join('\n'), 'utf-8');

      const result = await makerImport({ skillDir });
      const governance = await readFile(join(result.clawsDir, 'governance.yaml'), 'utf-8');
      expect(governance).toContain('obo: false');
      expect(governance).not.toContain('data_labels:');
      expect(governance).not.toContain('obo_capabilities:');
    } finally {
      await rm(skillDir, { recursive: true, force: true });
    }
  });
});

describe('import with subdirectories', () => {
  it('skips subdirectories when inventorying files', async () => {
    const { mkdir: mkdirFs } = await import('node:fs/promises');
    const skillDir = await mkdtemp(join(tmpdir(), 'claws-import-subdir-'));
    try {
      await writeFile(join(skillDir, 'SKILL.md'), [
        '---',
        'name: dir-skill',
        'description: Skill with subdirectory',
        '---',
        '',
        '# Dir Skill',
      ].join('\n'), 'utf-8');
      await writeFile(join(skillDir, 'handler.ts'), 'export async function handler() {}', 'utf-8');
      // Create a subdirectory that should be skipped
      await mkdirFs(join(skillDir, 'subdir'), { recursive: true });
      await writeFile(join(skillDir, 'subdir', 'nested.ts'), 'export {};', 'utf-8');

      const result = await makerImport({ skillDir });
      // Only the top-level files should be in manifest (subdir skipped via catch)
      const manifestPaths = result.manifest.map(m => m.path);
      expect(manifestPaths).toContain('SKILL.md');
      expect(manifestPaths).toContain('handler.ts');
      expect(manifestPaths).not.toContain('subdir');
    } finally {
      await rm(skillDir, { recursive: true, force: true });
    }
  });
});

describe('original files untouched', () => {
  it('SKILL.md content is byte-identical after import', async () => {
    const beforeContent = await readFile(join(tempDir, 'SKILL.md'), 'utf-8');
    const beforeHash = sha256(beforeContent);

    await makerImport({ skillDir: tempDir });

    const afterContent = await readFile(join(tempDir, 'SKILL.md'), 'utf-8');
    const afterHash = sha256(afterContent);

    expect(afterHash).toBe(beforeHash);
    expect(afterContent).toBe(beforeContent);
  });

  it('handler.ts content is byte-identical after import', async () => {
    const beforeContent = await readFile(join(tempDir, 'handler.ts'), 'utf-8');
    const beforeHash = sha256(beforeContent);

    await makerImport({ skillDir: tempDir });

    const afterContent = await readFile(join(tempDir, 'handler.ts'), 'utf-8');
    const afterHash = sha256(afterContent);

    expect(afterHash).toBe(beforeHash);
    expect(afterContent).toBe(beforeContent);
  });

  it('original file list matches pre-import snapshot', async () => {
    const beforeEntries = (await readdir(tempDir)).sort();

    await makerImport({ skillDir: tempDir });

    // After import, only .claws/ is added
    const afterEntries = (await readdir(tempDir)).sort();
    const originalEntries = afterEntries.filter(e => e !== '.claws');
    expect(originalEntries).toEqual(beforeEntries);
  });
});
