/**
 * PROTECT command group — thin CLI adapter.
 *
 * Delegates all logic to claws-sdk/protect. This file only parses
 * arguments, calls SDK functions, and renders output.
 *
 * @module claws-cli/commands/protect
 */

import { createInterface } from 'node:readline';
import { budget } from '@bic/claws-sdk/protect/budget';
import type { FullBudgetResult } from '@bic/claws-sdk/protect/budget';
import { budgetFleet } from '@bic/claws-sdk/protect/budget-fleet';
import type { BudgetFleetReport } from '@bic/claws-sdk/protect';
import {
  vaultInit,
  vaultSet,
  vaultGet,
  vaultList,
  vaultDelete,
  defaultVaultConfig,
  configureIdentity,
  getIdentity,
} from '@bic/claws-sdk/protect';
import type { FullIdentityConfig, RoleMapping } from '@bic/claws-sdk/protect';

/**
 * Resolve the vault passphrase from (in priority order):
 * 1. CLAWS_VAULT_PASSPHRASE environment variable
 * 2. Interactive stdin prompt (only if stdin is a TTY)
 * 3. Reject with an error (never accept via CLI argument)
 */
async function resolvePassphrase(): Promise<string> {
  const envPass = process.env['CLAWS_VAULT_PASSPHRASE'];
  if (envPass !== undefined && envPass.length > 0) {
    return envPass;
  }

  if (process.stdin.isTTY) {
    return new Promise<string>((resolve, reject) => {
      const rl = createInterface({ input: process.stdin, output: process.stderr });
      rl.question('Vault passphrase: ', (answer) => {
        rl.close();
        if (answer.length === 0) {
          reject(new Error('Passphrase cannot be empty'));
        } else {
          resolve(answer);
        }
      });
    });
  }

  throw new Error('No passphrase available: set CLAWS_VAULT_PASSPHRASE env var or run interactively');
}

export interface ProtectBudgetOpts {
  readonly json: boolean;
  readonly period?: string;
}

/**
 * Run `claws protect budget` — display workspace budget usage.
 */
export async function runProtectBudget(
  workspaceRoot: string,
  opts: ProtectBudgetOpts,
): Promise<number> {
  const period = opts.period === 'daily' ? 'daily' : opts.period === 'weekly' ? 'weekly' : 'monthly';

  let result: FullBudgetResult;
  try {
    result = await budget(workspaceRoot, { period });
  } catch (err) {
    if (opts.json) {
      console.log(JSON.stringify({ error: String(err) }));
    } else {
      console.error(`Budget check failed: ${err instanceof Error ? err.message : String(err)}`);
    }
    return 1;
  }

  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
    return 0;
  }

  // Terminal output
  const { report, alerts, enforcement } = result;
  console.log(`Budget: ${report.percentage.toFixed(0)}% used (${report.tokenCount}/${report.limit} tokens, ${report.period})`);

  const triggered = alerts.filter((a) => a.triggered);
  if (triggered.length > 0) {
    console.log('');
    for (const alert of triggered) {
      console.log(`  ALERT: ${alert.message}`);
    }
  }

  for (const e of enforcement) {
    if (e.exceeded) {
      console.log(`  ${e.action.toUpperCase()}: ${e.message}`);
    }
  }

  return 0;
}

// ── Fleet budget command ─────────────────────────────────────────────

export interface ProtectBudgetFleetOpts {
  readonly json: boolean;
}

/**
 * Run `claws protect budget --fleet` — display fleet-wide budget usage.
 */
export async function runProtectBudgetFleet(
  fleetRoot: string,
  opts: ProtectBudgetFleetOpts,
): Promise<number> {
  let result: BudgetFleetReport;
  try {
    result = await budgetFleet(fleetRoot);
  } catch (err) {
    if (opts.json) {
      console.log(JSON.stringify({ error: String(err) }));
    } else {
      console.error(`Fleet budget check failed: ${err instanceof Error ? err.message : String(err)}`);
    }
    return 1;
  }

  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
    return 0;
  }

  // Terminal output
  console.log(`Fleet Budget: ${result.workspaces.length} workspaces, ${result.totalSpend} total tokens`);

  if (result.sortedByUsage.length > 0) {
    console.log('');
    for (const ws of result.sortedByUsage) {
      if (ws.error) {
        console.log(`  ERROR  ${ws.workspaceName} — ${ws.error}`);
      } else {
        console.log(`  ${ws.report.percentage.toFixed(0)}%  ${ws.workspaceName}  ${ws.report.tokenCount}/${ws.report.limit} tokens (${ws.report.period})`);
      }
    }
  }

  return 0;
}

