/**
 * Plugin loader — loads compiled claws plugins via dynamic import().
 *
 * Security: eval() and new Function() are banned. Only dynamic import()
 * is permitted for plugin loading.
 *
 * @module @bic/claws-test/gateway-sim/plugin-loader
 */

/**
 * Expected hook function signatures from a compiled plugin module.
 */
export interface PluginHooks {
  readonly beforeToolCall?: (
    toolName: string | null | undefined,
    context: Record<string, unknown>,
  ) => Promise<{ allowed: boolean; blockReason: string | null }>;
  readonly afterToolCall?: (
    toolName: string,
    result: unknown,
    context: Record<string, unknown>,
  ) => Promise<void>;
  readonly onError?: (
    toolName: string,
    error: unknown,
    context: Record<string, unknown>,
  ) => Promise<void>;
}

/**
 * Error thrown when a plugin module has invalid exports.
 */
export class PluginLoadError extends Error {
  readonly modulePath: string;
  readonly expectedExports: readonly string[];
  readonly actualExports: readonly string[];

  constructor(
    modulePath: string,
    expectedExports: readonly string[],
    actualExports: readonly string[],
  ) {
    const msg = [
      `PluginLoadError: invalid plugin module at "${modulePath}"`,
      `  Expected hook exports (functions): ${expectedExports.join(', ')}`,
      `  Actual exports: ${actualExports.join(', ') || '(none)'}`,
    ].join('\n');
    super(msg);
    this.name = 'PluginLoadError';
    this.modulePath = modulePath;
    this.expectedExports = expectedExports;
    this.actualExports = actualExports;
  }
}

/**
 * Hook names recognized by the plugin loader.
 */
const HOOK_NAMES = ['beforeToolCall', 'afterToolCall', 'onError'] as const;

/**
 * Load a compiled plugin module via dynamic import and validate its exports.
 *
 * The module may export hooks directly (named exports) or via a default
 * export object with a `register` method. Both patterns are supported.
 *
 * @param modulePath - Absolute file path to the compiled plugin .ts/.js
 * @returns Validated plugin hooks
 * @throws PluginLoadError if exports are invalid
 */
export async function loadPlugin(modulePath: string): Promise<PluginHooks> {
  let mod: Record<string, unknown>;
  try {
    mod = await import(modulePath) as Record<string, unknown>;
  } catch (err) {
    throw new PluginLoadError(
      modulePath,
      [...HOOK_NAMES],
      [`(import failed: ${err instanceof Error ? err.message : String(err)})`],
    );
  }

  // If there is a default export with a register() method, invoke it
  // to extract hooks via the registration API.
  const defaultExport = mod['default'] as Record<string, unknown> | undefined;
  if (defaultExport && typeof defaultExport === 'object' && typeof defaultExport['register'] === 'function') {
    const hooks: Record<string, unknown> = {};
    const fakeApi = {
      on(event: string, handler: unknown) {
        // Map event names to hook names
        if (event === 'before_tool_call') hooks['beforeToolCall'] = handler;
        else if (event === 'after_tool_call') hooks['afterToolCall'] = handler;
        else if (event === 'on_error') hooks['onError'] = handler;
      },
    };
    (defaultExport['register'] as (api: typeof fakeApi) => void)(fakeApi);
    return validateHooks(modulePath, hooks);
  }

  // Otherwise, expect named exports
  return validateHooks(modulePath, mod);
}

/**
 * Validate that hook exports are functions (or absent).
 */
function validateHooks(
  modulePath: string,
  exports: Record<string, unknown>,
): PluginHooks {
  const actualExports = Object.keys(exports);
  const invalidHooks: string[] = [];

  for (const name of HOOK_NAMES) {
    const value = exports[name];
    if (value !== undefined && typeof value !== 'function') {
      invalidHooks.push(name);
    }
  }

  if (invalidHooks.length > 0) {
    throw new PluginLoadError(
      modulePath,
      invalidHooks,
      actualExports,
    );
  }

  const hooks: PluginHooks = {};
  if (typeof exports['beforeToolCall'] === 'function') {
    (hooks as { beforeToolCall: PluginHooks['beforeToolCall'] }).beforeToolCall =
      exports['beforeToolCall'] as PluginHooks['beforeToolCall'];
  }
  if (typeof exports['afterToolCall'] === 'function') {
    (hooks as { afterToolCall: PluginHooks['afterToolCall'] }).afterToolCall =
      exports['afterToolCall'] as PluginHooks['afterToolCall'];
  }
  if (typeof exports['onError'] === 'function') {
    (hooks as { onError: PluginHooks['onError'] }).onError =
      exports['onError'] as PluginHooks['onError'];
  }
  return hooks;
}
