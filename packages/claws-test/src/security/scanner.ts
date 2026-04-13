/**
 * SecurityScanner — AST-based security analysis for skill handler files.
 *
 * Parses TypeScript source using ts.createSourceFile and walks the AST
 * to detect patterns indicating prompt injection risk, secret exposure,
 * or unsafe input/output handling.
 *
 * @module @bic/claws-test/security/scanner
 */

import ts from 'typescript';
import type { FindingSeverity } from '../types.js';

/**
 * A security finding from a single rule match.
 */
export interface SecurityFinding {
  /** Rule ID (e.g. 'no-eval'). */
  readonly rule: string;
  /** Severity of the finding. */
  readonly severity: FindingSeverity;
  /** Source file path. */
  readonly file: string;
  /** Line number (1-based). */
  readonly line: number;
  /** Matched code snippet. */
  readonly code: string;
  /** Actionable remediation suggestion. */
  readonly remediation: string;
}

/**
 * A security rule that inspects AST nodes.
 */
export interface SecurityRule {
  /** Rule ID. */
  readonly id: string;
  /** Rule category (injection, secrets, input, output). */
  readonly category: string;
  /** Run the rule against a source file AST. */
  check(sourceFile: ts.SourceFile, filePath: string): readonly SecurityFinding[];
}

/**
 * Scan result for a set of files.
 */
export interface ScanResult {
  readonly findings: readonly SecurityFinding[];
  readonly filesScanned: number;
  readonly rulesApplied: number;
}

/**
 * Get the 1-based line number of a node in a source file.
 */
export function getLineNumber(sourceFile: ts.SourceFile, node: ts.Node): number {
  const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return line + 1;
}

/**
 * Get a code snippet for a node, trimmed and truncated.
 */
export function getCodeSnippet(sourceFile: ts.SourceFile, node: ts.Node, maxLen = 80): string {
  const text = node.getText(sourceFile).trim();
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text;
}

/**
 * Scan TypeScript source code with a set of rules.
 *
 * @param sources - Array of { filePath, content } to scan
 * @param rules - Security rules to apply
 * @returns Aggregated scan result
 */
export function scan(
  sources: readonly { filePath: string; content: string }[],
  rules: readonly SecurityRule[],
): ScanResult {
  const allFindings: SecurityFinding[] = [];

  for (const source of sources) {
    const sourceFile = ts.createSourceFile(
      source.filePath,
      source.content,
      ts.ScriptTarget.ES2022,
      true,
      ts.ScriptKind.TS,
    );

    for (const rule of rules) {
      const findings = rule.check(sourceFile, source.filePath);
      allFindings.push(...findings);
    }
  }

  return {
    findings: allFindings,
    filesScanned: sources.length,
    rulesApplied: rules.length,
  };
}

/**
 * Get all 16 built-in security rules.
 */
export { getAllRules } from './rules/index.js';
