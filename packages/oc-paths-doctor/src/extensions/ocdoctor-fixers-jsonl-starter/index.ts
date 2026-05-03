/**
 * `ocdoctor-fixers-jsonl-starter` — starter fixer pack for jsonl
 * session logs.
 *
 * Each fixer pairs with a lint rule from
 * `@bic/oc-paths-lint/extensions/oclint-rules-jsonl-starter`.
 *
 * @module ocdoctor-fixers-jsonl-starter
 */

import type { OcPathFixerSpec } from '../../plugin-sdk/oc-doctor/types.js';
import { sessionAppendTerminalEvent } from './fixers/session-append-terminal-event.js';
import { sessionQuarantineMalformedLine } from './fixers/session-quarantine-malformed-line.js';

export const jsonlStarterFixers: readonly OcPathFixerSpec[] = [
  sessionAppendTerminalEvent,
  sessionQuarantineMalformedLine,
];

export {
  sessionAppendTerminalEvent,
  sessionQuarantineMalformedLine,
};
