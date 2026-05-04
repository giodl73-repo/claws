/**
 * `ocdoctor-fixers-jsonc-starter` — starter fixer pack for jsonc files.
 *
 * Each fixer pairs with a lint rule from
 * `@bic/pinch/extensions/oclint-rules-jsonc-starter`. The pack
 * is additive-by-default; redaction is the only quasi-destructive
 * fixer and it preserves the operator's ability to recover the
 * original via env-var assignment.
 *
 * @module ocdoctor-fixers-jsonc-starter
 */

import type { OcPathFixerSpec } from '../../plugin-sdk/oc-doctor/types.js';
import { configAddPluginsStub } from './fixers/config-add-plugins-stub.js';
import { configAddVersionStub } from './fixers/config-add-version-stub.js';
import { configRedactSecretLiteral } from './fixers/config-redact-secret-literal.js';

export const jsoncStarterFixers: readonly OcPathFixerSpec[] = [
  configAddPluginsStub,
  configAddVersionStub,
  configRedactSecretLiteral,
];

export {
  configAddPluginsStub,
  configAddVersionStub,
  configRedactSecretLiteral,
};
