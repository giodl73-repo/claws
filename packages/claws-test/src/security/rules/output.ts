/**
 * Output validation rules (4 rules).
 *
 * Rule 13: no-unredacted-pii — detect PII patterns in return/output
 * Rule 14: no-unvalidated-urls — detect URLs returned without validation
 * Rule 15: no-format-injection — detect user input interpolated into structured formats
 * Rule 16: no-chain-bypass — detect tool chain validation skipped
 *
 * @module @bic/claws-test/security/rules/output
 */

import ts from 'typescript';
import type { SecurityRule, SecurityFinding } from '../scanner.js';
import { getLineNumber, getCodeSnippet } from '../scanner.js';

/**
 * Rule 13: no-unredacted-pii — detect PII patterns (email, phone, SSN)
 * in string literals within return statements.
 */
export const noUnredactedPii: SecurityRule = {
  id: 'no-unredacted-pii',
  category: 'output',
  check(sourceFile: ts.SourceFile, filePath: string): readonly SecurityFinding[] {
    const findings: SecurityFinding[] = [];
    const piiPatterns = [
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,  // email
      /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/,                      // phone
      /\b\d{3}-\d{2}-\d{4}\b/,                               // SSN
    ];

    function visit(node: ts.Node): void {
      if (ts.isReturnStatement(node) && node.expression) {
        checkExpression(node.expression, node);
      }
      ts.forEachChild(node, visit);
    }

    function checkExpression(expr: ts.Expression, contextNode: ts.Node): void {
      if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) {
        if (piiPatterns.some(p => p.test(expr.text))) {
          findings.push({
            rule: 'no-unredacted-pii',
            severity: 'high',
            file: filePath,
            line: getLineNumber(sourceFile, contextNode),
            code: getCodeSnippet(sourceFile, contextNode),
            remediation: 'Redact PII (emails, phone numbers, SSNs) before returning in output.',
          });
        }
      }
      if (ts.isTemplateExpression(expr)) {
        for (const span of expr.templateSpans) {
          if (ts.isStringLiteral(span.literal) || ts.isNoSubstitutionTemplateLiteral(span.literal)) {
            if (piiPatterns.some(p => p.test(span.literal.text))) {
              findings.push({
                rule: 'no-unredacted-pii',
                severity: 'high',
                file: filePath,
                line: getLineNumber(sourceFile, contextNode),
                code: getCodeSnippet(sourceFile, contextNode),
                remediation: 'Redact PII before including in template literal output.',
              });
            }
          }
        }
      }
    }

    visit(sourceFile);
    return findings;
  },
};

/**
 * Rule 14: no-unvalidated-urls — detect URLs returned without validation.
 * Looks for return statements containing URL strings without URL() validation.
 */
export const noUnvalidatedUrls: SecurityRule = {
  id: 'no-unvalidated-urls',
  category: 'output',
  check(sourceFile: ts.SourceFile, filePath: string): readonly SecurityFinding[] {
    const findings: SecurityFinding[] = [];

    function visit(node: ts.Node): void {
      if (ts.isReturnStatement(node) && node.expression) {
        if (ts.isTemplateExpression(node.expression)) {
          const head = node.expression.head.text;
          if (/^https?:\/\//.test(head) && node.expression.templateSpans.length > 0) {
            findings.push({
              rule: 'no-unvalidated-urls',
              severity: 'medium',
              file: filePath,
              line: getLineNumber(sourceFile, node),
              code: getCodeSnippet(sourceFile, node),
              remediation: 'Validate returned URLs using new URL() constructor and check against allowed domains.',
            });
          }
        }
      }
      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    return findings;
  },
};

/**
 * Rule 15: no-format-injection — detect user input interpolated into
 * JSON.stringify, XML builders, or structured output format calls.
 */
export const noFormatInjection: SecurityRule = {
  id: 'no-format-injection',
  category: 'output',
  check(sourceFile: ts.SourceFile, filePath: string): readonly SecurityFinding[] {
    const findings: SecurityFinding[] = [];
    const formatFunctions = new Set(['stringify', 'toXML', 'toJSON', 'serialize']);
    const inputNames = new Set(['userInput', 'rawInput', 'untrustedInput', 'unsanitizedInput']);

    function visit(node: ts.Node): void {
      if (ts.isCallExpression(node)) {
        let funcName = '';
        if (ts.isPropertyAccessExpression(node.expression) && ts.isIdentifier(node.expression.name)) {
          funcName = node.expression.name.text;
        }

        if (formatFunctions.has(funcName)) {
          for (const arg of node.arguments) {
            if (ts.isIdentifier(arg) && inputNames.has(arg.text)) {
              findings.push({
                rule: 'no-format-injection',
                severity: 'medium',
                file: filePath,
                line: getLineNumber(sourceFile, node),
                code: getCodeSnippet(sourceFile, node),
                remediation: 'Sanitize user input before including in structured output formats (JSON, XML).',
              });
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    return findings;
  },
};

/**
 * Rule 16: no-chain-bypass — detect tool chain validation being skipped.
 * Looks for patterns like `skipValidation = true` or `validate: false` in tool configs.
 */
export const noChainBypass: SecurityRule = {
  id: 'no-chain-bypass',
  category: 'output',
  check(sourceFile: ts.SourceFile, filePath: string): readonly SecurityFinding[] {
    const findings: SecurityFinding[] = [];
    const bypassNames = new Set(['skipValidation', 'bypassChain', 'noValidate', 'skipChain', 'disableValidation']);

    function visit(node: ts.Node): void {
      // Check variable declarations: const skipValidation = true
      if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        bypassNames.has(node.name.text) &&
        node.initializer &&
        node.initializer.kind === ts.SyntaxKind.TrueKeyword
      ) {
        findings.push({
          rule: 'no-chain-bypass',
          severity: 'high',
          file: filePath,
          line: getLineNumber(sourceFile, node),
          code: getCodeSnippet(sourceFile, node),
          remediation: 'Never skip tool chain validation. Remove the bypass flag and ensure all validation steps run.',
        });
      }

      // Check property assignments: { validate: false }
      if (
        ts.isPropertyAssignment(node) &&
        ts.isIdentifier(node.name) &&
        (node.name.text === 'validate' || node.name.text === 'skipValidation') &&
        node.initializer.kind === ts.SyntaxKind.FalseKeyword
      ) {
        // validate: false means validation is disabled
        if (node.name.text === 'validate') {
          findings.push({
            rule: 'no-chain-bypass',
            severity: 'high',
            file: filePath,
            line: getLineNumber(sourceFile, node),
            code: getCodeSnippet(sourceFile, node),
            remediation: 'Do not disable validation. Set validate to true or remove the override.',
          });
        }
      }

      // Check property assignments: { skipValidation: true }
      if (
        ts.isPropertyAssignment(node) &&
        ts.isIdentifier(node.name) &&
        bypassNames.has(node.name.text) &&
        node.initializer.kind === ts.SyntaxKind.TrueKeyword
      ) {
        findings.push({
          rule: 'no-chain-bypass',
          severity: 'high',
          file: filePath,
          line: getLineNumber(sourceFile, node),
          code: getCodeSnippet(sourceFile, node),
          remediation: 'Never skip tool chain validation. Remove the bypass flag.',
        });
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    return findings;
  },
};

export const outputRules: readonly SecurityRule[] = [
  noUnredactedPii,
  noUnvalidatedUrls,
  noFormatInjection,
  noChainBypass,
];
