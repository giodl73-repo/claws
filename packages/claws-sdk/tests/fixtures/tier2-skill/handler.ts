/**
 * Data transform skill handler with governance decorators.
 */

import { readFile, writeFile } from 'node:fs/promises';

// Governance decorators (S02-F02)
// @Risk(3)
// @DataLabel(file-access)

interface TransformRequest {
  inputPath: string;
  outputPath: string;
  format: 'json' | 'csv';
}

interface TransformResult {
  success: boolean;
  recordCount: number;
}

export async function handler(request: TransformRequest): Promise<TransformResult> {
  const input = await readFile(request.inputPath, 'utf-8');
  const records = JSON.parse(input);

  const output = request.format === 'csv'
    ? records.map((r: Record<string, unknown>) => Object.values(r).join(',')).join('\n')
    : JSON.stringify(records, null, 2);

  await writeFile(request.outputPath, output, 'utf-8');

  return { success: true, recordCount: records.length };
}
