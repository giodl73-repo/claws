/**
 * L0: Two-phase atomicity — stage+commit and stage+rollback.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, access } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import {
  executeTransaction,
  stageLocally,
  rollbackStaging,
  generateTxId,
} from '../../src/publish/atomicity.js';
import type { RegistryClient, StagedArtifact } from '../../src/publish/atomicity.js';

function tempDir(): string {
  return join(tmpdir(), `claws-test-atom-${randomBytes(4).toString('hex')}`);
}

const artifacts: readonly StagedArtifact[] = [
  { name: 'skill.yaml', content: 'name: test-skill\nrisk: 1\n' },
  { name: 'badge.json', content: '{"name":"test-skill"}' },
];

describe('stageLocally', () => {
  let dir: string;

  beforeEach(async () => {
    dir = tempDir();
    await mkdir(dir, { recursive: true });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('creates staging directory and writes artifacts', async () => {
    const txId = generateTxId();
    const stagingDir = await stageLocally(dir, txId, artifacts);

    // Verify files exist
    await expect(access(join(stagingDir, 'skill.yaml'))).resolves.toBeUndefined();
    await expect(access(join(stagingDir, 'badge.json'))).resolves.toBeUndefined();
    await expect(access(join(stagingDir, '_tx.json'))).resolves.toBeUndefined();
  });
});

describe('rollbackStaging', () => {
  let dir: string;

  beforeEach(async () => {
    dir = tempDir();
    await mkdir(dir, { recursive: true });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('removes the staging directory', async () => {
    const txId = generateTxId();
    const stagingDir = await stageLocally(dir, txId, artifacts);

    await rollbackStaging(dir, txId);

    await expect(access(stagingDir)).rejects.toThrow();
  });
});

describe('executeTransaction', () => {
  let dir: string;

  beforeEach(async () => {
    dir = tempDir();
    await mkdir(dir, { recursive: true });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('commits on remote 200 response', async () => {
    const successClient: RegistryClient = {
      async submit() {
        return 200;
      },
    };

    const result = await executeTransaction(dir, artifacts, successClient);
    expect(result.state).toBe('committed');
    expect(result.remoteStatus).toBe(200);
    expect(result.artifactCount).toBe(2);
  });

  it('rolls back on remote non-200 response', async () => {
    const failClient: RegistryClient = {
      async submit() {
        return 500;
      },
    };

    const result = await executeTransaction(dir, artifacts, failClient);
    expect(result.state).toBe('rolled-back');
    expect(result.remoteStatus).toBe(500);

    // Staging directory should be cleaned up
    await expect(access(result.stagingDir)).rejects.toThrow();
  });

  it('rolls back on remote exception', async () => {
    const errorClient: RegistryClient = {
      async submit() {
        throw new Error('Network failure');
      },
    };

    const result = await executeTransaction(dir, artifacts, errorClient);
    expect(result.state).toBe('rolled-back');
    expect(result.remoteStatus).toBeNull();
    expect(result.summary).toContain('Network failure');
  });
});

describe('readStagedArtifacts', () => {
  let dir: string;

  beforeEach(async () => {
    dir = tempDir();
    await mkdir(dir, { recursive: true });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('reads back staged files by name', async () => {
    const txId = generateTxId();
    const stagingDir = await stageLocally(dir, txId, artifacts);

    const { readStagedArtifacts } = await import('../../src/publish/atomicity.js');
    const read = await readStagedArtifacts(stagingDir, ['skill.yaml', 'badge.json']);
    expect(read).toHaveLength(2);
    expect(read[0]!.name).toBe('skill.yaml');
    expect(read[0]!.content).toContain('name: test-skill');
    expect(read[1]!.name).toBe('badge.json');
  });
});

describe('executeTransaction — error branch coverage', () => {
  let dir: string;

  beforeEach(async () => {
    dir = tempDir();
    await mkdir(dir, { recursive: true });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('handles non-Error thrown by remote submission', async () => {
    const throwStringClient: RegistryClient = {
      async submit() {
        throw 'raw string error'; // eslint-disable-line no-throw-literal
      },
    };

    const result = await executeTransaction(dir, artifacts, throwStringClient);
    expect(result.state).toBe('rolled-back');
    expect(result.summary).toContain('raw string error');
  });

  it('returns failed state when staging directory is invalid', async () => {
    // Create a file where the staging directory needs a subdirectory
    const { writeFile: wf } = await import('node:fs/promises');
    const stagingPath = join(dir, '.claws', 'staging');
    await mkdir(join(dir, '.claws'), { recursive: true });
    await wf(stagingPath, 'blocking-file', 'utf-8');

    const successClient: RegistryClient = {
      async submit() {
        return 200;
      },
    };

    const result = await executeTransaction(dir, artifacts, successClient);
    expect(result.state).toBe('failed');
    expect(result.summary).toContain('Staging failed');
  });
});

describe('generateTxId', () => {
  it('produces unique transaction IDs', () => {
    const a = generateTxId();
    const b = generateTxId();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^tx-/);
  });
});
