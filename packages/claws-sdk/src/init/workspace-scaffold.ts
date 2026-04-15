/**
 * Workspace file scaffolding — create starter OC workspace files
 * when none exist. All 9 default OC sources are covered:
 * SOUL.md, TOOLS.md, AGENTS.md, IDENTITY.md, USER.md,
 * MEMORY.md, HEARTBEAT.md, skills/example/SKILL.md, lobster.yaml.
 *
 * Each file is checked independently: if SOUL.md exists but TOOLS.md
 * does not, only TOOLS.md is created. Existing files are never touched.
 *
 * @module claws-sdk/init/workspace-scaffold
 */

import { access, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';

/**
 * A starter workspace file to be scaffolded.
 */
interface StarterFile {
  /** File name relative to workspace root. */
  readonly name: string;
  /** Human-readable description shown in CLI output. */
  readonly description: string;
  /** File content to write. */
  readonly content: string;
}

/**
 * Result of workspace file scaffolding.
 */
export interface WorkspaceScaffoldResult {
  /** Files that were created (names only, e.g. "SOUL.md"). */
  readonly created: readonly string[];
  /** Files that already existed and were skipped. */
  readonly skipped: readonly string[];
}

// ── Starter File Content ─────────────────────────────────────────────

const SOUL_CONTENT = `# Agent Soul

<!-- Edit this file to define your agent's persona and constraints. -->
<!-- Lines with "never", "must not", "always" become governance rules. -->

You are a helpful assistant that supports daily workflows.

## Purpose

Assist with research, drafting, and task coordination.

## Deny Constraints

- **Never access production databases.** All data queries go through read-only replicas.
- **Never send external communications without approval.** Draft freely, but always ask before sending.
- **Never impersonate a team member.** Do not sign messages as a person or claim to be human.
`;

const TOOLS_CONTENT = `# Tool Guidance

<!-- Edit this file to declare the tools your agent can use. -->
<!-- Risk levels: R1 (safe) through R5 (requires approval). -->

## file-read
- Risk: R1
- Description: Read files from the workspace directory
- Governance: audit-only

## web-search
- Risk: R2
- Description: Search the public web for information
- Governance: audit-only

## file-write
- Risk: R3
- Description: Write or update files in the workspace directory
- Governance: audit + approval (team-lead)

## send-email
- Risk: R5
- Description: Send email on behalf of the user
- Governance: audit + approval (exec) + elicitation required
`;

const AGENTS_CONTENT = `# Agents

<!-- Edit this file to define agent delegations and trust boundaries. -->

## assistant-agent

- description: General-purpose assistant with read and write access.
- tools:
  - file-read
  - web-search
  - file-write
- governance: inherits workspace SOUL constraints
`;

const IDENTITY_CONTENT = `# Identity

<!-- Edit this file to set your workspace identity and authentication. -->

## Authentication

- Level: L0 (no attestation)
- Method: none

## Workspace

- Workspace ID: my-workspace
- Organization: My Organization
`;

const USER_CONTENT = `# User Profile

<!-- Edit this file to set user preferences and on-behalf-of scope. -->

## Role

Developer

## Preferences

- Communication style: concise
`;

const MEMORY_CONTENT = `# Memory

<!-- Edit this file to define data classification and retention rules. -->

## Data Classification

All stored data is classified as **INTERNAL**. Do not persist CONFIDENTIAL or RESTRICTED data in agent memory.

## Retention Policy

- Retention period: 30 days
- Auto-purge: enabled
`;

const HEARTBEAT_CONTENT = `# Heartbeat

<!-- Edit this file to define lifecycle hooks and scheduled actions. -->

## On Start

- Verify SOUL constraints are loaded
- Confirm identity token is valid

## Every Hour

- Flush pending audit events
- Re-validate identity token
`;

const SKILL_CONTENT = `---
name: example-skill
description: An example skill that searches the web
tools:
  - web-search
governance:
  audit: true
---

# Example Skill

<!-- Edit or replace this skill. Each skill lives in skills/{name}/SKILL.md. -->

Search the web for a topic and return a concise summary.
`;

const LOBSTER_CONTENT = `name: example-workflow
description: A simple example workflow

steps:
  - name: research
    skill: example-skill
    description: Search for information on the topic
`;

/**
 * All starter files in display order.
 */
const STARTER_FILES: readonly StarterFile[] = [
  { name: 'SOUL.md', description: 'persona + deny constraints (edit these!)', content: SOUL_CONTENT },
  { name: 'TOOLS.md', description: '4 example tools with risk annotations', content: TOOLS_CONTENT },
  { name: 'AGENTS.md', description: '1 example agent delegation', content: AGENTS_CONTENT },
  { name: 'IDENTITY.md', description: 'identity placeholder', content: IDENTITY_CONTENT },
  { name: 'USER.md', description: 'user preferences placeholder', content: USER_CONTENT },
  { name: 'MEMORY.md', description: 'data classification + retention', content: MEMORY_CONTENT },
  { name: 'HEARTBEAT.md', description: 'lifecycle hooks + schedules', content: HEARTBEAT_CONTENT },
  { name: 'skills/example/SKILL.md', description: '1 example skill', content: SKILL_CONTENT },
  { name: 'lobster.yaml', description: 'example workflow', content: LOBSTER_CONTENT },
];

/**
 * Check if a file exists.
 */
async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Scaffold starter OC workspace files when they do not exist.
 *
 * Each file is checked independently — only missing files are created.
 * Existing files are never modified. For nested paths like
 * skills/example/SKILL.md, parent directories are created as needed.
 *
 * @param workspaceRoot - Absolute path to workspace root
 * @returns Result with created and skipped file lists
 */
export async function scaffoldWorkspaceFiles(
  workspaceRoot: string,
): Promise<WorkspaceScaffoldResult> {
  const created: string[] = [];
  const skipped: string[] = [];

  for (const starter of STARTER_FILES) {
    const filePath = join(workspaceRoot, starter.name);
    if (await fileExists(filePath)) {
      skipped.push(starter.name);
    } else {
      // Ensure parent directories exist for nested paths (e.g. skills/example/)
      const parentDir = dirname(filePath);
      await mkdir(parentDir, { recursive: true });
      await writeFile(filePath, starter.content, 'utf-8');
      created.push(starter.name);
    }
  }

  return { created, skipped };
}

/**
 * Get the description for a starter file by name.
 *
 * Returns undefined if the name is not a known starter file.
 */
export function getStarterFileDescription(name: string): string | undefined {
  return STARTER_FILES.find((f) => f.name === name)?.description;
}
