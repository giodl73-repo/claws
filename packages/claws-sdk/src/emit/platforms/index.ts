/**
 * Platform adapters — per-platform emitter registry.
 *
 * @module claws-sdk/emit/platforms
 */

import type { Platform } from '../../types/platform.js';
import type { PlatformAdapter } from './platform-adapter.js';
import { openclawAdapter } from './openclaw-adapter.js';
import { cursorAdapter } from './cursor-adapter.js';
import { claudeCodeAdapter } from './claude-code-adapter.js';
import { copilotAdapter } from './copilot-adapter.js';
import { bedrockAdapter } from './bedrock-adapter.js';
import { langgraphAdapter } from './langgraph-adapter.js';
import { crewaiAdapter } from './crewai-adapter.js';

export type { PlatformAdapter, PlatformEmitResult, EmittedArtifact } from './platform-adapter.js';

/**
 * Registry of all 7 platform adapters.
 */
const ADAPTER_REGISTRY: ReadonlyMap<Platform, PlatformAdapter> = new Map([
  ['openclaw', openclawAdapter],
  ['cursor', cursorAdapter],
  ['claude-code', claudeCodeAdapter],
  ['github-copilot', copilotAdapter],
  ['bedrock', bedrockAdapter],
  ['langgraph', langgraphAdapter],
  ['crewai', crewaiAdapter],
]);

/**
 * Get the platform adapter for a specific platform.
 *
 * @param platform - The target platform
 * @returns The platform adapter, or undefined if not registered
 */
export function getAdapter(platform: Platform): PlatformAdapter | undefined {
  return ADAPTER_REGISTRY.get(platform);
}

/**
 * Get all registered platform adapters.
 */
export function getAllAdapters(): readonly PlatformAdapter[] {
  return Array.from(ADAPTER_REGISTRY.values());
}
