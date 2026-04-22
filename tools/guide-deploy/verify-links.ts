/**
 * tools/guide-deploy/verify-links.ts — Horus CP-8 pulse 74.
 *
 * Walks `docs/**.md` and asserts every relative Markdown link resolves
 * to a file on disk. Prints a broken-link table and exits 1 on any
 * break; exits 0 when the tree is intact.
 *
 * External URLs (http:, https:, mailto:) and pure anchor fragments (#…)
 * are skipped. Anchor fragments inside relative links (foo.md#section)
 * are stripped before existence check.
 */

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, resolve, dirname, relative } from 'node:path';
import { argv, exit, stderr, stdout } from 'node:process';

export interface BrokenLink {
  readonly sourceFile: string;
  readonly target: string;
  readonly resolvedPath: string;
  readonly lineNumber: number;
}

function walkMd(root: string): string[] {
  const out: string[] = [];
  const visit = (dir: string): void => {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir)) {
      if (name.startsWith('.')) continue;
      const full = join(dir, name);
      const st = statSync(full);
      if (st.isDirectory()) visit(full);
      else if (name.endsWith('.md')) out.push(full);
    }
  };
  visit(root);
  return out.sort();
}

export function findBrokenLinks(docsRoot: string): BrokenLink[] {
  const broken: BrokenLink[] = [];
  const files = walkMd(docsRoot);
  const linkRx = /\[[^\]]+\]\(([^)]+)\)/g;

  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      let m: RegExpExecArray | null;
      const lineRx = new RegExp(linkRx.source, 'g');
      while ((m = lineRx.exec(line)) !== null) {
        const target = m[1]!;
        if (
          target.startsWith('http:') ||
          target.startsWith('https:') ||
          target.startsWith('mailto:') ||
          target.startsWith('#')
        ) {
          continue;
        }
        // Strip anchor fragment
        const clean = target.split('#')[0]!;
        if (clean.length === 0) continue;
        // Only check .md targets (skip images, etc.)
        if (!clean.endsWith('.md')) continue;

        const abs = resolve(dirname(file), clean);
        if (!existsSync(abs)) {
          broken.push({
            sourceFile: relative(docsRoot, file),
            target,
            resolvedPath: abs,
            lineNumber: i + 1,
          });
        }
      }
    }
  }
  return broken;
}

function parseFlag(flag: string): string | undefined {
  const idx = argv.indexOf(flag);
  if (idx === -1) return undefined;
  return argv[idx + 1];
}

function main(): void {
  const docsDir = parseFlag('--docs-dir') ?? 'docs';
  const absDocs = resolve(docsDir);
  if (!existsSync(absDocs)) {
    stderr.write(`docs dir does not exist: ${absDocs}\n`);
    exit(2);
  }
  const broken = findBrokenLinks(absDocs);
  if (broken.length === 0) {
    stdout.write(`verify-links: 0 broken links in ${absDocs}\n`);
    exit(0);
  }
  stdout.write(`verify-links: ${broken.length} broken link(s):\n`);
  for (const b of broken) {
    stdout.write(`  ${b.sourceFile}:${b.lineNumber}  ${b.target}\n`);
  }
  exit(1);
}

const entryPath = resolve(argv[1] ?? '').replace(/\\/g, '/');
if (import.meta.url.endsWith(entryPath) || import.meta.url.endsWith(`/${entryPath}`)) {
  main();
}
