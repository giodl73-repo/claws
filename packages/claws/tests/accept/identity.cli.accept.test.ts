/**
 * L3: CLI acceptance — `claws protect identity` configure/show subcommands
 * produce correct output for OIDC and SAML providers and exit 0.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { claws, makeTempWorkspace } from './helpers.js';

describe('claws protect identity', () => {
  let cleanup: () => void;

  afterEach(() => cleanup?.());

  it('configure OIDC and show output with correct exit codes', async () => {
    const ws = makeTempWorkspace();
    cleanup = ws.cleanup;

    // Initialize workspace first
    await claws(['init'], { cwd: ws.dir });

    // Configure OIDC identity provider
    const configureResult = await claws([
      'protect', 'identity', 'configure',
      '--provider', 'OIDC',
      '--issuer', 'https://login.microsoftonline.com/tenant/v2.0',
      '--client-id', 'claws-test-app',
      '--redirect-uri', 'https://localhost:3000/callback',
      '--scopes', 'openid,profile,email',
      '--role-mapping', 'admin:4,developer:2,viewer:1',
    ], { cwd: ws.dir });

    expect(configureResult.exitCode).toBe(0);
    expect(configureResult.stdout).toContain('Identity provider configured: OIDC');

    // Verify claws.json has identity section
    const config = JSON.parse(readFileSync(join(ws.dir, 'claws.json'), 'utf-8'));
    expect(config.identity).toBeDefined();
    expect(config.identity.provider).toBe('OIDC');

    // Show identity configuration
    const showResult = await claws([
      'protect', 'identity', 'show',
    ], { cwd: ws.dir });

    expect(showResult.exitCode).toBe(0);
    expect(showResult.stdout).toContain('Provider: OIDC');
    expect(showResult.stdout).toContain('issuer:');
    expect(showResult.stdout).toContain('clientId:');

    // JSON output
    const jsonResult = await claws([
      '--json', 'protect', 'identity', 'show',
    ], { cwd: ws.dir });

    expect(jsonResult.exitCode).toBe(0);
    const parsed = JSON.parse(jsonResult.stdout);
    expect(parsed.status).toBe('ok');
    expect(parsed.identity.provider).toBe('OIDC');

    // Show on workspace with no identity returns not-configured
    const emptyWs = makeTempWorkspace();
    const emptyCleanup = emptyWs.cleanup;
    try {
      await claws(['init'], { cwd: emptyWs.dir });
      const emptyShow = await claws([
        'protect', 'identity', 'show',
      ], { cwd: emptyWs.dir });
      expect(emptyShow.exitCode).toBe(0);
      expect(emptyShow.stdout).toContain('No identity provider configured');
    } finally {
      emptyCleanup();
    }
  });

  it('configure SAML provider with JSON output', async () => {
    const ws = makeTempWorkspace();
    cleanup = ws.cleanup;

    await claws(['init'], { cwd: ws.dir });

    const result = await claws([
      '--json', 'protect', 'identity', 'configure',
      '--provider', 'SAML',
      '--entity-id', 'urn:test:sp',
      '--sso-url', 'https://idp.test.com/saml/sso',
      '--certificate', '-----BEGIN CERTIFICATE-----\nMIIB...\n-----END CERTIFICATE-----',
      '--role-mapping', 'admin:5,user:1',
    ], { cwd: ws.dir });

    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.status).toBe('configured');
    expect(parsed.provider).toBe('SAML');
  });
});
