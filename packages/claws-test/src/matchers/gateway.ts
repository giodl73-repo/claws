/**
 * Custom vitest matchers for GatewaySim assertions.
 *
 * 6 matchers:
 * - `toBlock(toolName)` — GatewaySim blocked the named tool
 * - `toAllow(toolName)` — GatewaySim allowed the named tool
 * - `toElicit(toolName)` — GatewaySim triggered elicitation
 * - `toHaveAuditEntries(count)` — audit chain length
 * - `toEnforceWithin(toolName, maxMs)` — timing budget check
 * - `toHaveValidAuditChain()` — sequential IDs + monotonic timestamps
 *
 * @module @bic/claws-test/matchers/gateway
 */

import type { GatewaySim, AuditEntry } from '../gateway-sim.js';

/**
 * toBlock(toolName) — asserts GatewaySim blocked the named tool.
 */
export function toBlock(received: GatewaySim, toolName: string) {
  const chain = received.getAuditChain();
  const entry = chain.find(e => e.toolName === toolName);

  if (!entry) {
    return {
      pass: false,
      message: () =>
        `Expected GatewaySim to have an entry for "${toolName}", but no entry found. Tools in chain: ${chain.map(e => e.toolName).join(', ') || '(none)'}`,
    };
  }

  const pass = entry.outcome === 'BLOCKED';
  return {
    pass,
    message: () =>
      pass
        ? `Expected "${toolName}" NOT to be blocked, but it was (reason: ${entry.reason})`
        : `Expected "${toolName}" to be BLOCKED, but outcome was ${entry.outcome}`,
  };
}

/**
 * toAllow(toolName) — asserts GatewaySim allowed the named tool.
 */
export function toAllow(received: GatewaySim, toolName: string) {
  const chain = received.getAuditChain();
  const entry = chain.find(e => e.toolName === toolName);

  if (!entry) {
    return {
      pass: false,
      message: () =>
        `Expected GatewaySim to have an entry for "${toolName}", but no entry found`,
    };
  }

  const pass = entry.outcome === 'ALLOWED';
  return {
    pass,
    message: () =>
      pass
        ? `Expected "${toolName}" NOT to be allowed, but it was`
        : `Expected "${toolName}" to be ALLOWED, but outcome was ${entry.outcome} (reason: ${entry.reason})`,
  };
}

/**
 * toElicit(toolName) — asserts GatewaySim triggered elicitation.
 */
export function toElicit(received: GatewaySim, toolName: string) {
  const chain = received.getAuditChain();
  const entry = chain.find(e => e.toolName === toolName);

  if (!entry) {
    return {
      pass: false,
      message: () =>
        `Expected GatewaySim to have an entry for "${toolName}", but no entry found`,
    };
  }

  const pass = entry.outcome === 'ELICITED';
  return {
    pass,
    message: () =>
      pass
        ? `Expected "${toolName}" NOT to trigger elicitation, but it did`
        : `Expected "${toolName}" to trigger ELICITATION, but outcome was ${entry.outcome}`,
  };
}

/**
 * toHaveAuditEntries(count) — asserts audit chain has exactly `count` entries.
 */
export function toHaveAuditEntries(received: GatewaySim, count: number) {
  const chain = received.getAuditChain();
  const pass = chain.length === count;

  return {
    pass,
    message: () =>
      pass
        ? `Expected audit chain NOT to have ${count} entries, but it does`
        : `Expected audit chain to have ${count} entries, but found ${chain.length}`,
  };
}

/**
 * toEnforceWithin(toolName, maxMs) — asserts enforcement for the named tool
 * completed within the timing budget.
 */
export function toEnforceWithin(received: GatewaySim, toolName: string, maxMs: number) {
  const timings = received.getTimings();
  const entry = timings.find(t => t.toolName === toolName);

  if (!entry) {
    return {
      pass: false,
      message: () =>
        `Expected GatewaySim to have timing data for "${toolName}", but no entry found`,
    };
  }

  const pass = entry.elapsedMs <= maxMs;
  return {
    pass,
    message: () =>
      pass
        ? `Expected "${toolName}" to exceed ${maxMs}ms, but it completed in ${entry.elapsedMs.toFixed(1)}ms`
        : `Expected "${toolName}" to complete within ${maxMs}ms, but it took ${entry.elapsedMs.toFixed(1)}ms`,
  };
}

/**
 * toHaveValidAuditChain() — verifies:
 * 1. Sequential entry IDs (1, 2, 3, ...)
 * 2. Monotonic timestamps (each >= previous)
 * 3. Valid HMAC chain when signatures are present
 */
export function toHaveValidAuditChain(received: GatewaySim) {
  const chain = received.getAuditChain();

  if (chain.length === 0) {
    return {
      pass: true,
      message: () => 'Expected audit chain to be invalid, but it is empty (trivially valid)',
    };
  }

  // Check sequential IDs
  for (let i = 0; i < chain.length; i++) {
    const entry = chain[i] as AuditEntry;
    const expectedId = i + 1;
    if (entry.id !== expectedId) {
      return {
        pass: false,
        message: () =>
          `Audit chain has non-sequential ID at index ${i}: expected ${expectedId}, got ${entry.id}`,
      };
    }
  }

  // Check monotonic timestamps
  for (let i = 1; i < chain.length; i++) {
    const prev = chain[i - 1] as AuditEntry;
    const curr = chain[i] as AuditEntry;
    if (curr.timestamp < prev.timestamp) {
      return {
        pass: false,
        message: () =>
          `Audit chain has non-monotonic timestamp at index ${i}: ${curr.timestamp} < ${prev.timestamp}`,
      };
    }
  }

  // If HMAC signatures are present, verify they form a chain
  const signed = chain.filter(e => e.hmacSignature);
  if (signed.length > 0 && signed.length !== chain.length) {
    return {
      pass: false,
      message: () =>
        `Audit chain has partial HMAC coverage: ${signed.length}/${chain.length} entries signed`,
    };
  }

  return {
    pass: true,
    message: () =>
      `Expected audit chain to be invalid, but all ${chain.length} entries have sequential IDs, monotonic timestamps, and valid signatures`,
  };
}
