/**
 * tools/guide-deploy/deploy-guides.ts — Horus CP-8 pulse 74.
 *
 * Deterministic migration driver: reads 17 wave guides from
 * `.craft/waves/260416+horus-the-heir+clawc-migration/guides/`, writes
 * each to its canonical bic/claws docs/ path, rewrites internal links
 * per three rules, and emits per-guide SHA evidence to
 * `.audit/migrations/horus/close/guide-rewrite-evidence.json`.
 *
 * Idempotent: re-running the driver on an already-migrated tree is a
 * no-op (same SHAs, no link rewrites applied).
 *
 * Invocation:
 *   tsx tools/guide-deploy/deploy-guides.ts \
 *     --from ../craftworks/.craft/waves/260416+horus-the-heir+clawc-migration/guides/ \
 *     --to . \
 *     --evidence .audit/migrations/horus/close/guide-rewrite-evidence.json
 *
 * All three flags are optional; defaults match the Horus wave paths.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve, relative } from 'node:path';
import { argv, stderr, stdout, exit } from 'node:process';

// ---------------------------------------------------------------------------
// Authoritative mapping table (pulse 74 §Deliverables).
// ---------------------------------------------------------------------------

export interface GuideEntry {
  readonly waveFile: string;
  readonly destPath: string;
  readonly subdir: 'concepts' | 'governance' | 'testing' | 'host-presets' | 'contributing';
}

export const GUIDE_TABLE: readonly GuideEntry[] = [
  { waveFile: 'concepts--atoms-registry.md', destPath: 'docs/concepts/atoms-registry.md', subdir: 'concepts' },
  { waveFile: 'concepts--accept-test-system.md', destPath: 'docs/concepts/accept-test-system.md', subdir: 'concepts' },
  { waveFile: 'concepts--doc-validation.md', destPath: 'docs/concepts/doc-validation.md', subdir: 'concepts' },
  { waveFile: 'concepts--no-craftworks-gate.md', destPath: 'docs/concepts/no-craftworks-gate.md', subdir: 'concepts' },
  { waveFile: 'host-adapter-contract.md', destPath: 'docs/concepts/host-adapter-contract.md', subdir: 'concepts' },
  { waveFile: 'governance--approval-flow.md', destPath: 'docs/governance/approval-flow.md', subdir: 'governance' },
  { waveFile: 'governance--decision-vocabulary.md', destPath: 'docs/governance/decision-vocabulary.md', subdir: 'governance' },
  { waveFile: 'governance--file-ingest-review.md', destPath: 'docs/governance/file-ingest-review.md', subdir: 'governance' },
  { waveFile: 'testing--e2e-harness.md', destPath: 'docs/testing/e2e-harness.md', subdir: 'testing' },
  { waveFile: 'testing--host-presets.md', destPath: 'docs/testing/host-presets.md', subdir: 'testing' },
  { waveFile: 'host-presets--openclaw.md', destPath: 'docs/host-presets/openclaw.md', subdir: 'host-presets' },
  { waveFile: 'host-presets--lobster.md', destPath: 'docs/host-presets/lobster.md', subdir: 'host-presets' },
  { waveFile: 'host-presets--aether.md', destPath: 'docs/host-presets/aether.md', subdir: 'host-presets' },
  { waveFile: 'host-presets--claws-service.md', destPath: 'docs/host-presets/claws-service.md', subdir: 'host-presets' },
  { waveFile: 'contributing--adding-an-atom.md', destPath: 'docs/contributing/adding-an-atom.md', subdir: 'contributing' },
  { waveFile: 'contributing--doc-scrub-checklist.md', destPath: 'docs/contributing/doc-scrub-checklist.md', subdir: 'contributing' },
  { waveFile: 'contributing--windows-setup.md', destPath: 'docs/contributing/windows-setup.md', subdir: 'contributing' },
];

// wave-file basename → destination path lookup
const WAVE_TO_DEST: ReadonlyMap<string, GuideEntry> = new Map(
  GUIDE_TABLE.map((e) => [e.waveFile, e]),
);

// Spec-draft citation rewrites: pulse 73 merged the amendments into the
// canonical CL-*.md specs. Bare-string + markdown-link forms both get
// rewritten so post-migration guides cite real files.
const SPEC_REWRITES: readonly [RegExp, string][] = [
  [/specs\/drafts\/CL-13-amendment-rename-to-claws\.md/g, 'specs/CL-13-repo-boundary.md'],
  [/specs\/drafts\/CL-13-amendment-repo-ops-oracle\.md/g, 'specs/CL-13-repo-boundary.md'],
  [/specs\/drafts\/CL-07-amendment-file-ingest-provider\.md/g, 'specs/CL-07-deep-integration.md'],
  [/specs\/drafts\/CL-07-amendment-snapshot-switch-semantics\.md/g, 'specs/CL-07-deep-integration.md'],
  [/specs\/drafts\/CL-11-amendment-audit-cross-linking\.md/g, 'specs/CL-11-upstream-governance.md'],
  [/specs\/drafts\/CL-NEW-canonicalizer-byte-identical\.md/g, 'specs/CL-15-canonicalizer.md'],
];

// ---------------------------------------------------------------------------
// Link rewriter — pure function of (source content, source subdir).
// ---------------------------------------------------------------------------

export interface LinkRewrite {
  readonly from: string;
  readonly to: string;
}

export function rewriteLinks(
  content: string,
  sourceSubdir: GuideEntry['subdir'],
): { rewritten: string; rewrites: LinkRewrite[] } {
  const rewrites: LinkRewrite[] = [];
  let out = content;

  // Rule 1 + 2: rewrite `{./,}{prefix}--{name}.md` markdown-link targets.
  // If prefix matches sourceSubdir → `./{name}.md`.
  // If prefix differs → `../{prefix}/{name}.md`.
  // Leading `./` is optional (some wave guides use bare filenames inside links).
  // Only the link target inside `](...)` is rewritten; the display text is preserved.
  const mdLinkRx = /\]\((\.\/)?([a-z-]+)--([a-z0-9-]+)\.md([^)]*)\)/g;
  out = out.replace(mdLinkRx, (_match, _dot: string | undefined, prefix: string, name: string, suffix: string) => {
    const to = prefix === sourceSubdir ? `./${name}.md${suffix}` : `../${prefix}/${name}.md${suffix}`;
    const from = `${_dot ?? ''}${prefix}--${name}.md${suffix}`;
    rewrites.push({ from, to });
    return `](${to})`;
  });

  // Wave-author absolute-style links `../../../docs/{subdir}/{name}.md` anchored
  // at the wave root get rewritten to be relative to the destination subdir.
  // From `docs/{sourceSubdir}/` to `docs/{subdir}/{name}.md` → `../{subdir}/{name}.md`.
  const absDocsRx = /\]\(\.\.\/\.\.\/\.\.\/docs\/([a-z-]+)\/([a-z0-9-]+)\.md([^)]*)\)/g;
  out = out.replace(absDocsRx, (_m, subdir: string, name: string, suffix: string) => {
    const to = subdir === sourceSubdir ? `./${name}.md${suffix}` : `../${subdir}/${name}.md${suffix}`;
    const from = `../../../docs/${subdir}/${name}.md${suffix}`;
    rewrites.push({ from, to });
    return `](${to})`;
  });

  // Rule 3: unprefixed `./host-adapter-contract.md`
  //  - from concepts/ source: unchanged
  //  - from other source: `../concepts/host-adapter-contract.md`
  if (sourceSubdir !== 'concepts') {
    const hac = /\]\(\.\/host-adapter-contract\.md([^)]*)\)/g;
    out = out.replace(hac, (_m, suffix: string) => {
      const to = `../concepts/host-adapter-contract.md${suffix}`;
      rewrites.push({ from: `./host-adapter-contract.md${suffix}`, to });
      return `](${to})`;
    });
  }

  // Spec-draft citations (both backtick-bare and markdown-link forms).
  for (const [rx, replacement] of SPEC_REWRITES) {
    let m: RegExpExecArray | null;
    const matches: string[] = [];
    const seen = new Set<string>();
    const scanRx = new RegExp(rx.source, rx.flags);
    while ((m = scanRx.exec(out)) !== null) {
      if (!seen.has(m[0])) {
        matches.push(m[0]);
        seen.add(m[0]);
      }
    }
    if (matches.length > 0) {
      const applyRx = new RegExp(rx.source, rx.flags);
      out = out.replace(applyRx, replacement);
      for (const m0 of matches) {
        rewrites.push({ from: m0, to: replacement });
      }
    }
  }

  return { rewritten: out, rewrites };
}

// ---------------------------------------------------------------------------
// README transform — strip wave-only sections, rewrite inventory links.
// ---------------------------------------------------------------------------

export function transformReadme(content: string): { rewritten: string; rewrites: LinkRewrite[] } {
  const rewrites: LinkRewrite[] = [];
  let out = content;

  // Strip wave-only sections. Each section is a ## or ### heading through
  // the next heading at the same-or-greater level, or EOF.
  const stripSections = [
    'Cross-reference conventions',
    'Migration footnote',
  ];
  for (const heading of stripSections) {
    const rx = new RegExp(
      `^##\\s+${heading.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}[\\s\\S]*?(?=^##\\s|\\Z)`,
      'm',
    );
    const before = out;
    out = out.replace(rx, '');
    if (out === before) {
      // Section might use ### instead
      const rx2 = new RegExp(
        `^###\\s+${heading.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}[\\s\\S]*?(?=^###\\s|^##\\s|\\Z)`,
        'm',
      );
      out = out.replace(rx2, '');
    }
  }

  // Rewrite `./{prefix}--{name}.md` to `./{prefix}/{name}.md` in the
  // README (inventory-style links; the README's canonical home is docs/
  // so relative links stay at docs/ root and descend into each subdir).
  const mdLinkRx = /\]\(\.\/([a-z-]+)--([a-z0-9-]+)\.md([^)]*)\)/g;
  out = out.replace(mdLinkRx, (_match, prefix: string, name: string, suffix: string) => {
    const to = `./${prefix}/${name}.md${suffix}`;
    rewrites.push({ from: `./${prefix}--${name}.md${suffix}`, to });
    return `](${to})`;
  });

  // Unprefixed host-adapter-contract from README → concepts/
  const hacRx = /\]\(\.\/host-adapter-contract\.md([^)]*)\)/g;
  out = out.replace(hacRx, (_m, suffix: string) => {
    const to = `./concepts/host-adapter-contract.md${suffix}`;
    rewrites.push({ from: `./host-adapter-contract.md${suffix}`, to });
    return `](${to})`;
  });

  // Spec-draft citations (bare-string only in README).
  for (const [rx, replacement] of SPEC_REWRITES) {
    const matches: string[] = [];
    const seen = new Set<string>();
    const scanRx = new RegExp(rx.source, rx.flags);
    let m: RegExpExecArray | null;
    while ((m = scanRx.exec(out)) !== null) {
      if (!seen.has(m[0])) {
        matches.push(m[0]);
        seen.add(m[0]);
      }
    }
    if (matches.length > 0) {
      const applyRx = new RegExp(rx.source, rx.flags);
      out = out.replace(applyRx, replacement);
      for (const m0 of matches) {
        rewrites.push({ from: m0, to: replacement });
      }
    }
  }

  // Collapse double blank lines introduced by the strip.
  out = out.replace(/\n{3,}/g, '\n\n');

  return { rewritten: out, rewrites };
}

// ---------------------------------------------------------------------------
// Driver
// ---------------------------------------------------------------------------

export interface EvidenceEntry {
  readonly source_path: string;
  readonly source_sha256: string;
  readonly dest_path: string;
  readonly dest_sha256: string;
  readonly link_rewrites: LinkRewrite[];
}

export interface DeployResult {
  readonly entries: EvidenceEntry[];
  readonly wrote: number;
  readonly unchanged: number;
}

function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

export function deployGuides(
  fromDir: string,
  toDir: string,
): DeployResult {
  const entries: EvidenceEntry[] = [];
  let wrote = 0;
  let unchanged = 0;

  // 17 content guides
  for (const entry of GUIDE_TABLE) {
    const sourcePath = join(fromDir, entry.waveFile);
    if (!existsSync(sourcePath)) {
      throw new Error(`deploy-guides: source guide missing: ${sourcePath}`);
    }
    const sourceContent = readFileSync(sourcePath, 'utf8');
    const { rewritten, rewrites } = rewriteLinks(sourceContent, entry.subdir);

    const destPath = join(toDir, entry.destPath);
    mkdirSync(dirname(destPath), { recursive: true });

    // Idempotency: if dest exists and is identical, skip write.
    if (existsSync(destPath)) {
      const existing = readFileSync(destPath, 'utf8');
      if (existing === rewritten) {
        unchanged++;
        entries.push({
          source_path: `guides/${entry.waveFile}`,
          source_sha256: sha256(sourceContent),
          dest_path: entry.destPath,
          dest_sha256: sha256(existing),
          link_rewrites: rewrites,
        });
        continue;
      }
    }

    writeFileSync(destPath, rewritten, 'utf8');
    wrote++;
    entries.push({
      source_path: `guides/${entry.waveFile}`,
      source_sha256: sha256(sourceContent),
      dest_path: entry.destPath,
      dest_sha256: sha256(rewritten),
      link_rewrites: rewrites,
    });
  }

  // README — source: guides/README.md, dest: docs/README.md
  const readmeSource = join(fromDir, 'README.md');
  if (existsSync(readmeSource)) {
    const sourceContent = readFileSync(readmeSource, 'utf8');
    const { rewritten, rewrites } = transformReadme(sourceContent);
    const destPath = join(toDir, 'docs/README.md');
    mkdirSync(dirname(destPath), { recursive: true });
    if (existsSync(destPath) && readFileSync(destPath, 'utf8') === rewritten) {
      unchanged++;
    } else {
      writeFileSync(destPath, rewritten, 'utf8');
      wrote++;
    }
    entries.push({
      source_path: 'guides/README.md',
      source_sha256: sha256(sourceContent),
      dest_path: 'docs/README.md',
      dest_sha256: sha256(rewritten),
      link_rewrites: rewrites,
    });
  }

  return { entries, wrote, unchanged };
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

function parseFlag(flag: string): string | undefined {
  const idx = argv.indexOf(flag);
  if (idx === -1) return undefined;
  return argv[idx + 1];
}

function main(): void {
  const fromDir = parseFlag('--from');
  const toDir = parseFlag('--to') ?? '.';
  const evidencePath = parseFlag('--evidence') ?? '.audit/migrations/horus/close/guide-rewrite-evidence.json';

  if (fromDir === undefined) {
    stderr.write('Usage: tsx tools/guide-deploy/deploy-guides.ts --from <wave-guides-dir> [--to <repo-root>] [--evidence <path>]\n');
    exit(2);
  }

  const absFrom = resolve(fromDir);
  const absTo = resolve(toDir);
  if (!existsSync(absFrom)) {
    stderr.write(`source wave-guides dir does not exist: ${absFrom}\n`);
    exit(2);
  }

  const { entries, wrote, unchanged } = deployGuides(absFrom, absTo);

  // Emit evidence
  const absEvidence = resolve(toDir, evidencePath);
  mkdirSync(dirname(absEvidence), { recursive: true });
  writeFileSync(
    absEvidence,
    JSON.stringify({ pulse: 74, wave: 'horus', generated_at: new Date().toISOString(), entries }, null, 2) + '\n',
    'utf8',
  );

  stdout.write(`deploy-guides: ${entries.length} guides processed (${wrote} written, ${unchanged} unchanged)\n`);
  stdout.write(`  evidence: ${relative(absTo, absEvidence)}\n`);
}

// Only run main when invoked as script
const entryPath = resolve(argv[1] ?? '').replace(/\\/g, '/');
if (import.meta.url.endsWith(entryPath) || import.meta.url.endsWith(`/${entryPath}`)) {
  main();
}
