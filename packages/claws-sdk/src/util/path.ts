/**
 * Cross-platform path normalization for claws-sdk.
 *
 * All file path operations in claws-sdk must use normalizePath()
 * to ensure Windows backslashes are converted to forward slashes.
 *
 * C07: Windows Path Normalization amendment.
 */

/**
 * Normalize a file path by converting backslashes to forward slashes.
 *
 * @param filePath - The path to normalize (may contain Windows backslashes)
 * @returns The path with all backslashes replaced by forward slashes
 */
export function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}
