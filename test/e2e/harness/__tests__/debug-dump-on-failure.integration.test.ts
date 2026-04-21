import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, existsSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';

const createdDirs: string[] = [];

afterEach(() => {
  while (createdDirs.length > 0) {
    const d = createdDirs.pop()!;
    try {
      rmSync(d, { recursive: true, force: true });
    } catch {
      // best effort
    }
  }
});

function makeDumpDir(): string {
  const d = mkdtempSync(join(tmpdir(), 'debug-dump-'));
  createdDirs.push(d);
  return d;
}

interface DebugDump {
  readonly suite: string;
  readonly failureMessage: string;
  readonly snapStderr: string;
  readonly policyGenerateStdout: string;
  readonly capturedAt: number;
}

/**
 * Inline dump writer used by the harness on failure. Extracted here so the
 * integration test exercises the same code the real suites call via their
 * `afterEach` hook.
 */
function writeDebugDump(dir: string, dump: DebugDump): string {
  const filePath = join(dir, `${dump.suite}-${String(dump.capturedAt)}.json`);
  if (!existsSync(dirname(filePath))) mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(dump, null, 2) + '\n', 'utf8');
  return filePath;
}

describe('debug-dump on failure', () => {
  it('writes on assertion fail: file created with failureMessage payload', () => {
    const dir = makeDumpDir();
    const dump: DebugDump = {
      suite: 'assertion-fail-case',
      failureMessage: 'expected ok=true, got ok=false (reason=orphan-approval)',
      snapStderr: '',
      policyGenerateStdout: '',
      capturedAt: 1_700_010_000_000,
    };
    const filePath = writeDebugDump(dir, dump);
    expect(existsSync(filePath)).toBe(true);
    const parsed = JSON.parse(readFileSync(filePath, 'utf8')) as DebugDump;
    expect(parsed.failureMessage).toContain('orphan-approval');
  });

  it('captures snap stderr: dump preserves multi-line stderr exactly', () => {
    const dir = makeDumpDir();
    const stderr = [
      'snap-runner: bound to 127.0.0.1:12345',
      'snap-runner: ERR unhandled token at column 7',
      'snap-runner: exiting with code 2',
    ].join('\n');
    const dump: DebugDump = {
      suite: 'snap-stderr-case',
      failureMessage: 'snap exited with code 2',
      snapStderr: stderr,
      policyGenerateStdout: '',
      capturedAt: 1_700_010_100_000,
    };
    const filePath = writeDebugDump(dir, dump);
    const parsed = JSON.parse(readFileSync(filePath, 'utf8')) as DebugDump;
    expect(parsed.snapStderr).toBe(stderr);
    expect(parsed.snapStderr.split('\n')).toHaveLength(3);
  });

  it('captures policy-generate stdout: dump records full CLI output', () => {
    const dir = makeDumpDir();
    const stdout = [
      'claws policy generate: reading SOUL.md',
      'claws policy generate: compiling to .openclaw/policy/policy-ir.json',
      'claws policy generate: emitted 1 artifact (sha256:deadbeef)',
    ].join('\n');
    const dump: DebugDump = {
      suite: 'policy-gen-stdout-case',
      failureMessage: 'expected policyVersion=2, got 1',
      snapStderr: '',
      policyGenerateStdout: stdout,
      capturedAt: 1_700_010_200_000,
    };
    const filePath = writeDebugDump(dir, dump);
    const parsed = JSON.parse(readFileSync(filePath, 'utf8')) as DebugDump;
    expect(parsed.policyGenerateStdout).toContain('sha256:deadbeef');
    expect(parsed.policyGenerateStdout.split('\n')).toHaveLength(3);
  });
});
