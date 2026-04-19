/**
 * L0 unit test — `StageCache` get/set/has/clear (CL-04 §IS.5).
 *
 * Set-then-get round-trips. Schema-version mismatch forces a miss. Clear
 * removes every entry for the stage.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { StageCache } from '#src/compiler/host/stage-cache.js';
import { STAGE_CACHE_KEY_SCHEMA_VERSION } from '#src/compiler/host/stage-cache-key.js';

describe('StageCache (unit)', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'stage-cache-'));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('set-then-get round-trips the entry', async () => {
    const cache = new StageCache(tmp, 'soul');
    await cache.set('k1', {
      keySchemaVersion: STAGE_CACHE_KEY_SCHEMA_VERSION,
      byteHash: 'bh',
      payload: 'payload',
    });
    const got = await cache.get('k1');
    expect(got?.byteHash).toBe('bh');
    expect(got?.payload).toBe('payload');
    expect(await cache.has('k1')).toBe(true);
  });

  it('get returns undefined on miss', async () => {
    const cache = new StageCache(tmp, 'tools');
    expect(await cache.get('missing')).toBeUndefined();
    expect(await cache.has('missing')).toBe(false);
  });

  it('schema-version mismatch forces a miss', async () => {
    const cache = new StageCache(tmp, 'agents');
    mkdirSync(join(tmp, 'stages', 'agents'), { recursive: true });
    writeFileSync(
      join(tmp, 'stages', 'agents', 'oldkey.json'),
      JSON.stringify({
        keySchemaVersion: STAGE_CACHE_KEY_SCHEMA_VERSION + 1,
        byteHash: 'bh',
        payload: 'x',
      }),
    );
    expect(await cache.get('oldkey')).toBeUndefined();
  });

  it('clear removes every entry', async () => {
    const cache = new StageCache(tmp, 'memory');
    await cache.set('a', {
      keySchemaVersion: STAGE_CACHE_KEY_SCHEMA_VERSION,
      byteHash: 'b',
      payload: '',
    });
    await cache.clear();
    expect(await cache.get('a')).toBeUndefined();
    // Second clear on the now-empty dir is a no-op.
    await cache.clear();
  });

  it('malformed JSON returns undefined (miss)', async () => {
    const cache = new StageCache(tmp, 'lobster');
    mkdirSync(join(tmp, 'stages', 'lobster'), { recursive: true });
    writeFileSync(join(tmp, 'stages', 'lobster', 'bad.json'), '{not json');
    expect(await cache.get('bad')).toBeUndefined();
  });

  it('non-object JSON returns undefined (miss)', async () => {
    const cache = new StageCache(tmp, 'identity');
    mkdirSync(join(tmp, 'stages', 'identity'), { recursive: true });
    writeFileSync(join(tmp, 'stages', 'identity', 'null.json'), 'null');
    expect(await cache.get('null')).toBeUndefined();
  });
});
