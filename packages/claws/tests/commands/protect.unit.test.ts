/**
 * L0: protect command — budget, budget-fleet, secrets vault, identity wiring + JSON/text output.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

// ── SDK mocks ───────────────────────────────────────────────────────────────

const mockBudget = vi.fn();

vi.mock('@bic/claws-sdk/protect/budget', () => ({
  budget: (...args: unknown[]) => mockBudget(...args),
}));

const mockBudgetFleet = vi.fn();

vi.mock('@bic/claws-sdk/protect/budget-fleet', () => ({
  budgetFleet: (...args: unknown[]) => mockBudgetFleet(...args),
}));

const mockVaultInit = vi.fn();
const mockVaultSet = vi.fn();
const mockVaultGet = vi.fn();
const mockVaultList = vi.fn();
const mockVaultDelete = vi.fn();
const mockDefaultVaultConfig = vi.fn();
const mockConfigureIdentity = vi.fn();
const mockGetIdentity = vi.fn();

vi.mock('@bic/claws-sdk/protect', () => ({
  vaultInit: (...args: unknown[]) => mockVaultInit(...args),
  vaultSet: (...args: unknown[]) => mockVaultSet(...args),
  vaultGet: (...args: unknown[]) => mockVaultGet(...args),
  vaultList: (...args: unknown[]) => mockVaultList(...args),
  vaultDelete: (...args: unknown[]) => mockVaultDelete(...args),
  defaultVaultConfig: (...args: unknown[]) => mockDefaultVaultConfig(...args),
  configureIdentity: (...args: unknown[]) => mockConfigureIdentity(...args),
  getIdentity: (...args: unknown[]) => mockGetIdentity(...args),
}));

// ── readline mock (for resolvePassphrase) ───────────────────────────────────

const mockQuestion = vi.fn((_prompt: string, cb: (answer: string) => void) => cb('test-passphrase'));
const mockRlClose = vi.fn();

vi.mock('node:readline', () => ({
  createInterface: () => ({
    question: (...args: unknown[]) => mockQuestion(...args as [string, (answer: string) => void]),
    close: () => mockRlClose(),
  }),
}));

// ── Imports (after mocks) ───────────────────────────────────────────────────

import {
  runProtectBudget,
  runProtectBudgetFleet,
  runSecretsInit,
  runSecretsSet,
  runSecretsGet,
  runSecretsList,
  runSecretsDelete,
  runIdentityConfigure,
  runIdentityShow,
} from '../../src/commands/protect.js';

// ── Helpers ─────────────────────────────────────────────────────────────────

function resetMocks() {
  vi.restoreAllMocks();
  mockBudget.mockReset();
  mockBudgetFleet.mockReset();
  mockVaultInit.mockReset();
  mockVaultSet.mockReset();
  mockVaultGet.mockReset();
  mockVaultList.mockReset();
  mockVaultDelete.mockReset();
  mockDefaultVaultConfig.mockReset();
  mockConfigureIdentity.mockReset();
  mockGetIdentity.mockReset();
  mockQuestion.mockReset();
  mockQuestion.mockImplementation((_prompt: string, cb: (answer: string) => void) => cb('test-passphrase'));
  mockRlClose.mockReset();
  // Set env passphrase for all vault tests
  process.env['CLAWS_VAULT_PASSPHRASE'] = 'test-passphrase';
}

const MOCK_VAULT_CONFIG = { algorithm: 'aes-256-gcm', saltPath: '/ws/.claws/secrets/salt', vaultPath: '/ws/.claws/secrets/vault.enc', keyDerivation: 'pbkdf2' };

// ── Budget tests ────────────────────────────────────────────────────────────

describe('claws protect budget', () => {
  afterEach(() => resetMocks());

  it('returns 0 and outputs JSON on success with --json', async () => {
    const result = {
      report: { tokenCount: 500, limit: 1000, percentage: 50, period: 'monthly' },
      alerts: [],
      enforcement: [],
    };
    mockBudget.mockResolvedValue(result);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runProtectBudget('/ws', { json: true });
      expect(code).toBe(0);
      const output = JSON.parse(logSpy.mock.calls[0][0] as string);
      expect(output.report.percentage).toBe(50);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 0 and outputs terminal text on success without --json', async () => {
    const result = {
      report: { tokenCount: 500, limit: 1000, percentage: 50, period: 'monthly' },
      alerts: [],
      enforcement: [],
    };
    mockBudget.mockResolvedValue(result);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runProtectBudget('/ws', { json: false });
      expect(code).toBe(0);
      const lines = logSpy.mock.calls.map((c) => String(c[0]));
      expect(lines.some((l) => l.includes('50%'))).toBe(true);
      expect(lines.some((l) => l.includes('500/1000'))).toBe(true);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 1 and outputs JSON error when budget() throws', async () => {
    mockBudget.mockRejectedValue(new Error('No budget config'));

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runProtectBudget('/ws', { json: true });
      expect(code).toBe(1);
      const output = JSON.parse(logSpy.mock.calls[0][0] as string);
      expect(output.error).toContain('No budget config');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 1 and outputs stderr when budget() throws without --json', async () => {
    mockBudget.mockRejectedValue(new Error('No budget config'));

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runProtectBudget('/ws', { json: false });
      expect(code).toBe(1);
      expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('No budget config'));
    } finally {
      errSpy.mockRestore();
    }
  });

  it('renders triggered alerts in text mode', async () => {
    const result = {
      report: { tokenCount: 900, limit: 1000, percentage: 90, period: 'monthly' },
      alerts: [
        { threshold: 90, triggered: true, message: '90% threshold reached' },
        { threshold: 50, triggered: false, message: '50% threshold' },
      ],
      enforcement: [],
    };
    mockBudget.mockResolvedValue(result);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runProtectBudget('/ws', { json: false });
      const lines = logSpy.mock.calls.map((c) => String(c[0]));
      expect(lines.some((l) => l.includes('ALERT:') && l.includes('90%'))).toBe(true);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('renders exceeded enforcement actions in text mode', async () => {
    const result = {
      report: { tokenCount: 1100, limit: 1000, percentage: 110, period: 'monthly' },
      alerts: [],
      enforcement: [
        { action: 'block', exceeded: true, message: 'Monthly limit exceeded' },
      ],
    };
    mockBudget.mockResolvedValue(result);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runProtectBudget('/ws', { json: false });
      const lines = logSpy.mock.calls.map((c) => String(c[0]));
      expect(lines.some((l) => l.includes('BLOCK:'))).toBe(true);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('normalizes period to monthly/daily/weekly', async () => {
    const result = {
      report: { tokenCount: 0, limit: 1000, percentage: 0, period: 'daily' },
      alerts: [],
      enforcement: [],
    };
    mockBudget.mockResolvedValue(result);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runProtectBudget('/ws', { json: true, period: 'daily' });
      expect(mockBudget).toHaveBeenCalledWith('/ws', { period: 'daily' });

      mockBudget.mockClear();
      await runProtectBudget('/ws', { json: true, period: 'weekly' });
      expect(mockBudget).toHaveBeenCalledWith('/ws', { period: 'weekly' });

      mockBudget.mockClear();
      await runProtectBudget('/ws', { json: true, period: 'unknown' });
      expect(mockBudget).toHaveBeenCalledWith('/ws', { period: 'monthly' });
    } finally {
      logSpy.mockRestore();
    }
  });
});

// ── Fleet budget tests ──────────────────────────────────────────────────────

describe('claws protect budget --fleet', () => {
  afterEach(() => resetMocks());

  it('returns 0 and outputs JSON on success with --json', async () => {
    const result = {
      workspaces: [{ workspacePath: '/ws/a', workspaceName: 'a', report: { tokenCount: 100, limit: 500, percentage: 20, period: 'monthly' } }],
      totalSpend: 100,
      sortedByUsage: [{ workspacePath: '/ws/a', workspaceName: 'a', report: { tokenCount: 100, limit: 500, percentage: 20, period: 'monthly' } }],
    };
    mockBudgetFleet.mockResolvedValue(result);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runProtectBudgetFleet('/fleet', { json: true });
      expect(code).toBe(0);
      const output = JSON.parse(logSpy.mock.calls[0][0] as string);
      expect(output.totalSpend).toBe(100);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 0 and outputs terminal text on success without --json', async () => {
    const result = {
      workspaces: [{ workspacePath: '/ws/a', workspaceName: 'a', report: { tokenCount: 100, limit: 500, percentage: 20, period: 'monthly' } }],
      totalSpend: 100,
      sortedByUsage: [{ workspacePath: '/ws/a', workspaceName: 'a', report: { tokenCount: 100, limit: 500, percentage: 20, period: 'monthly' } }],
    };
    mockBudgetFleet.mockResolvedValue(result);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runProtectBudgetFleet('/fleet', { json: false });
      expect(code).toBe(0);
      const lines = logSpy.mock.calls.map((c) => String(c[0]));
      expect(lines.some((l) => l.includes('Fleet Budget:'))).toBe(true);
      expect(lines.some((l) => l.includes('100/500'))).toBe(true);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 1 and outputs error on fleet budget failure', async () => {
    mockBudgetFleet.mockRejectedValue(new Error('Fleet root not found'));

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runProtectBudgetFleet('/fleet', { json: true });
      expect(code).toBe(1);
      const output = JSON.parse(logSpy.mock.calls[0][0] as string);
      expect(output.error).toContain('Fleet root not found');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 1 and outputs stderr on fleet budget failure without --json', async () => {
    mockBudgetFleet.mockRejectedValue(new Error('Fleet root not found'));

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runProtectBudgetFleet('/fleet', { json: false });
      expect(code).toBe(1);
      expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('Fleet root not found'));
    } finally {
      errSpy.mockRestore();
    }
  });

  it('renders error workspaces in text mode', async () => {
    const result = {
      workspaces: [],
      totalSpend: 0,
      sortedByUsage: [
        { workspacePath: '/ws/bad', workspaceName: 'bad', report: { tokenCount: 0, limit: 0, percentage: 0, period: 'monthly' }, error: 'corrupt config' },
      ],
    };
    mockBudgetFleet.mockResolvedValue(result);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runProtectBudgetFleet('/fleet', { json: false });
      const lines = logSpy.mock.calls.map((c) => String(c[0]));
      expect(lines.some((l) => l.includes('ERROR') && l.includes('bad'))).toBe(true);
    } finally {
      logSpy.mockRestore();
    }
  });
});

// ── Secrets vault tests ─────────────────────────────────────────────────────

describe('claws protect secrets init', () => {
  afterEach(() => resetMocks());

  it('returns 0 and outputs JSON on success with --json', async () => {
    mockDefaultVaultConfig.mockReturnValue(MOCK_VAULT_CONFIG);
    mockVaultInit.mockResolvedValue({ kdf: 'pbkdf2' });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runSecretsInit('/ws', { json: true });
      expect(code).toBe(0);
      const output = JSON.parse(logSpy.mock.calls[0][0] as string);
      expect(output.status).toBe('initialized');
      expect(output.kdf).toBe('pbkdf2');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 0 and outputs text on success without --json', async () => {
    mockDefaultVaultConfig.mockReturnValue(MOCK_VAULT_CONFIG);
    mockVaultInit.mockResolvedValue({ kdf: 'pbkdf2' });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runSecretsInit('/ws', { json: false });
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Vault initialized'));
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 1 and outputs error on vault init failure', async () => {
    mockDefaultVaultConfig.mockReturnValue(MOCK_VAULT_CONFIG);
    mockVaultInit.mockRejectedValue(new Error('Vault already exists'));

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runSecretsInit('/ws', { json: true });
      expect(code).toBe(1);
      const output = JSON.parse(logSpy.mock.calls[0][0] as string);
      expect(output.status).toBe('error');
      expect(output.error).toBe('[redacted]');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 1 and outputs stderr on failure without --json', async () => {
    mockDefaultVaultConfig.mockReturnValue(MOCK_VAULT_CONFIG);
    mockVaultInit.mockRejectedValue(new Error('Vault already exists'));

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runSecretsInit('/ws', { json: false });
      expect(code).toBe(1);
      expect(errSpy).toHaveBeenCalledWith('Error: vault initialization failed');
    } finally {
      errSpy.mockRestore();
    }
  });
});

describe('claws protect secrets set', () => {
  afterEach(() => resetMocks());

  it('returns 0 and outputs JSON on success', async () => {
    mockDefaultVaultConfig.mockReturnValue(MOCK_VAULT_CONFIG);
    mockVaultSet.mockResolvedValue(undefined);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runSecretsSet('/ws', 'API_KEY', 'secret123', { json: true });
      expect(code).toBe(0);
      const output = JSON.parse(logSpy.mock.calls[0][0] as string);
      expect(output.status).toBe('stored');
      expect(output.key).toBe('API_KEY');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 0 and outputs text on success', async () => {
    mockDefaultVaultConfig.mockReturnValue(MOCK_VAULT_CONFIG);
    mockVaultSet.mockResolvedValue(undefined);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runSecretsSet('/ws', 'API_KEY', 'secret123', { json: false });
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('API_KEY'));
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 1 on failure', async () => {
    mockDefaultVaultConfig.mockReturnValue(MOCK_VAULT_CONFIG);
    mockVaultSet.mockRejectedValue(new Error('Vault locked'));

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runSecretsSet('/ws', 'API_KEY', 'secret123', { json: true });
      expect(code).toBe(1);
    } finally {
      logSpy.mockRestore();
    }
  });
});

describe('claws protect secrets get', () => {
  afterEach(() => resetMocks());

  it('returns 0 and outputs JSON with value on success', async () => {
    mockDefaultVaultConfig.mockReturnValue(MOCK_VAULT_CONFIG);
    mockVaultGet.mockResolvedValue('secret123');

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runSecretsGet('/ws', 'API_KEY', { json: true });
      expect(code).toBe(0);
      const output = JSON.parse(logSpy.mock.calls[0][0] as string);
      expect(output.value).toBe('secret123');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 0 and outputs raw value in text mode', async () => {
    mockDefaultVaultConfig.mockReturnValue(MOCK_VAULT_CONFIG);
    mockVaultGet.mockResolvedValue('secret123');

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runSecretsGet('/ws', 'API_KEY', { json: false });
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalledWith('secret123');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 1 on failure', async () => {
    mockDefaultVaultConfig.mockReturnValue(MOCK_VAULT_CONFIG);
    mockVaultGet.mockRejectedValue(new Error('Key not found'));

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runSecretsGet('/ws', 'API_KEY', { json: false });
      expect(code).toBe(1);
      expect(errSpy).toHaveBeenCalledWith('Error: failed to retrieve secret');
    } finally {
      errSpy.mockRestore();
    }
  });
});

describe('claws protect secrets list', () => {
  afterEach(() => resetMocks());

  it('returns 0 and outputs JSON with key list', async () => {
    mockDefaultVaultConfig.mockReturnValue(MOCK_VAULT_CONFIG);
    mockVaultList.mockResolvedValue(['API_KEY', 'DB_PASS']);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runSecretsList('/ws', { json: true });
      expect(code).toBe(0);
      const output = JSON.parse(logSpy.mock.calls[0][0] as string);
      expect(output.keys).toEqual(['API_KEY', 'DB_PASS']);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 0 and prints each key in text mode', async () => {
    mockDefaultVaultConfig.mockReturnValue(MOCK_VAULT_CONFIG);
    mockVaultList.mockResolvedValue(['API_KEY', 'DB_PASS']);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runSecretsList('/ws', { json: false });
      expect(code).toBe(0);
      const calls = logSpy.mock.calls.map((c) => c[0]);
      expect(calls).toContain('API_KEY');
      expect(calls).toContain('DB_PASS');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('prints "No secrets stored" when list is empty', async () => {
    mockDefaultVaultConfig.mockReturnValue(MOCK_VAULT_CONFIG);
    mockVaultList.mockResolvedValue([]);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runSecretsList('/ws', { json: false });
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalledWith('No secrets stored');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 1 on failure', async () => {
    mockDefaultVaultConfig.mockReturnValue(MOCK_VAULT_CONFIG);
    mockVaultList.mockRejectedValue(new Error('Vault not initialized'));

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runSecretsList('/ws', { json: true });
      expect(code).toBe(1);
    } finally {
      logSpy.mockRestore();
    }
  });
});

describe('claws protect secrets delete', () => {
  afterEach(() => resetMocks());

  it('returns 0 and outputs JSON on success', async () => {
    mockDefaultVaultConfig.mockReturnValue(MOCK_VAULT_CONFIG);
    mockVaultDelete.mockResolvedValue(undefined);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runSecretsDelete('/ws', 'API_KEY', { json: true });
      expect(code).toBe(0);
      const output = JSON.parse(logSpy.mock.calls[0][0] as string);
      expect(output.status).toBe('deleted');
      expect(output.key).toBe('API_KEY');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 0 and outputs text on success', async () => {
    mockDefaultVaultConfig.mockReturnValue(MOCK_VAULT_CONFIG);
    mockVaultDelete.mockResolvedValue(undefined);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runSecretsDelete('/ws', 'API_KEY', { json: false });
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('API_KEY'));
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 1 on failure', async () => {
    mockDefaultVaultConfig.mockReturnValue(MOCK_VAULT_CONFIG);
    mockVaultDelete.mockRejectedValue(new Error('Key not found'));

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runSecretsDelete('/ws', 'API_KEY', { json: true });
      expect(code).toBe(1);
    } finally {
      logSpy.mockRestore();
    }
  });
});

// ── Identity tests ──────────────────────────────────────────────────────────

describe('claws protect identity configure', () => {
  afterEach(() => resetMocks());

  it('returns 0 and outputs JSON for OIDC provider', async () => {
    mockConfigureIdentity.mockResolvedValue(undefined);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runIdentityConfigure('/ws', {
        json: true,
        provider: 'oidc',
        issuer: 'https://idp.example.com',
        clientId: 'client-123',
        redirectUri: 'http://localhost:3000/callback',
        scopes: 'openid,profile',
      });
      expect(code).toBe(0);
      const output = JSON.parse(logSpy.mock.calls[0][0] as string);
      expect(output.status).toBe('configured');
      expect(output.provider).toBe('OIDC');
      expect(mockConfigureIdentity).toHaveBeenCalledWith('/ws', expect.objectContaining({
        provider: 'OIDC',
        oidc: expect.objectContaining({
          issuer: 'https://idp.example.com',
          clientId: 'client-123',
        }),
      }));
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 0 and outputs JSON for SAML provider', async () => {
    mockConfigureIdentity.mockResolvedValue(undefined);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runIdentityConfigure('/ws', {
        json: true,
        provider: 'saml',
        entityId: 'urn:example:sp',
        ssoUrl: 'https://idp.example.com/sso',
        certificate: 'MIIC...',
      });
      expect(code).toBe(0);
      expect(mockConfigureIdentity).toHaveBeenCalledWith('/ws', expect.objectContaining({
        provider: 'SAML',
        saml: expect.objectContaining({
          entityId: 'urn:example:sp',
          ssoUrl: 'https://idp.example.com/sso',
        }),
      }));
    } finally {
      logSpy.mockRestore();
    }
  });

  it('parses role mapping from comma-separated string', async () => {
    mockConfigureIdentity.mockResolvedValue(undefined);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runIdentityConfigure('/ws', {
        json: true,
        provider: 'oidc',
        issuer: 'https://idp.example.com',
        clientId: 'client-123',
        roleMapping: 'admin:5,viewer:1,editor:3',
      });
      expect(mockConfigureIdentity).toHaveBeenCalledWith('/ws', expect.objectContaining({
        roleMapping: { admin: 5, viewer: 1, editor: 3 },
      }));
    } finally {
      logSpy.mockRestore();
    }
  });

  it('prints role mapping count in text mode', async () => {
    mockConfigureIdentity.mockResolvedValue(undefined);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runIdentityConfigure('/ws', {
        json: false,
        provider: 'oidc',
        issuer: 'https://idp.example.com',
        clientId: 'client-123',
        roleMapping: 'admin:5,viewer:1',
      });
      const lines = logSpy.mock.calls.map((c) => String(c[0]));
      expect(lines.some((l) => l.includes('Identity provider configured: OIDC'))).toBe(true);
      expect(lines.some((l) => l.includes('role mappings: 2'))).toBe(true);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 1 on failure', async () => {
    mockConfigureIdentity.mockRejectedValue(new Error('Invalid config'));

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runIdentityConfigure('/ws', {
        json: true,
        provider: 'oidc',
      });
      expect(code).toBe(1);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 1 and outputs stderr on failure without --json', async () => {
    mockConfigureIdentity.mockRejectedValue(new Error('Invalid config'));

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runIdentityConfigure('/ws', {
        json: false,
        provider: 'oidc',
      });
      expect(code).toBe(1);
      expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid config'));
    } finally {
      errSpy.mockRestore();
    }
  });
});

describe('claws protect identity show', () => {
  afterEach(() => resetMocks());

  it('returns 0 and outputs JSON when identity is configured', async () => {
    mockGetIdentity.mockResolvedValue({
      provider: 'OIDC',
      oidc: { issuer: 'https://idp.example.com', clientId: 'c1', redirectUri: 'http://localhost', scopes: ['openid'] },
      roleMapping: { admin: 5 },
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runIdentityShow('/ws', { json: true });
      expect(code).toBe(0);
      const output = JSON.parse(logSpy.mock.calls[0][0] as string);
      expect(output.status).toBe('ok');
      expect(output.identity.provider).toBe('OIDC');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 0 and outputs "not-configured" when no identity', async () => {
    mockGetIdentity.mockResolvedValue(null);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runIdentityShow('/ws', { json: true });
      expect(code).toBe(0);
      const output = JSON.parse(logSpy.mock.calls[0][0] as string);
      expect(output.status).toBe('not-configured');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('prints "No identity provider configured" in text mode when no identity', async () => {
    mockGetIdentity.mockResolvedValue(null);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runIdentityShow('/ws', { json: false });
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalledWith('No identity provider configured');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('renders OIDC details in text mode', async () => {
    mockGetIdentity.mockResolvedValue({
      provider: 'OIDC',
      oidc: { issuer: 'https://idp.example.com', clientId: 'c1', redirectUri: 'http://localhost', scopes: ['openid', 'profile'] },
      roleMapping: { admin: 5, viewer: 1 },
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runIdentityShow('/ws', { json: false });
      const lines = logSpy.mock.calls.map((c) => String(c[0]));
      expect(lines.some((l) => l.includes('Provider: OIDC'))).toBe(true);
      expect(lines.some((l) => l.includes('issuer:'))).toBe(true);
      expect(lines.some((l) => l.includes('clientId:'))).toBe(true);
      expect(lines.some((l) => l.includes('openid, profile'))).toBe(true);
      expect(lines.some((l) => l.includes('role mappings:'))).toBe(true);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('renders SAML details in text mode', async () => {
    mockGetIdentity.mockResolvedValue({
      provider: 'SAML',
      saml: { entityId: 'urn:sp', ssoUrl: 'https://idp/sso', certificate: 'MIIC...' },
      roleMapping: {},
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runIdentityShow('/ws', { json: false });
      const lines = logSpy.mock.calls.map((c) => String(c[0]));
      expect(lines.some((l) => l.includes('Provider: SAML'))).toBe(true);
      expect(lines.some((l) => l.includes('entityId:'))).toBe(true);
      expect(lines.some((l) => l.includes('ssoUrl:'))).toBe(true);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 1 on failure', async () => {
    mockGetIdentity.mockRejectedValue(new Error('Read error'));

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runIdentityShow('/ws', { json: true });
      expect(code).toBe(1);
      const output = JSON.parse(logSpy.mock.calls[0][0] as string);
      expect(output.status).toBe('error');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 1 and outputs stderr on failure without --json', async () => {
    mockGetIdentity.mockRejectedValue(new Error('Read error'));

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runIdentityShow('/ws', { json: false });
      expect(code).toBe(1);
      expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('Read error'));
    } finally {
      errSpy.mockRestore();
    }
  });
});

// ── resolvePassphrase branch coverage ───────────────────────────────────────

describe('resolvePassphrase branches', () => {
  afterEach(() => resetMocks());

  it('uses TTY prompt when env var is not set', async () => {
    delete process.env['CLAWS_VAULT_PASSPHRASE'];
    // Simulate TTY
    const origIsTTY = process.stdin.isTTY;
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });

    mockQuestion.mockImplementation((_prompt: string, cb: (answer: string) => void) => cb('tty-pass'));
    mockDefaultVaultConfig.mockReturnValue(MOCK_VAULT_CONFIG);
    mockVaultInit.mockResolvedValue({ kdf: 'pbkdf2' });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runSecretsInit('/ws', { json: true });
      expect(code).toBe(0);
      expect(mockQuestion).toHaveBeenCalled();
      expect(mockVaultInit).toHaveBeenCalledWith(MOCK_VAULT_CONFIG, 'tty-pass');
    } finally {
      logSpy.mockRestore();
      Object.defineProperty(process.stdin, 'isTTY', { value: origIsTTY, configurable: true });
    }
  });

  it('rejects with empty passphrase on TTY', async () => {
    delete process.env['CLAWS_VAULT_PASSPHRASE'];
    const origIsTTY = process.stdin.isTTY;
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });

    mockQuestion.mockImplementation((_prompt: string, cb: (answer: string) => void) => cb(''));
    mockDefaultVaultConfig.mockReturnValue(MOCK_VAULT_CONFIG);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runSecretsInit('/ws', { json: true });
      expect(code).toBe(1);
      const output = JSON.parse(logSpy.mock.calls[0][0] as string);
      expect(output.error).toBe('[redacted]');
    } finally {
      logSpy.mockRestore();
      Object.defineProperty(process.stdin, 'isTTY', { value: origIsTTY, configurable: true });
    }
  });

  it('throws when no env var and not TTY', async () => {
    delete process.env['CLAWS_VAULT_PASSPHRASE'];
    const origIsTTY = process.stdin.isTTY;
    Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true });

    mockDefaultVaultConfig.mockReturnValue(MOCK_VAULT_CONFIG);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runSecretsInit('/ws', { json: true });
      expect(code).toBe(1);
      const output = JSON.parse(logSpy.mock.calls[0][0] as string);
      expect(output.error).toBe('[redacted]');
    } finally {
      logSpy.mockRestore();
      Object.defineProperty(process.stdin, 'isTTY', { value: origIsTTY, configurable: true });
    }
  });

  it('treats empty env var as not set', async () => {
    process.env['CLAWS_VAULT_PASSPHRASE'] = '';
    const origIsTTY = process.stdin.isTTY;
    Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true });

    mockDefaultVaultConfig.mockReturnValue(MOCK_VAULT_CONFIG);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runSecretsInit('/ws', { json: true });
      expect(code).toBe(1);
      const output = JSON.parse(logSpy.mock.calls[0][0] as string);
      expect(output.error).toBe('[redacted]');
    } finally {
      logSpy.mockRestore();
      Object.defineProperty(process.stdin, 'isTTY', { value: origIsTTY, configurable: true });
    }
  });
});

// ── Additional error path coverage ──────────────────────────────────────────

describe('protect secrets error paths', () => {
  afterEach(() => resetMocks());

  it('secrets get returns 1 with JSON error on failure', async () => {
    mockDefaultVaultConfig.mockReturnValue(MOCK_VAULT_CONFIG);
    mockVaultGet.mockRejectedValue(new Error('Key not found'));

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runSecretsGet('/ws', 'MISSING', { json: true });
      expect(code).toBe(1);
      const output = JSON.parse(logSpy.mock.calls[0][0] as string);
      expect(output.status).toBe('error');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('secrets delete returns 1 with stderr on failure without --json', async () => {
    mockDefaultVaultConfig.mockReturnValue(MOCK_VAULT_CONFIG);
    mockVaultDelete.mockRejectedValue(new Error('Key not found'));

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runSecretsDelete('/ws', 'MISSING', { json: false });
      expect(code).toBe(1);
      expect(errSpy).toHaveBeenCalledWith('Error: failed to delete secret');
    } finally {
      errSpy.mockRestore();
    }
  });

  it('secrets set returns 1 with stderr on failure without --json', async () => {
    mockDefaultVaultConfig.mockReturnValue(MOCK_VAULT_CONFIG);
    mockVaultSet.mockRejectedValue(new Error('Vault locked'));

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runSecretsSet('/ws', 'KEY', 'val', { json: false });
      expect(code).toBe(1);
      expect(errSpy).toHaveBeenCalledWith('Error: failed to store secret');
    } finally {
      errSpy.mockRestore();
    }
  });

  it('secrets list returns 1 with stderr on failure without --json', async () => {
    mockDefaultVaultConfig.mockReturnValue(MOCK_VAULT_CONFIG);
    mockVaultList.mockRejectedValue(new Error('Vault not initialized'));

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runSecretsList('/ws', { json: false });
      expect(code).toBe(1);
      expect(errSpy).toHaveBeenCalledWith('Error: failed to list secrets');
    } finally {
      errSpy.mockRestore();
    }
  });
});

// ── Identity configure edge cases ───────────────────────────────────────────

describe('identity configure edge cases', () => {
  afterEach(() => resetMocks());

  it('ignores invalid tier numbers in role mapping', async () => {
    mockConfigureIdentity.mockResolvedValue(undefined);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runIdentityConfigure('/ws', {
        json: true,
        provider: 'oidc',
        issuer: 'https://idp.example.com',
        clientId: 'client-123',
        roleMapping: 'admin:5,viewer:0,editor:6,bad:abc',
      });
      expect(mockConfigureIdentity).toHaveBeenCalledWith('/ws', expect.objectContaining({
        roleMapping: { admin: 5 },
      }));
    } finally {
      logSpy.mockRestore();
    }
  });

  it('handles empty role mapping string', async () => {
    mockConfigureIdentity.mockResolvedValue(undefined);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runIdentityConfigure('/ws', {
        json: false,
        provider: 'oidc',
        issuer: 'https://idp.example.com',
        clientId: 'client-123',
        roleMapping: '',
      });
      const lines = logSpy.mock.calls.map((c) => String(c[0]));
      // No role mappings line when mapping is empty
      expect(lines.every((l) => !l.includes('role mappings:'))).toBe(true);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('handles no roleMapping option', async () => {
    mockConfigureIdentity.mockResolvedValue(undefined);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runIdentityConfigure('/ws', {
        json: true,
        provider: 'oidc',
        issuer: 'https://idp.example.com',
        clientId: 'client-123',
      });
      expect(mockConfigureIdentity).toHaveBeenCalledWith('/ws', expect.objectContaining({
        roleMapping: {},
      }));
    } finally {
      logSpy.mockRestore();
    }
  });

  it('uses default scopes when scopes option is not provided', async () => {
    mockConfigureIdentity.mockResolvedValue(undefined);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runIdentityConfigure('/ws', {
        json: true,
        provider: 'oidc',
        issuer: 'https://idp.example.com',
        clientId: 'client-123',
      });
      expect(mockConfigureIdentity).toHaveBeenCalledWith('/ws', expect.objectContaining({
        oidc: expect.objectContaining({
          scopes: ['openid'],
        }),
      }));
    } finally {
      logSpy.mockRestore();
    }
  });
});
