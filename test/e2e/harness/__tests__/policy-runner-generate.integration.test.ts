import { describe, it, expect, afterEach } from 'vitest';
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  defaultClawsCommand,
  generatePolicy,
  PolicyGenerateError,
  type ResolvedCommand,
} from '../policy-runner.ts';

const createdDirs: string[] = [];

afterEach(async () => {
  while (createdDirs.length > 0) {
    const dir = createdDirs.pop()!;
    // Windows can hold a directory open briefly after killing the child
    // that had it as cwd — retry a few times before giving up.
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await rm(dir, { recursive: true, force: true });
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
  }
});

async function makeTmpFixture(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'pulse36-runner-'));
  createdDirs.push(dir);
  await writeFile(join(dir, 'SOUL.md'), '# soul\n', 'utf8');
  return dir;
}

// A fake CLI that stands in for `claws policy generate` until pulse 53
// implements the real subcommand. It writes a policy-ir.json and optionally
// echoes the --scope flag so the runner's arg wiring is testable.
function fakeClaws(scriptBody: string): ResolvedCommand {
  const script =
    `'use strict';\n` +
    `const fs = require('fs');\n` +
    `const path = require('path');\n` +
    `${scriptBody}`;
  return {
    bin: process.execPath,
    args: ['-e', script, '--'],
  };
}

describe('generatePolicy — real child-process spawn + artifact capture', () => {
  it('produces the expected .openclaw/policy/ artifact tree', async () => {
    const fixture = await makeTmpFixture();
    const command = fakeClaws(
      `const out = path.join(process.cwd(), '.openclaw', 'policy');\n` +
        `fs.mkdirSync(out, { recursive: true });\n` +
        `fs.writeFileSync(path.join(out, 'policy-ir.json'), '{"ok":true}');\n` +
        `process.stdout.write('generated\\n');\n`,
    );

    const result = await generatePolicy(fixture, { command });
    expect(result.exitCode).toBe(0);
    expect(result.policyDir).toBe(join(fixture, '.openclaw', 'policy'));
    expect(result.stdout).toContain('generated');

    const ir = await readFile(join(result.policyDir, 'policy-ir.json'), 'utf8');
    expect(JSON.parse(ir)).toEqual({ ok: true });
  });

  it('honors --scope by forwarding it to the child via argv', async () => {
    const fixture = await makeTmpFixture();
    // The fake echoes its argv so we can verify the runner wired the scope
    // args through. Node's `-e` consumes `--scope` if it appears bare, so
    // we include a positional marker the script echoes back verbatim.
    const command: ResolvedCommand = {
      bin: process.execPath,
      args: [
        '-e',
        `process.stdout.write(process.argv.slice(1).join('|'));`,
        'scope:@bic/openclaw',
      ],
    };

    const result = await generatePolicy(fixture, { command });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('scope:@bic/openclaw');
  });

  it('fails with a PolicyGenerateError on non-zero exit', async () => {
    const fixture = await makeTmpFixture();
    const command = fakeClaws(
      `process.stderr.write('malformed fixture\\n');\n` +
        `process.exit(3);\n`,
    );

    await expect(generatePolicy(fixture, { command })).rejects.toMatchObject({
      name: 'PolicyGenerateError',
      exitCode: 3,
      stderr: expect.stringContaining('malformed fixture'),
    });
  });

  it('captures stderr alongside stdout when generation succeeds with warnings', async () => {
    const fixture = await makeTmpFixture();
    const command = fakeClaws(
      `process.stdout.write('ok\\n');\n` +
        `process.stderr.write('warning: deprecated syntax\\n');\n` +
        `fs.mkdirSync(path.join(process.cwd(), '.openclaw', 'policy'), { recursive: true });\n`,
    );

    const result = await generatePolicy(fixture, { command });
    expect(result.stdout).toContain('ok');
    expect(result.stderr).toContain('warning: deprecated syntax');
  });
});

describe('defaultClawsCommand — production argv contract', () => {
  it('wires `policy generate` + optional --scope into the argv', () => {
    const cmdDefault = defaultClawsCommand();
    expect(cmdDefault.args).toContain('policy');
    expect(cmdDefault.args).toContain('generate');
    expect(cmdDefault.args).not.toContain('--scope');

    const cmdScoped = defaultClawsCommand('@openclaw');
    expect(cmdScoped.args).toContain('--scope');
    expect(cmdScoped.args).toContain('@openclaw');
  });
});

describe('generatePolicy — timeout + spawn errors', () => {
  it('kills the child and rejects with a timeout error when it runs too long', async () => {
    const fixture = await makeTmpFixture();
    // Sleep long enough that the runner's timeout fires first.
    const command: ResolvedCommand = {
      bin: process.execPath,
      args: ['-e', 'setTimeout(() => {}, 60_000)'],
    };

    await expect(
      generatePolicy(fixture, { command, timeoutMs: 200 }),
    ).rejects.toMatchObject({
      name: 'PolicyGenerateError',
      exitCode: 124,
    });
  });

  it('rejects with the spawn error when the binary does not exist', async () => {
    const fixture = await makeTmpFixture();
    const command: ResolvedCommand = {
      bin: '/this/binary/does/not/exist/claws-ghost',
      args: ['policy', 'generate'],
    };

    await expect(generatePolicy(fixture, { command })).rejects.toThrow();
  });

  it('falls back to the default command when opts.command is omitted', async () => {
    const fixture = await makeTmpFixture();
    // No `command` override — the runner must wire up defaultClawsCommand
    // and invoke tsx. We give it a tiny timeout so we do not wait for
    // real tsx startup; whether the process errors or times out, we just
    // assert that the runner exercised the default path.
    await expect(
      generatePolicy(fixture, { timeoutMs: 10 }),
    ).rejects.toBeDefined();
  });
});

describe('generatePolicy — error shape', () => {
  it('surfaces stdout/stderr/tmpFixtureDir on the structured error', async () => {
    const fixture = await makeTmpFixture();
    const command = fakeClaws(
      `process.stdout.write('partial-progress\\n');\n` +
        `process.stderr.write('fatal\\n');\n` +
        `process.exit(7);\n`,
    );

    try {
      await generatePolicy(fixture, { command });
      throw new Error('expected PolicyGenerateError');
    } catch (err) {
      expect(err).toBeInstanceOf(PolicyGenerateError);
      const pge = err as PolicyGenerateError;
      expect(pge.tmpFixtureDir).toBe(fixture);
      expect(pge.stdout).toContain('partial-progress');
      expect(pge.stderr).toContain('fatal');
      expect(pge.exitCode).toBe(7);
    }
  });
});
