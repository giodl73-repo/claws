/**
 * Top-level OC workspace reader — orchestrates all 9 file readers.
 *
 * Discovers files, dispatches to individual readers, collects diagnostics,
 * and returns a unified OCWorkspaceModel. Missing files are handled
 * gracefully: optional files produce warnings, required files produce errors.
 *
 * The 9-file set dispatched here is declared declaratively (and kept in
 * lock-step with this function) by
 * `@bic/openclaw-workspace/path#OC_WORKSPACE_FILES`. That constant
 * is the single authoritative OC workspace file list — the serve-layer
 * parser reads the same 9 files; CAP data that used to live in standalone
 * DENY/KNOWLEDGE/ENTITLEMENTS files now lives in IDENTITY.md subsections.
 *
 * @module claws-sdk/compiler/readers/workspace-reader
 */

import { soulReader } from './soul-reader.js';
import { toolsReader } from './tools-reader.js';
import { agentsReader } from './agents-reader.js';
import { memoryReader } from './memory-reader.js';
import { identityReader } from './identity-reader.js';
import { userReader } from './user-reader.js';
import { heartbeatReader } from './heartbeat-reader.js';
import { skillsReader } from './skills-reader.js';
import { lobsterReader } from './lobster-reader.js';
import type { OCWorkspaceModel, WorkspaceDiagnostic } from './types.js';

/**
 * Read an entire OC workspace from a root directory.
 *
 * All 9 file reads are independent and execute in parallel.
 * Missing optional files produce warnings; missing required files produce errors.
 *
 * @param workspaceRoot - Absolute path to the workspace root directory
 * @returns Unified OCWorkspaceModel with all reader results and diagnostics
 */
export async function readOCWorkspace(workspaceRoot: string): Promise<OCWorkspaceModel> {
  // All 9 reads are independent — resolve in parallel
  const [soul, tools, agents, memory, identity, user, heartbeat, skills, lobster] =
    await Promise.all([
      soulReader.read(workspaceRoot),
      toolsReader.read(workspaceRoot),
      agentsReader.read(workspaceRoot),
      memoryReader.read(workspaceRoot),
      identityReader.read(workspaceRoot),
      userReader.read(workspaceRoot),
      heartbeatReader.read(workspaceRoot),
      skillsReader.read(workspaceRoot),
      lobsterReader.read(workspaceRoot),
    ]);

  // Collect all diagnostics
  const allResults = [soul, tools, agents, memory, identity, user, heartbeat, skills, lobster];
  const diagnostics: WorkspaceDiagnostic[] = allResults.flatMap(r => [...r.diagnostics]);

  // Count present/absent
  let presentCount = 0;
  let absentCount = 0;
  for (const result of allResults) {
    if (result.ok) {
      presentCount++;
    } else {
      absentCount++;
    }
  }

  return {
    soul,
    tools,
    agents,
    memory,
    identity,
    user,
    heartbeat,
    skills,
    lobster,
    diagnostics,
    presentCount,
    absentCount,
  };
}
