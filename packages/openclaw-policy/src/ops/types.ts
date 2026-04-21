/**
 * Operational-helper shared types — ComplianceReport, rubric shapes, scenario
 * spec, mock-gateway handles, audit-verify results.
 *
 * These back the top-level exports `evaluateCompliance`, `renderReport`,
 * `verifyAudit`, `runScenarios`, and `startMockGateway` described in
 * docs/claws/proposals/openclaw-upstream/policy.md §Operational helpers.
 *
 * @module @bic/openclaw-policy/ops/types
 */

import type { AuditEntry, VerifyResult } from '@bic/openclaw-guardrails/audit';

import type { PolicyIR } from '../types/index.js';

export type { AuditEntry, VerifyResult } from '@bic/openclaw-guardrails/audit';

export type RubricCheckKind = 'static' | 'structural' | 'dynamic';

export type RubricStatus = 'pass' | 'fail' | 'partial' | 'not_applicable';

export type RenderFormat = 'markdown' | 'html' | 'json' | 'pdf' | 'sarif';

export interface RubricRequirement {
  readonly id: string;
  readonly title: string;
  readonly kind: RubricCheckKind;
  readonly predicate: string;
  readonly description?: string;
}

export interface Rubric {
  readonly id: string;
  readonly version: string;
  readonly framework: string;
  readonly requirements: readonly RubricRequirement[];
}

export interface ComplianceEvidenceRef {
  readonly type: 'oc_uri' | 'audit_correlation' | 'sample';
  readonly ref: string;
}

export interface ComplianceRequirementResult {
  readonly requirementId: string;
  readonly title: string;
  readonly status: RubricStatus;
  readonly evidence: readonly ComplianceEvidenceRef[];
  readonly gaps?: readonly string[];
}

export interface ComplianceSummary {
  readonly total: number;
  readonly pass: number;
  readonly fail: number;
  readonly partial: number;
  readonly na: number;
}

export interface ComplianceSignature {
  readonly algo: 'hmac-sha256';
  readonly key_id: string;
  readonly value: string;
}

export interface ComplianceReport {
  readonly snapshotId: string;
  readonly rubric: { readonly id: string; readonly version: string; readonly framework: string };
  readonly generatedAt: string;
  readonly evaluatedWindow?: { readonly from: string; readonly to: string };
  readonly results: readonly ComplianceRequirementResult[];
  readonly summary: ComplianceSummary;
  readonly signature: ComplianceSignature;
}

export interface ComplianceEvaluationInput {
  readonly snapshotId: string;
  readonly policyIR: PolicyIR;
  readonly auditManifest?: AuditManifestSummary;
  readonly auditEvents?: readonly AuditEventSummary[];
  readonly window?: { readonly from: string; readonly to: string };
}

export interface AuditManifestSummary {
  readonly retentionDays: number;
  readonly algorithm: string;
  readonly hasTamperSeal: boolean;
}

export interface AuditEventSummary {
  readonly timestamp: string;
  readonly ruleId: string;
  readonly outcome: string;
  readonly decision?: 'allow' | 'deny' | 'review' | 'modify';
  readonly requireApproval?: boolean;
  readonly externalApproval?: boolean;
}

export interface EvaluateComplianceOptions {
  readonly rubric: Rubric;
  readonly input: ComplianceEvaluationInput;
  readonly signingKey: string;
  readonly keyId: string;
  readonly now?: () => Date;
}

export interface ScenarioExpectAudit {
  readonly event: string;
  readonly policyId?: { readonly must_contain?: string };
}

export interface ScenarioExpect {
  readonly decision: 'allow' | 'deny' | 'review' | 'modify';
  readonly requireApproval?: boolean;
  readonly audit?: ScenarioExpectAudit;
}

export interface ScenarioToolCall {
  readonly name: string;
  readonly args: Record<string, unknown>;
}

export interface ScenarioGiven {
  readonly tool_call?: ScenarioToolCall;
  readonly file_ingest?: { readonly path: string; readonly content: string };
}

export interface ScenarioCase {
  readonly name?: string;
  readonly snapshot: string;
  readonly given: ScenarioGiven;
  readonly expect: ScenarioExpect;
}

export interface ScenarioCaseResult {
  readonly name: string;
  readonly passed: boolean;
  readonly failures: readonly string[];
  readonly snapshot: string;
}

export interface ScenarioRunResult {
  readonly total: number;
  readonly passed: number;
  readonly failed: number;
  readonly cases: readonly ScenarioCaseResult[];
}

export interface ScenarioRunOptions {
  readonly gatewayUrl: string;
  readonly cases: readonly ScenarioCase[];
  readonly fetchImpl?: typeof fetch;
}

export interface MockGatewayOptions {
  readonly policyIR: PolicyIR;
  readonly port?: number;
  readonly host?: string;
}

export interface MockGatewayHandle {
  readonly url: string;
  readonly port: number;
  close(): Promise<void>;
}

export interface RenderInput {
  readonly kind: 'compliance' | 'audit' | 'diff';
  readonly compliance?: ComplianceReport;
  readonly audit?: VerifyResult & { readonly chain?: readonly AuditEntry[] };
  readonly diff?: { readonly from: string; readonly to: string; readonly added: string[]; readonly removed: string[]; readonly modified: string[] };
}
