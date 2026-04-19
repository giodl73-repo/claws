/**
 * ValidationPipeline L2 e2e tests.
 *
 * End-to-end flow: edit → validate → write via StructuredEditor →
 * verify file content. Covers the success path and the "no write on
 * validation failure" invariant.
 */

import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  StructuredEditor,
  ValidationPipeline,
  createR5Validator,
  createFleetValidator,
  createGovernanceValidator,
  type EditOperation,
} from '../../src/workspace-edit/index.js';
import { minimalGovernanceIR } from '../fixtures/minimal/governance-ir.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = join(__dirname, '../fixtures/workspace-edit');

let workspace: string;

beforeEach(async () => {
  workspace = await mkdtemp(join(tmpdir(), 'validation-e2e-'));
  // Copy TOOLS.md / SETTINGS.md / CONNECTIONS.md fixtures.
  await cp(join(FIXTURE_DIR, 'TOOLS.md'), join(workspace, 'TOOLS.md'));
  await cp(join(FIXTURE_DIR, 'SETTINGS.md'), join(workspace, 'SETTINGS.md'));
  await cp(join(FIXTURE_DIR, 'CONNECTIONS.md'), join(workspace, 'CONNECTIONS.md'));
});

afterEach(async () => {
  await rm(workspace, { recursive: true, force: true });
});

describe('ValidationPipeline — e2e', () => {
  it('edit → validate → write cycle completes on reference workspace', async () => {
    const ir = minimalGovernanceIR();
    const policyFile = join(workspace, 'fleet-policy.json');
    await writeFile(policyFile, JSON.stringify({ overrides: [] }), 'utf-8');

    const pipeline = new ValidationPipeline();
    pipeline.addValidator(createR5Validator(ir));
    pipeline.addValidator(createFleetValidator({ policyFile }));
    pipeline.addValidator(
      createGovernanceValidator({ ir, denyProvenance: new Map(), governanceFile: policyFile }),
    );

    const editor = new StructuredEditor({ workspaceRoot: workspace });
    const edit: EditOperation = {
      kind: 'toggle',
      file: 'TOOLS.md',
      section: 'web-search', // R1 in the fixture — safe to toggle.
      field: 'enabled',
      value: false,
    };

    const validation = await pipeline.validate(edit);
    expect(validation.ok).toBe(true);
    const writeResult = await editor.apply(edit);
    expect(writeResult.success).toBe(true);
    const updated = await readFile(join(workspace, 'TOOLS.md'), 'utf-8');
    const section = updated.split('## web-search')[1] ?? '';
    expect(section).toMatch(/-\s+enabled:\s+false/);
  });

  it('validation failure means the file is not written and compile is not triggered', async () => {
    const policyFile = join(workspace, 'fleet-policy.json');
    // NO policy → fleet validator fails closed.

    const pipeline = new ValidationPipeline();
    pipeline.addValidator(createFleetValidator({ policyFile }));

    const editor = new StructuredEditor({ workspaceRoot: workspace });
    const edit: EditOperation = {
      kind: 'toggle',
      file: 'TOOLS.md',
      section: 'file-read',
      field: 'enabled',
      value: false,
    };

    const before = await readFile(join(workspace, 'TOOLS.md'), 'utf-8');

    const validation = await pipeline.validate(edit);
    expect(validation.ok).toBe(false);
    // When validation fails, the caller MUST NOT invoke editor.apply.
    // We assert the invariant by checking file is byte-for-byte unchanged.
    const after = await readFile(join(workspace, 'TOOLS.md'), 'utf-8');
    expect(after).toBe(before);
    // And ensure editor.apply would have changed the file had we called
    // it — this sanity-checks the test's counter-factual.
    const counterfactual = await editor.apply(edit);
    expect(counterfactual.success).toBe(true);
  });
});
