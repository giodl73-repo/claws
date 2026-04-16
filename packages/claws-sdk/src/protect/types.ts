/**
 * PROTECT command group types — budget tracking, secrets vault,
 * identity/SSO integration, threshold alerts, and usage caps.
 *
 * @module claws-sdk/protect/types
 */

// ── Budget tracking ────────────────────────────────────────────────────

/** Time period for budget reporting. */
export type BudgetPeriod = 'daily' | 'weekly' | 'monthly';

/**
 * Workspace-scoped usage data for a single reporting period.
 */
export interface BudgetReport {
  /** Total tokens consumed in this period. */
  readonly tokenCount: number;
  /** Token limit for this period. */
  readonly limit: number;
  /** Usage as a percentage of limit (0–100). */
  readonly percentage: number;
  /** Which period this report covers. */
  readonly period: BudgetPeriod;
}

/**
 * Per-workspace budget entry with workspace identity for fleet reporting.
 */
export interface WorkspaceBudgetEntry {
  /** Absolute path to the workspace root. */
  readonly workspacePath: string;
  /** Workspace name (basename of path). */
  readonly workspaceName: string;
  /** Budget report for this workspace. */
  readonly report: BudgetReport;
  /** Whether this entry represents an error (failed to read workspace). */
  readonly error?: string;
}

/**
 * Fleet-scoped budget aggregation across workspaces.
 */
export interface BudgetFleetReport {
  /** Per-workspace budget entries with identity information. */
  readonly workspaces: readonly WorkspaceBudgetEntry[];
  /** Total spend across all workspaces (in tokens). */
  readonly totalSpend: number;
  /** Workspace entries sorted by usage percentage, descending. */
  readonly sortedByUsage: readonly WorkspaceBudgetEntry[];
}

// ── Secrets vault ──────────────────────────────────────────────────────

/** Supported key derivation functions. */
export type KeyDerivation = 'pbkdf2' | 'argon2' | 'scrypt';

/**
 * Configuration for the encrypted secrets vault.
 */
export interface VaultConfig {
  /** Encryption algorithm (e.g. "aes-256-gcm"). */
  readonly algorithm: string;
  /** Path to the salt file. */
  readonly saltPath: string;
  /** Path to the vault data file. */
  readonly vaultPath: string;
  /** Key derivation function. */
  readonly keyDerivation: KeyDerivation;
}

// ── Identity / SSO ─────────────────────────────────────────────────────

/** Supported identity provider protocols. */
export type IdentityProvider = 'OIDC' | 'SAML';

/**
 * SSO/RBAC integration configuration.
 */
export interface IdentityConfig {
  /** Identity provider protocol. */
  readonly provider: IdentityProvider;
  /** Issuer URL for the identity provider. */
  readonly issuer: string;
  /** OAuth/SAML client identifier. */
  readonly clientId: string;
  /** Mapping from IdP roles to claws roles. */
  readonly roleMapping: Readonly<Record<string, string>>;
}

// ── Threshold alerts ───────────────────────────────────────────────────

/** Valid threshold levels — 80%, 95%, 100%. */
export type ThresholdLevel = 80 | 95 | 100;

/** All valid threshold levels as a runtime array. */
export const THRESHOLD_LEVELS: readonly ThresholdLevel[] = [80, 95, 100] as const;

/**
 * Budget threshold notification.
 */
export interface ThresholdAlert {
  /** Threshold level that was hit. */
  readonly level: ThresholdLevel;
  /** Whether this alert has been triggered. */
  readonly triggered: boolean;
  /** Human-readable alert message. */
  readonly message: string;
}

/**
 * Type guard — returns true if `value` is a valid ThresholdLevel.
 */
export function isThresholdLevel(value: number): value is ThresholdLevel {
  return (THRESHOLD_LEVELS as readonly number[]).includes(value);
}

// ── Budget limits ──────────────────────────────────────────────────────

/** Enforcement mode for budget caps. */
export type EnforcementMode = 'warn' | 'block';

/**
 * Daily/weekly/monthly usage caps with enforcement mode.
 */
export interface BudgetLimit {
  /** Maximum tokens per day. */
  readonly daily: number;
  /** Maximum tokens per week. 0 means not configured (falls back to daily * 7). */
  readonly weekly: number;
  /** Maximum tokens per month. */
  readonly monthly: number;
  /** What happens when the limit is hit. */
  readonly enforcement: EnforcementMode;
}

/**
 * Validate and create a BudgetLimit. Throws if daily or monthly is negative.
 */
export function createBudgetLimit(
  daily: number,
  monthly: number,
  enforcement: EnforcementMode,
  weekly = 0,
): BudgetLimit {
  if (daily < 0) {
    throw new RangeError(`daily limit must be non-negative, got ${daily}`);
  }
  if (weekly < 0) {
    throw new RangeError(`weekly limit must be non-negative, got ${weekly}`);
  }
  if (monthly < 0) {
    throw new RangeError(`monthly limit must be non-negative, got ${monthly}`);
  }
  return { daily, weekly, monthly, enforcement };
}
