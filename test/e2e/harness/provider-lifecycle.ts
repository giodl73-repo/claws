/**
 * test/e2e/harness/provider-lifecycle — CL-07 §1a lifecycle substrate.
 *
 * The `LifecycleManager` enforces the exactly-once `init(ctx)` rule that
 * every other CP-5 pulse depends on: if `init` fires twice per registration,
 * the OC-7 merger sees doubled providers and scenario outcomes diverge.
 *
 * Contract:
 *
 *   - `init(provider, ctx)` — calls `provider.init(ctx)` exactly once per
 *     provider instance. Re-init of the same instance throws
 *     `AlreadyInitializedError` (loud failure — silent no-ops hide
 *     registration bugs).
 *   - `fireStageModeChanged(newMode)` — calls `provider.onStageModeChanged`
 *     on each registered provider when the mode differs from the current
 *     mode. Idempotent by state: two consecutive `'current'` calls fire the
 *     hook once, on the first call.
 *   - `fireSnapshotPromoted(meta)` — delegates to `provider.onSnapshotPromoted`
 *     on each registered provider. Pulse 41 owns the non-uplift semantics
 *     around snapshot promotion; this module only provides the fan-out.
 *
 * The manager tracks providers independently of `HostMock` so the lifecycle
 * layer remains usable with any provider-registry, not just the OC-7 merger
 * host.
 *
 * @module test/e2e/harness/provider-lifecycle
 */

export type StageMode = 'draft' | 'current' | 'superseded';

export interface SnapshotMeta {
  readonly snapshotId: string;
  readonly promotedAt: number;
}

/**
 * Provider lifecycle hooks. All four are optional — a provider that only
 * participates in `beforeToolCall` decisions (with no init/stage/snapshot
 * concerns) can ship an empty lifecycle.
 *
 * `init(ctx)` is passed the 11-field CL-07 §1a `HostContext` (opaque here to
 * avoid a circular import — `host-context.ts` re-exports the real shape and
 * the manager treats it as unknown-shaped pass-through data).
 */
export interface ProviderLifecycle {
  readonly id: string;
  readonly init?: (ctx: unknown) => Promise<void> | void;
  readonly onStageModeChanged?: (newMode: StageMode) => Promise<void> | void;
  readonly onSnapshotPromoted?: (meta: SnapshotMeta) => Promise<void> | void;
}

export class AlreadyInitializedError extends Error {
  readonly providerId: string;
  constructor(providerId: string) {
    super(
      `provider-lifecycle: provider '${providerId}' already initialized — ` +
        `re-init is a registration bug, not a no-op`,
    );
    this.name = 'AlreadyInitializedError';
    this.providerId = providerId;
  }
}

export class LifecycleManager {
  private readonly providers: ProviderLifecycle[] = [];
  private readonly initialized = new Set<ProviderLifecycle>();
  private currentMode: StageMode | null = null;

  /**
   * Register a provider so that subsequent `fireStageModeChanged` /
   * `fireSnapshotPromoted` calls fan out to it. Registration alone does
   * NOT call `init`; that happens via `init(provider, ctx)` below.
   */
  register(provider: ProviderLifecycle): void {
    if (this.providers.includes(provider)) {
      throw new AlreadyInitializedError(provider.id);
    }
    this.providers.push(provider);
  }

  /**
   * Call `provider.init(ctx)` exactly once. Throws
   * `AlreadyInitializedError` on re-init of the same instance. Providers
   * without an `init` hook are still marked initialized (so subsequent
   * `hasInitialized` reports true) but no hook is invoked.
   */
  async init(provider: ProviderLifecycle, ctx: unknown): Promise<void> {
    if (this.initialized.has(provider)) {
      throw new AlreadyInitializedError(provider.id);
    }
    if (!this.providers.includes(provider)) {
      this.providers.push(provider);
    }
    if (provider.init !== undefined) {
      await provider.init(ctx);
    }
    this.initialized.add(provider);
  }

  hasInitialized(provider: ProviderLifecycle): boolean {
    return this.initialized.has(provider);
  }

  registeredIds(): readonly string[] {
    return this.providers.map((p) => p.id);
  }

  stageMode(): StageMode | null {
    return this.currentMode;
  }

  /**
   * Fan out an `onStageModeChanged` hook. Idempotent by state: if
   * `newMode === currentMode`, this is a no-op. Returns the ids of
   * providers whose hook was actually invoked.
   */
  async fireStageModeChanged(newMode: StageMode): Promise<readonly string[]> {
    if (newMode === this.currentMode) {
      return [];
    }
    this.currentMode = newMode;
    const fanout: string[] = [];
    for (const p of this.providers) {
      if (p.onStageModeChanged !== undefined) {
        await p.onStageModeChanged(newMode);
        fanout.push(p.id);
      }
    }
    return fanout;
  }

  /**
   * Fan out an `onSnapshotPromoted` hook. The non-uplift rules (trust-set
   * rotation, provider re-keying, etc.) are pulse 41's responsibility —
   * this method only delivers the event.
   */
  async fireSnapshotPromoted(meta: SnapshotMeta): Promise<readonly string[]> {
    const fanout: string[] = [];
    for (const p of this.providers) {
      if (p.onSnapshotPromoted !== undefined) {
        await p.onSnapshotPromoted(meta);
        fanout.push(p.id);
      }
    }
    return fanout;
  }
}
