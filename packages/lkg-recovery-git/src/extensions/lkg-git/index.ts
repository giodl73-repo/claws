/**
 * `@openclaw/lkg-git` — git-backed LKGStore impl.
 *
 * @module @openclaw/lkg-git
 */

export { GitLKGStore, type GitAuthorship, type GitLKGStoreOptions } from './store.js';
export { git, gitBinary, type GitInvocationOptions, type GitResult } from './git-cmd.js';