// ── Secrets vault commands ────────────────────────────────────────────

export interface SecretsInitOpts {
  readonly json: boolean;
}

/**
 * Run `claws protect secrets init`.
 */
export async function runSecretsInit(
  workspaceRoot: string,
  opts: SecretsInitOpts,
): Promise<number> {
  try {
    const passphrase = await resolvePassphrase();
    const config = defaultVaultConfig(workspaceRoot);
    const { kdf } = await vaultInit(config, passphrase);

    if (opts.json) {
      console.log(JSON.stringify({ status: 'initialized', kdf }));
    } else {
      console.log(`Vault initialized (KDF: ${kdf})`);
    }
    return 0;
  } catch (err: unknown) {
    const msg = (err as Error).message;
    if (opts.json) {
      console.log(JSON.stringify({ status: 'error', error: '[redacted]' }));
    } else {
      console.error('Error: vault initialization failed');
    }
    return 1;
  }
}

export interface SecretsSetOpts {
  readonly json: boolean;
}

/**
 * Run `claws protect secrets set`.
 */
export async function runSecretsSet(
  workspaceRoot: string,
  key: string,
  value: string,
  opts: SecretsSetOpts,
): Promise<number> {
  try {
    const passphrase = await resolvePassphrase();
    const config = defaultVaultConfig(workspaceRoot);
    await vaultSet(config, key, value, passphrase);

    if (opts.json) {
      console.log(JSON.stringify({ status: 'stored', key }));
    } else {
      console.log(`Secret "${key}" stored`);
    }
    return 0;
  } catch (err: unknown) {
    const msg = (err as Error).message;
    if (opts.json) {
      console.log(JSON.stringify({ status: 'error', error: '[redacted]' }));
    } else {
      console.error('Error: failed to store secret');
    }
    return 1;
  }
}

export interface SecretsGetOpts {
  readonly json: boolean;
}

/**
 * Run `claws protect secrets get`.
 */
export async function runSecretsGet(
  workspaceRoot: string,
  key: string,
  opts: SecretsGetOpts,
): Promise<number> {
  try {
    const passphrase = await resolvePassphrase();
    const config = defaultVaultConfig(workspaceRoot);
    const value = await vaultGet(config, key, passphrase);

    if (opts.json) {
      console.log(JSON.stringify({ status: 'ok', key, value }));
    } else {
      console.log(value);
    }
    return 0;
  } catch (err: unknown) {
    const msg = (err as Error).message;
    const wrongPassphrase = /wrong passphrase/i.test(msg);
    if (opts.json) {
      console.log(
        JSON.stringify({
          status: 'error',
          error: wrongPassphrase ? 'wrong passphrase' : '[redacted]',
        }),
      );
    } else {
      console.error(
        wrongPassphrase
          ? 'Error: wrong passphrase'
          : 'Error: failed to retrieve secret',
      );
    }
    return 1;
  }
}

export interface SecretsListOpts {
  readonly json: boolean;
}

/**
 * Run `claws protect secrets list`.
 */
export async function runSecretsList(
  workspaceRoot: string,
  opts: SecretsListOpts,
): Promise<number> {
  try {
    const config = defaultVaultConfig(workspaceRoot);
    const keys = await vaultList(config);

    if (opts.json) {
      console.log(JSON.stringify({ status: 'ok', keys }));
    } else {
      if (keys.length === 0) {
        console.log('No secrets stored');
      } else {
        for (const k of keys) {
          console.log(k);
        }
      }
    }
    return 0;
  } catch (err: unknown) {
    const msg = (err as Error).message;
    if (opts.json) {
      console.log(JSON.stringify({ status: 'error', error: '[redacted]' }));
    } else {
      console.error('Error: failed to list secrets');
    }
    return 1;
  }
}

export interface SecretsDeleteOpts {
  readonly json: boolean;
}

/**
 * Run `claws protect secrets delete`.
 */
export async function runSecretsDelete(
  workspaceRoot: string,
  key: string,
  opts: SecretsDeleteOpts,
): Promise<number> {
  try {
    const passphrase = await resolvePassphrase();
    const config = defaultVaultConfig(workspaceRoot);
    await vaultDelete(config, key, passphrase);

    if (opts.json) {
      console.log(JSON.stringify({ status: 'deleted', key }));
    } else {
      console.log(`Secret "${key}" deleted`);
    }
    return 0;
  } catch (err: unknown) {
    const msg = (err as Error).message;
    if (opts.json) {
      console.log(JSON.stringify({ status: 'error', error: '[redacted]' }));
    } else {
      console.error('Error: failed to delete secret');
    }
    return 1;
  }
}

