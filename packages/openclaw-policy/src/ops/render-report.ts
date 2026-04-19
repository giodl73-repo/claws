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

export function renderReport(input: RenderInput, format: RenderFormat): string {
  if (format === 'json') {
    return JSON.stringify(input, null, 2);
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
