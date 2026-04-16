/**
 * Init module — workspace initialization orchestration.
 *
 * @module claws-sdk/init
 */

export { initWorkspace } from './orchestrator.js';
export type { InitOrchestratorOptions, InitResult } from './orchestrator.js';
export { detectWorkspacePlatform } from './platform-detect.js';
export type { WorkspacePlatform, WorkspacePlatformResult } from './platform-detect.js';
export { buildInitConfig, writeInitConfig } from './config-create.js';
export type { InitConfig } from './config-create.js';
export { scaffoldSidecar } from './sidecar-scaffold.js';
export { updateGitignore } from './gitignore-update.js';
export { uninstallWorkspace, workspaceHash } from './uninstall.js';
export type { UninstallResult } from './uninstall.js';
export { checkBypass, CLAWS_BYPASS_ENV } from '../config/bypass.js';
export type { BypassCheckResult, FleetBypassPolicy } from '../config/bypass.js';
export {
  applyTemplate,
  getTemplate,
  listTemplateNames,
  TemplateNotFoundError,
} from './templates/index.js';
export type {
  GovernanceTemplate,
  PolicyFile,
  TemplateConfigOverrides,
  ApplyTemplateResult,
} from './templates/index.js';
export { scaffoldWorkspaceFiles, getStarterFileDescription } from './workspace-scaffold.js';
export type { WorkspaceScaffoldResult } from './workspace-scaffold.js';
