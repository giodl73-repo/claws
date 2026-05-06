/**
 * lkg-stale-tmp-cleanup — what happens when a prior promote crashed
 * mid-write? FsLKGStore writes to `<path>.lkg.tmp-<pid>-<rnd>` then
 * renames to `<path>.lkg`. If the process dies between writeFile and
 * rename, a stale `.tmp-*` file is left behind.
 *
 * Verify: a subsequent promote/status doesn't trip over the stale
 * tmp file — either it's cleaned up or it's ignored (it's not a
 * substrate-recognized file shape; the substrate looks for `.lkg`,
 * not `.lkg.tmp-*`).
 */
export const slug = 'lkg-stale-tmp-cleanup';
export const description = 'stale .lkg.tmp file from prior crash does not break promote';

export const setup = {
  files: {
    'AGENTS.md': `# Agent\n## Boundaries\n- none\n`,
    'gateway.jsonc': `{ "version": "0.1.0" }\n`,
    // Pre-stage a stale tmp file as if a previous promote crashed mid-write.
    'gateway.jsonc.lkg.tmp-12345-abc123': `{ "stale": "from-crashed-write" }\n`,
  },
};

export const steps = [
  {
    name: 'promote despite stale tmp file',
    run: ['cage', 'promote', '.'],
    expect: { exitCode: 0, ok: true },
  },
  {
    name: '.lkg companion exists (real one was written)',
    file: { 'gateway.jsonc.lkg': { exists: true } },
  },
  {
    name: 'subsequent status still works (manifest walker tolerates stale tmp)',
    run: ['cage', 'status', '.'],
    expect: { exitCode: 0 },
  },
];
