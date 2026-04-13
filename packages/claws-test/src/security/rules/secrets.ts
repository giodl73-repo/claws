/**
 * Secret detection rules (4 rules).
 *
 * Rule 5: no-api-keys — detect hardcoded API key patterns
 * Rule 6: no-tokens — detect hardcoded bearer/auth tokens
 * Rule 7: no-credentials — detect password/secret string literals
 * Rule 8: no-env-leaks — detect process.env values logged or returned
 *
 * @module @bic/claws-test/security/rules/secrets
 */

import ts from 'typescript';
import type { SecurityRule, SecurityFinding } from '../scanner.js';
import { getLineNumber, getCodeSnippet } from '../scanner.js';

/**
 * Rule 5: no-api-keys — detect hardcoded API key patterns.
 */
export const noApiKeys: SecurityRule = {
  id: 'no-api-keys',
  category: 'secrets',
  check(sourceFile: ts.SourceFile, filePath: string): readonly SecurityFinding[] {
    const findings: SecurityFinding[] = [];
    const apiKeyPatterns = [
      /^sk-[a-zA-Z0-9]{20,}/,   // OpenAI
      /^sk-proj-[a-zA-Z0-9]+/,   // OpenAI project keys
      /^AKIA[A-Z0-9]{16}/,       // AWS access key
      /^ghp_[a-zA-Z0-9]{36}/,    // GitHub PAT
      /^gho_[a-zA-Z0-9]{36}/,    // GitHub OAuth
      /^xoxb-[0-9]+-/,           // Slack bot token
    ];

    function visit(node: ts.Node): void {
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
        const text = node.text;
        if (apiKeyPatterns.some(p => p.test(text))) {
          findings.push({
            rule: 'no-api-keys',
            severity: 'high',
            file: filePath,
            line: getLineNumber(sourceFile, node),
            code: getCodeSnippet(sourceFile, node),
            remediation: 'Move API keys to environment variables or a secrets manager. Never hardcode credentials.',
          });
        }
      }
      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    return findings;
  },
};

/**
 * Rule 6: no-tokens — detect hardcoded bearer/auth tokens.
 */
export const noTokens: SecurityRule = {
  id: 'no-tokens',
  category: 'secrets',
  check(sourceFile: ts.SourceFile, filePath: string): readonly SecurityFinding[] {
    const findings: SecurityFinding[] = [];
    const tokenPatterns = [
      /^Bearer\s+[a-zA-Z0-9._\-]{20,}/,
      /^Basic\s+[a-zA-Z0-9+/=]{20,}/,
    ];

    function visit(node: ts.Node): void {
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
        const text = node.text;
        if (tokenPatterns.some(p => p.test(text))) {
          findings.push({
            rule: 'no-tokens',
            severity: 'high',
            file: filePath,
            line: getLineNumber(sourceFile, node),
            code: getCodeSnippet(sourceFile, node),
            remediation: 'Use environment variables for auth tokens. Never embed credentials in source code.',
          });
        }
      }
      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    return findings;
  },
};

/**
 * Rule 7: no-credentials — detect password/secret string literals assigned to variables.
 */
export const noCredentials: SecurityRule = {
  id: 'no-credentials',
  category: 'secrets',
  check(sourceFile: ts.SourceFile, filePath: string): readonly SecurityFinding[] {
    const findings: SecurityFinding[] = [];
    const sensitiveNames = /^(password|passwd|secret|apikey|api_key|token|auth_token|private_key)$/i;

    function visit(node: ts.Node): void {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
        if (sensitiveNames.test(node.name.text) && node.initializer) {
          if (ts.isStringLiteral(node.initializer) && node.initializer.text.length > 0) {
            findings.push({
              rule: 'no-credentials',
              severity: 'medium',
              file: filePath,
              line: getLineNumber(sourceFile, node),
              code: getCodeSnippet(sourceFile, node),
              remediation: 'Use process.env or a secrets manager instead of hardcoded credentials.',
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
 * Rule 8: no-env-leaks — detect process.env values logged or returned without redaction.
 */
export const noEnvLeaks: SecurityRule = {
  id: 'no-env-leaks',
  category: 'secrets',
  check(sourceFile: ts.SourceFile, filePath: string): readonly SecurityFinding[] {
    const findings: SecurityFinding[] = [];
    const logFunctions = new Set(['log', 'warn', 'error', 'info', 'debug']);

    function isProcessEnvAccess(node: ts.Node): boolean {
      if (!ts.isElementAccessExpression(node) && !ts.isPropertyAccessExpression(node)) {
        return false;
      }
      const expr = node.expression;
      if (
        ts.isPropertyAccessExpression(expr) &&
        ts.isIdentifier(expr.expression) &&
        expr.expression.text === 'process' &&
        ts.isIdentifier(expr.name) &&
        expr.name.text === 'env'
      ) {
        return true;
      }
      return false;
    }

    function visit(node: ts.Node): void {
      if (ts.isCallExpression(node)) {
        let funcName = '';
        if (ts.isPropertyAccessExpression(node.expression) && ts.isIdentifier(node.expression.name)) {
          funcName = node.expression.name.text;
        }

        if (logFunctions.has(funcName)) {
          for (const arg of node.arguments) {
            if (isProcessEnvAccess(arg)) {
              findings.push({
                rule: 'no-env-leaks',
                severity: 'medium',
                file: filePath,
                line: getLineNumber(sourceFile, node),
                code: getCodeSnippet(sourceFile, node),
                remediation: 'Redact environment variable values before logging. Use a redaction utility.',
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

export const secretsRules: readonly SecurityRule[] = [
  noApiKeys,
  noTokens,
  noCredentials,
  noEnvLeaks,
];
