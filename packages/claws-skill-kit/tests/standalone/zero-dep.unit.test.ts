/**
 * L0 Unit: Verify @bic/claws-skill-kit has zero transitive claws-cli dependencies.
 *
 * package.json must NOT list claws-cli, claws-base-cli, craftworks-sdk,
 * or shared-cli as dependencies or peerDependencies (except claws-sdk
 * which is allowed as an optional peer).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const BANNED_PACKAGES = [
  '@bic/claws-cli',
  '@craftworks/claws-base-cli',
  '@craftworks/craftworks-sdk',
  '@craftworks/shared-cli',
  'claws-cli',
  'claws-base-cli',
  'craftworks-sdk',
  'shared-cli',
];

function loadPackageJson(): Record<string, unknown> {
  const raw = readFileSync(resolve(__dirname, '../../package.json'), 'utf-8');
  return JSON.parse(raw) as Record<string, unknown>;
}

describe('zero transitive claws-cli dependencies', () => {
  const pkg = loadPackageJson();

  it('dependencies contain no banned packages', () => {
    const deps = pkg['dependencies'] as Record<string, string> | undefined ?? {};
    for (const banned of BANNED_PACKAGES) {
      expect(deps, `dependencies should not include ${banned}`).not.toHaveProperty(banned);
    }
  });

  it('peerDependencies contain no banned packages (claws-sdk allowed)', () => {
    const peers = pkg['peerDependencies'] as Record<string, string> | undefined ?? {};
    for (const banned of BANNED_PACKAGES) {
      expect(peers, `peerDependencies should not include ${banned}`).not.toHaveProperty(banned);
    }
  });

  it('only zod is a runtime dependency', () => {
    const deps = pkg['dependencies'] as Record<string, string> | undefined ?? {};
    const depNames = Object.keys(deps);
    // Only zod should be in dependencies
    expect(depNames).toEqual(['zod']);
  });

  it('claws-sdk peer dependency is optional', () => {
    const peerMeta = pkg['peerDependenciesMeta'] as Record<string, Record<string, boolean>> | undefined;
    expect(peerMeta).toBeDefined();
    expect(peerMeta!['@bic/claws-sdk']).toBeDefined();
    expect(peerMeta!['@bic/claws-sdk']!['optional']).toBe(true);
  });
});
