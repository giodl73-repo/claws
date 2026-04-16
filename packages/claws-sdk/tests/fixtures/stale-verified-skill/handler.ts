/**
 * Code scanner skill handler — MODIFIED after VERIFIED build.
 *
 * This handler has been edited since the last verified compilation,
 * making the VERIFIED badge stale. The handler hash in the fixture
 * manifest will NOT match this content.
 */

import { readFile } from 'node:fs/promises';

// Governance decorators (S02-F02)
// @Risk(3)
// @DataLabel(file-access)

interface ScanRequest {
  targetPath: string;
  patterns: string[];
}

interface ScanResult {
  vulnerabilities: number;
  findings: string[];
}

// MODIFIED: Added new severity field (causes hash mismatch)
export async function handler(request: ScanRequest): Promise<ScanResult & { severity: string }> {
  const content = await readFile(request.targetPath, 'utf-8');
  const findings: string[] = [];

  for (const pattern of request.patterns) {
    if (content.includes(pattern)) {
      findings.push(`Found pattern: ${pattern}`);
    }
  }

  return {
    vulnerabilities: findings.length,
    findings,
    severity: findings.length > 5 ? 'high' : 'low',
  };
}
