/**
 * Minimal openclaw-shaped `LintSchema` for issue-replay tests.
 *
 * Models a representative subset of `openclaw.config.json`:
 *   - `$schema` (editor convention — known, not unknown)
 *   - `version` (string)
 *   - `gateway.dmPolicy` (required)
 *   - `agents.defaults.{thinkingDefault, reasoningDefault}` (known)
 *   - `agents.defaults.agentRuntime` (legacy, auto-migrates to runtimeVersion)
 *   - `channels.<id>` (object map)
 *   - `plugins.entries.<id>` (object map) — id-space shares with channels
 *   - `defaultAgent` (correct key for default-agent setting; `defaultId`
 *     is a typo)
 *
 * Production schemas would wire from a Zod or JSON-schema definition;
 * this hand-authored form is enough to exercise the lint engine.
 */

import type { LintSchema, SchemaKind } from '../../../src/lint/types.js';
import type { JsoncDocument, JsoncValue } from '../../../src/ast/jsonc/ast-types.js';

export const openclawTestSchema: LintSchema = {
  kindOf(path): SchemaKind {
    if (path.length === 0) return 'object';
    if (path.length === 1) {
      switch (path[0]) {
        case '$schema':
        case 'version':
          return 'string';
        case 'channels':
        case 'plugins':
        case 'agents':
        case 'gateway':
          return 'object';
      }
    }
    if (path.length === 2 && path[0] === 'gateway' && path[1] === 'dmPolicy') return 'object';
    if (path.length === 3 && path[0] === 'agents' && path[1] === 'defaults') {
      switch (path[2]) {
        case 'thinkingDefault':
        case 'reasoningDefault':
          return 'string';
        case 'agentRuntime':
        case 'runtimeVersion':
          return 'string';
      }
    }
    if (
      path.length === 3 &&
      path[0] === 'channels' &&
      path[1] === 'matrix'
    ) {
      if (path[2] === 'homeserver' || path[2] === 'accessToken') return 'string';
    }
    return 'unknown';
  },

  knownChildKeys(path) {
    if (path.length === 0) {
      return ['$schema', 'version', 'gateway', 'agents', 'channels', 'plugins', 'defaultAgent'];
    }
    if (path.length === 1 && path[0] === 'gateway') {
      return ['dmPolicy', 'port', 'host'];
    }
    if (path.length === 1 && path[0] === 'agents') {
      return ['defaults', 'list'];
    }
    if (path.length === 2 && path[0] === 'agents' && path[1] === 'defaults') {
      return ['thinkingDefault', 'reasoningDefault', 'runtimeVersion'];
    }
    if (path.length === 2 && path[0] === 'channels' && path[1] === 'matrix') {
      return ['homeserver', 'accessToken'];
    }
    return [];
  },

  requiredChildKeys(path) {
    if (path.length === 1 && path[0] === 'gateway') return ['dmPolicy'];
    return [];
  },

  deprecatedKeys(_path) {
    return new Map();
  },

  legacyKeys(path) {
    if (path.length === 2 && path[0] === 'agents' && path[1] === 'defaults') {
      // #72872 — `agentRuntime` rejected by 2026.4.24 schema validator;
      // auto-migrates to `runtimeVersion`.
      return new Map([['agentRuntime', 'runtimeVersion']]);
    }
    if (path.length === 0) {
      // #60334 — legacy root keys removed in 2026.4.2.
      return new Map([
        ['mediaLocalRoots', null],
        ['bootstrapMaxCharsPerFile', null],
      ]);
    }
    return new Map();
  },

  pluginIdSources(doc) {
    const out: Array<{ path: ReadonlyArray<string | number>; id: string }> = [];
    if (!doc.root || doc.root.kind !== 'object') return out;
    const channelsMember = doc.root.members.find((m) => m.key.value === 'channels');
    if (channelsMember && channelsMember.value.kind === 'object') {
      for (const m of channelsMember.value.members) {
        out.push({ path: ['channels', m.key.value], id: m.key.value });
      }
    }
    const pluginsMember = doc.root.members.find((m) => m.key.value === 'plugins');
    if (pluginsMember && pluginsMember.value.kind === 'object') {
      const entriesMember = pluginsMember.value.members.find((m) => m.key.value === 'entries');
      if (entriesMember && entriesMember.value.kind === 'object') {
        for (const m of entriesMember.value.members) {
          out.push({ path: ['plugins', 'entries', m.key.value], id: m.key.value });
        }
      }
    }
    return out;
  },
};

// Re-export for convenience in tests.
export type { JsoncDocument, JsoncValue };
