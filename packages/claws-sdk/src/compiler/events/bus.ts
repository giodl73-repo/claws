/**
 * `CompilerEventBus` — the Horus-seam hook surface shipped by Ra per
 * CL-14 §9. A thin typed wrapper around `EventEmitter` with:
 *
 *   • typed `on` / `once` / `off` overloads narrowing the payload via
 *     `Extract<CompilerEvent, { type: T }>`,
 *   • `on` / `once` return an unsubscribe function so callers need not
 *     thread the listener reference back to `off`,
 *   • listener-exception guard — a throwing listener is caught, logged,
 *     and MUST NOT propagate back into the compiler,
 *   • monotonic-clock helper — every emitted event carries a
 *     `process.hrtime.bigint()`-sourced timestamp.
 *
 * Stability: extension-only per CL-14 §9.5. The bus is published under the
 * public subpath `@bic/claws-sdk/compiler/events` (post-Horus rename:
 * `@bic/claws-sdk/compiler/events`) and is NOT re-exported from the
 * top-level barrel.
 *
 * @module claws-sdk/compiler/events/bus
 */
import { EventEmitter } from 'node:events';
import type { CompilerEvent, CompilerEventLogger } from './types.js';

/** Monotonic-clock helper — centralized so callers never reach for Date.now(). */
export function monotonicNs(): bigint {
  return process.hrtime.bigint();
}

export interface CompilerEventBusOptions {
  /**
   * Optional logger used to surface listener exceptions. Defaults to
   * `console`. CL-14 §9.3 requires caught listener errors be logged —
   * swallowing silently would make broken consumers invisible.
   */
  readonly logger?: CompilerEventLogger;
}

type EventType = CompilerEvent['type'];
type EventFor<T extends EventType> = Extract<CompilerEvent, { type: T }>;
type Listener<T extends EventType> = (event: EventFor<T>) => void;

type AnyListener = (...args: unknown[]) => void;

export class CompilerEventBus {
  readonly #emitter = new EventEmitter();
  readonly #logger: CompilerEventLogger;
  /**
   * Per-type map from caller's listener to the set of wrapped listeners
   * currently registered on the underlying EventEmitter. A listener may be
   * registered multiple times (on+on, or on+once) — each registration gets
   * its own wrapped reference; `off` pops one wrapped ref at a time so
   * repeated registrations detach in LIFO order.
   */
  readonly #registrations = new Map<string, WeakMap<object, AnyListener[]>>();

  constructor(options: CompilerEventBusOptions = {}) {
    this.#emitter.setMaxListeners(0);
    this.#logger = options.logger ?? console;
  }

  /**
   * Register a listener for `type`. Returns an unsubscribe function — calling
   * it detaches the listener identically to `off(type, listener)`.
   */
  on<T extends EventType>(type: T, listener: Listener<T>): () => void {
    const wrapped: AnyListener = this.#wrap(listener) as AnyListener;
    this.#track(type, listener, wrapped);
    this.#emitter.on(type, wrapped);
    return () => {
      this.#untrack(type, listener, wrapped);
      this.#emitter.off(type, wrapped);
    };
  }

  /**
   * Register a one-shot listener that auto-detaches after its first
   * invocation. Returns an unsubscribe function.
   */
  once<T extends EventType>(type: T, listener: Listener<T>): () => void {
    const inner = this.#wrap(listener);
    const wrapped: AnyListener = (...args) => {
      this.#untrack(type, listener, wrapped);
      inner(...(args as [EventFor<T>]));
    };
    this.#track(type, listener, wrapped);
    this.#emitter.once(type, wrapped);
    return () => {
      this.#untrack(type, listener, wrapped);
      this.#emitter.off(type, wrapped);
    };
  }

  /**
   * Detach a previously-registered listener. Looks up the internal wrapped
   * reference so callers can pass the same listener they passed to `on` or
   * `once`. If the listener was registered multiple times, `off` removes one
   * registration per call (LIFO order). If the listener is not registered,
   * `off` is a silent no-op.
   */
  off<T extends EventType>(type: T, listener: Listener<T>): void {
    const byListener = this.#registrations.get(type);
    if (!byListener) return;
    const wrappedList = byListener.get(listener as unknown as object);
    if (!wrappedList || wrappedList.length === 0) return;
    const wrapped = wrappedList.pop()!;
    if (wrappedList.length === 0) byListener.delete(listener as unknown as object);
    this.#emitter.off(type, wrapped);
  }

  #track<T extends EventType>(type: T, listener: Listener<T>, wrapped: AnyListener): void {
    let byListener = this.#registrations.get(type);
    if (!byListener) {
      byListener = new WeakMap<object, AnyListener[]>();
      this.#registrations.set(type, byListener);
    }
    const key = listener as unknown as object;
    const existing = byListener.get(key);
    if (existing) {
      existing.push(wrapped);
    } else {
      byListener.set(key, [wrapped]);
    }
  }

  #untrack<T extends EventType>(type: T, listener: Listener<T>, wrapped: AnyListener): void {
    const byListener = this.#registrations.get(type);
    /* c8 ignore next -- #untrack is only invoked after a matching #track, so the type entry must exist. */
    if (!byListener) return;
    const key = listener as unknown as object;
    const wrappedList = byListener.get(key);
    if (!wrappedList) return;
    const idx = wrappedList.lastIndexOf(wrapped);
    /* c8 ignore next -- wrapped refs are unique per registration, so lastIndexOf always finds them. */
    if (idx === -1) return;
    wrappedList.splice(idx, 1);
    if (wrappedList.length === 0) byListener.delete(key);
  }

  /**
   * Emit an event to every registered listener. Listener exceptions are
   * caught and logged; the compile MUST proceed as if no listener
   * threw (CL-14 §9.3).
   */
  emit(event: CompilerEvent): void {
    this.#emitter.emit(event.type, event);
  }

  /**
   * Wrap a caller's listener in a try/catch so exceptions never propagate
   * back into the compiler. Caught errors are logged via the injected
   * logger.
   */
  #wrap<T extends EventType>(listener: Listener<T>): (event: EventFor<T>) => void {
    const logger = this.#logger;
    return (event) => {
      try {
        listener(event);
      } catch (err) {
        logger.error('[CompilerEventBus] listener threw for', event.type, err);
      }
    };
  }
}
