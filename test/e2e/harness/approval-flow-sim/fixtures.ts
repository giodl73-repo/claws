/**
 * test/e2e/harness/approval-flow-sim/fixtures — fixture resolver.
 *
 * Maps a scenario's `fixture` string to the absolute path of the matching
 * `test/e2e/fixtures/{name}/` directory. A missing fixture throws a clear
 * error — we refuse to silently fall back because scenarios that reference
 * typo'd fixtures would otherwise pass against random unrelated policy.
 *
 * @module test/e2e/harness/approval-flow-sim/fixtures
 */
import { existsSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES_ROOT = resolve(HERE, '..', '..', 'fixtures');

export class FixtureNotFoundError extends Error {
  constructor(name: string, searchedAt: string) {
    super(
      `approval-flow-sim: fixture '${name}' not found at '${searchedAt}'. ` +
        `Scenarios must point at an existing directory under test/e2e/fixtures/.`,
    );
    this.name = 'FixtureNotFoundError';
  }
}

export function resolveFixture(name: string): string {
  if (name.length === 0) {
    throw new FixtureNotFoundError(name, FIXTURES_ROOT);
  }
  const candidate = join(FIXTURES_ROOT, name);
  if (!existsSync(candidate) || !statSync(candidate).isDirectory()) {
    throw new FixtureNotFoundError(name, candidate);
  }
  return candidate;
}

export function fixturesRoot(): string {
  return FIXTURES_ROOT;
}
