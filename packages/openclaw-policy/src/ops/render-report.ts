/**
 * renderReport — turn a ComplianceReport, VerifyAuditResult, or diff output
 * into markdown / html / json / pdf for downstream consumers.
 *
 * `pdf` returns a minimal PDF-1.4 document with the markdown body embedded
 * as a single text stream. It is a valid PDF (opens in Adobe/Chrome) but
 * makes no layout promises beyond "readable plain text"; a richer renderer
 * can be layered later without breaking the API.
 *
 * @module @bic/openclaw-policy/ops/render-report
 */

import type {
  ComplianceReport,
  RenderFormat,
  RenderInput,
  VerifyResult,
  AuditEntry,
} from './types.js';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderComplianceMarkdown(r: ComplianceReport): string {
  const lines: string[] = [
    `# Compliance Report — ${r.rubric.framework}`,
    '',
    `- **Snapshot**: \`${r.snapshotId}\``,
    `- **Rubric**: ${r.rubric.id} v${r.rubric.version}`,
    `- **Generated**: ${r.generatedAt}`,
  ];
  if (r.evaluatedWindow !== undefined) {
    lines.push(`- **Window**: ${r.evaluatedWindow.from} → ${r.evaluatedWindow.to}`);
  }
  lines.push(
    '',
    `**Summary** — ${r.summary.pass}/${r.summary.total} pass, ${r.summary.fail} fail, ${r.summary.partial} partial, ${r.summary.na} n/a`,
    '',
    '## Requirements',
    '',
  );
  for (const res of r.results) {
    lines.push(`### ${res.requirementId} — ${res.title}`);
    lines.push('');
    lines.push(`- Status: **${res.status}**`);
    if (res.evidence.length > 0) {
      lines.push('- Evidence:');
      for (const e of res.evidence) {
        lines.push(`  - \`${e.type}\` → ${e.ref}`);
      }
    }
    if (res.gaps !== undefined && res.gaps.length > 0) {
      lines.push('- Gaps:');
      for (const g of res.gaps) {
        lines.push(`  - ${g}`);
      }
    }
    lines.push('');
  }
  lines.push(`_Signature ${r.signature.algo} (${r.signature.key_id}): ${r.signature.value.slice(0, 16)}…_`);
  return lines.join('\n');
}

function renderComplianceHtml(r: ComplianceReport): string {
  const body = renderComplianceMarkdown(r)
    .split('\n')
    .map((line) => {
      if (line.startsWith('### ')) return `<h3>${esc(line.slice(4))}</h3>`;
      if (line.startsWith('## ')) return `<h2>${esc(line.slice(3))}</h2>`;
      if (line.startsWith('# ')) return `<h1>${esc(line.slice(2))}</h1>`;
      if (line.startsWith('- ') || line.startsWith('  - ')) return `<li>${esc(line.replace(/^\s*-\s*/, ''))}</li>`;
      if (line === '') return '';
      return `<p>${esc(line)}</p>`;
    })
    .join('\n');
  return `<!doctype html><html><head><meta charset="utf-8"><title>Compliance Report</title></head><body>${body}</body></html>`;
}

function renderAuditMarkdown(
  result: VerifyResult & { readonly chain?: readonly AuditEntry[] },
): string {
  const lines: string[] = [
    '# Audit Chain Verification',
    '',
    `- **Records**: ${result.length}`,
    `- **Status**: ${result.valid ? 'OK' : 'TAMPERED'}`,
  ];
  if (!result.valid && result.brokenAt !== undefined) {
    lines.push(`- **Broken at event**: ${result.brokenAt}`);
  }
  return lines.join('\n');
}

function renderDiffMarkdown(
  diff: { from: string; to: string; added: string[]; removed: string[]; modified: string[] },
): string {
  const lines: string[] = [
    '# Policy Diff',
    '',
    `- **From**: ${diff.from}`,
    `- **To**: ${diff.to}`,
    '',
    `**Added** (${diff.added.length}): ${diff.added.join(', ') || '_none_'}`,
    `**Removed** (${diff.removed.length}): ${diff.removed.join(', ') || '_none_'}`,
    `**Modified** (${diff.modified.length}): ${diff.modified.join(', ') || '_none_'}`,
  ];
  return lines.join('\n');
}

