/**
 * Single source of truth for the claws-sdk version string.
 *
 * Every module that needs the SDK version imports from here.
 * Bumping this one constant invalidates all caches, updates
 * all doc URLs, and updates all provenance metadata.
 *
 * @module claws-sdk/version
 */

/** Current claws SDK version. */
export const CLAWS_SDK_VERSION = '0.36.0';
