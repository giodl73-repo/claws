/**
 * GatewaySim — loads a compiled claws plugin and simulates gateway enforcement.
 *
 * GatewaySim EXTENDS MockGateway: MockGateway is per-skill handler-level mocking,
 * GatewaySim adds full compiled plugin loading with hook lifecycle simulation.
 *
 * Key design decisions (CISO + gateway-eng role lenses):
 * - R5 fail-closed: degraded mode always blocks R5 tools
 * - R1-R2 fail-open: errors on low-risk tools allow through
 * - Audit chain: every action writes an audit entry, even on error
 * - No eval/Function: plugin loading via dynamic import() only
 *
 * @module @bic/claws-test/gateway-sim
 */

import { loadPlugin, type PluginHooks } from './gateway-sim/plugin-loader.js';
import { MockGovernanceHost, type GovernanceHost } from './gateway-sim/mock-governance-host.js';
import { TimingCollector, type TimingEntry, type TimingBaseline } from './gateway-sim/timing.js';
import {
  SimReport,
  type EnforcementEntry,
  type EnforcementOutcome,
} from './gateway-sim/report.js';

/**
 * Audit entry recorded by GatewaySim.
 */
export interface AuditEntry {
  readonly id: number;
  readonly timestamp: string;
  readonly toolName: string;
  readonly outcome: EnforcementOutcome;
  readonly ruleId: string;
  readonly riskLevel: number;
  readonly actor: string;
  readonly reason: string;
  readonly hmacSignature?: string;
}

/**
 * Result of firing a single tool call through GatewaySim.
 */
export interface FireResult {
  readonly allowed: boolean;
  readonly blocked: boolean;
  readonly elicited: boolean;
  readonly auditEntries: readonly AuditEntry[];
  readonly reason: string;
}

/**
 * Options for GatewaySim construction.
 */
export interface GatewaySimOptions {
  /** Governance host to wire into the plugin context. */
  readonly host?: GovernanceHost;
  /** Whether to log verbose pipeline info. */
  readonly verbose?: boolean;
  /** Timeout in ms for governance host calls (default 5000). */
  readonly hookTimeoutMs?: number;
}

/**
 * Options for reset().
 */
export interface ResetOptions {
  /** If true, only clear audit chain — preserve host config. */
  readonly auditOnly?: boolean;
}

/**
 * Risk map: tool name -> risk level.
 */
type RiskMap = ReadonlyMap<string, number>;

/**
 * Default risk level for unknown tools (fail-closed).
 */
const DEFAULT_RISK_LEVEL = 5;

/**
 * GatewaySim — core test harness for compiled claws plugins.
 */
export class GatewaySim {
  private _hooks: PluginHooks;
  private _host: GovernanceHost | undefined;
  private _riskMap: RiskMap;
  private readonly _auditChain: AuditEntry[] = [];
  private readonly _timing: TimingCollector = new TimingCollector();
  private _nextAuditId = 1;
  private readonly _report: SimReport;
  private readonly _verbose: boolean;
  private readonly _hookTimeoutMs: number;

  /** Default timeout for governance host calls (ms). */
  static readonly DEFAULT_HOOK_TIMEOUT_MS = 5000;

  private constructor(
    hooks: PluginHooks,
    host: GovernanceHost | undefined,
    riskMap: RiskMap,
    verbose: boolean,
    hookTimeoutMs: number,
  ) {
    this._hooks = hooks;
    this._host = host;
    this._riskMap = riskMap;
    this._verbose = verbose;
    this._hookTimeoutMs = hookTimeoutMs;
    this._report = new SimReport();
  }

