// SC-05 F-02 fixture — `try`-branch assignment after `await` (nested depth 1).
// The codegen-lint AST nested-block walker MUST flag this file; a
// top-level-only walker would miss it.

export async function runWithTry(): Promise<string> {
  let policyArtifactSha256 = '';
  const artifact = await fetchArtifact();
  try {
    policyArtifactSha256 = artifact.sha256;
  } catch (err) {
    void err;
  }
  return policyArtifactSha256;
}

async function fetchArtifact(): Promise<{ sha256: string }> {
  return { sha256: 'sha256:' + '1'.repeat(64) };
}
