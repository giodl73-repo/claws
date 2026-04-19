/**
 * ServeClient — HTTP client for `claws serve` from LSP context.
 *
 * The LSP uses this client to offload compilation to a running `claws serve`
 * instance, making the VS Code extension the fourth consumer of the server
 * (TUI, HTTP, WS being the others). Compared to compiling in-process, the
 * serve-backed path gives the LSP the same cache, diagnostics, and tension
 * analysis as the TUI — with no duplication of logic.
 *
 * Surfaces used:
 *   GET  /health     — connection probe + mode check
 *   POST /compile    — trigger recompilation, return GovernanceIR
 *   GET  /ir         — fetch last IR without recompiling
 *
 * @module openclaw-lsp/serve-client
 */

import type { GovernanceIRLike } from './compilation-host.js';

/** Connection state for a ServeClient instance. */
export type ServeConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

/** Health response shape — matches claws-serve's /health endpoint. */
export interface ServeHealth {
  readonly uptime: number;
  readonly memory: number;
  readonly compileCount: number;
  readonly mode: string;
  readonly degradedReasonCode?: string;
}

/** Compile response shape — matches claws-serve's /compile endpoint. */
export interface ServeCompileResult {
  readonly ir: GovernanceIRLike;
  readonly cached: boolean;
  readonly durationMs: number;
}

/** Minimal fetch implementation signature, so tests can inject mocks. */
export type FetchLike = (
  input: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

/** Options for ServeClient. */
export interface ServeClientOptions {
  /** Base URL for `claws serve`, e.g. `http://127.0.0.1:7711`. */
  readonly baseUrl: string;
  /** Injected fetch — defaults to the global fetch. */
  readonly fetchImpl?: FetchLike;
}

/**
 * ServeClient — thin HTTP wrapper around `claws serve`.
 *
 * Tracks connection state, surfaces structured errors, and does not cache
 * IR locally — callers (LSP providers) are expected to hold cached IR in
 * the CompilationHost rather than here.
 */
export class ServeClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: FetchLike;
  private stateValue: ServeConnectionState = 'disconnected';

  constructor(opts: ServeClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, '');
    this.fetchImpl = opts.fetchImpl ?? (globalThis.fetch as unknown as FetchLike);
  }

  /** Current connection state — updated by health/compile calls. */
  get state(): ServeConnectionState {
    return this.stateValue;
  }

  /** Probe the server and update state. Returns the health payload on success. */
  async health(): Promise<ServeHealth> {
    this.stateValue = 'connecting';
    try {
      const payload = await this.getJson<ServeHealth>('/health');
      this.stateValue = 'connected';
      return payload;
    } catch (err) {
      this.stateValue = 'error';
      throw err;
    }
  }

  /** Trigger a compile and return the resulting IR. */
  async compile(): Promise<ServeCompileResult> {
    const payload = await this.postJson<ServeCompileResult>('/compile');
    this.stateValue = 'connected';
    return payload;
  }

  /** Fetch the last compiled IR without triggering a recompile. */
  async getIR(): Promise<GovernanceIRLike> {
    const body = await this.getJson<{ ir: GovernanceIRLike }>('/ir');
    this.stateValue = 'connected';
    return body.ir;
  }

  private async getJson<T>(path: string): Promise<T> {
    return this.requestJson<T>('GET', path);
  }

  private async postJson<T>(path: string): Promise<T> {
    return this.requestJson<T>('POST', path);
  }

  private async requestJson<T>(method: string, path: string): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    try {
      const res = await this.fetchImpl(url, {
        method,
        headers: { 'content-type': 'application/json' },
      });
      if (!res.ok) {
        this.stateValue = 'error';
        throw new Error(`claws serve ${method} ${path} returned ${res.status}`);
      }
      return (await res.json()) as T;
    } catch (err) {
      this.stateValue = 'error';
      throw err;
    }
  }
}