// ── Identity SSO commands ────────────────────────────────────────────

export interface IdentityConfigureOpts {
  readonly json: boolean;
  readonly provider: string;
  readonly issuer?: string | undefined;
  readonly clientId?: string | undefined;
  readonly redirectUri?: string | undefined;
  readonly scopes?: string | undefined;
  readonly entityId?: string | undefined;
  readonly ssoUrl?: string | undefined;
  readonly certificate?: string | undefined;
  readonly roleMapping?: string | undefined;
}

/**
 * Run `claws protect identity configure` — register an identity provider.
 */
export async function runIdentityConfigure(
  workspaceRoot: string,
  opts: IdentityConfigureOpts,
): Promise<number> {
  try {
    const roleMappingObj: Record<string, 1 | 2 | 3 | 4 | 5> = {};
    if (opts.roleMapping) {
      for (const pair of opts.roleMapping.split(',')) {
        const [role, tier] = pair.trim().split(':');
        if (role && tier) {
          const tierNum = parseInt(tier.trim(), 10);
          if (tierNum >= 1 && tierNum <= 5) {
            roleMappingObj[role.trim()] = tierNum as 1 | 2 | 3 | 4 | 5;
          }
        }
      }
    }

    const config: FullIdentityConfig = {
      provider: opts.provider.toUpperCase() as 'OIDC' | 'SAML',
      ...(opts.provider.toUpperCase() === 'OIDC'
        ? {
            oidc: {
              issuer: opts.issuer ?? '',
              clientId: opts.clientId ?? '',
              redirectUri: opts.redirectUri ?? '',
              scopes: opts.scopes?.split(',').map((s) => s.trim()) ?? ['openid'],
            },
          }
        : {}),
      ...(opts.provider.toUpperCase() === 'SAML'
        ? {
            saml: {
              entityId: opts.entityId ?? '',
              ssoUrl: opts.ssoUrl ?? '',
              certificate: opts.certificate ?? '',
            },
          }
        : {}),
      roleMapping: roleMappingObj,
    };

    await configureIdentity(workspaceRoot, config);

    if (opts.json) {
      console.log(JSON.stringify({ status: 'configured', provider: config.provider }));
    } else {
      console.log(`Identity provider configured: ${config.provider}`);
      if (Object.keys(roleMappingObj).length > 0) {
        console.log(`  role mappings: ${Object.keys(roleMappingObj).length}`);
      }
    }
    return 0;
  } catch (err: unknown) {
    const msg = (err as Error).message;
    if (opts.json) {
      console.log(JSON.stringify({ status: 'error', error: msg }));
    } else {
      console.error(`Error: ${msg}`);
    }
    return 1;
  }
}

export interface IdentityShowOpts {
  readonly json: boolean;
}

/**
 * Run `claws protect identity show` — display current identity configuration.
 */
export async function runIdentityShow(
  workspaceRoot: string,
  opts: IdentityShowOpts,
): Promise<number> {
  try {
    const identity = await getIdentity(workspaceRoot);

    if (!identity) {
      if (opts.json) {
        console.log(JSON.stringify({ status: 'not-configured' }));
      } else {
        console.log('No identity provider configured');
      }
      return 0;
    }

    if (opts.json) {
      console.log(JSON.stringify({ status: 'ok', identity }));
    } else {
      console.log(`Provider: ${identity.provider}`);
      if (identity.oidc) {
        console.log(`  issuer:    ${identity.oidc.issuer}`);
        console.log(`  clientId:  ${identity.oidc.clientId}`);
        console.log(`  redirect:  ${identity.oidc.redirectUri}`);
        console.log(`  scopes:    ${identity.oidc.scopes.join(', ')}`);
      }
      if (identity.saml) {
        console.log(`  entityId:  ${identity.saml.entityId}`);
        console.log(`  ssoUrl:    ${identity.saml.ssoUrl}`);
      }
      const mappings = Object.entries(identity.roleMapping);
      if (mappings.length > 0) {
        console.log('  role mappings:');
        for (const [role, tier] of mappings) {
          console.log(`    ${role} → T${tier}`);
        }
      }
    }
    return 0;
  } catch (err: unknown) {
    const msg = (err as Error).message;
    if (opts.json) {
      console.log(JSON.stringify({ status: 'error', error: msg }));
    } else {
      console.error(`Error: ${msg}`);
    }
    return 1;
  }
}
