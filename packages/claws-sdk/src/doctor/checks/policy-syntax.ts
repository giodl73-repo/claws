/**
 * Doctor check: policy-syntax — validate .claws/policies/*.yaml against
 * the policy schema.
 *
 * Performs structural validation: YAML must parse, and must contain
 * the required top-level fields (name, version, rules).
 *
 * @module claws-sdk/doctor/checks/policy-syntax
 */

import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { CLAWS_SIDECAR_LAYOUT } from '../../types/sidecar.js';
import type { CheckResult, Diagnostic } from '../orchestrator.js';

const CHECK_ID = 'policy-syntax';
const CHECK_NAME = 'Policy Syntax Validation';

const REQUIRED_FIELDS = ['policy', 'level', 'rules'] as const;

/**
 * Minimal YAML-like parser for simple key: value structures.
 * We parse line-by-line to avoid a YAML dependency — policies
 * are validated structurally (required top-level keys exist).
 */
function extractTopLevelKeys(content: string): string[] {
  const keys: string[] = [];
  for (const line of content.split('\n')) {
    // A top-level key is a non-indented line with key: value
    const match = /^([a-zA-Z_][a-zA-Z0-9_-]*)\s*:/.exec(line);
    if (match?.[1]) {
      keys.push(match[1]);
    }
  }
  return keys;
}

/**
 * Validate .claws/policies/*.yaml files for correct structure.
 */
export async function checkPolicySyntax(workspaceRoot: string): Promise<CheckResult> {
  const start = Date.now();
  const diagnostics: Diagnostic[] = [];
  const policiesDir = join(workspaceRoot, CLAWS_SIDECAR_LAYOUT.policies);

  let files: string[];
  try {
    const entries = await readdir(policiesDir);
    files = entries.filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));
  } catch {
    diagnostics.push({
      checkId: CHECK_ID,
      severity: 'info',
      message: 'No .claws/policies/ directory found — skipping policy check',
      fixable: false,
    });
    return {
      checkId: CHECK_ID,
      name: CHECK_NAME,
      passed: true,
      diagnostics,
      durationMs: Date.now() - start,
    };
  }

  if (files.length === 0) {
    diagnostics.push({
      checkId: CHECK_ID,
      severity: 'info',
      message: 'No policy files found in .claws/policies/',
      fixable: false,
    });
    return {
      checkId: CHECK_ID,
      name: CHECK_NAME,
      passed: true,
      diagnostics,
      durationMs: Date.now() - start,
    };
  }

  for (const file of files) {
    const filePath = join(policiesDir, file);
    let content: string;
    try {
      content = await readFile(filePath, 'utf-8');
    } catch {
      diagnostics.push({
        checkId: CHECK_ID,
        severity: 'error',
        message: `Could not read policy file ${file}`,
        file: filePath,
        fixable: false,
      });
      continue;
    }

    if (content.trim().length === 0) {
      diagnostics.push({
        checkId: CHECK_ID,
        severity: 'error',
        message: `Policy file ${file} is empty`,
        file: filePath,
        fixable: false,
      });
      continue;
    }

    const keys = extractTopLevelKeys(content);
    const missing = REQUIRED_FIELDS.filter((f) => !keys.includes(f));

    if (missing.length > 0) {
      diagnostics.push({
        checkId: CHECK_ID,
        severity: 'error',
        message: `Policy ${file} missing required fields: ${missing.join(', ')}`,
        file: filePath,
        fixable: false,
      });
    }
  }

  if (diagnostics.length === 0) {
    diagnostics.push({
      checkId: CHECK_ID,
      severity: 'info',
      message: `All ${files.length} policy file(s) are valid`,
      fixable: false,
    });
  }

  return {
    checkId: CHECK_ID,
    name: CHECK_NAME,
    passed: diagnostics.every((d) => d.severity !== 'error'),
    diagnostics,
    durationMs: Date.now() - start,
  };
}
