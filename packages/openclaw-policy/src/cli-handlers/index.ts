/**
 * 9-verb CLI handler registry (architect W1/W2 closure).
 *
 * Each verb is a thin argv→library→render shim. P58 wires these into
 * the `claws` CLI entry point and covers them with E2E tests.
 */

import * as check from './check.js';
import * as generate from './generate.js';
import * as watch from './watch.js';
import * as comply from './comply.js';
import * as test from './test.js';
import * as sim from './sim.js';
import * as report from './report.js';
import * as verify from './verify.js';
import * as diff from './diff.js';
import * as doctor from './doctor.js';
import * as upgrade from './upgrade.js';

export type PolicyVerb =
  | 'check'
  | 'generate'
  | 'watch'
  | 'comply'
  | 'test'
  | 'sim'
  | 'report'
  | 'verify'
  | 'diff';

export const POLICY_VERBS: readonly PolicyVerb[] = [
  'check',
  'generate',
  'watch',
  'comply',
  'test',
  'sim',
  'report',
  'verify',
  'diff',
] as const;

export const HANDLERS = {
  check,
  generate,
  watch,
  comply,
  test,
  sim,
  report,
  verify,
  diff,
} as const;

// Top-level (non-policy-scoped) handlers that still live in the policy
// package because they consume policy artifacts.
export const TOP_LEVEL_HANDLERS = {
  doctor,
  upgrade,
} as const;

export { doctor, upgrade };

export { runRouter, renderHelp, renderUnknown, isPolicyVerb } from './router.js';
export type { RouterOptions } from './router.js';

export type { HandlerArgv, HandlerResult } from './shared.js';
