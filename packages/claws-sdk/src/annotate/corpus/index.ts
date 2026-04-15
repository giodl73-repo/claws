/**
 * 20-skill test corpus for annotation accuracy validation.
 *
 * Each skill has known-correct governance metadata (risk level, OBO,
 * data classification) across all five risk levels:
 *   5 R1 (read-only), 5 R2 (write), 4 R3 (create), 3 R4 (delete/modify), 3 R5 (transact/impersonate)
 *
 * Skills include name, description, and synthetic source content that
 * exercises the heuristic pattern families (tool name, import, API signature).
 *
 * @module claws-sdk/annotate/corpus
 */

import type { ToolRiskClass } from '../../compile/types.js';
import type { DataClassification } from '../heuristics.js';

/**
 * A corpus skill entry with known-correct governance metadata.
 */
export interface CorpusSkill {
  /** Skill name. */
  readonly name: string;
  /** Skill description. */
  readonly description: string;
  /** Synthetic source content (triggers import/API patterns). */
  readonly sourceContent: string;
  /** Expected risk class. */
  readonly expectedRisk: ToolRiskClass;
  /** Whether OBO is expected. */
  readonly expectedObo: boolean;
  /** Expected data classification. */
  readonly expectedDataClassification: DataClassification;
}

// ── R1 Skills (read-only, computation) ────────────────────────────────

const R1_SKILLS: readonly CorpusSkill[] = [
  {
    name: 'search-docs',
    description: 'Search public documentation for answers',
    sourceContent: `
      const results = searchIndex.query(terms);
      return results.map(r => r.snippet);
    `,
    expectedRisk: 1,
    expectedObo: false,
    expectedDataClassification: 'public',
  },
  {
    name: 'list-files',
    description: 'List files in a directory',
    sourceContent: `
      const entries = fs.readdir(dir);
      return entries.filter(e => !e.startsWith('.'));
    `,
    expectedRisk: 1,
    expectedObo: false,
    expectedDataClassification: 'public',
  },
  {
    name: 'read-config',
    description: 'Read configuration settings',
    sourceContent: `
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      return config;
    `,
    expectedRisk: 1,
    expectedObo: false,
    expectedDataClassification: 'public',
  },
  {
    name: 'summarize-text',
    description: 'Summarize a text document',
    sourceContent: `
      const sentences = text.split('. ');
      return sentences.slice(0, 3).join('. ');
    `,
    expectedRisk: 1,
    expectedObo: false,
    expectedDataClassification: 'public',
  },
  {
    name: 'lookup-definition',
    description: 'Look up a term in the glossary',
    sourceContent: `
      const entry = glossary.get(term);
      return entry?.definition ?? 'Not found';
    `,
    expectedRisk: 1,
    expectedObo: false,
    expectedDataClassification: 'public',
  },
];

// ── R2 Skills (read with network) ─────────────────────────────────────

const R2_SKILLS: readonly CorpusSkill[] = [
  {
    name: 'fetch-weather',
    description: 'Fetch current weather data from API',
    sourceContent: `
      const response = await fetch('https://api.weather.com/current');
      return response.json();
    `,
    expectedRisk: 2,
    expectedObo: false,
    expectedDataClassification: 'public',
  },
  {
    name: 'download-report',
    description: 'Download a report from the server',
    sourceContent: `
      const data = await http.get(reportUrl);
      return data.body;
    `,
    expectedRisk: 2,
    expectedObo: false,
    expectedDataClassification: 'public',
  },
  {
    name: 'http-health-check',
    description: 'Check HTTP endpoint health status',
    sourceContent: `
      const resp = await https.get(endpoint);
      return { status: resp.statusCode };
    `,
    expectedRisk: 2,
    expectedObo: false,
    expectedDataClassification: 'public',
  },
  {
    name: 'fetch-stock-price',
    description: 'Fetch real-time stock price from financial API',
    sourceContent: `
      const price = await fetchData('https://api.stocks.com/price');
      return price.current;
    `,
    expectedRisk: 2,
    expectedObo: false,
    expectedDataClassification: 'public',
  },
  {
    name: 'query-database-readonly',
    description: 'Query database in read-only mode with fetch',
    sourceContent: `
      const rows = await fetch(dbUrl + '/query?readonly=true');
      return rows.json();
    `,
    expectedRisk: 2,
    expectedObo: false,
    expectedDataClassification: 'public',
  },
];

// ── R3 Skills (create, file writes, external API) ─────────────────────

