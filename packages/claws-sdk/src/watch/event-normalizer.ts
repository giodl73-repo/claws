/**
 * Event normalizer — handle platform-specific fs.watch quirks.
 *
 * NTFS fires duplicate 'change' events for a single write. VS Code's
 * "atomic save" pattern (write temp + rename) emits 'rename' followed
 * by 'change' for what is logically one edit. This module normalizes
 * these platform behaviors into a clean stream of unique file paths.
 *
 * @module claws-sdk/watch/event-normalizer
 */

/** A raw fs.watch event. */
export interface RawWatchEvent {
  readonly eventType: 'rename' | 'change';
  readonly filename: string;
  readonly timestamp: number;
}

/** Window (ms) within which duplicate events for the same file are suppressed. */
const DEDUP_WINDOW_MS = 50;

/**
 * Normalizes raw fs.watch events by suppressing duplicates within a short window.
 *
 * NTFS double-fire: Two 'change' events within ~10ms for the same file.
 * VS Code rename-as-change: A 'rename' + 'change' pair within ~20ms.
 *
 * Both patterns are collapsed by tracking the last event time per file and
 * suppressing events that arrive within `DEDUP_WINDOW_MS` of the previous.
 */
export class EventNormalizer {
  private readonly lastSeen = new Map<string, number>();

  /**
   * Process a raw event. Returns the filename if this is a genuine new event,
   * or `null` if it's a platform duplicate that should be suppressed.
   */
  normalize(event: RawWatchEvent): string | null {
    const { filename, timestamp } = event;

    const prev = this.lastSeen.get(filename);
    if (prev !== undefined && (timestamp - prev) < DEDUP_WINDOW_MS) {
      // Duplicate within dedup window — suppress
      return null;
    }

    this.lastSeen.set(filename, timestamp);
    return filename;
  }

  /** Clear all tracking state. */
  clear(): void {
    this.lastSeen.clear();
  }
}
