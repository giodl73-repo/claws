import { EventEmitter } from 'node:events';
import { describe, expect, it } from 'vitest';
import {
  MxcSandboxRunner,
  SandboxUnavailableError,
  type MxcSdkLoader,
} from '../../src/sandbox/index.js';

interface CapturedSpawn {
  readonly policy: Record<string, unknown>;
  readonly containment: string | undefined;
  readonly config: {
    process?: {
      commandLine?: string;
      cwd?: string;
      env?: readonly string[];
    };
  };
  readonly options: Record<string, unknown> | undefined;
  readonly workingDirectory: string | undefined;
  readonly env: Readonly<Record<string, string>> | undefined;
}

class FakeReadable extends EventEmitter {
  write(chunk: string): void {
    this.emit('data', chunk);
  }
}

class FakeChild extends EventEmitter {
  readonly stdout = new FakeReadable();
  readonly stderr = new FakeReadable();

  close(code: number | null): void {
    this.emit('close', code);
  }
}

function makeLoader(options: {
  readonly supported?: boolean;
  readonly reason?: string;
  readonly onSpawn?: (child: FakeChild) => void;
  readonly captures: CapturedSpawn[];
}): MxcSdkLoader {
  return async () => ({
    getPlatformSupport: () => ({
      isSupported: options.supported ?? true,
      ...(options.reason !== undefined ? { reason: options.reason } : {}),
    }),
    getAvailableToolsPolicy: () => ({
      readonlyPaths: ['C:\\Tools', 'C:\\Tools'],
    }),
    getTemporaryFilesPolicy: () => ({
      readwritePaths: ['C:\\Temp'],
    }),
    createConfigFromPolicy: (policy: Record<string, unknown>, containment?: string) => {
      const config = { process: {} };
      options.captures.push({
        policy,
        containment,
        config,
        options: undefined,
        workingDirectory: undefined,
        env: undefined,
      });
      return config;
    },
    spawnSandboxFromConfig: (
      config: CapturedSpawn['config'],
      spawnOptions?: Record<string, unknown>,
      workingDirectory?: string,
      env?: Readonly<Record<string, string>>,
    ) => {
      const last = options.captures[options.captures.length - 1]!;
      options.captures[options.captures.length - 1] = {
        ...last,
        config,
        options: spawnOptions,
        workingDirectory,
        env,
      };
      const child = new FakeChild();
      queueMicrotask(() => {
        options.onSpawn?.(child);
        child.close(7);
      });
      return child;
    },
  });
}

describe('MxcSandboxRunner', () => {
  it('reports unavailable when the MXC SDK cannot be loaded', async () => {
    const runner = new MxcSandboxRunner({
      loadMxc: async () => {
        throw new Error('missing package');
      },
    });

    await expect(runner.isAvailable()).resolves.toEqual({
      available: false,
      reason: 'MXC SDK could not be loaded: missing package',
    });
  });

  it('reports unsupported hosts without throwing from isAvailable', async () => {
    const runner = new MxcSandboxRunner({
      loadMxc: makeLoader({
        supported: false,
        reason: 'no backend on PATH',
        captures: [],
      }),
    });

    await expect(runner.isAvailable()).resolves.toEqual({
      available: false,
      reason: 'no backend on PATH',
    });
  });

  it('maps OpenClaw execution policy into an MXC config and collects output', async () => {
    const captures: CapturedSpawn[] = [];
    const runner = new MxcSandboxRunner({
      loadMxc: makeLoader({
        captures,
        onSpawn: (child) => {
          child.stdout.write('out');
          child.stderr.write('err');
        },
      }),
    });

    const result = await runner.run({
      commandLine: 'node -e "console.log(1)"',
      policy: {
        containment: 'vm',
        experimental: true,
        cwd: 'C:\\workspace',
        env: { B: '2', A: '1' },
        timeoutMs: 1234,
        filesystem: {
          workspaceRoot: 'C:\\workspace',
          workspaceAccess: 'readonly',
          readonlyPaths: ['C:\\input'],
          readwritePaths: ['C:\\output'],
          deniedPaths: ['C:\\secrets'],
        },
        network: { allowOutbound: true },
        ui: { allowWindows: true },
      },
    });

    expect(result).toEqual({ stdout: 'out', stderr: 'err', exitCode: 7 });
    expect(captures).toHaveLength(1);
    const captured = captures[0]!;
    expect(captured.containment).toBe('vm');
    expect(captured.config.process).toEqual({
      commandLine: 'node -e "console.log(1)"',
      cwd: 'C:\\workspace',
      env: ['A=1', 'B=2'],
    });
    expect(captured.options).toEqual({ usePty: false, experimental: true });
    expect(captured.workingDirectory).toBe('C:\\workspace');
    expect(captured.env).toEqual({ A: '1', B: '2' });
    expect(captured.policy).toEqual({
      version: '0.6.0-alpha',
      filesystem: {
        readonlyPaths: ['C:\\Tools', 'C:\\input', 'C:\\workspace'],
        readwritePaths: ['C:\\Temp', 'C:\\output'],
        deniedPaths: ['C:\\secrets'],
      },
      network: { allowOutbound: true },
      timeoutMs: 1234,
      ui: { allowWindows: true },
    });
  });

  it('defaults to process containment, denied network, temp write, and readwrite workspace when requested', async () => {
    const captures: CapturedSpawn[] = [];
    const runner = new MxcSandboxRunner({
      loadMxc: makeLoader({ captures }),
    });

    await runner.run({
      commandLine: 'git status',
      policy: {
        filesystem: {
          workspaceRoot: 'C:\\repo',
          workspaceAccess: 'readwrite',
        },
      },
    });

    const captured = captures[0]!;
    expect(captured.containment).toBe('process');
    expect(captured.options).toEqual({ usePty: false, experimental: false });
    expect(captured.policy).toEqual({
      version: '0.6.0-alpha',
      filesystem: {
        readonlyPaths: ['C:\\Tools'],
        readwritePaths: ['C:\\Temp', 'C:\\repo'],
        deniedPaths: [],
      },
      network: { allowOutbound: false },
      timeoutMs: 30_000,
    });
  });

  it('throws SandboxUnavailableError when run is attempted on an unsupported host', async () => {
    const runner = new MxcSandboxRunner({
      loadMxc: makeLoader({
        supported: false,
        reason: 'unsupported',
        captures: [],
      }),
    });

    await expect(
      runner.run({ commandLine: 'node --version' }),
    ).rejects.toBeInstanceOf(SandboxUnavailableError);
  });

  it('rejects empty commands before loading MXC', async () => {
    const runner = new MxcSandboxRunner({
      loadMxc: async () => {
        throw new Error('should not load');
      },
    });

    await expect(runner.run({ commandLine: '   ' })).rejects.toThrow(
      'Sandbox commandLine must not be empty',
    );
  });
});
