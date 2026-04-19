/**
 * EventStream — SSE broadcast manager for the /api/events endpoint.
 *
 * Maintains a monotonic sequence counter (starts at 1, increments per event)
 * so clients can detect gaps on reconnect (P-275). Current-state-only:
 * events emitted while a client is disconnected are lost. For full audit
 * replay, clients use GET /api/audit (Phase 4).
 *
 * Transport-agnostic: clients are registered via a `ClientWriter` callback
 * interface so the class is testable without real HTTP sockets. The Express
 * route adapter wraps `res.write` into a ClientWriter.
 *
 * @module claws-serve/sse/event-stream
 */

/**
 * Default idle-heartbeat cadence in milliseconds.
 *
 * 15 seconds is chosen to stay safely under the most aggressive reverse-proxy
 * idle timeouts seen in production (nginx, Azure Front Door, corporate egress
 * proxies commonly default to 30-60s). Emitting a comment-only frame every
 * 15s guarantees at least two keepalives per typical idle window, so a
 * single dropped frame does not terminate the connection.
 *
 * The wire frame is an SSE comment (`:heartbeat\n\n`) which clients ignore
 * per the SSE spec — it advances no sequence counter and fires no event
 * handler on EventSource.
 */
export const DEFAULT_HEARTBEAT_INTERVAL_MS = 15_000;

/**
 * Event types pushed to SSE subscribers. See CL-10 §S8 for the full catalog.
 *
 * - `connected` — sent once per subscription with the current sequence so
 *   clients can anchor gap detection.
 * - `file_changed` — workspace OC file edited (via claws watch).
 * - `recompiled` — compilation finished, carries duration + result summary.
 * - `governance_warning` — advisory rule fired during compile.
 * - `governance_state_changed` — violation state transition ({from, to, activeViolations}).
 */
export type SseEventType =
  | 'connected'
  | 'file_changed'
  | 'recompiled'
  | 'governance_warning'
  | 'governance_state_changed';

/** Payload shape for `file_changed` events. */
export interface FileChangedPayload {
  readonly path: string;
  readonly changedBy: string;
  readonly timestamp: string;
}

/** Payload shape for `recompiled` events. */
export interface RecompiledPayload {
  readonly durationMs: number;
  readonly result: {
    readonly violationCount: number;
    readonly warningCount: number;
    readonly cached: boolean;
  };
  readonly timestamp: string;
}

/** Payload shape for `governance_warning` events. */
export interface GovernanceWarningPayload {
  readonly rule: string;
  readonly tool: string;
  readonly message: string;
  readonly timestamp: string;
}

/** Payload shape for `governance_state_changed` events. */
export interface GovernanceStatePayload {
  readonly from: string;
  readonly to: string;
  readonly activeViolations: number;
  readonly timestamp: string;
}

/** Payload shape for the initial `connected` event. */
export interface ConnectedPayload {
  readonly sequence: number;
  readonly timestamp: string;
}

/** Typed map from event type to its payload. */
export interface SseEventPayloads {
  readonly connected: ConnectedPayload;
  readonly file_changed: FileChangedPayload;
  readonly recompiled: RecompiledPayload;
  readonly governance_warning: GovernanceWarningPayload;
  readonly governance_state_changed: GovernanceStatePayload;
}

/** The envelope actually written on the wire. */
export interface SseEnvelope<T extends SseEventType = SseEventType> {
  readonly sequence: number;
  readonly type: T;
  readonly payload: SseEventPayloads[T];
  /**
   * Workspace version at broadcast time (pulse 69 — versioning). Optional
   * so events emitted before the VersionManager is wired into the stream
   * stay wire-compatible with older clients. Live clients compare this
   * against their last-known ETag to detect staleness.
   */
  readonly workspaceVersion?: number;
}

/**
 * Transport handle for a single subscriber. The Express route adapter
 * implements this with `res.write`; tests can implement it with a plain
 * function collector.
 */
export interface ClientWriter {
  /** Write a pre-serialized SSE frame. Return false on failure so the stream evicts the client. */
  write(frame: string): boolean;
}

/**
 * Serialize an envelope into the SSE wire format per RFC 6202:
 *   `event: <type>\ndata: <json>\nid: <sequence>\n\n`
 */
export function serializeSseFrame<T extends SseEventType>(envelope: SseEnvelope<T>): string {
  const data = envelope.workspaceVersion !== undefined
    ? JSON.stringify({
        sequence: envelope.sequence,
        workspaceVersion: envelope.workspaceVersion,
        payload: envelope.payload,
      })
    : JSON.stringify({ sequence: envelope.sequence, payload: envelope.payload });
  return `event: ${envelope.type}\ndata: ${data}\nid: ${String(envelope.sequence)}\n\n`;
}

/** SSE comment frame used for idle keepalive. Clients ignore comment lines per the SSE spec. */
export const HEARTBEAT_FRAME = ':heartbeat\n\n';

/**
 * Broadcast manager. Holds the monotonic counter and the set of subscribers.
 * A single EventStream instance is created per server and wired into both
 * the `/api/events` route (as the broadcaster) and the CompilerEventBus /
 * watch plumbing (as the event source).
 */
