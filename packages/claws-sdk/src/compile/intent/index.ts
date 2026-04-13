/**
 * Intent extraction — per-file intent extractors for all 9 OC workspace files.
 *
 * Each extractor operates on a parsed FileEntryPresent (no file I/O).
 * extractAllIntents() orchestrates extraction across a full ParseResult.
 *
 * @module claws-sdk/compile/intent
 */

import type {
  ParseResult,
  FileEntryPresent,
  IntentResult,
  SoulIntent,
  ToolManifestEntry,
  DelegationIntent,
  IdentityIntent,
  AuthorityIntent,
  MemoryIntent,
  ScheduleIntent,
  SkillIntent,
  WorkflowIntent,
} from '../types.js';
import { extractSoulIntents } from './soul-intent.js';
import { extractToolsIntents } from './tools-intent.js';
import { extractAgentsIntents } from './agents-intent.js';
import { extractIdentityIntents } from './identity-intent.js';
import { extractUserIntents } from './user-intent.js';
import { extractMemoryIntents } from './memory-intent.js';
import { extractHeartbeatIntents } from './heartbeat-intent.js';
import { extractSkillIntents } from './skill-intent.js';
import { extractWorkflowIntents } from './workflow-intent.js';

export { extractSoulIntents } from './soul-intent.js';
export { extractToolsIntents } from './tools-intent.js';
export { extractAgentsIntents } from './agents-intent.js';
export { extractIdentityIntents } from './identity-intent.js';
export { extractUserIntents } from './user-intent.js';
export { extractMemoryIntents } from './memory-intent.js';
export { extractHeartbeatIntents } from './heartbeat-intent.js';
export { extractSkillIntents } from './skill-intent.js';
export { extractWorkflowIntents } from './workflow-intent.js';

/**
 * Intent result union — any per-file intent result.
 */
export type AnyIntentResult = IntentResult<
  | SoulIntent
  | ToolManifestEntry
  | DelegationIntent
  | IdentityIntent
  | AuthorityIntent
  | MemoryIntent
  | ScheduleIntent
  | SkillIntent
  | WorkflowIntent
>;

/**
 * Dispatch a single file entry to the correct intent extractor.
 */
function extractForEntry(entry: FileEntryPresent): AnyIntentResult | undefined {
  switch (entry.source) {
    case 'SOUL.md':
      return extractSoulIntents(entry);
    case 'TOOLS.md':
      return extractToolsIntents(entry);
    case 'AGENTS.md':
      return extractAgentsIntents(entry);
    case 'IDENTITY.md':
      return extractIdentityIntents(entry);
    case 'USER.md':
      return extractUserIntents(entry);
    case 'MEMORY.md':
      return extractMemoryIntents(entry);
    case 'HEARTBEAT.md':
      return extractHeartbeatIntents(entry);
    case 'skills/':
      return extractSkillIntents(entry);
    case 'lobster.yaml':
      return extractWorkflowIntents(entry);
    default:
      return undefined;
  }
}

/**
 * Extract intents from all present files in a ParseResult.
 *
 * Pass 1: per-file intent extraction. Cross-file resolution is Pass 2 (Pulse 11-12).
 * Absent files are skipped — they produce no intents.
 */
export function extractAllIntents(parseResult: ParseResult): AnyIntentResult[] {
  const results: AnyIntentResult[] = [];

  for (const entry of parseResult.entries) {
    if (entry.status !== 'present') continue;

    const result = extractForEntry(entry);
    if (result !== undefined) {
      results.push(result);
    }
  }

  return results;
}
