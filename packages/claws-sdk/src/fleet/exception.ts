/**
 * Fleet exception registry — approved deviations from baseline.
 *
 * Exceptions stored in .claws/fleet-exceptions.json suppress drift
 * alerts for workspaces matching a pattern with an approved reason.
 *
 * @module claws-sdk/fleet/exception
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';

import type { FleetException, FleetExceptionRegistry } from './drift-types.js';

/** Default exceptions file path relative to a fleet root. */
const FLEET_EXCEPTIONS_FILE = '.claws/fleet-exceptions.json';

/**
 * Convert a glob pattern to a regular expression.
 *
 * Supports `*` (any chars except `/`), `**` (any chars including `/`),
 * and `?` (single char). All other regex metacharacters are escaped.
 */
function globToRegex(pattern: string): RegExp {
  let regexStr = '';
  let i = 0;
  while (i < pattern.length) {
    const ch = pattern[i]!;
    if (ch === '*' && pattern[i + 1] === '*') {
      regexStr += '.*';
      i += 2;
      // skip trailing slash after **
      if (pattern[i] === '/') i++;
    } else if (ch === '*') {
      regexStr += '[^/]*';
      i++;
    } else if (ch === '?') {
      regexStr += '[^/]';
      i++;
    } else if ('.+^${}()|[]\\'.includes(ch)) {
      regexStr += '\\' + ch;
      i++;
    } else {
      regexStr += ch;
      i++;
    }
  }
  return new RegExp('(?:^|/)' + regexStr + '$');
}

/**
 * Match a workspace path against the exception registry.
 *
 * Returns the first matching non-expired exception, or null if none match.
 *
 * Pattern matching uses glob-style matching: `*` matches any chars except
 * path separators, `**` matches across directories, `?` matches a single
 * char. For example, `special-ws` matches a path ending in `/special-ws`,
 * and `team-*` matches `/team-alpha`, `/team-beta`, etc.
 *
 * @param workspacePath - Absolute path to the workspace
 * @param exceptions - List of exceptions to check against
 * @returns The first matching exception, or null
 */
export function matchException(
  workspacePath: string,
  exceptions: readonly FleetException[],
): FleetException | null {
  const normalizedPath = workspacePath.replace(/\\/g, '/');
  const now = new Date();

  for (const exception of exceptions) {
    // Check expiry
    if (exception.expiresAt !== null) {
      const expiry = new Date(exception.expiresAt);
      if (expiry <= now) {
        continue; // expired
      }
    }

    // Glob-based pattern matching on normalized path
    const pattern = exception.workspacePattern.replace(/\\/g, '/');
    const regex = globToRegex(pattern);
    if (regex.test(normalizedPath)) {
      return exception;
    }
  }

  return null;
}

/**
 * Purge expired exceptions from a list.
 *
 * @param exceptions - Exceptions to filter
 * @returns Non-expired exceptions only
 */
export function purgeExpiredExceptions(
  exceptions: readonly FleetException[],
): FleetException[] {
  const now = new Date();
  return exceptions.filter((e) => {
    if (e.expiresAt === null) return true;
    return new Date(e.expiresAt) > now;
  });
}

/**
 * Load the exception registry from a fleet root.
 * Automatically purges expired exceptions on load.
 *
 * @param fleetRoot - Absolute path to the fleet root
 * @returns Array of non-expired exceptions (empty if file doesn't exist)
 */
export async function loadExceptions(
  fleetRoot: string,
): Promise<readonly FleetException[]> {
  const exceptionPath = join(fleetRoot, FLEET_EXCEPTIONS_FILE);
  try {
    const raw = await readFile(exceptionPath, 'utf-8');
    const parsed = JSON.parse(raw) as FleetExceptionRegistry;
    const all = parsed.exceptions ?? [];
    return purgeExpiredExceptions(all);
  } catch {
    return [];
  }
}

/**
 * Save exceptions to the fleet exception registry.
 *
 * @param fleetRoot - Absolute path to the fleet root
 * @param exceptions - Exceptions to save
 */
export async function saveExceptions(
  fleetRoot: string,
  exceptions: readonly FleetException[],
): Promise<void> {
  const exceptionPath = join(fleetRoot, FLEET_EXCEPTIONS_FILE);
  const registry: FleetExceptionRegistry = { exceptions };

  await mkdir(dirname(exceptionPath), { recursive: true });
  await writeFile(exceptionPath, JSON.stringify(registry, null, 2), 'utf-8');
}

/**
 * Validate an exception before adding it to the registry.
 *
 * @throws Error if approver is empty or missing
 */
function validateException(exception: FleetException): void {
  if (!exception.approver || exception.approver.trim().length === 0) {
    throw new Error('Exception approver must be a non-empty string');
  }
}

/**
 * Add an exception to the registry.
 *
 * @param fleetRoot - Absolute path to the fleet root
 * @param exception - Exception to add
 * @throws Error if approver is empty or missing
 */
export async function addException(
  fleetRoot: string,
  exception: FleetException,
): Promise<void> {
  validateException(exception);
  const existing = await loadExceptions(fleetRoot);
  await saveExceptions(fleetRoot, [...existing, exception]);
}
