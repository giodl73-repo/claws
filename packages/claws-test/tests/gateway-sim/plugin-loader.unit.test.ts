/**
 * L0: plugin-loader — PluginLoadError construction, loadPlugin() paths,
 * hook validation (valid/invalid/absent hooks, register API pattern).
 */

import { describe, it, expect, vi } from 'vitest';
import {
  PluginLoadError,
  loadPlugin,
  type PluginHooks,
} from '@bic/claws-test/gateway-sim/plugin-loader';

// ── PluginLoadError ────────────────────────────────────────────────────

describe('PluginLoadError', () => {
  it('formats message with module path, expected, and actual exports', () => {
    const err = new PluginLoadError(
      '/plugins/bad-plugin.js',
      ['beforeToolCall', 'afterToolCall'],
      ['foo', 'bar'],
    );

    expect(err.name).toBe('PluginLoadError');
    expect(err.modulePath).toBe('/plugins/bad-plugin.js');
    expect(err.expectedExports).toEqual(['beforeToolCall', 'afterToolCall']);
    expect(err.actualExports).toEqual(['foo', 'bar']);
    expect(err.message).toContain('/plugins/bad-plugin.js');
    expect(err.message).toContain('beforeToolCall, afterToolCall');
    expect(err.message).toContain('foo, bar');
  });

  it('shows "(none)" when actual exports are empty', () => {
    const err = new PluginLoadError('/p.js', ['beforeToolCall'], []);

    expect(err.message).toContain('(none)');
  });

  it('is instanceof Error', () => {
    const err = new PluginLoadError('/p.js', [], []);
    expect(err).toBeInstanceOf(Error);
  });
});

// ── loadPlugin() ───────────────────────────────────────────────────────

describe('loadPlugin()', () => {
  it('throws PluginLoadError when import fails', async () => {
    // A path that does not exist will cause import() to throw
    await expect(
      loadPlugin('file:///nonexistent-plugin-xyz-9999.mjs'),
    ).rejects.toThrow(PluginLoadError);

    try {
      await loadPlugin('file:///nonexistent-plugin-xyz-9999.mjs');
    } catch (e) {
      const err = e as PluginLoadError;
      expect(err.actualExports[0]).toContain('(import failed:');
    }
  });

  it('loads named exports as hooks', async () => {
    // Create a data: URL module with named exports
    const moduleCode = `
      export async function beforeToolCall(name, ctx) {
        return { allowed: true, blockReason: null };
      }
      export async function afterToolCall(name, result, ctx) {}
    `;
    const dataUrl = `data:text/javascript;base64,${Buffer.from(moduleCode).toString('base64')}`;

    const hooks = await loadPlugin(dataUrl);
    expect(typeof hooks.beforeToolCall).toBe('function');
    expect(typeof hooks.afterToolCall).toBe('function');
    expect(hooks.onError).toBeUndefined();
  });

  it('loads hooks via default export register() API', async () => {
    const moduleCode = `
      export default {
        register(api) {
          api.on('before_tool_call', async (name, ctx) => {
            return { allowed: true, blockReason: null };
          });
          api.on('after_tool_call', async (name, result, ctx) => {});
          api.on('on_error', async (name, err, ctx) => {});
        }
      };
    `;
    const dataUrl = `data:text/javascript;base64,${Buffer.from(moduleCode).toString('base64')}`;

    const hooks = await loadPlugin(dataUrl);
    expect(typeof hooks.beforeToolCall).toBe('function');
    expect(typeof hooks.afterToolCall).toBe('function');
    expect(typeof hooks.onError).toBe('function');
  });

  it('throws PluginLoadError when hooks are non-function values', async () => {
    const moduleCode = `
      export const beforeToolCall = "not-a-function";
      export const afterToolCall = 42;
    `;
    const dataUrl = `data:text/javascript;base64,${Buffer.from(moduleCode).toString('base64')}`;

    await expect(loadPlugin(dataUrl)).rejects.toThrow(PluginLoadError);

    try {
      await loadPlugin(dataUrl);
    } catch (e) {
      const err = e as PluginLoadError;
      expect(err.expectedExports).toContain('beforeToolCall');
      expect(err.expectedExports).toContain('afterToolCall');
    }
  });

  it('accepts a module with only onError hook', async () => {
    const moduleCode = `
      export async function onError(name, err, ctx) {}
    `;
    const dataUrl = `data:text/javascript;base64,${Buffer.from(moduleCode).toString('base64')}`;

    const hooks = await loadPlugin(dataUrl);
    expect(hooks.beforeToolCall).toBeUndefined();
    expect(hooks.afterToolCall).toBeUndefined();
    expect(typeof hooks.onError).toBe('function');
  });

  it('accepts module with no recognized hooks (all undefined)', async () => {
    const moduleCode = `
      export const something = 'unrelated';
    `;
    const dataUrl = `data:text/javascript;base64,${Buffer.from(moduleCode).toString('base64')}`;

    const hooks = await loadPlugin(dataUrl);
    expect(hooks.beforeToolCall).toBeUndefined();
    expect(hooks.afterToolCall).toBeUndefined();
    expect(hooks.onError).toBeUndefined();
  });

  it('register API maps only recognized events', async () => {
    const moduleCode = `
      export default {
        register(api) {
          api.on('before_tool_call', async () => ({ allowed: true, blockReason: null }));
          api.on('unknown_event', async () => {});
        }
      };
    `;
    const dataUrl = `data:text/javascript;base64,${Buffer.from(moduleCode).toString('base64')}`;

    const hooks = await loadPlugin(dataUrl);
    expect(typeof hooks.beforeToolCall).toBe('function');
    expect(hooks.afterToolCall).toBeUndefined();
    expect(hooks.onError).toBeUndefined();
  });

  it('wraps non-Error import failures in the error message', async () => {
    // The actual import path will produce an Error, but the code handles
    // non-Error throws via String(err). We test the PluginLoadError fields.
    try {
      await loadPlugin('file:///definitely-not-a-real-module.mjs');
    } catch (e) {
      const err = e as PluginLoadError;
      expect(err.expectedExports).toEqual(['beforeToolCall', 'afterToolCall', 'onError']);
      expect(err.actualExports.length).toBe(1);
      expect(err.actualExports[0]).toMatch(/import failed/);
    }
  });
});
