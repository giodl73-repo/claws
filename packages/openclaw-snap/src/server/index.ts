/**
 * @bic/openclaw-snap/server — HTTP surface (9 endpoints).
 */
export { startServer, type ServerHandle, type StartServerOptions } from './startServer.js';
export {
  dispatch,
  handleHealthz,
  type AuthContextResult,
  type HandlerDeps,
  type SnapRequest,
  type SnapResponse,
} from './handlers.js';
export type { AuditSink } from './audit.js';
