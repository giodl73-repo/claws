/**
 * Optional sandbox runner contract for OpenClaw tool execution.
 *
 * This layer is intentionally small: OpenClaw decides whether a tool may
 * execute, then a SandboxRunner constrains the approved process.
 *
 * @module claws-sdk/sandbox/types
 */

export type SandboxContainment = 'process' | 'vm' | 'microvm' | string;

export interface SandboxFilesystemPolicy {
  /** Workspace root to mount according to workspaceAccess. */
  readonly workspaceRoot?: string;
  /** Defaults to readonly when workspaceRoot is supplied. */
  readonly workspaceAccess?: 'readonly' | 'readwrite';
  /** Additional host paths visible read-only to the command. */
  readonly readonlyPaths?: readonly string[];
  /** Additional host paths visible read-write to the command. */
  readonly readwritePaths?: readonly string[];
  /** Additional host paths explicitly denied where the backend supports it. */
  readonly deniedPaths?: readonly string[];
}

export interface SandboxNetworkPolicy {
  /** Defaults to false. */
  readonly allowOutbound?: boolean;
}

export interface SandboxUiPolicy {
  /**
   * Some Windows shells need limited UI access even for non-interactive
   * startup. Keep false unless the caller knows the command needs it.
   */
  readonly allowWindows?: boolean;
}

export interface SandboxRunPolicy {
  readonly filesystem?: SandboxFilesystemPolicy;
  readonly network?: SandboxNetworkPolicy;
  readonly ui?: SandboxUiPolicy;
  /** Defaults to 30 seconds. */
  readonly timeoutMs?: number;
  /** MXC abstract intent or concrete backend. Defaults to "process". */
  readonly containment?: SandboxContainment;
  /** Required by MXC experimental backends. Defaults to false. */
  readonly experimental?: boolean;
  readonly cwd?: string;
  readonly env?: Readonly<Record<string, string>>;
}

export interface SandboxRunRequest {
  readonly commandLine: string;
  readonly policy?: SandboxRunPolicy;
}

export interface SandboxRunResult {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number | null;
}

export interface SandboxAvailability {
  readonly available: boolean;
  readonly reason: string | null;
}

export interface SandboxRunner {
  isAvailable(): Promise<SandboxAvailability>;
  run(request: SandboxRunRequest): Promise<SandboxRunResult>;
}

export class SandboxUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SandboxUnavailableError';
  }
}
