/**
 * Mock registry for publish integration tests.
 *
 * In-memory registry that records publish calls and supports
 * configurable failure modes for rollback testing.
 */

import type {
  RegistryClient,
  RegistryPublishPayload,
  RegistryPublishResult,
} from '../../../src/maker/publish.js';

/**
 * Recorded publish call for assertion.
 */
export interface RecordedPublish {
  readonly payload: RegistryPublishPayload;
  readonly timestamp: string;
}

/**
 * Create an in-memory mock registry client.
 *
 * @param behavior - 'success' always succeeds, 'reject' returns rejection,
 *                   'error' throws a network error, 'status-500' simulates server error
 */
export function createMockRegistry(
  behavior: 'success' | 'reject' | 'error' | 'status-500' = 'success',
): RegistryClient & { readonly calls: RecordedPublish[] } {
  const calls: RecordedPublish[] = [];

  return {
    calls,
    async publish(payload: RegistryPublishPayload): Promise<RegistryPublishResult> {
      calls.push({ payload, timestamp: new Date().toISOString() });

      switch (behavior) {
        case 'success':
          return {
            success: true,
            publishId: `pub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          };
        case 'reject':
          return {
            success: false,
            error: 'Package rejected: governance requirements not met',
          };
        case 'error':
          throw new Error('Network error: connection refused');
        case 'status-500':
          throw new Error('Registry returned HTTP 500: internal server error');
      }
    },
  };
}