  /**
   * Create a GatewaySim by loading a compiled plugin file.
   */
  static async fromPlugin(
    pluginPath: string,
    options?: GatewaySimOptions,
  ): Promise<GatewaySim> {
    const hooks = await loadPlugin(pluginPath);
    const verbose = options?.verbose ?? false;

    if (verbose) {
      const hookNames = [
        hooks.beforeToolCall ? 'beforeToolCall' : null,
        hooks.afterToolCall ? 'afterToolCall' : null,
        hooks.onError ? 'onError' : null,
      ].filter(Boolean);
      console.log(`[claws] Plugin: ${pluginPath}`);
      console.log(`[claws] Hooks: ${hookNames.join(', ')}`);
    }

    return new GatewaySim(
      hooks,
      options?.host,
      new Map(),
      verbose,
      options?.hookTimeoutMs ?? GatewaySim.DEFAULT_HOOK_TIMEOUT_MS,
    );
  }

  /**
   * Create a GatewaySim directly from hook functions and a risk map.
   * Used for unit testing without needing a compiled plugin file.
   */
  static fromHooks(
    hooks: PluginHooks,
    riskMap: RiskMap,
    options?: GatewaySimOptions,
  ): GatewaySim {
    return new GatewaySim(
      hooks,
      options?.host,
      riskMap,
      options?.verbose ?? false,
      options?.hookTimeoutMs ?? GatewaySim.DEFAULT_HOOK_TIMEOUT_MS,
    );
  }

  /**
   * Convenience constructor: compile workspace + load in one step.
   * Not yet implemented — use fromHooks() or fromPlugin() instead.
   */
  static async fromWorkspace(
    _workspacePath: string,
    _options?: GatewaySimOptions & { verbose?: boolean },
  ): Promise<GatewaySim> {
    throw new Error(
      'GatewaySim.fromWorkspace() is not yet implemented. Use GatewaySim.fromHooks() or GatewaySim.fromPlugin() instead.',
    );
  }

  /** Set the governance host. */
  setHost(host: GovernanceHost): void {
    this._host = host;
  }

  /** Get the current governance host. */
  getHost(): GovernanceHost | undefined {
    return this._host;
  }

  /**
   * Fire a single tool call through the plugin hooks.
   *
   * Degraded mode (CI-01):
   * - No GovernanceHost: R5 blocked, R1-R2 allowed
   * - GovernanceHost throws: R5 blocked, R1-R2 allowed
   * - GovernanceHost returns malformed: R5 blocked
   *
   * Error propagation (GE-02):
   * - beforeToolCall throws on R1: allowed (fail-open)
   * - beforeToolCall throws on R5: blocked (fail-closed)
   * - afterToolCall throws: audit entry still written
   */
  async fireToolCall(
    toolName: string,
    args: Record<string, unknown> = {},
    context: Record<string, unknown> = {},
  ): Promise<FireResult> {
    const riskLevel = this._riskMap.get(toolName) ?? DEFAULT_RISK_LEVEL;
    const startTime = new Date().toISOString();

    // Build AbortSignal with configured timeout (M7)
    const timeoutSignal = AbortSignal.timeout(this._hookTimeoutMs);

    // Build context with governance host and abort signal
    const fullContext: Record<string, unknown> = {
      ...context,
      args,
      __governanceHost: this._host,
      __abortSignal: timeoutSignal,
    };

    let outcome: EnforcementOutcome = 'ALLOWED';
    let reason = '';
    let ruleId = 'default';

    // before_tool_call
    if (this._hooks.beforeToolCall) {
      try {
        const result = await this._timing.measure(
          'beforeToolCall',
          toolName,
          () => this._hooks.beforeToolCall!(toolName, fullContext),
        );

        if (result.allowed === false) {
          outcome = 'BLOCKED';
          reason = result.blockReason ?? 'blocked by policy';
          ruleId = extractRuleId(reason);

          // Check if this is an elicitation block
          if (reason.toLowerCase().includes('elicit')) {
            outcome = 'ELICITED';
          }
        }
      } catch (err) {
        // M7: AbortSignal timeout → degraded mode (R5 blocked, R1-R2 allowed)
        const isTimeout = err instanceof DOMException && err.name === 'TimeoutError';
        const errMsg = isTimeout
          ? `Hook timeout (${this._hookTimeoutMs}ms) — degraded mode`
          : (err instanceof Error ? err.message : String(err));

        // GE-02: fail-mode depends on risk level
        if (riskLevel >= 3) {
          outcome = 'BLOCKED';
          reason = `Hook error — R${riskLevel} fail-closed: ${errMsg}`;
        } else {
          outcome = 'ALLOWED';
          reason = `Hook error — R${riskLevel} fail-open: ${errMsg}`;
        }
      }
    } else {
      // No beforeToolCall hook: use degraded mode logic
      if (!this._host) {
        if (riskLevel >= 3) {
          outcome = 'BLOCKED';
          reason = 'governance host not configured';
        } else {
          outcome = 'ALLOWED';
          reason = 'no governance host — fail-open for R1-R2';
        }
      }
    }

    // after_tool_call — fires on ALL outcomes (allowed, blocked, elicited)
    // so audit hooks can record every decision, not just allowed ones (M6)
    if (this._hooks.afterToolCall) {
      try {
        await this._timing.measure(
          'afterToolCall',
          toolName,
          () => this._hooks.afterToolCall!(toolName, { outcome }, fullContext),
        );
      } catch (_err) {
        // GE-02: afterToolCall errors still write audit entry (handled below)
      }
    }

    // Record audit entry (always, even on error)
    const auditEntry = this._createAuditEntry(
      toolName,
      outcome,
      ruleId,
      riskLevel,
      context['actor'] as string ?? 'system',
      reason,
      startTime,
    );
    this._auditChain.push(auditEntry);

    // Record in report
    const lastTiming = this._timing.getEntries().at(-1);
    this._report.addEntry({
      toolName,
      outcome,
      ruleId,
      riskLevel,
      timingMs: lastTiming?.elapsedMs ?? 0,
      reason,
      actor: context['actor'] as string ?? 'system',
      timestamp: startTime,
    });

    return {
      allowed: outcome === 'ALLOWED',
      blocked: outcome === 'BLOCKED',
      elicited: outcome === 'ELICITED',
      auditEntries: [auditEntry],
      reason,
    };
  }

