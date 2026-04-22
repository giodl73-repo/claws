// SC-05 F-02 fixture — `for`-body assignment after `await` (nested depth 1).
// The codegen-lint AST nested-block walker MUST flag this file; a
// top-level-only walker would miss it.

export async function runWithFor(items: readonly string[]): Promise<string> {
  let policyArtifactSha256 = '';
  const artifact = await fetchArtifact();
  for (const item of items) {
    policyArtifactSha256 = artifact.sha256 + item;
  }
  return policyArtifactSha256;
}

async function fetchArtifact(): Promise<{ sha256: string }> {
  return { sha256: 'sha256:' + '2'.repeat(64) };
}
