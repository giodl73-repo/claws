/**
 * L0 unit tests for `CompilerEventBus` — per-method coverage of the §9.1
 * contract. Covers the 8 assertions enumerated in pulse 83 §Deliverables.
 */
import { describe, it, expect, vi } from 'vitest';
import {
  CompilerEventBus,
  monotonicNs,
} from '#src/compiler/events/bus.js';
import type {
  CompilerEvent,
  CompileStartEvent,
  EmitCompleteEvent,
} from '#src/compiler/events/types.js';

function startEvent(): CompileStartEvent {
  return {
    type: 'compile.start',
    workspace: '/ws',
    monotonicNs: monotonicNs(),
    contentHash: '',
    targets: ['oc'],
    cacheEnabled: false,
    now: '1970-01-01T00:00:00.000Z',
  };
}

function emitCompleteEvent(): EmitCompleteEvent {
  return {
    type: 'emit.complete',
    workspace: '/ws',
    monotonicNs: monotonicNs(),
    target: 'oc',
    files: [],
    durationMs: 1,
  };
}

describe('CompilerEventBus (unit)', () => {
  // (1) typed `on` narrows payload via Extract<…>
  it('on<T> narrows the payload via Extract discriminator', () => {
    const bus = new CompilerEventBus();
    const seen: string[] = [];
    bus.on('emit.complete', (event) => {
      // Type system ensures event.target is EmitTarget, no cast needed.
      seen.push(event.target);
    });
    bus.emit(emitCompleteEvent());
    expect(seen).toEqual(['oc']);
  });

  // (2) `once` invokes at most once and then auto-removes
  it('once<T> fires exactly once and auto-detaches', () => {
    const bus = new CompilerEventBus();
    const listener = vi.fn();
    bus.once('compile.start', listener);
    bus.emit(startEvent());
    bus.emit(startEvent());
    bus.emit(startEvent());
    expect(listener).toHaveBeenCalledTimes(1);
  });

  // (3) `off` detaches a listener by its caller-facing reference
  it('off<T> detaches a previously-registered on() listener', () => {
    const bus = new CompilerEventBus();
    const listener = vi.fn();
    bus.on('compile.start', listener);
    bus.emit(startEvent());
    expect(listener).toHaveBeenCalledTimes(1);
    bus.off('compile.start', listener);
    bus.emit(startEvent());
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('off<T> detaches a once() listener before its first invocation', () => {
    const bus = new CompilerEventBus();
    const listener = vi.fn();
    bus.once('compile.start', listener);
    bus.off('compile.start', listener);
    bus.emit(startEvent());
    expect(listener).not.toHaveBeenCalled();
  });

  it('off<T> on an unregistered listener is a silent no-op', () => {
    const bus = new CompilerEventBus();
    const other = vi.fn();
    expect(() => bus.off('compile.start', other)).not.toThrow();
    expect(other).not.toHaveBeenCalled();
  });

  it('off<T> on a type with other registrations but not this listener is a no-op', () => {
    // Covers the branch where #registrations has an entry for `type` but the
    // specific listener is absent — distinct from "no entry for type at all".
    const bus = new CompilerEventBus();
    const registered = vi.fn();
    const stranger = vi.fn();
    bus.on('compile.start', registered);
    expect(() => bus.off('compile.start', stranger)).not.toThrow();
    bus.emit(startEvent());
    expect(registered).toHaveBeenCalledTimes(1);
    expect(stranger).not.toHaveBeenCalled();
  });

  it('unsubscribe returned by on() is idempotent across double-calls', () => {
    // Calling unsub twice exercises the #untrack defensive branches (wrapped
    // ref no longer in the list) and must not detach a sibling listener.
    const bus = new CompilerEventBus();
    const listener = vi.fn();
    const sibling = vi.fn();
    const unsub = bus.on('compile.start', listener);
    bus.on('compile.start', sibling);
    unsub();
    unsub(); // second call: wrapped no longer tracked
    bus.emit(startEvent());
    expect(listener).not.toHaveBeenCalled();
    expect(sibling).toHaveBeenCalledTimes(1);
  });

  it('unsubscribe returned by once() after the one-shot fires is a no-op', () => {
    // Once the once() listener auto-clears via its own #untrack, the
    // returned unsub's #untrack finds nothing — the idx === -1 branch.
    const bus = new CompilerEventBus();
    const listener = vi.fn();
    const unsub = bus.once('compile.start', listener);
    bus.emit(startEvent());
    expect(listener).toHaveBeenCalledTimes(1);
    expect(() => unsub()).not.toThrow();
    bus.emit(startEvent());
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('off<T> removes one registration when the same listener was on()-registered twice', () => {
    const bus = new CompilerEventBus();
    const listener = vi.fn();
    bus.on('compile.start', listener);
    bus.on('compile.start', listener);
    bus.off('compile.start', listener);
    bus.emit(startEvent());
    // One registration remains — listener fires exactly once per emit.
    expect(listener).toHaveBeenCalledTimes(1);
    bus.off('compile.start', listener);
    bus.emit(startEvent());
    expect(listener).toHaveBeenCalledTimes(1);
  });

  // (4) unsubscribe function returned by `on` detaches the listener
  it('on<T> returns an unsubscribe function that detaches the listener', () => {
    const bus = new CompilerEventBus();
    const listener = vi.fn();
    const unsub = bus.on('compile.start', listener);
    bus.emit(startEvent());
    unsub();
    bus.emit(startEvent());
    expect(listener).toHaveBeenCalledTimes(1);
  });

  // (4b) unsubscribe from `once` detaches before the first invocation
  it('once<T> unsubscribe prevents the one-shot firing', () => {
    const bus = new CompilerEventBus();
    const listener = vi.fn();
    const unsub = bus.once('compile.start', listener);
    unsub();
    bus.emit(startEvent());
    expect(listener).not.toHaveBeenCalled();
  });

  // (5) throwing listener caught, compile/bus continues (error logged)
  it('listener exceptions are caught and logged, not propagated', () => {
    const logger = { error: vi.fn() };
    const bus = new CompilerEventBus({ logger });
    bus.on('compile.start', () => {
      throw new Error('listener boom');
    });
    expect(() => bus.emit(startEvent())).not.toThrow();
    expect(logger.error).toHaveBeenCalledTimes(1);
    const [tag, type, err] = logger.error.mock.calls[0]!;
    expect(tag).toMatch(/CompilerEventBus/);
    expect(type).toBe('compile.start');
    expect((err as Error).message).toBe('listener boom');
  });

  // (5b) a throwing listener does NOT prevent sibling listeners from firing
  it('throwing listener does not starve later listeners', () => {
    const bus = new CompilerEventBus({ logger: { error: () => {} } });
    const second = vi.fn();
    bus.on('compile.start', () => {
      throw new Error('boom');
    });
    bus.on('compile.start', second);
    bus.emit(startEvent());
    expect(second).toHaveBeenCalledTimes(1);
  });

  // (6) emit() with no listeners registered is a no-op
  it('emit() with no listeners registered is a silent no-op', () => {
    const bus = new CompilerEventBus();
    expect(() => bus.emit(startEvent())).not.toThrow();
  });

  // (7) multiple listeners on the same type invoked in registration order
  it('multiple listeners fire in registration order', () => {
    const bus = new CompilerEventBus();
    const order: number[] = [];
    bus.on('compile.start', () => order.push(1));
    bus.on('compile.start', () => order.push(2));
    bus.on('compile.start', () => order.push(3));
    bus.emit(startEvent());
    expect(order).toEqual([1, 2, 3]);
  });

  // (8) listeners for type `A` NOT invoked when type `B` fires
  it('listeners are scoped to their registered type', () => {
    const bus = new CompilerEventBus();
    const startListener = vi.fn();
    const emitListener = vi.fn();
    bus.on('compile.start', startListener);
    bus.on('emit.complete', emitListener);
    bus.emit(startEvent());
    expect(startListener).toHaveBeenCalledTimes(1);
    expect(emitListener).not.toHaveBeenCalled();
  });

  // Defensive: exhaustiveness check compiles — this test body is only
  // interesting to tsc, but we run it at runtime to assert that every
  // variant has a `type` field that narrows.
  it('CompilerEvent discriminator narrows via switch', () => {
    function assertNever(_x: never): never {
      throw new Error('unreachable');
    }
    function kind(event: CompilerEvent): string {
      switch (event.type) {
        case 'compile.start':
          return event.now;
        case 'read.start':
        case 'read.complete':
        case 'read.failed':
          return event.stage;
        case 'enforce.start':
          return String(event.violationCount);
        case 'enforce.denied':
          return event.severity;
        case 'enforce.complete':
          return String(event.durationMs);
        case 'emit.start':
        case 'emit.complete':
        case 'emit.failed':
          return event.target;
        case 'validate.start':
        case 'validate.complete':
        case 'validate.failed':
          return event.target;
        case 'cache.hit':
        case 'cache.miss':
        case 'cache.write':
          return event.key;
        case 'cache.evicted':
          return `${event.reason}:${event.key}`;
        case 'compile.complete':
          return String(event.durationMs);
        case 'compile.failed':
          return String(event.durationMs);
        case 'compile.cancelled':
          return event.reason;
        default:
          return assertNever(event);
      }
    }
    expect(kind(startEvent())).toBe('1970-01-01T00:00:00.000Z');
    expect(kind(emitCompleteEvent())).toBe('oc');
  });

  it('compile.cancelled variant carries a reason string and durationMs', () => {
    const bus = new CompilerEventBus();
    const seen: Array<{ reason: string; durationMs: number }> = [];
    bus.on('compile.cancelled', (event) => {
      seen.push({ reason: event.reason, durationMs: event.durationMs });
    });
    bus.emit({
      type: 'compile.cancelled',
      workspace: '/ws',
      monotonicNs: monotonicNs(),
      durationMs: 120,
      reason: 'sigint',
    });
    expect(seen).toEqual([{ reason: 'sigint', durationMs: 120 }]);
  });

  it('cache.evicted variant carries key, reason, sizeBytes, and optional stage', () => {
    const bus = new CompilerEventBus();
    const seen: Array<{ key: string; reason: string; sizeBytes: number; stage: string | undefined }> = [];
    bus.on('cache.evicted', (event) => {
      seen.push({
        key: event.key,
        reason: event.reason,
        sizeBytes: event.sizeBytes,
        stage: event.stage,
      });
    });
    bus.emit({
      type: 'cache.evicted',
      workspace: '/ws',
      monotonicNs: monotonicNs(),
      key: 'abc',
      reason: 'lru',
      sizeBytes: 1024,
    });
    bus.emit({
      type: 'cache.evicted',
      workspace: '/ws',
      monotonicNs: monotonicNs(),
      key: 'def',
      stage: 'modelToIR',
      reason: 'clear',
      sizeBytes: 64,
    });
    expect(seen).toEqual([
      { key: 'abc', reason: 'lru', sizeBytes: 1024, stage: undefined },
      { key: 'def', reason: 'clear', sizeBytes: 64, stage: 'modelToIR' },
    ]);
  });

  it('monotonicNs() returns a strictly non-decreasing bigint', () => {
    const a = monotonicNs();
    const b = monotonicNs();
    expect(typeof a).toBe('bigint');
    expect(b >= a).toBe(true);
  });

  it('defaults to console when no logger is injected', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const bus = new CompilerEventBus();
      bus.on('compile.start', () => {
        throw new Error('oops');
      });
      bus.emit(startEvent());
      expect(spy).toHaveBeenCalledTimes(1);
    } finally {
      spy.mockRestore();
    }
  });
});
