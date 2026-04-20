export interface Clock {
  nowMs(): number;
}

export class ClockMock implements Clock {
  private frozen: number | undefined;
  private offsetMs = 0;

  constructor(options?: { freezeAtMs?: number }) {
    if (options?.freezeAtMs !== undefined) {
      if (!Number.isFinite(options.freezeAtMs) || options.freezeAtMs < 0) {
        throw new Error('clock-mock: freezeAtMs must be a non-negative finite number');
      }
      this.frozen = options.freezeAtMs;
    }
  }

  nowMs(): number {
    if (this.frozen !== undefined) {
      return this.frozen + this.offsetMs;
    }
    return Date.now() + this.offsetMs;
  }

  advance(ms: number): void {
    if (!Number.isFinite(ms) || ms < 0) {
      throw new Error('clock-mock: advance requires a non-negative finite number');
    }
    this.offsetMs += ms;
  }

  freeze(atMs: number): void {
    if (!Number.isFinite(atMs) || atMs < 0) {
      throw new Error('clock-mock: freeze requires a non-negative finite number');
    }
    this.frozen = atMs;
    this.offsetMs = 0;
  }

  unfreeze(): void {
    this.frozen = undefined;
    this.offsetMs = 0;
  }
}