const R3_SKILLS: readonly CorpusSkill[] = [
  {
    name: 'write-log-entry',
    description: 'Write a structured log entry to file',
    sourceContent: `
      const entry = formatLog(event);
      await fs.writeFile(logPath, entry, 'utf-8');
    `,
    expectedRisk: 3,
    expectedObo: false,
    expectedDataClassification: 'public',
  },
  {
    name: 'create-draft-doc',
    description: 'Create a draft document from template',
    sourceContent: `
      const doc = template.render(data);
      await writeFile(outputPath, doc);
    `,
    expectedRisk: 3,
    expectedObo: false,
    expectedDataClassification: 'internal',
  },
  {
    name: 'update-settings',
    description: 'Update application settings file',
    sourceContent: `
      const settings = JSON.parse(await fs.readFile(settingsPath, 'utf-8'));
      settings[key] = value;
      await fs.writeFile(settingsPath, JSON.stringify(settings));
    `,
    expectedRisk: 3,
    expectedObo: false,
    expectedDataClassification: 'public',
  },
  {
    name: 'api-call-register',
    description: 'Register a new resource via API call',
    sourceContent: `
      const result = await executeQuery('INSERT INTO resources VALUES ($1)', [data]);
      return result.rows[0];
    `,
    expectedRisk: 3,
    expectedObo: false,
    expectedDataClassification: 'public',
  },
];

// ── R4 Skills (delete/modify, external side effects) ──────────────────

const R4_SKILLS: readonly CorpusSkill[] = [
  {
    name: 'send-email-notification',
    description: 'Send email notification to user',
    sourceContent: `
      const msg = formatEmail(template, data);
      await sendEmail(recipient, msg);
    `,
    expectedRisk: 4,
    expectedObo: false,
    expectedDataClassification: 'public',
  },
  {
    name: 'delete-record',
    description: 'Delete a record from the database',
    sourceContent: `
      await deleteRecord(id);
      await auditLog.write({ action: 'delete', id });
    `,
    expectedRisk: 4,
    expectedObo: false,
    expectedDataClassification: 'public',
  },
  {
    name: 'publish-content',
    description: 'Publish content to public website',
    sourceContent: `
      await cms.publish(article);
      await fs.unlink(draftPath);
    `,
    expectedRisk: 4,
    expectedObo: false,
    expectedDataClassification: 'public',
  },
];

// ── R5 Skills (transact/impersonate) ──────────────────────────────────

const R5_SKILLS: readonly CorpusSkill[] = [
  {
    name: 'purchase-item',
    description: 'Purchase an item from the marketplace on behalf of the user',
    sourceContent: `
      const order = await marketplace.purchase(item, payment);
      await auditLog.write({ action: 'purchase', order });
    `,
    expectedRisk: 5,
    expectedObo: true,
    expectedDataClassification: 'public',
  },
  {
    name: 'deploy-production',
    description: 'Deploy application to production environment',
    sourceContent: `
      import { exec } from 'child_process';
      exec('deploy.sh --env production');
    `,
    expectedRisk: 5,
    expectedObo: false,
    expectedDataClassification: 'public',
  },
  {
    name: 'shell-exec-command',
    description: 'Execute arbitrary shell command impersonating service account',
    sourceContent: `
      import { spawn } from 'child_process';
      const proc = spawn(cmd, args);
    `,
    expectedRisk: 5,
    expectedObo: true,
    expectedDataClassification: 'public',
  },
];

/**
 * The full 20-skill test corpus: 5 R1, 5 R2, 4 R3, 3 R4, 3 R5.
 */
export const TEST_CORPUS: readonly CorpusSkill[] = [
  ...R1_SKILLS,
  ...R2_SKILLS,
  ...R3_SKILLS,
  ...R4_SKILLS,
  ...R5_SKILLS,
];

/**
 * Get corpus skills filtered by risk level.
 */
export function getCorpusByRisk(riskClass: ToolRiskClass): readonly CorpusSkill[] {
  return TEST_CORPUS.filter(s => s.expectedRisk === riskClass);
}

/**
 * Verify corpus has the expected distribution.
 */
export function validateCorpusDistribution(): {
  valid: boolean;
  counts: Record<ToolRiskClass, number>;
  expected: Record<ToolRiskClass, number>;
} {
  const expected: Record<ToolRiskClass, number> = { 1: 5, 2: 5, 3: 4, 4: 3, 5: 3 };
  const counts: Record<ToolRiskClass, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  for (const skill of TEST_CORPUS) {
    counts[skill.expectedRisk]++;
  }

  const valid = (Object.keys(expected) as unknown as ToolRiskClass[]).every(
    k => counts[k] === expected[k],
  );

  return { valid, counts, expected };
}
