/**
 * SARIF URI normalizer for claws output.
 *
 * Converts OS-native absolute paths to workspace-relative POSIX URIs
 * suitable for SARIF 2.1.0 `artifactLocation.uri` fields.
 *
 * On Windows, strips the drive letter prefix and replaces backslashes
 * with forward slashes so URIs are portable across platforms.
 *
 * @module claws-cli/format/sarif-uri
 */

/**
 * Convert an absolute OS path to a POSIX SARIF URI.
 *
 * Returns a workspace-relative URI when the path can be relativized against
 * `workspaceRoot`; otherwise returns the normalized absolute path.
 *
 * @param absolutePath - Absolute path to the file (may use backslashes on Windows)
 * @param workspaceRoot - Absolute path to the workspace root
 * @returns Forward-slash SARIF URI suitable for `artifactLocation.uri`
 */
export function toSarifUri(absolutePath: string, workspaceRoot: string): string {
  const normPath = absolutePath.replace(/\\/g, '/');
  const normRoot = workspaceRoot.replace(/\\/g, '/').replace(/\/$/, '');

  // If the path is the workspace root itself, return "." for a valid SARIF URI
  if (normPath === normRoot) {
    return '.';
  }

  const relativePath = toRelativePosixPath(normRoot, normPath);
  return relativePath ?? normPath;
}

function toRelativePosixPath(fromPath: string, toPath: string): string | null {
  const fromDrive = getWindowsDriveLetter(fromPath);
  const toDrive = getWindowsDriveLetter(toPath);

  // Windows paths on different drives cannot be relativized safely.
  if (fromDrive !== null || toDrive !== null) {
    if (fromDrive === null || toDrive === null || fromDrive.toLowerCase() !== toDrive.toLowerCase()) {
      return null;
    }
  } else if (isAbsolutePosixPath(fromPath) !== isAbsolutePosixPath(toPath)) {
    // Do not attempt to relativize mixed absolute/relative POSIX-style paths.
    return null;
  }

  const fromParts = splitPathParts(stripWindowsDriveLetter(fromPath));
  const toParts = splitPathParts(stripWindowsDriveLetter(toPath));

  let shared = 0;
  while (shared < fromParts.length && shared < toParts.length && fromParts[shared] === toParts[shared]) {
    shared++;
  }

  const upLevels = new Array<string>(fromParts.length - shared).fill('..');
  const remaining = toParts.slice(shared);
  const relativeParts = upLevels.concat(remaining);

  return relativeParts.length > 0 ? relativeParts.join('/') : '.';
}

function getWindowsDriveLetter(path: string): string | null {
  const match = /^[A-Za-z]:/.exec(path);
  return match ? match[0].slice(0, 1) : null;
}

function stripWindowsDriveLetter(path: string): string {
  return path.replace(/^[A-Za-z]:/, '');
}

function isAbsolutePosixPath(path: string): boolean {
  return path.startsWith('/');
}

function splitPathParts(path: string): string[] {
  return path.split('/').filter((part) => part.length > 0);
}
