/**
 * `claws cache` command — LLM extraction cache management.
 *
 * Thin CLI adapter: calls SDK LLMCache and renders results.
 * No business logic lives here.
 *
 * @module claws-cli/commands/cache
 */

import { readFile } from 'node:fs/promises';
import { LLMCache } from '@bic/claws-sdk/compile';

/**
 * Options for cache subcommands.
 */
export interface CacheOptions {
  readonly json: boolean;
}

/**
 * `claws cache status` — display cache statistics.
 *
 * @returns Exit code (0=success, 3=error)
 */
export async function runCacheStatus(
  workspaceRoot: string,
  opts: CacheOptions,
): Promise<number> {
  try {
    const cache = new LLMCache(workspaceRoot);
    await cache.load();
    const st = cache.status();

    if (opts.json) {
      console.log(JSON.stringify({
        status: 'ok',
        size: st.size,
        hits: st.hits,
        misses: st.misses,
        hitRate: st.hitRate,
        modelIds: st.modelIds,
        promptVersions: st.promptVersions,
      }));
    } else {
      console.log(`LLM cache: ${st.size} entries`);
      if (st.modelIds.length > 0) {
        console.log(`  models: ${st.modelIds.join(', ')}`);
      }
      if (st.promptVersions.length > 0) {
        console.log(`  prompt versions: ${st.promptVersions.length}`);
      }
    }
    return 0;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (opts.json) {
      console.error(JSON.stringify({ status: 'error', message }));
    } else {
      console.error(`Error: ${message}`);
    }
    return 3;
  }
}

/**
 * `claws cache export` — export cache as portable JSON to stdout.
 *
 * @returns Exit code (0=success, 3=error)
 */
export async function runCacheExport(
  workspaceRoot: string,
  opts: CacheOptions,
): Promise<number> {
  try {
    const cache = new LLMCache(workspaceRoot);
    await cache.load();
    const data = cache.export();
    console.log(JSON.stringify(data, null, 2));
    return 0;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (opts.json) {
      console.error(JSON.stringify({ status: 'error', message }));
    } else {
      console.error(`Error: ${message}`);
    }
    return 3;
  }
}

/**
 * `claws cache import <file>` — import cache from a JSON file.
 *
 * @returns Exit code (0=success, 3=error)
 */
export async function runCacheImport(
  workspaceRoot: string,
  filePath: string,
  opts: CacheOptions,
): Promise<number> {
  try {
    const raw = await readFile(filePath, 'utf-8');
    const data = JSON.parse(raw) as ReturnType<LLMCache['export']>;

    const cache = new LLMCache(workspaceRoot);
    await cache.load();
    const { skipped, reasons } = cache.import(data);
    await cache.save();

    const st = cache.status();
    if (opts.json) {
      console.log(JSON.stringify({ status: 'ok', size: st.size, skipped }));
    } else {
      console.log(`Cache imported: ${st.size} entries`);
      if (skipped > 0) {
        console.log(`Skipped ${skipped} invalid entries:`);
        for (const reason of reasons) {
          console.log(`  - ${reason}`);
        }
      }
    }
    return 0;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (opts.json) {
      console.error(JSON.stringify({ status: 'error', message }));
    } else {
      console.error(`Error: ${message}`);
    }
    return 3;
  }
}

/**
 * `claws cache clear` — clear all LLM cache entries.
 *
 * @returns Exit code (0=success, 3=error)
 */
export async function runCacheClear(
  workspaceRoot: string,
  opts: CacheOptions,
): Promise<number> {
  try {
    const cache = new LLMCache(workspaceRoot);
    cache.clear();
    await cache.save();

    if (opts.json) {
      console.log(JSON.stringify({ status: 'ok', cleared: true }));
    } else {
      console.log('LLM cache cleared.');
    }
    return 0;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (opts.json) {
      console.error(JSON.stringify({ status: 'error', message }));
    } else {
      console.error(`Error: ${message}`);
    }
    return 3;
  }
}
