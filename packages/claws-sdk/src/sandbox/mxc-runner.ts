/**
 * MXC-backed sandbox runner.
 *
 * `@microsoft/mxc-sdk` is loaded dynamically so claws-sdk can expose this
 * adapter without making MXC a mandatory install-time dependency.
 *
 * @module claws-sdk/sandbox/mxc-runner
 */

import type {
  SandboxAvailability,
  SandboxRunRequest,
  SandboxRunResult,
  SandboxRunner,
} from './types.js';
import { SandboxUnavailableError } from './types.js';

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_SCHEMA_VERSION = '0.6.0-alpha';

interface MxcFilesystemPolicyResult {
  readonly readonlyPaths?: readonly string[];
  readonly readwritePaths?: readonly string[];
}

interface MxcPlatformSupport {
  readonly isSupported: boolean;
  readonly reason?: string;
}

interface MxcProcessConfig {
  commandLine?: string;
  cwd?: string;
  env?: readonly string[];
}

interface MxcContainerConfig {
  process?: MxcProcessConfig;
}

interface MxcReadable {
  on(event: 'data', cb: (chunk: unknown) => void): void;
}

interface MxcChildProcess {
  stdout?: MxcReadable | null;
  stderr?: MxcReadable | null;
  on(event: 'close', cb: (code: number | null) => void): void;
  on(event: 'error', cb: (error: Error) => void): void;
}

interface MxcSdk {
  getPlatformSupport(): MxcPlatformSupport;
  getAvailableToolsPolicy(env?: Readonly<Record<string, string>>): MxcFilesystemPolicyResult;
  getTemporaryFilesPolicy(env?: Readonly<Record<string, string>>): MxcFilesystemPolicyResult;
  createConfigFromPolicy(
    policy: Record<string, unknown>,
    containment?: string,
  ): MxcContainerConfig;
  spawnSandboxFromConfig(
    config: MxcContainerConfig,
    options?: Record<string, unknown>,
    workingDirectory?: string,
    env?: Readonly<Record<string, string>>,
  ): MxcChildProcess;
}

export type MxcSdkLoader = () => Promise<MxcSdk>;

export interface MxcSandboxRunnerOptions {
  readonly loadMxc?: MxcSdkLoader;
}

const dynamicImport = new Function(
  'specifier',
  'return import(specifier)',
) as (specifier: string) => Promise<unknown>;

async function defaultLoadMxc(): Promise<MxcSdk> {
  return dynamicImport('@microsoft/mxc-sdk') as Promise<MxcSdk>;
}

/**
 * Sandbox runner that executes a single approved command through MXC.
 */
export class MxcSandboxRunner implements SandboxRunner {
  private readonly loadMxc: MxcSdkLoader;

  constructor(options: MxcSandboxRunnerOptions = {}) {
    this.loadMxc = options.loadMxc ?? defaultLoadMxc;
  }

  async isAvailable(): Promise<SandboxAvailability> {
    let mxc: MxcSdk;
    try {
      mxc = await this.loadMxc();
    } catch (err) {
      return {
        available: false,
        reason: `MXC SDK could not be loaded: ${errorMessage(err)}`,
      };
    }

    try {
      const support = mxc.getPlatformSupport();
      if (support.isSupported) return { available: true, reason: null };
      return {
        available: false,
        reason: support.reason ?? 'MXC is not supported on this host',
      };
    } catch (err) {
      return {
        available: false,
        reason: `MXC platform check failed: ${errorMessage(err)}`,
      };
    }
  }

  async run(request: SandboxRunRequest): Promise<SandboxRunResult> {
    if (request.commandLine.trim() === '') {
      throw new Error('Sandbox commandLine must not be empty');
    }

    const mxc = await this.loadMxc();
    const support = mxc.getPlatformSupport();
    if (!support.isSupported) {
      throw new SandboxUnavailableError(
        support.reason ?? 'MXC is not supported on this host',
      );
    }

    const policy = request.policy ?? {};
    const env = policy.env;
    const tools = mxc.getAvailableToolsPolicy(env);
    const temp = mxc.getTemporaryFilesPolicy(env);
    const filesystem = policy.filesystem ?? {};
    const workspaceAccess = filesystem.workspaceAccess ?? 'readonly';

    const readonlyPaths = unique([
      ...(tools.readonlyPaths ?? []),
      ...(filesystem.readonlyPaths ?? []),
      ...(filesystem.workspaceRoot !== undefined && workspaceAccess === 'readonly'
        ? [filesystem.workspaceRoot]
        : []),
    ]);
    const readwritePaths = unique([
      ...(temp.readwritePaths ?? []),
      ...(filesystem.readwritePaths ?? []),
      ...(filesystem.workspaceRoot !== undefined && workspaceAccess === 'readwrite'
        ? [filesystem.workspaceRoot]
        : []),
    ]);
    const deniedPaths = unique([...(filesystem.deniedPaths ?? [])]);

    const mxcPolicy: Record<string, unknown> = {
      version: DEFAULT_SCHEMA_VERSION,
      filesystem: {
        readonlyPaths,
        readwritePaths,
        deniedPaths,
      },
      network: {
        allowOutbound: policy.network?.allowOutbound ?? false,
      },
      timeoutMs: policy.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    };

    if (policy.ui?.allowWindows === true) {
      mxcPolicy['ui'] = { allowWindows: true };
    }

    const config = mxc.createConfigFromPolicy(
      mxcPolicy,
      policy.containment ?? 'process',
    );
    config.process ??= {};
    config.process.commandLine = request.commandLine;
    if (policy.cwd !== undefined) config.process.cwd = policy.cwd;
    if (env !== undefined) config.process.env = envToArray(env);

    const child = mxc.spawnSandboxFromConfig(
      config,
      { usePty: false, experimental: policy.experimental === true },
      policy.cwd,
      env,
    );

    return collectChild(child);
  }
}

function collectChild(child: MxcChildProcess): Promise<SandboxRunResult> {
  return new Promise((resolve, reject) => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    child.stdout?.on('data', (chunk) => stdout.push(String(chunk)));
    child.stderr?.on('data', (chunk) => stderr.push(String(chunk)));
    child.on('error', reject);
    child.on('close', (exitCode) => {
      resolve({
        stdout: stdout.join(''),
        stderr: stderr.join(''),
        exitCode,
      });
    });
  });
}

function unique(paths: readonly string[]): readonly string[] {
  return Array.from(new Set(paths.filter((p) => p.length > 0))).sort();
}

function envToArray(env: Readonly<Record<string, string>>): readonly string[] {
  return Object.keys(env)
    .sort()
    .map((key) => `${key}=${env[key] ?? ''}`);
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
