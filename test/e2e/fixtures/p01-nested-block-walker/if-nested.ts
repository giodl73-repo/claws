// SC-05 F-02 fixture — `if`-branch assignment after `await` (nested depth 1).
// The codegen-lint AST nested-block walker MUST flag this file; a
// top-level-only walker would miss it.

export async function runWithIf(cond: boolean): Promise<string> {
  let policyArtifactSha256 = '';
  const artifact = await fetchArtifact();
  if (cond) {
    policyArtifactSha256 = artifact.sha256;
  }
  return policyArtifactSha256;
}

async function fetchArtifact(): Promise<{ sha256: string }> {
  return { sha256: 'sha256:' + '0'.repeat(64) };
}
