/**
 * Extensible marker specification registry for all 7 platforms.
 *
 * Each MarkerSpec describes the file paths and nested-path behavior
 * for detecting a platform. New platforms can be added by appending
 * to the MARKER_REGISTRY without modifying the detection orchestrator.
 *
 * @module claws-sdk/detect/marker-registry
 */

import type { MarkerSpec } from './types.js';
import { GOVERNANCE_PATTERNS, MIN_GOVERNANCE_HITS } from './governance-patterns.js';

/**
 * Authoritative registry of platform marker specifications.
 *
 * Entries describe where to look for each platform's marker files.
 * The `nested` flag indicates whether the path involves subdirectories
 * (e.g., `.github/copilot-instructions.md` is nested within `.github/`).
 */
export const MARKER_REGISTRY: readonly MarkerSpec[] = [
  // OpenClaw — SOUL.md with governance keywords
  {
    platform: 'openclaw',
    paths: ['SOUL.md'],
    nested: false,
    validator: (content: string) => {
      const hits = GOVERNANCE_PATTERNS.filter((p) => p.test(content)).length;
      return hits >= MIN_GOVERNANCE_HITS;
    },
  },

  // Cursor — .cursorrules file (legacy) and .cursor/ directory (forward-compat)
  {
    platform: 'cursor',
    paths: ['.cursorrules', '.cursor/'],
    nested: false,
  },

  // Claude Code — CLAUDE.md
  {
    platform: 'claude-code',
    paths: ['CLAUDE.md'],
    nested: false,
  },

  // GitHub Copilot — .github/copilot-instructions.md (nested) and .copilot/ directory
  {
    platform: 'github-copilot',
    paths: ['.github/copilot-instructions.md', '.copilot/'],
    nested: true,
  },

  // AWS Bedrock — bedrock-guardrails.json or .bedrock/guardrails.json
  {
    platform: 'bedrock',
    paths: ['bedrock-guardrails.json', '.bedrock/guardrails.json'],
    nested: true,
  },

  // LangGraph — langgraph.json
  {
    platform: 'langgraph',
    paths: ['langgraph.json'],
    nested: false,
  },

  // CrewAI — crewai.yaml, crew.yaml, pyproject.toml (with crewai markers)
  {
    platform: 'crewai',
    paths: ['crewai.yaml', 'crew.yaml', 'pyproject.toml'],
    nested: false,
    validator: (content: string) => /crewai/i.test(content),
  },
] as const;

/**
 * Look up marker specs for a specific platform.
 */
export function getMarkerSpecs(platform: MarkerSpec['platform']): readonly MarkerSpec[] {
  return MARKER_REGISTRY.filter((spec) => spec.platform === platform);
}
