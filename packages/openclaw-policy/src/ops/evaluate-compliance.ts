/**
 * evaluateCompliance — run a PolicyIR (and optional audit window) against a
 * rubric and produce a signed ComplianceReport.
 *
 * Three check kinds:
 *  - `static`     — predicate over PolicyIR alone
 *  - `structural` — predicate over PolicyIR + audit manifest shape
 *  - `dynamic`    — predicate over live audit events (window required)
 *
 * Predicates are a small DSL resolved by name. Built-in predicates are
 * enumerated below; unknown predicates resolve to `not_applicable` (never a
 * silent `pass`).
 *
 * @module @bic/openclaw-policy/ops/evaluate-compliance
 */

import { createHmac } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { formatOcPath } from '@bic/openclaw-workspace/path';

import type { PolicyIR, ToolSpec } from '../types/index.js';
import type {
  ComplianceEvaluationInput,
  ComplianceReport,
  ComplianceRequirementResult,
  EvaluateComplianceOptions,
  RubricRequirement,
  RubricStatus,
} from './types.js';

interface EvalOutcome {
  readonly status: RubricStatus;
  readonly evidence: ComplianceRequirementResult['evidence'];
  readonly gaps?: readonly string[];
}

type StaticPredicate = (ir: PolicyIR) => EvalOutcome;
type StructuralPredicate = (input: ComplianceEvaluationInput) => EvalOutcome;
type DynamicPredicate = (input: ComplianceEvaluationInput) => EvalOutcome;

function hasIrreversible(tool: ToolSpec): boolean {
  return tool.capabilities.includes('IRREVERSIBLE_EXTERNAL');
}

const STATIC_PREDICATES: Readonly<Record<string, StaticPredicate>> = {
  'every-r5-has-irreversible-external': (ir) => {
    const r5Tools = ir.tools.filter((t) => t.riskLevel === 5);
    const gaps = r5Tools.filter((t) => !hasIrreversible(t)).map((t) => `${t.name} missing IRREVERSIBLE_EXTERNAL`);
    if (r5Tools.length === 0) {
      return { status: 'not_applicable', evidence: [], gaps: ['no R5 tools declared'] };
    }
    return gaps.length === 0
      ? {
          status: 'pass',
          evidence: r5Tools.map((t) => ({
            type: 'oc_uri' as const,
            ref: formatOcPath({ file: 'policy', section: 'tool', item: t.name }),
          })),
        }
      : { status: 'fail', evidence: [], gaps };
  },

  'has-deny-rules': (ir) => {
    const count = ir.soul.denyRules.length;
    if (count === 0) {
      return { status: 'fail', evidence: [], gaps: ['no deny rules declared in SOUL'] };
    }
    return {
      status: 'pass',
      evidence: ir.soul.denyRules.map((d) => ({
        type: 'oc_uri' as const,
        ref: formatOcPath({ file: 'policy', section: 'soul', item: 'deny', field: d.id }),
      })),
    };
  },

  'model-allowlist-nonempty': (ir) => {
    if (ir.soul.modelAllowlist.length === 0) {
      return { status: 'fail', evidence: [], gaps: ['model allowlist is empty'] };
    }
    return {
      status: 'pass',
      evidence: [{
        type: 'oc_uri',
        ref: formatOcPath({ file: 'policy', section: 'soul', item: 'modelAllowlist' }),
      }],
    };
  },

  'has-governance-rules': (ir) => {
    const rules = ir.governance.rules;
    if (rules.length === 0) {
      return { status: 'fail', evidence: [], gaps: ['no governance rules declared'] };
    }
    return {
      status: 'pass',
      evidence: rules.map((r) => ({
        type: 'oc_uri' as const,
        ref: formatOcPath({ file: 'policy', section: 'governance', item: 'rule', field: r.id }),
      })),
    };
  },

  'authority-bounds-declared': (ir) => {
    if (ir.user.authorityBounds.length === 0) {
      return { status: 'partial', evidence: [], gaps: ['no USER authorityBounds declared'] };
    }
    return {
      status: 'pass',
      evidence: [{
        type: 'oc_uri',
        ref: formatOcPath({ file: 'policy', section: 'user', item: 'authorityBounds' }),
      }],
    };
  },
};

const STRUCTURAL_PREDICATES: Readonly<Record<string, StructuralPredicate>> = {
  'audit-retention-1-year': (input) => {
    const manifest = input.auditManifest;
    if (manifest === undefined) {
      return { status: 'not_applicable', evidence: [], gaps: ['no audit manifest supplied'] };
    }
    if (manifest.retentionDays >= 365) {
      return {
        status: 'pass',
        evidence: [{
          type: 'oc_uri',
          ref: formatOcPath({ file: 'audit', section: 'manifest', item: 'retention' }),
        }],
      };
    }
    return {
      status: 'fail',
      evidence: [],
      gaps: [`retention ${manifest.retentionDays}d < 365d`],
    };
  },

  'audit-tamper-seal-present': (input) => {
    const manifest = input.auditManifest;
    if (manifest === undefined) {
      return { status: 'not_applicable', evidence: [], gaps: ['no audit manifest supplied'] };
    }
    return manifest.hasTamperSeal
      ? {
          status: 'pass',
          evidence: [{
            type: 'oc_uri',
            ref: formatOcPath({ file: 'audit', section: 'manifest', item: 'tamperSeal' }),
          }],
        }
      : { status: 'fail', evidence: [], gaps: ['audit manifest has no tamper seal'] };
  },
};

