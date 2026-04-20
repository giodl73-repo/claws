import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { copyFixture } from '../fixture-copier.ts';

const createdDirs: string[] = [];

afterEach(async () => {
  while (createdDirs.length > 0) {
    const dir = createdDirs.pop()!;
    await rm(dir, { recursive: true, force: true });
  }
});

describe('copyFixture — CRLF + UTF-8 BOM byte preservation', () => {
  it('round-trips CRLF line endings and a UTF-8 BOM byte-for-byte', async () => {
    const src = await mkdtemp(join(tmpdir(), 'pulse36-bom-'));
    createdDirs.push(src);

    // Construct a file with:
    //   - UTF-8 BOM (EF BB BF)
    //   - mixed CRLF + LF line endings
    //   - a non-ASCII codepoint
    const bom = Buffer.from([0xef, 0xbb, 0xbf]);
    const body = Buffer.from(
      '# header\r\nline-two\r\nunicode café\nbare-lf\r\n',
      'utf8',
    );
    const originalBytes = Buffer.concat([bom, body]);

    await mkdir(join(src, 'deep'), { recursive: true });
    await writeFile(join(src, 'deep', 'bom-crlf.md'), originalBytes);

    const dest = await copyFixture(src, 'byte-fidelity');
    createdDirs.push(dest);

    const copiedBytes = await readFile(join(dest, 'deep', 'bom-crlf.md'));
    expect(Buffer.isBuffer(copiedBytes)).toBe(true);
    expect(Buffer.compare(originalBytes, copiedBytes)).toBe(0);
    // Buffer.equals is the assertion named by the pulse plan.
    expect(originalBytes.equals(copiedBytes)).toBe(true);
  });
});