function wrapAsPdf(body: string): string {
  // Minimal PDF 1.4 with a single-stream text layer. Valid enough for readers
  // to open; no pagination / layout work is promised.
  const escaped = body
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
  const stream = `BT /F1 10 Tf 50 750 Td (${escaped.split('\n').join(') Tj T* (')}) Tj ET`;
  const objs: string[] = [
    '1 0 obj<</Type /Catalog /Pages 2 0 R>>endobj',
    '2 0 obj<</Type /Pages /Kids [3 0 R] /Count 1>>endobj',
    '3 0 obj<</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources <</Font <</F1 5 0 R>>>>>>endobj',
    `4 0 obj<</Length ${stream.length}>>stream\n${stream}\nendstream\nendobj`,
    '5 0 obj<</Type /Font /Subtype /Type1 /BaseFont /Helvetica>>endobj',
  ];
  const header = '%PDF-1.4\n';
  let offset = header.length;
  const xrefOffsets: number[] = [];
  const parts: string[] = [header];
  for (const obj of objs) {
    xrefOffsets.push(offset);
    parts.push(obj + '\n');
    offset += obj.length + 1;
  }
  const xrefStart = offset;
  const xref = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${xrefOffsets
    .map((o) => String(o).padStart(10, '0') + ' 00000 n \n')
    .join('')}`;
  const trailer = `trailer<</Size ${objs.length + 1} /Root 1 0 R>>\nstartxref\n${xrefStart}\n%%EOF`;
  parts.push(xref);
  parts.push(trailer);
  return parts.join('');
}

function renderMarkdown(input: RenderInput): string {
  if (input.kind === 'compliance' && input.compliance !== undefined) {
    return renderComplianceMarkdown(input.compliance);
  }
  if (input.kind === 'audit' && input.audit !== undefined) {
    return renderAuditMarkdown(input.audit);
  }
  if (input.kind === 'diff' && input.diff !== undefined) {
    return renderDiffMarkdown(input.diff);
  }
  throw new Error(`renderReport: missing payload for kind=${input.kind}`);
}

/**
 * SARIF 2.1.0 static analysis output — consumed by GitHub Code Scanning.
 * Each compliance `fail`/`partial` becomes a SARIF `result` with an
 * associated rule on the single tool driver. `pass` results are NOT
 * emitted; SARIF is intended for findings.
 *
 * Spec: https://docs.oasis-open.org/sarif/sarif/v2.1.0/
 */
function renderSarif(input: RenderInput): string {
  const sarif = {
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    version: '2.1.0',
    runs: [buildSarifRun(input)],
  };
  return JSON.stringify(sarif, null, 2);
}

interface SarifRule {
  readonly id: string;
  readonly name?: string;
  readonly shortDescription: { readonly text: string };
  readonly fullDescription?: { readonly text: string };
  readonly defaultConfiguration?: { readonly level: 'error' | 'warning' | 'note' };
}

interface SarifResult {
  readonly ruleId: string;
  readonly level: 'error' | 'warning' | 'note';
  readonly message: { readonly text: string };
  readonly locations?: ReadonlyArray<{
    readonly physicalLocation: {
      readonly artifactLocation: { readonly uri: string };
    };
  }>;
  readonly partialFingerprints?: Readonly<Record<string, string>>;
}

function buildSarifRun(input: RenderInput): {
  readonly tool: { readonly driver: Readonly<Record<string, unknown>> };
  readonly results: readonly SarifResult[];
} {
  const rules: SarifRule[] = [];
  const results: SarifResult[] = [];

  if (input.kind === 'compliance' && input.compliance !== undefined) {
    collectComplianceSarif(input.compliance, rules, results);
  } else if (input.kind === 'audit' && input.audit !== undefined) {
    collectAuditSarif(input.audit, rules, results);
  } else if (input.kind === 'diff' && input.diff !== undefined) {
    collectDiffSarif(input.diff, rules, results);
  }

  return {
    tool: {
      driver: {
        name: 'openclaw-policy',
        version: '0.1.0',
        informationUri: 'https://microsoft.ghe.com/bic/claws',
        rules,
      },
    },
    results,
  };
}

function collectComplianceSarif(
  report: { readonly rubric: { readonly id: string; readonly framework: string }; readonly results: readonly {
    readonly requirementId: string;
    readonly title: string;
    readonly status: 'pass' | 'fail' | 'partial' | 'not_applicable';
    readonly gaps?: readonly string[];
  }[] },
  rules: SarifRule[],
  results: SarifResult[],
): void {
  const seen = new Set<string>();
  for (const r of report.results) {
    if (r.status !== 'fail' && r.status !== 'partial') continue;
    const ruleId = `${report.rubric.id}.${r.requirementId}`;
    if (!seen.has(ruleId)) {
      seen.add(ruleId);
      rules.push({
        id: ruleId,
        name: r.requirementId,
        shortDescription: { text: r.title },
        fullDescription: {
          text: `${report.rubric.framework} compliance requirement ${r.requirementId}`,
        },
        defaultConfiguration: { level: r.status === 'fail' ? 'error' : 'warning' },
      });
    }
    const gapText = r.gaps !== undefined && r.gaps.length > 0 ? r.gaps.join('; ') : r.title;
    results.push({
      ruleId,
      level: r.status === 'fail' ? 'error' : 'warning',
      message: { text: `${r.title}: ${gapText}` },
    });
  }
}

function collectAuditSarif(
  audit: { readonly valid: boolean; readonly length: number; readonly brokenAt?: string },
  rules: SarifRule[],
  results: SarifResult[],
): void {
  if (audit.valid) return;
  rules.push({
    id: 'openclaw-policy.audit-chain-broken',
    name: 'audit-chain-broken',
    shortDescription: { text: 'Audit chain integrity check failed' },
    defaultConfiguration: { level: 'error' },
  });
  results.push({
    ruleId: 'openclaw-policy.audit-chain-broken',
    level: 'error',
    message: {
      text: `Audit chain broken at ${audit.brokenAt ?? 'unknown'} (length=${audit.length})`,
    },
  });
}

function collectDiffSarif(
  diff: { readonly added: readonly string[]; readonly removed: readonly string[]; readonly modified: readonly string[] },
  rules: SarifRule[],
  results: SarifResult[],
): void {
  const hasFindings =
    diff.added.length > 0 || diff.removed.length > 0 || diff.modified.length > 0;
  if (!hasFindings) return;
  rules.push({
    id: 'openclaw-policy.snapshot-diff',
    name: 'snapshot-diff',
    shortDescription: { text: 'Policy snapshot diff detected' },
    defaultConfiguration: { level: 'note' },
  });
  for (const name of diff.added) {
    results.push({
      ruleId: 'openclaw-policy.snapshot-diff',
      level: 'note',
      message: { text: `Added tool: ${name}` },
    });
  }
  for (const name of diff.removed) {
    results.push({
      ruleId: 'openclaw-policy.snapshot-diff',
      level: 'warning',
      message: { text: `Removed tool: ${name}` },
    });
  }
  for (const name of diff.modified) {
    results.push({
      ruleId: 'openclaw-policy.snapshot-diff',
      level: 'note',
      message: { text: `Modified tool: ${name}` },
    });
  }
}

export function renderReport(input: RenderInput, format: RenderFormat): string {
  if (format === 'json') {
    return JSON.stringify(input, null, 2);
  }
  if (format === 'sarif') {
    return renderSarif(input);
  }
  if (format === 'html') {
    if (input.kind === 'compliance' && input.compliance !== undefined) {
      return renderComplianceHtml(input.compliance);
    }
    const md = renderMarkdown(input);
    return `<!doctype html><html><body><pre>${esc(md)}</pre></body></html>`;
  }
  const md = renderMarkdown(input);
  if (format === 'markdown') return md;
  return wrapAsPdf(md);
}