export class EventStream {
  private sequenceCounter = 0;
  private readonly clients = new Set<ClientWriter>();
  private heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  private heartbeatIntervalMs = DEFAULT_HEARTBEAT_INTERVAL_MS;
  private versionSource: (() => number) | undefined;

  /**
   * Attach a workspace-version source (pulse 69 — versioning). When set,
   * every broadcast envelope carries the current value so live clients can
   * detect staleness without polling. Unset by default so unit tests and
   * pre-versioning call sites keep their existing wire format.
   */
  setVersionSource(source: (() => number) | undefined): void {
    this.versionSource = source;
  }

  /** Current sequence. Zero means no events have been emitted yet. */
  get currentSequence(): number {
    return this.sequenceCounter;
  }

  /** Number of currently subscribed clients. */
  get clientCount(): number {
    return this.clients.size;
  }

  /** Whether the idle-heartbeat interval is currently running. */
  get heartbeatActive(): boolean {
    return this.heartbeatTimer !== undefined;
  }

  /**
   * Register a subscriber. Returns an unsubscribe function that drops the
   * client from the broadcast list. Safe to call multiple times — the
   * underlying Set dedupes. Starts the idle-heartbeat interval on first
   * subscribe; the interval is torn down automatically when the last
   * subscriber unsubscribes.
   */
  subscribe(client: ClientWriter): () => void {
    this.clients.add(client);
    if (this.heartbeatTimer === undefined) {
      this.startHeartbeat(this.heartbeatIntervalMs);
    }
    return () => {
      this.clients.delete(client);
      if (this.clients.size === 0) {
        this.stopHeartbeat();
      }
    };
  }

  /**
   * Broadcast an event. Allocates the next sequence number, serializes the
   * envelope once, and writes to every client. Clients whose `write` returns
   * `false` (or throws) are evicted so a broken subscriber cannot block the
   * broadcast loop. Returns the sequence number assigned to the event.
   */
  broadcast<T extends SseEventType>(type: T, payload: SseEventPayloads[T]): number {
    this.sequenceCounter += 1;
    const version = this.versionSource?.();
    const envelope: SseEnvelope<T> = version !== undefined
      ? { sequence: this.sequenceCounter, type, payload, workspaceVersion: version }
      : { sequence: this.sequenceCounter, type, payload };
    const frame = serializeSseFrame(envelope);
    this.fanOut(frame);
    return envelope.sequence;
  }

  /**
   * Emit the initial `connected` anchor event. Allocates the sequence and
   * writes the envelope whose payload `sequence` field is authoritatively
   * the allocated value — no caller-side `currentSequence + 1` computation,
   * which races with concurrent broadcasts (e.g., the CompilerEventBus →
   * SSE bridge firing between the read and the broadcast).
   *
   * Returns the allocated sequence so callers can assert ordering in tests.
   */
  broadcastConnected(timestamp: string): number {
    this.sequenceCounter += 1;
    const sequence = this.sequenceCounter;
    const version = this.versionSource?.();
    const envelope: SseEnvelope<'connected'> = version !== undefined
      ? {
          sequence,
          type: 'connected',
          payload: { sequence, timestamp },
          workspaceVersion: version,
        }
      : {
          sequence,
          type: 'connected',
          payload: { sequence, timestamp },
        };
    const frame = serializeSseFrame(envelope);
    this.fanOut(frame);
    return sequence;
  }

  /**
   * Start the idle-heartbeat interval. Emits `:heartbeat\n\n` comment
   * frames to every subscribed client every `intervalMs` milliseconds so
   * reverse proxies do not terminate idle SSE connections.
   *
   * Idempotent: calling while active updates the cadence and restarts the
   * timer. The interval is torn down automatically when the last
   * subscriber unsubscribes.
   */
  startHeartbeat(intervalMs: number = DEFAULT_HEARTBEAT_INTERVAL_MS): void {
    this.heartbeatIntervalMs = intervalMs;
    if (this.heartbeatTimer !== undefined) {
      clearInterval(this.heartbeatTimer);
    }
    this.heartbeatTimer = setInterval(() => {
      this.fanOut(HEARTBEAT_FRAME);
    }, intervalMs);
    // Node-specific: unref so a dangling heartbeat does not keep the
    // process alive when the server is shutting down. Guard for
    // environments (some test harnesses) where unref is not present.
    const timer = this.heartbeatTimer as unknown as { unref?: () => void };
    if (typeof timer.unref === 'function') timer.unref();
  }

  /** Stop the idle-heartbeat interval. Idempotent. */
  stopHeartbeat(): void {
    if (this.heartbeatTimer !== undefined) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  /** Disconnect-all helper for graceful shutdown. Clears the client set and stops the heartbeat. */
  closeAll(): void {
    this.clients.clear();
    this.stopHeartbeat();
  }

  /**
   * Write a pre-serialized frame to every subscribed client. Clients whose
   * `write` returns `false` (or throws) are evicted so a broken subscriber
   * cannot block the broadcast or heartbeat loops.
   */
  private fanOut(frame: string): void {
    const failed: ClientWriter[] = [];
    for (const client of this.clients) {
      let ok = false;
      try {
        ok = client.write(frame);
      } catch {
        ok = false;
      }
      if (!ok) failed.push(client);
    }
    for (const dead of failed) this.clients.delete(dead);
    if (this.clients.size === 0) this.stopHeartbeat();
  }
}
