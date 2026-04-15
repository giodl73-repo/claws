/**
 * MockGovernanceHost — implements all 6 governance host facets
 * with configurable responses for testing.
 *
 * Without a governance host, the generated plugin returns
 * `{ allowed: false, blockReason: 'governance host not configured' }`.
 *
 * @module @bic/claws-test/gateway-sim/mock-governance-host
 */

/**
 * Policy evaluation result.
 */
export interface PolicyResult {
  readonly allowed: boolean;
  readonly blockReason: string | null;
}

/**
 * Tool risk resolution result.
 */
export interface RiskResolution {
  readonly riskLevel: number;
  readonly failMode: 'open' | 'closed';
}

/**
 * Diagnostic report entry.
 */
export interface DiagnosticReport {
  readonly code: string;
  readonly message: string;
  readonly severity: 'error' | 'warning' | 'info';
}

/**
 * GovernanceHost interface — the 6 facets that the generated plugin
 * expects from the runtime environment.
 */
export interface GovernanceHost {
  evaluatePolicy(
    toolName: string,
    context: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<PolicyResult>;

  emitAuditEvent(event: Record<string, unknown>): void;

  getConfig(key: string): unknown;

  resolveToolRisk(toolName: string): RiskResolution;

  checkElicitation(
    toolName: string,
    principal: string,
    signal?: AbortSignal,
  ): Promise<boolean>;

  reportDiagnostic(diagnostic: DiagnosticReport): void;
}

/**
 * Configuration for MockGovernanceHost.
 */
export interface MockGovernanceHostConfig {
  /** Default policy result for all tools. */
  readonly defaultPolicy?: PolicyResult;
  /** Per-tool policy overrides. */
  readonly toolPolicies?: Record<string, PolicyResult>;
  /** Default risk resolution for all tools. */
  readonly defaultRisk?: RiskResolution;
  /** Per-tool risk overrides. */
  readonly toolRisks?: Record<string, RiskResolution>;
  /** Default elicitation result. */
  readonly defaultElicitation?: boolean;
  /** Per-tool elicitation overrides. */
  readonly toolElicitations?: Record<string, boolean>;
  /** Config values. */
  readonly configValues?: Record<string, unknown>;
}

/**
 * MockGovernanceHost — configurable test double for all 6 governance facets.
 */
export class MockGovernanceHost implements GovernanceHost {
  private readonly _config: MockGovernanceHostConfig;
  private readonly _auditEvents: Record<string, unknown>[] = [];
  private readonly _diagnostics: DiagnosticReport[] = [];

  constructor(config?: MockGovernanceHostConfig) {
    this._config = config ?? {};
  }

  async evaluatePolicy(
    toolName: string,
    _context: Record<string, unknown>,
    _signal?: AbortSignal,
  ): Promise<PolicyResult> {
    const override = this._config.toolPolicies?.[toolName];
    if (override) return override;
    return this._config.defaultPolicy ?? { allowed: true, blockReason: null };
  }

  emitAuditEvent(event: Record<string, unknown>): void {
    this._auditEvents.push({ ...event, timestamp: new Date().toISOString() });
  }

  getConfig(key: string): unknown {
    return this._config.configValues?.[key];
  }

  resolveToolRisk(toolName: string): RiskResolution {
    const override = this._config.toolRisks?.[toolName];
    if (override) return override;
    return this._config.defaultRisk ?? { riskLevel: 1, failMode: 'open' };
  }

  async checkElicitation(
    toolName: string,
    _principal: string,
    _signal?: AbortSignal,
  ): Promise<boolean> {
    const override = this._config.toolElicitations?.[toolName];
    if (override !== undefined) return override;
    return this._config.defaultElicitation ?? true;
  }

  reportDiagnostic(diagnostic: DiagnosticReport): void {
    this._diagnostics.push(diagnostic);
  }

  /** Get all emitted audit events. */
  getAuditEvents(): readonly Record<string, unknown>[] {
    return [...this._auditEvents];
  }

  /** Get all reported diagnostics. */
  getDiagnostics(): readonly DiagnosticReport[] {
    return [...this._diagnostics];
  }

  /** Clear recorded audit events and diagnostics. */
  reset(): void {
    this._auditEvents.length = 0;
    this._diagnostics.length = 0;
  }
}
