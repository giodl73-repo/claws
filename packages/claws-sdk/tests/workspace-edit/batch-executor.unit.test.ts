/**
 * L0 unit tests for {@link BatchExecutor}.
 *
 * Exercises the all-or-nothing contract against a real StructuredEditor and
 * a stubbed ValidationPipeline (so tests do not depend on validator wiring
 * below the SDK boundary). Six scenarios:
 *   1. 3-op batch all succeed
 *   2. 1 invalid op → whole batch rejected, no partial writes
 *   3. dryRun → returns preview, no disk mutation
 *   4. >MAX_BATCH_SIZE → envelope-rejected
 *   5. empty batch → envelope-rejected
 *   6. single-op batch works
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import {
  BatchExecutor,
  MAX_BATCH_SIZE,
  StructuredEditor,
  ValidationPipeline,
  buildPatchError,
  type EditOperation,
  type EditorTransaction,
  type FileSnapshot,
  type RollbackFailedError,
  type Validator,
  type ValidationFailedError,
} from '../../src/workspace-edit/index.js';

const TOOLS_MD_3 = `# Tools

## read_inbox

- enabled: true
- description: Read inbox

## send_mail

- enabled: true
- description: Send email

## post_message

- enabled: true
- description: Post Teams message
`;

const SETTINGS_MD = `# Settings

## preferences

- language: en
`;

function hash(s: string): string {
  return createHash('sha256').update(s, 'utf-8').digest('hex');
}

function alwaysOk(): Validator {
  return {
    name: 'always-ok',
    validate: async () => ({ ok: true }),
  };
}

/**
 * Wrap a stub `apply` function into a StructuredEditor-shaped object that
 * also implements the `withFileLocks` transaction API. Snapshots and
 * writeRaw/deleteRaw go directly against the on-disk workspaceRoot — the
 * stub only overrides the `apply` step (the usual seam these tests need).
 */
function stubEditor(
  workspaceRoot: string,
  applyFn: (op: EditOperation) => Promise<{
    success: boolean;
    file: EditOperation['file'];
    before: string;
    after: string;
    error?: string;
  }>,
): StructuredEditor {
  return {
    async withFileLocks<T>(
      _files: readonly EditOperation['file'][],
      fn: (tx: EditorTransaction) => Promise<T>,
    ): Promise<T> {
      const tx: EditorTransaction = {
        snapshot: async (file): Promise<FileSnapshot> => {
          try {
            const content = await readFile(join(workspaceRoot, file), 'utf-8');
            return { existed: true, content };
          } catch {
            return { existed: false };
          }
        },
        apply: applyFn,
        writeRaw: async (file, content) => {
          try {
            await writeFile(join(workspaceRoot, file), content, 'utf-8');
            return { ok: true };
          } catch (err) {
            return { ok: false, error: err instanceof Error ? err.message : String(err) };
          }
        },
        deleteRaw: async (file) => {
          try {
            await rm(join(workspaceRoot, file), { force: true });
            return { ok: true };
          } catch (err) {
            return { ok: false, error: err instanceof Error ? err.message : String(err) };
          }
        },
      };
      return fn(tx);
    },
  } as unknown as StructuredEditor;
}

function rejectsOp(section: string): Validator {
  return {
    name: 'rejects-op',
    validate: async (op: EditOperation) => {
      if (op.section === section) {
        return {
          ok: false,
          error: buildPatchError<ValidationFailedError>({
            code: 'VALIDATION_FAILED',
            ocPath: `oc://${op.file}/${op.section}`,
            subCode: 'TEST_REJECTED',
          }),
        };
      }
      return { ok: true };
    },
  };
}

let root: string;
let recompileCount = 0;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'batch-unit-'));
  recompileCount = 0;
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

function buildExecutor(validator: Validator = alwaysOk()): BatchExecutor {
  const pipeline = new ValidationPipeline();
  pipeline.addValidator(validator);
  return new BatchExecutor({
    workspaceRoot: root,
    editor: new StructuredEditor({ workspaceRoot: root }),
    pipeline,
    recompile: async () => {
      recompileCount += 1;
    },
  });
}

