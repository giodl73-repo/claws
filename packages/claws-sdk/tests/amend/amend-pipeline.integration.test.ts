/**
 * L1: Amendment pipeline — integration tests that run the full
 * amend pipeline on a reference workspace and verify post-state.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { runAmendPipeline } from '../../src/amend/amend.js';
import type { Amendment } from '../../src/amend/validate.js';
import type { RecompileFn } from '../../src/amend/apply.js';
import type { GovernanceIR } from '../../src/ir/governance-ir.js';
import type { ToolCapability, SkillCapability } from '../../src/ir/capability-manifest.js';

let tmpDir: string;

/**
 * Build a realistic GovernanceIR with tools at various risk levels.
 */
function buildReferenceIR(): GovernanceIR {
  const tools: ToolCapability[] = [
    {
      name: 'read-file',
      description: 'Read a file',
      riskLevel: 'low',
      oboFlag: false,
      classification: 'filesystem',
    },
    {
      name: 'write-file',
      description: 'Write a file',
      riskLevel: 'medium',
      oboFlag: false,
      classification: 'filesystem',
    },
    {
      name: 'network-fetch',
      description: 'Fetch data from network',
      riskLevel: 'high',
      oboFlag: false,
      classification: 'network',
    },
    {
      name: 'execute-shell',
      description: 'Execute shell commands',
      riskLevel: 'critical',
      oboFlag: false,
      classification: 'execution',
    },
  ];

  const skills: SkillCapability[] = [
    {
      name: 'file-search',
      description: 'Search files',
      requiredTools: ['read-file'],
      governanceLevel: 1,
    },
  ];

  return {
    capabilities: {
      tools,
      skills,
      agents: [],
      workflows: [],
    },
    analysis: {
      violations: [],
      warnings: [],
      enforcementPlan: {
        blockedTools: [],
        requiredApprovals: [],
        auditOnlyRules: [],
        channelRedactions: [],
        ruleSuppressions: [],
      },
      reclassificationTable: [],
      effectiveR5Count: { derived: 0, overridden: 0, total: 0 },
    },
    intents: [],
    delegationMap: [],
    conflicts: {
      oboConflicts: [],
      multiConstraintConflicts: [],
      totalCount: 0,
      maxSeverity: 'low',
    },
    compiler: {
      compilerVersion: '0.36.0',
      compiledAt: '2026-04-13T00:00:00.000Z',
      schemaVersion: 1,
    },
  };
}

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'claws-amend-int-'));
  await mkdir(join(tmpDir, '.claws', 'staging'), { recursive: true });
  await mkdir(join(tmpDir, '.claws', 'compiled'), { recursive: true });
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe('amend add-skill → recompile → skill present', () => {
  it('adds a skill amendment and verifies it in the staging file', async () => {
    const ir = buildReferenceIR();

    // Simulate a recompile that reads the staging amendments and
    // writes an updated GovernanceIR with the new skill
    const recompile: RecompileFn = async (root: string) => {
      // Read the amendments staging file
      const stagingPath = join(root, '.claws', 'staging', 'amendments.json');
      const raw = await readFile(stagingPath, 'utf-8');
      const amendments = JSON.parse(raw) as Array<{ type: string; target: string; value: Record<string, unknown> }>;

      // Build updated IR with new skills from amendments
      const newSkills: SkillCapability[] = [...ir.capabilities.skills];
      for (const a of amendments) {
        if (a.type === 'add-skill') {
          newSkills.push({
            name: a.target,
            description: typeof a.value['description'] === 'string' ? a.value['description'] : '',
            requiredTools: Array.isArray(a.value['requiredTools']) ? a.value['requiredTools'] as string[] : [],
            governanceLevel: 1,
          });
        }
      }

      const updatedIR: GovernanceIR = {
        ...ir,
        capabilities: {
          ...ir.capabilities,
          skills: newSkills,
        },
      };

      // Write updated GovernanceIR
      await writeFile(
        join(root, '.claws', 'compiled', 'governance-ir.json'),
        JSON.stringify(updatedIR, null, 2),
        'utf-8',
      );

      return { success: true };
    };

    const amendment: Amendment = {
      type: 'add-skill',
      target: 'data-export',
      value: {
        description: 'Export workspace data',
        requiredTools: ['read-file', 'write-file'],
      },
    };

    const result = await runAmendPipeline(tmpDir, amendment, ir, 3, recompile);

    expect(result.success).toBe(true);
    expect(result.step).toBe('done');
    expect(result.validation.valid).toBe(true);

    // Verify the new skill is in the compiled GovernanceIR
    const compiledRaw = await readFile(
      join(tmpDir, '.claws', 'compiled', 'governance-ir.json'),
      'utf-8',
    );
    const compiledIR = JSON.parse(compiledRaw) as GovernanceIR;
    const newSkill = compiledIR.capabilities.skills.find((s) => s.name === 'data-export');
    expect(newSkill).toBeDefined();
    expect(newSkill!.requiredTools).toEqual(['read-file', 'write-file']);
  });
});

describe('amend remove-tool → recompile → tool absent', () => {
  it('removes a tool when no skills depend on it and verifies it is absent', async () => {
    const ir = buildReferenceIR();

    // Simulate recompile that removes the tool from GovernanceIR
    const recompile: RecompileFn = async (root: string) => {
      const stagingPath = join(root, '.claws', 'staging', 'amendments.json');
      const raw = await readFile(stagingPath, 'utf-8');
      const amendments = JSON.parse(raw) as Array<{ type: string; target: string }>;

      const removedTools = new Set(
        amendments.filter((a) => a.type === 'remove-tool').map((a) => a.target.toLowerCase()),
      );

      const updatedIR: GovernanceIR = {
        ...ir,
        capabilities: {
          ...ir.capabilities,
          tools: ir.capabilities.tools.filter(
            (t) => !removedTools.has(t.name.toLowerCase()),
          ),
        },
      };

      await writeFile(
        join(root, '.claws', 'compiled', 'governance-ir.json'),
        JSON.stringify(updatedIR, null, 2),
        'utf-8',
      );

      return { success: true };
    };

    // Remove execute-shell (no skills depend on it)
    const amendment: Amendment = {
      type: 'remove-tool',
      target: 'execute-shell',
      value: {},
    };

    const result = await runAmendPipeline(tmpDir, amendment, ir, 3, recompile);

    expect(result.success).toBe(true);
    expect(result.step).toBe('done');

    // Verify the tool is absent from compiled GovernanceIR
    const compiledRaw = await readFile(
      join(tmpDir, '.claws', 'compiled', 'governance-ir.json'),
      'utf-8',
    );
    const compiledIR = JSON.parse(compiledRaw) as GovernanceIR;
    const removedTool = compiledIR.capabilities.tools.find((t) => t.name === 'execute-shell');
    expect(removedTool).toBeUndefined();

    // Verify other tools still present
    expect(compiledIR.capabilities.tools).toHaveLength(3);
  });
});