const DYNAMIC_PREDICATES: Readonly<Record<string, DynamicPredicate>> = {
  'r5-decisions-had-external-approval': (input) => {
    const events = input.auditEvents;
    if (events === undefined || input.window === undefined) {
      return { status: 'not_applicable', evidence: [], gaps: ['no audit window supplied'] };
    }
    const r5Events = events.filter((e) => e.ruleId.startsWith('R5-'));
    if (r5Events.length === 0) {
      return { status: 'not_applicable', evidence: [], gaps: ['no R5 events in window'] };
    }
    const missing = r5Events.filter((e) => e.externalApproval !== true);
    if (missing.length === 0) {
      return {
        status: 'pass',
        evidence: r5Events.map((e) => ({ type: 'audit_correlation' as const, ref: `${e.timestamp}:${e.ruleId}` })),
      };
    }
    return {
      status: 'fail',
      evidence: [],
      gaps: [`${missing.length}/${r5Events.length} R5 events missing externalApproval`],
    };
  },

  'review-decisions-were-approved': (input) => {
    const events = input.auditEvents;
    if (events === undefined || events.length === 0) {
      return { status: 'not_applicable', evidence: [], gaps: ['no audit events in window'] };
    }
    const reviewEvents = events.filter((e) => e.decision === 'review');
    if (reviewEvents.length === 0) {
      return { status: 'not_applicable', evidence: [], gaps: ['no review decisions in window'] };
    }
    const notApproved = reviewEvents.filter((e) => e.requireApproval === true && e.outcome !== 'approved');
    if (notApproved.length === 0) {
      return {
        status: 'pass',
        evidence: [{ type: 'audit_correlation', ref: `review-window:${reviewEvents.length}` }],
      };
    }
    return {
      status: 'partial',
      evidence: [],
      gaps: [`${notApproved.length} review events still pending or denied`],
    };
  },
};

function evaluateRequirement(
  req: RubricRequirement,
  input: ComplianceEvaluationInput,
): ComplianceRequirementResult {
  let outcome: EvalOutcome;

  if (req.kind === 'static') {
    const pred = STATIC_PREDICATES[req.predicate];
    outcome = pred !== undefined
      ? pred(input.policyIR)
      : { status: 'not_applicable', evidence: [], gaps: [`unknown static predicate: ${req.predicate}`] };
  } else if (req.kind === 'structural') {
    const pred = STRUCTURAL_PREDICATES[req.predicate];
    outcome = pred !== undefined
      ? pred(input)
      : { status: 'not_applicable', evidence: [], gaps: [`unknown structural predicate: ${req.predicate}`] };
  } else {
    const pred = DYNAMIC_PREDICATES[req.predicate];
    outcome = pred !== undefined
      ? pred(input)
      : { status: 'not_applicable', evidence: [], gaps: [`unknown dynamic predicate: ${req.predicate}`] };
  }

  return outcome.gaps !== undefined
    ? {
        requirementId: req.id,
        title: req.title,
        status: outcome.status,
        evidence: outcome.evidence,
        gaps: outcome.gaps,
      }
    : {
        requirementId: req.id,
        title: req.title,
        status: outcome.status,
        evidence: outcome.evidence,
      };
}

function signReport(
  payload: Omit<ComplianceReport, 'signature'>,
  signingKey: string,
  keyId: string,
): ComplianceReport {
  const canonical = JSON.stringify(payload);
  const value = createHmac('sha256', signingKey).update(canonical).digest('hex');
  return {
    ...payload,
    signature: { algo: 'hmac-sha256', key_id: keyId, value },
  };
}

export interface LoadPolicyIRFromSnapshotOptions {
  readonly workspace: string;
  readonly snapshotId: string;
}

/**
 * Load a `PolicyIR` from a workspace snapshot directory.
 *
 * Accepts either:
 *  - a workspace root containing `.openclaw/policy/policy-ir.json` (when
 *    `snapshotId === 'current'`), or
 *  - `.openclaw/snapshots/<snapshotId>/policy-ir.json` for an archived
 *    snapshot.
 */
export async function loadPolicyIRFromSnapshot(
  options: LoadPolicyIRFromSnapshotOptions,
): Promise<PolicyIR> {
  const { workspace, snapshotId } = options;
  const candidate =
    snapshotId === 'current'
      ? join(workspace, '.openclaw', 'policy', 'policy-ir.json')
      : join(workspace, '.openclaw', 'snapshots', snapshotId, 'policy-ir.json');
  const raw = await readFile(candidate, 'utf8');
  return JSON.parse(raw) as PolicyIR;
}

export function evaluateCompliance(options: EvaluateComplianceOptions): ComplianceReport {
  const { rubric, input, signingKey, keyId } = options;
  const now = options.now ?? (() => new Date());

  const results = rubric.requirements.map((req) => evaluateRequirement(req, input));

  const summary = results.reduce(
    (acc, r) => {
      acc.total++;
      if (r.status === 'pass') acc.pass++;
      else if (r.status === 'fail') acc.fail++;
      else if (r.status === 'partial') acc.partial++;
      else acc.na++;
      return acc;
    },
    { total: 0, pass: 0, fail: 0, partial: 0, na: 0 },
  );

  const body: Omit<ComplianceReport, 'signature'> = {
    snapshotId: input.snapshotId,
    rubric: { id: rubric.id, version: rubric.version, framework: rubric.framework },
    generatedAt: now().toISOString(),
    ...(input.window !== undefined ? { evaluatedWindow: input.window } : {}),
    results,
    summary,
  };

  return signReport(body, signingKey, keyId);
}
