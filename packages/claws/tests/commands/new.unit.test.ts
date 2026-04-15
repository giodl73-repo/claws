/**
 * L0: new skill command — scaffolding wiring + JSON/text output + error paths.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

// ── SDK mocks ───────────────────────────────────────────────────────────────

const mockScaffoldSkill = vi.fn();
const mockValidateSkillName = vi.fn();

vi.mock('@bic/claws-sdk/scaffold', () => {
  class _SkillAlreadyExistsError extends Error {
    readonly skillDir: string;
    constructor(skillDir: string) {
      super(`Skill directory already exists: ${skillDir}`);
      this.name = 'SkillAlreadyExistsError';
      this.skillDir = skillDir;
    }
  }
  class _RiskCapExceededError extends Error {
    readonly requestedRisk: number;
    readonly maxRisk: number;
    readonly trustTier: number;
    constructor(requestedRisk: number, maxRisk: number, trustTier: number) {
      super(
        `Risk level R${requestedRisk} exceeds workspace cap R${maxRisk} (trust tier T${trustTier}). ` +
        `Use a lower-risk template tier, or upgrade the workspace trust tier.`,
      );
      this.name = 'RiskCapExceededError';
      this.requestedRisk = requestedRisk;
      this.maxRisk = maxRisk;
      this.trustTier = trustTier;
    }
  }
  return {
    scaffoldSkill: (...args: unknown[]) => mockScaffoldSkill(...args),
    validateSkillName: (...args: unknown[]) => mockValidateSkillName(...args),
    SkillAlreadyExistsError: _SkillAlreadyExistsError,
    RiskCapExceededError: _RiskCapExceededError,
  };
});

import { runInitSkill as runNewSkill } from '../../src/commands/init.js';
import { SkillAlreadyExistsError, RiskCapExceededError } from '@bic/claws-sdk/scaffold';

// ── Helpers ─────────────────────────────────────────────────────────────────

const jsonOpts = { json: true } as const;
const textOpts = { json: false } as const;

function resetMocks() {
  vi.restoreAllMocks();
  mockScaffoldSkill.mockReset();
  mockValidateSkillName.mockReset();
}

function makeScaffoldResult(overrides: Record<string, unknown> = {}) {
  return {
    name: 'my-skill',
    tier: 'declared',
    skillRisk: 1,
    maxRisk: 3,
    trustTier: 2,
    files: ['skill.yaml', 'SKILL.md'],
    skillDir: '/ws/skills/my-skill',
    dependency: {
      installed: true,
      version: '1.0.0',
      versionAligned: true,
      expectedMajor: 1,
      instruction: undefined,
    },
    oboDetected: false,
    oboHints: [],
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('claws new skill', () => {
  afterEach(() => {
    resetMocks();
  });

  // ── Success paths ───────────────────────────────────────────────────────

  it('returns 0 and prints text on successful scaffold', async () => {
    mockValidateSkillName.mockReturnValue(undefined);
    mockScaffoldSkill.mockResolvedValue(makeScaffoldResult());

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runNewSkill('/ws', 'my-skill', textOpts);
      expect(code).toBe(0);

      expect(mockScaffoldSkill).toHaveBeenCalledWith('/ws', 'my-skill', { tier: undefined });

      const output = logSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Scaffolded skill "my-skill"');
      expect(output).toContain('tier: declared');
      expect(output).toContain('risk: R1');
      expect(output).toContain('/ws/skills/my-skill');
      expect(output).toContain('skill.yaml, SKILL.md');
      expect(output).toContain('T2');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 0 and outputs JSON on successful scaffold with --json', async () => {
    mockValidateSkillName.mockReturnValue(undefined);
    mockScaffoldSkill.mockResolvedValue(makeScaffoldResult());

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runNewSkill('/ws', 'my-skill', jsonOpts);
      expect(code).toBe(0);

      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('ok');
      expect(parsed.name).toBe('my-skill');
      expect(parsed.tier).toBe('declared');
      expect(parsed.skillRisk).toBe(1);
      expect(parsed.maxRisk).toBe(3);
      expect(parsed.trustTier).toBe(2);
      expect(parsed.files).toEqual(['skill.yaml', 'SKILL.md']);
      expect(parsed.skillDir).toBe('/ws/skills/my-skill');
      expect(parsed.dependency.installed).toBe(true);
      expect(parsed.dependency.version).toBe('1.0.0');
      expect(parsed.dependency.versionAligned).toBe(true);
      expect(parsed.dependency.instruction).toBeNull();
      expect(parsed.oboDetected).toBe(false);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('passes tier option through to scaffoldSkill', async () => {
    mockValidateSkillName.mockReturnValue(undefined);
    mockScaffoldSkill.mockResolvedValue(makeScaffoldResult({ tier: 'typed', skillRisk: 2 }));

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runNewSkill('/ws', 'typed-skill', { json: false, tier: 'typed' });
      expect(code).toBe(0);
      expect(mockScaffoldSkill).toHaveBeenCalledWith('/ws', 'typed-skill', { tier: 'typed' });
    } finally {
      logSpy.mockRestore();
    }
  });

  // ── Dependency warning ──────────────────────────────────────────────────

  it('shows dependency warning in text mode when instruction is set', async () => {
    mockValidateSkillName.mockReturnValue(undefined);
    mockScaffoldSkill.mockResolvedValue(makeScaffoldResult({
      dependency: {
        installed: false,
        version: undefined,
        versionAligned: false,
        expectedMajor: 1,
        instruction: 'Install @bic/claws-skill-kit: npm install @bic/claws-skill-kit',
      },
    }));

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runNewSkill('/ws', 'my-skill', textOpts);
      expect(code).toBe(0);

      const warnOutput = warnSpy.mock.calls.flat().join(' ');
      expect(warnOutput).toContain('Install @bic/claws-skill-kit');
    } finally {
      warnSpy.mockRestore();
      logSpy.mockRestore();
    }
  });

  it('does not show dependency warning in JSON mode', async () => {
    mockValidateSkillName.mockReturnValue(undefined);
    mockScaffoldSkill.mockResolvedValue(makeScaffoldResult({
      dependency: {
        installed: false,
        version: undefined,
        versionAligned: false,
        expectedMajor: 1,
        instruction: 'Install @bic/claws-skill-kit',
      },
    }));

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runNewSkill('/ws', 'my-skill', jsonOpts);
      expect(code).toBe(0);

      expect(warnSpy).not.toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
      logSpy.mockRestore();
    }
  });

  // ── OBO detected ────────────────────────────────────────────────────────

  it('shows OBO detected in text output when oboDetected is true', async () => {
    mockValidateSkillName.mockReturnValue(undefined);
    mockScaffoldSkill.mockResolvedValue(makeScaffoldResult({ oboDetected: true }));

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runNewSkill('/ws', 'my-skill', textOpts);
      expect(code).toBe(0);

      const output = logSpy.mock.calls.flat().join(' ');
      expect(output).toContain('OBO: detected');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('includes oboDetected=true in JSON output', async () => {
    mockValidateSkillName.mockReturnValue(undefined);
    mockScaffoldSkill.mockResolvedValue(makeScaffoldResult({ oboDetected: true }));

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runNewSkill('/ws', 'my-skill', jsonOpts);
      expect(code).toBe(0);

      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.oboDetected).toBe(true);
    } finally {
      logSpy.mockRestore();
    }
  });

  // ── Invalid tier ────────────────────────────────────────────────────────

  it('returns 1 for invalid tier (text)', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runNewSkill('/ws', 'my-skill', { json: false, tier: 'bogus' as any });
      expect(code).toBe(1);

      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Invalid tier "bogus"');
      expect(output).toContain('declared, typed, verified');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('returns 1 for invalid tier (json)', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runNewSkill('/ws', 'my-skill', { json: true, tier: 'bogus' as any });
      expect(code).toBe(1);

      const output = errorSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('error');
      expect(parsed.message).toContain('Invalid tier');
    } finally {
      errorSpy.mockRestore();
    }
  });

  // ── Invalid name ────────────────────────────────────────────────────────

  it('returns 1 when skill name is invalid (text)', async () => {
    mockValidateSkillName.mockReturnValue('Name must be lowercase');

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runNewSkill('/ws', 'BAD_NAME', textOpts);
      expect(code).toBe(1);

      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Name must be lowercase');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('returns 1 when skill name is invalid (json)', async () => {
    mockValidateSkillName.mockReturnValue('Name must be lowercase');

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runNewSkill('/ws', 'BAD_NAME', jsonOpts);
      expect(code).toBe(1);

      const output = errorSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('error');
      expect(parsed.message).toBe('Name must be lowercase');
    } finally {
      errorSpy.mockRestore();
    }
  });

  // ── SkillAlreadyExistsError ─────────────────────────────────────────────

  it('returns 1 when SkillAlreadyExistsError is thrown (text)', async () => {
    mockValidateSkillName.mockReturnValue(undefined);
    mockScaffoldSkill.mockRejectedValue(new SkillAlreadyExistsError('/ws/skills/dupe'));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runNewSkill('/ws', 'dupe', textOpts);
      expect(code).toBe(1);

      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Skill directory already exists');
      expect(output).toContain('/ws/skills/dupe');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('returns 1 when SkillAlreadyExistsError is thrown (json)', async () => {
    mockValidateSkillName.mockReturnValue(undefined);
    mockScaffoldSkill.mockRejectedValue(new SkillAlreadyExistsError('/ws/skills/dupe'));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runNewSkill('/ws', 'dupe', jsonOpts);
      expect(code).toBe(1);

      const output = errorSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('error');
      expect(parsed.message).toContain('Skill directory already exists');
    } finally {
      errorSpy.mockRestore();
    }
  });

  // ── RiskCapExceededError ────────────────────────────────────────────────

  it('returns 2 when RiskCapExceededError is thrown (text)', async () => {
    mockValidateSkillName.mockReturnValue(undefined);
    mockScaffoldSkill.mockRejectedValue(new RiskCapExceededError(4 as any, 3 as any, 2));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runNewSkill('/ws', 'risky', textOpts);
      expect(code).toBe(2);

      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Risk level R4 exceeds workspace cap R3');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('returns 2 when RiskCapExceededError is thrown (json)', async () => {
    mockValidateSkillName.mockReturnValue(undefined);
    mockScaffoldSkill.mockRejectedValue(new RiskCapExceededError(4 as any, 3 as any, 2));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runNewSkill('/ws', 'risky', jsonOpts);
      expect(code).toBe(2);

      const output = errorSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('risk_cap_exceeded');
      expect(parsed.requestedRisk).toBe(4);
      expect(parsed.maxRisk).toBe(3);
      expect(parsed.trustTier).toBe(2);
    } finally {
      errorSpy.mockRestore();
    }
  });

  // ── Generic error ───────────────────────────────────────────────────────

  it('returns 3 when generic Error is thrown (text)', async () => {
    mockValidateSkillName.mockReturnValue(undefined);
    mockScaffoldSkill.mockRejectedValue(new Error('Disk full'));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runNewSkill('/ws', 'my-skill', textOpts);
      expect(code).toBe(3);

      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Error: Disk full');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('returns 3 when generic Error is thrown (json)', async () => {
    mockValidateSkillName.mockReturnValue(undefined);
    mockScaffoldSkill.mockRejectedValue(new Error('IO failure'));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runNewSkill('/ws', 'my-skill', jsonOpts);
      expect(code).toBe(3);

      const output = errorSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.status).toBe('error');
      expect(parsed.message).toBe('IO failure');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('handles non-Error throw by converting to string', async () => {
    mockValidateSkillName.mockReturnValue(undefined);
    mockScaffoldSkill.mockRejectedValue('string error');

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runNewSkill('/ws', 'my-skill', textOpts);
      expect(code).toBe(3);

      const output = errorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('string error');
    } finally {
      errorSpy.mockRestore();
    }
  });
});