  /**
   * Fire a sequence of tool calls, accumulating audit entries.
   */
  async fireToolCallSequence(
    calls: readonly { toolName: string; args?: Record<string, unknown>; context?: Record<string, unknown> }[],
  ): Promise<readonly FireResult[]> {
    const results: FireResult[] = [];
    for (const call of calls) {
      results.push(await this.fireToolCall(call.toolName, call.args, call.context));
    }
    return results;
  }

  /** Get the accumulated audit chain. */
  getAuditChain(): readonly AuditEntry[] {
    return [...this._auditChain];
  }

  /** Get all timing entries. */
  getTimings(): readonly TimingEntry[] {
    return this._timing.getEntries();
  }

  /** Get the SimReport. */
  get report(): SimReport {
    this._report.setTimingBaselines(this._timing.getBaseline());
    return this._report;
  }

  /**
   * Reset the simulator state.
   *
   * - No args: clear everything (audit chain, timings, host)
   * - `{ auditOnly: true }`: clear audit chain + timings, preserve host config
   */
  reset(opts?: ResetOptions): void {
    this._auditChain.length = 0;
    this._timing.reset();
    this._nextAuditId = 1;

    if (!opts?.auditOnly) {
      this._host = undefined;
    }
  }

  private _createAuditEntry(
    toolName: string,
    outcome: EnforcementOutcome,
    ruleId: string,
    riskLevel: number,
    actor: string,
    reason: string,
    timestamp: string,
  ): AuditEntry {
    return {
      id: this._nextAuditId++,
      timestamp,
      toolName,
      outcome,
      ruleId,
      riskLevel,
      actor,
      reason,
    };
  }
}

/**
 * Extract a rule ID from a reason string (e.g. "G-ELICIT-GATE" from
 * 'OBO elicitation not satisfied for "send-email"').
 */
function extractRuleId(reason: string): string {
  const match = reason.match(/G-[\w-]+/);
  return match ? match[0] : 'default';
}
