/**
 * Levenshtein edit-distance with bounded early exit.
 *
 * Used for fuzzy matching in governance cross-reference resolution
 * and conflict detection (PF1-S03-F05, CLAWS-C006).
 *
 * @module claws-sdk/util/levenshtein
 */

/**
 * Compute Levenshtein distance between two strings, with early exit
 * when the distance is guaranteed to exceed maxDistance.
 *
 * @param a - First string
 * @param b - Second string
 * @param maxDistance - Bail out early if distance exceeds this (default 2)
 * @returns The edit distance, or `maxDistance + 1` if it exceeds the bound
 */
export function levenshtein(a: string, b: string, maxDistance: number = 2): number {
  const m = a.length;
  const n = b.length;

  // Length difference alone exceeds threshold — skip full computation
  if (Math.abs(m - n) > maxDistance) return maxDistance + 1;

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0) as number[]);

  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;

  for (let i = 1; i <= m; i++) {
    let rowMin = Infinity;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(
        dp[i - 1]![j]! + 1,
        dp[i]![j - 1]! + 1,
        dp[i - 1]![j - 1]! + cost,
      );
      if (dp[i]![j]! < rowMin) rowMin = dp[i]![j]!;
    }
    // Every cell in this row exceeds threshold — no path can recover
    if (rowMin > maxDistance) return maxDistance + 1;
  }

  return dp[m]![n]!;
}
