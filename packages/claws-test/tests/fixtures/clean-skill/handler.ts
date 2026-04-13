/**
 * Clean skill handler — zero security scanner findings expected.
 *
 * This handler follows all security best practices:
 * - No eval or Function constructor
 * - No hardcoded credentials
 * - Input is validated before use
 * - Output is redacted
 * - No chain bypass
 */

const API_BASE = 'https://api.example.com';

interface ReadResult {
  content: string;
  path: string;
}

function validatePath(path: string): string {
  if (path.length > 1024) {
    throw new Error('Path too long');
  }
  if (path.includes('..')) {
    throw new Error('Path traversal not allowed');
  }
  return path;
}

export async function handleRead(filePath: string): Promise<ReadResult> {
  if (filePath.length > 4096) throw new Error('Path too long');
  const safePath = validatePath(filePath);
  const content = `Contents of ${safePath}`;
  return { content, path: safePath };
}

export function formatOutput(data: Record<string, string>): string {
  return JSON.stringify(data);
}
