/**
 * MockGateway re-export — convenience import from @bic/claws-test.
 *
 * Re-exports MockGateway from @bic/claws-skill-kit so test authors
 * can import everything from a single package.
 *
 * @module @bic/claws-test/mock/mock-gateway
 */

export { MockGateway } from '@bic/claws-skill-kit/mock/mock-gateway.js';
export type {
  GatewayDecision,
  BeforeToolCallEvent,
  GatewayEventListener,
  MockGatewayConfig,
} from '@bic/claws-skill-kit/mock/mock-gateway.js';