describe('BatchExecutor — L0 unit', () => {
  it('applies a 3-operation batch atomically and triggers one recompile', async () => {
    await writeFile(join(root, 'TOOLS.md'), TOOLS_MD_3, 'utf-8');
    const executor = buildExecutor();
    const ops: EditOperation[] = [
      { kind: 'toggle', file: 'TOOLS.md', section: 'read_inbox', field: 'enabled', value: false },
      { kind: 'toggle', file: 'TOOLS.md', section: 'send_mail', field: 'enabled', value: false },
      { kind: 'toggle', file: 'TOOLS.md', section: 'post_message', field: 'enabled', value: false },
    ];

    const result = await executor.execute(ops);

    expect(result.committed).toBe(true);
    expect(result.dryRun).toBe(false);
    expect(result.results).toHaveLength(3);
    expect(result.results.map((r) => r.index)).toEqual([0, 1, 2]);
    expect(recompileCount).toBe(1);

    const onDisk = await readFile(join(root, 'TOOLS.md'), 'utf-8');
    expect(onDisk).not.toContain('- enabled: true');
    expect((onDisk.match(/- enabled: false/g) ?? []).length).toBe(3);
  });

  it('rejects the whole batch on a single invalid operation and rolls back writes', async () => {
    await writeFile(join(root, 'TOOLS.md'), TOOLS_MD_3, 'utf-8');
    const hashBefore = hash(await readFile(join(root, 'TOOLS.md'), 'utf-8'));
    const executor = buildExecutor(rejectsOp('send_mail'));

    const ops: EditOperation[] = [
      { kind: 'toggle', file: 'TOOLS.md', section: 'read_inbox', field: 'enabled', value: false },
      { kind: 'toggle', file: 'TOOLS.md', section: 'send_mail', field: 'enabled', value: false },
      { kind: 'toggle', file: 'TOOLS.md', section: 'post_message', field: 'enabled', value: false },
    ];

    const result = await executor.execute(ops);

    expect(result.committed).toBe(false);
    expect(result.results).toHaveLength(0);
    expect(result.summary.errors).toHaveLength(1);
    expect(result.summary.errors[0]!.index).toBe(1);
    expect(result.summary.errors[0]!.error.code).toBe('VALIDATION_FAILED');
    expect(recompileCount).toBe(0);

    const hashAfter = hash(await readFile(join(root, 'TOOLS.md'), 'utf-8'));
    expect(hashAfter).toBe(hashBefore);
  });

  it('returns a preview under dryRun and leaves the workspace untouched', async () => {
    await writeFile(join(root, 'TOOLS.md'), TOOLS_MD_3, 'utf-8');
    const hashBefore = hash(await readFile(join(root, 'TOOLS.md'), 'utf-8'));
    const executor = buildExecutor();

    const ops: EditOperation[] = [
      { kind: 'toggle', file: 'TOOLS.md', section: 'read_inbox', field: 'enabled', value: false },
      { kind: 'toggle', file: 'TOOLS.md', section: 'send_mail', field: 'enabled', value: false },
    ];

    const result = await executor.execute(ops, { dryRun: true });

    expect(result.committed).toBe(true);
    expect(result.dryRun).toBe(true);
    expect(result.results).toHaveLength(2);
    expect(result.summary.validated).toBe(2);
    expect(recompileCount).toBe(0);

    const hashAfter = hash(await readFile(join(root, 'TOOLS.md'), 'utf-8'));
    expect(hashAfter).toBe(hashBefore);
  });

  it('rejects batches that exceed MAX_BATCH_SIZE without touching disk', async () => {
    await writeFile(join(root, 'TOOLS.md'), TOOLS_MD_3, 'utf-8');
    const executor = buildExecutor();
    const oversizeOps: EditOperation[] = Array.from({ length: MAX_BATCH_SIZE + 1 }, () => ({
      kind: 'toggle' as const,
      file: 'TOOLS.md' as const,
      section: 'read_inbox',
      field: 'enabled',
      value: false,
    }));

    const result = await executor.execute(oversizeOps);

    expect(result.committed).toBe(false);
    expect(result.envelopeError?.code).toBe('VALIDATION_FAILED');
    const sub = (result.envelopeError as ValidationFailedError | undefined)?.subCode;
    expect(sub).toContain('BATCH_SIZE_EXCEEDED');
    expect(recompileCount).toBe(0);
  });

  it('rejects an empty batch without touching disk', async () => {
    await writeFile(join(root, 'TOOLS.md'), TOOLS_MD_3, 'utf-8');
    const executor = buildExecutor();

    const result = await executor.execute([]);

    expect(result.committed).toBe(false);
    expect(result.envelopeError?.code).toBe('VALIDATION_FAILED');
    const sub = (result.envelopeError as ValidationFailedError | undefined)?.subCode;
    expect(sub).toBe('BATCH_EMPTY');
    expect(recompileCount).toBe(0);
  });

  it('executes a single-operation batch with one recompile', async () => {
    await writeFile(join(root, 'TOOLS.md'), TOOLS_MD_3, 'utf-8');
    await writeFile(join(root, 'SETTINGS.md'), SETTINGS_MD, 'utf-8');
    const executor = buildExecutor();

    const ops: EditOperation[] = [
      { kind: 'set', file: 'SETTINGS.md', section: 'preferences', field: 'language', value: 'fr' },
    ];

    const result = await executor.execute(ops);

    expect(result.committed).toBe(true);
    expect(result.results).toHaveLength(1);
    expect(result.results[0]!.file).toBe('SETTINGS.md');
    expect(recompileCount).toBe(1);

    const onDisk = await readFile(join(root, 'SETTINGS.md'), 'utf-8');
    expect(onDisk).toContain('- language: fr');
  });

  // Branch coverage for apply-failure + recompile-failure rollback paths.
  // Not one of the 6 L0 scenarios in the plan — these additional
  // assertions keep the per-file coverage gate at 95/90/95/95.
  describe('rollback branches', () => {
    it('restores every touched file when a mid-batch apply fails', async () => {
      await writeFile(join(root, 'TOOLS.md'), TOOLS_MD_3, 'utf-8');
      await writeFile(join(root, 'SETTINGS.md'), SETTINGS_MD, 'utf-8');
      const executor = buildExecutor();
      const toolsBefore = await readFile(join(root, 'TOOLS.md'), 'utf-8');
      const settingsBefore = await readFile(join(root, 'SETTINGS.md'), 'utf-8');

      const ops: EditOperation[] = [
        { kind: 'toggle', file: 'TOOLS.md', section: 'read_inbox', field: 'enabled', value: false },
        { kind: 'set', file: 'SETTINGS.md', section: 'preferences', field: 'language', value: 'fr' },
        // Third op targets a section that does not exist — StructuredEditor
        // returns !success; rollback restores the first two files.
        { kind: 'toggle', file: 'TOOLS.md', section: 'no_such_tool', field: 'enabled', value: false },
      ];

      const result = await executor.execute(ops);

      expect(result.committed).toBe(false);
      expect(result.rollback?.triggered).toBe(true);
      expect(result.rollback?.restoredFiles).toContain('TOOLS.md');
      expect(result.rollback?.restoredFiles).toContain('SETTINGS.md');
      expect(result.summary.errors).toHaveLength(1);
      expect(result.summary.errors[0]!.index).toBe(2);

      expect(await readFile(join(root, 'TOOLS.md'), 'utf-8')).toBe(toolsBefore);
      expect(await readFile(join(root, 'SETTINGS.md'), 'utf-8')).toBe(settingsBefore);
    });

    it('rolls back every file when the post-apply recompile throws', async () => {
      await writeFile(join(root, 'TOOLS.md'), TOOLS_MD_3, 'utf-8');
      const toolsBefore = await readFile(join(root, 'TOOLS.md'), 'utf-8');
      const pipeline = new ValidationPipeline();
      pipeline.addValidator(alwaysOk());
      const executor = new BatchExecutor({
        workspaceRoot: root,
        editor: new StructuredEditor({ workspaceRoot: root }),
        pipeline,
        recompile: async () => {
          throw new Error('compile blew up');
        },
      });

      const ops: EditOperation[] = [
        { kind: 'toggle', file: 'TOOLS.md', section: 'read_inbox', field: 'enabled', value: false },
      ];

      const result = await executor.execute(ops);

      expect(result.committed).toBe(false);
      expect(result.rollback?.triggered).toBe(true);
      expect(result.rollback?.restoredFiles).toContain('TOOLS.md');
      expect(result.summary.errors[0]!.error.code).toBe('VALIDATION_FAILED');
      expect(await readFile(join(root, 'TOOLS.md'), 'utf-8')).toBe(toolsBefore);
    });

    it('deletes the written file to restore the "no file" state when the pre-batch snapshot was absent', async () => {
      // Snapshot records `existed: false` when TOOLS.md is absent at
      // execute() start. A custom editor fakes a successful first apply
      // (writing TOOLS.md) and a failing second apply — rollback's
      // idempotent "restore to pre-batch state" then deletes the file that
      // was added during this batch.
      const editor = stubEditor(root, async (op) => {
        if (op.section === 'first') {
          await writeFile(join(root, 'TOOLS.md'), '# Tools\n\n## first\n\n', 'utf-8');
          return { success: true, file: op.file, before: '', after: 'abc' };
        }
        return {
          success: false,
          file: op.file,
          before: '',
          after: '',
          error: 'simulated apply failure',
        };
      });

      const pipeline = new ValidationPipeline();
      pipeline.addValidator(alwaysOk());
      const customExecutor = new BatchExecutor({
        workspaceRoot: root,
        editor,
        pipeline,
        recompile: async () => {
          recompileCount += 1;
        },
      });

      const result = await customExecutor.execute([
        { kind: 'append', file: 'TOOLS.md', section: 'first', item: 'a' },
        { kind: 'append', file: 'TOOLS.md', section: 'second', item: 'b' },
      ]);

      expect(result.committed).toBe(false);
      expect(result.rollback?.triggered).toBe(true);
      expect(result.rollback?.restoredFiles).toContain('TOOLS.md');
      // The file that was created mid-batch is gone after rollback.
      await expect(readFile(join(root, 'TOOLS.md'), 'utf-8')).rejects.toThrow();
    });

    it('accumulates warnings from pipeline validators onto the batch summary', async () => {
      await writeFile(join(root, 'TOOLS.md'), TOOLS_MD_3, 'utf-8');
      const pipeline = new ValidationPipeline();
      pipeline.addValidator({
        name: 'warns',
        validate: async () => ({
          ok: true,
          warnings: [{ code: 'DEPRECATED', message: 'legacy flag', ocPath: 'oc://x' }],
        }),
      });
      const exec = new BatchExecutor({
        workspaceRoot: root,
        editor: new StructuredEditor({ workspaceRoot: root }),
        pipeline,
        recompile: async () => {
          recompileCount += 1;
        },
      });
      const result = await exec.execute([
        { kind: 'toggle', file: 'TOOLS.md', section: 'read_inbox', field: 'enabled', value: false },
      ]);
      expect(result.committed).toBe(true);
      expect(result.summary.warnings.length).toBeGreaterThan(0);
      expect(result.summary.warnings[0]!.code).toBe('DEPRECATED');
    });

    it('falls back to BATCH_APPLY_FAILED when apply returns no error string', async () => {
      await writeFile(join(root, 'TOOLS.md'), TOOLS_MD_3, 'utf-8');
      const editor = stubEditor(root, async (op) => ({
        success: false,
        file: op.file,
        before: '',
        after: '',
        // error field intentionally omitted → subCode falls back.
      }));
      const pipeline = new ValidationPipeline();
      pipeline.addValidator(alwaysOk());
      const exec = new BatchExecutor({
        workspaceRoot: root,
        editor,
        pipeline,
        recompile: async () => {
          recompileCount += 1;
        },
      });
      const result = await exec.execute([
        { kind: 'toggle', file: 'TOOLS.md', section: 'read_inbox', field: 'enabled', value: false },
      ]);
      expect(result.committed).toBe(false);
      const err = result.summary.errors[0]!.error as ValidationFailedError;
      expect(err.subCode).toBe('BATCH_APPLY_FAILED');
    });

    it('stringifies non-Error recompile throws', async () => {
      await writeFile(join(root, 'TOOLS.md'), TOOLS_MD_3, 'utf-8');
      const pipeline = new ValidationPipeline();
      pipeline.addValidator(alwaysOk());
      const exec = new BatchExecutor({
        workspaceRoot: root,
        editor: new StructuredEditor({ workspaceRoot: root }),
        pipeline,
        recompile: async () => {
          // Throw a non-Error value — exercise the `String(err)` branch.
          // eslint-disable-next-line @typescript-eslint/only-throw-error
          throw 'compile blew up as string';
        },
      });
      const result = await exec.execute([
        { kind: 'toggle', file: 'TOOLS.md', section: 'read_inbox', field: 'enabled', value: false },
      ]);
      expect(result.committed).toBe(false);
      const err = result.summary.errors[0]!.error as ValidationFailedError;
      expect(err.subCode).toContain('compile blew up as string');
    });

    it('captures filesystem-level rollback errors as restoreFailures', async () => {
      // Pre-seed TOOLS.md so the snapshot records existed:true. A custom
      // editor fakes a successful first apply, then deletes the workspace
      // root to guarantee that the rollback writeFile cannot succeed.
      await writeFile(join(root, 'TOOLS.md'), TOOLS_MD_3, 'utf-8');
      const editor = stubEditor(root, async (op) => {
        if (op.section === 'read_inbox') {
          // Fake success; leave the file in place.
          return { success: true, file: op.file, before: 'x', after: 'y' };
        }
        // Second op: before failing, nuke the workspace so rollback's
        // writeRaw call hits ENOENT on the parent directory.
        await rm(root, { recursive: true, force: true });
        return {
          success: false,
          file: op.file,
          before: '',
          after: '',
          error: 'triggered rollback',
        };
      });

      const pipeline = new ValidationPipeline();
      pipeline.addValidator(alwaysOk());
      const customExecutor = new BatchExecutor({
        workspaceRoot: root,
        editor,
        pipeline,
        recompile: async () => {
          recompileCount += 1;
        },
      });

      const result = await customExecutor.execute([
        { kind: 'toggle', file: 'TOOLS.md', section: 'read_inbox', field: 'enabled', value: false },
        { kind: 'toggle', file: 'TOOLS.md', section: 'trigger', field: 'enabled', value: false },
      ]);

      expect(result.committed).toBe(false);
      expect(result.rollback?.triggered).toBe(true);
      expect(result.rollback?.restoreFailures.length).toBeGreaterThan(0);
      // D1 contract: when rollback itself fails, the per-op error MUST be
      // promoted to ROLLBACK_FAILED so operators see the inconsistent files.
      const err = result.summary.errors[0]!.error;
      expect(err.code).toBe('ROLLBACK_FAILED');
      expect((err as RollbackFailedError).filesystemState).toContain('TOOLS.md');
    });
  });

  // CP-6 R2 Cluster D regression coverage.
  describe('D1/D3 — rollback routes through editor mutex + watcher', () => {
    it('D1: rollback writes fire the StructuredEditor watcher notifier', async () => {
      await writeFile(join(root, 'TOOLS.md'), TOOLS_MD_3, 'utf-8');
      const events: Array<{ phase: 'start' | 'end'; ok?: boolean }> = [];
      const editor = new StructuredEditor({
        workspaceRoot: root,
        watcher: {
          start: () => events.push({ phase: 'start' }),
          end: (_p, ok) => events.push({ phase: 'end', ok }),
        },
      });
      const pipeline = new ValidationPipeline();
      pipeline.addValidator(alwaysOk());
      const exec = new BatchExecutor({
        workspaceRoot: root,
        editor,
        pipeline,
        // Force a post-apply rollback by throwing in recompile.
        recompile: async () => {
          throw new Error('compile blew up');
        },
      });

      await exec.execute([
        { kind: 'toggle', file: 'TOOLS.md', section: 'read_inbox', field: 'enabled', value: false },
      ]);

      // One start/end pair for the apply + one for the rollback writeRaw.
      const startCount = events.filter((e) => e.phase === 'start').length;
      const endCount = events.filter((e) => e.phase === 'end').length;
      expect(startCount).toBe(2);
      expect(endCount).toBe(2);
      expect(events.filter((e) => e.phase === 'end').every((e) => e.ok === true)).toBe(true);
    });

    it('D3: snapshot taken under mutex — concurrent write cannot race rollback', async () => {
      // Two concurrent batches hit the same file. Batch A commits first
      // (compile ok). Batch B starts after A commits; its snapshot inside
      // withFileLocks MUST capture A's post-apply content — not the pre-A
      // state — so if B rolls back it restores A's write, not the stale
      // pre-A snapshot that a TOCTOU'd implementation would have captured.
      await writeFile(join(root, 'TOOLS.md'), TOOLS_MD_3, 'utf-8');
      const editor = new StructuredEditor({ workspaceRoot: root });
      const pipeline = new ValidationPipeline();
      pipeline.addValidator(alwaysOk());

      let aCompiled = false;
      const execA = new BatchExecutor({
        workspaceRoot: root,
        editor,
        pipeline,
        recompile: async () => {
          aCompiled = true;
        },
      });
      const execB = new BatchExecutor({
        workspaceRoot: root,
        editor,
        pipeline,
        recompile: async () => {
          if (!aCompiled) throw new Error('B compiled before A — unexpected interleave');
          throw new Error('B compile fails');
        },
      });

      const [resultA, resultB] = await Promise.all([
        execA.execute([
          { kind: 'toggle', file: 'TOOLS.md', section: 'read_inbox', field: 'enabled', value: false },
        ]),
        execB.execute([
          { kind: 'toggle', file: 'TOOLS.md', section: 'send_mail', field: 'enabled', value: false },
        ]),
      ]);

      expect(resultA.committed).toBe(true);
      expect(resultB.committed).toBe(false);
      expect(resultB.rollback?.triggered).toBe(true);

      // Post-condition: A's write (`read_inbox: false`) must survive B's
      // rollback. A TOCTOU'd rollback would have restored the pre-A state
      // (`read_inbox: true`), wiping A's committed edit.
      const finalContent = await readFile(join(root, 'TOOLS.md'), 'utf-8');
      expect(finalContent).toContain('## read_inbox');
      const readInboxBlock = finalContent.split('## read_inbox')[1]!.split('## ')[0]!;
      expect(readInboxBlock).toContain('enabled: false');
      // B's attempted edit was rolled back.
      const sendMailBlock = finalContent.split('## send_mail')[1]!.split('## ')[0]!;
      expect(sendMailBlock).toContain('enabled: true');
    });

    it('D3: queued concurrent batches see committed state as their snapshot', async () => {
      await writeFile(join(root, 'TOOLS.md'), TOOLS_MD_3, 'utf-8');
      const editor = new StructuredEditor({ workspaceRoot: root });
      const pipeline = new ValidationPipeline();
      pipeline.addValidator(alwaysOk());
      const exec = new BatchExecutor({
        workspaceRoot: root,
        editor,
        pipeline,
        recompile: async () => {},
      });

      // Serialised on the same file — both should commit without
      // stomping each other.
      const [r1, r2] = await Promise.all([
        exec.execute([
          { kind: 'toggle', file: 'TOOLS.md', section: 'read_inbox', field: 'enabled', value: false },
        ]),
        exec.execute([
          { kind: 'toggle', file: 'TOOLS.md', section: 'send_mail', field: 'enabled', value: false },
        ]),
      ]);

      expect(r1.committed).toBe(true);
      expect(r2.committed).toBe(true);
      const finalContent = await readFile(join(root, 'TOOLS.md'), 'utf-8');
      const readInboxBlock = finalContent.split('## read_inbox')[1]!.split('## ')[0]!;
      expect(readInboxBlock).toContain('enabled: false');
      const sendMailBlock = finalContent.split('## send_mail')[1]!.split('## ')[0]!;
      expect(sendMailBlock).toContain('enabled: false');
    });
  });
});
