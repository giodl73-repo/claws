/**
 * Input sanitization rules (4 rules).
 *
 * Rule 9: no-unvalidated-input — user input passed to tool calls without validation
 * Rule 10: no-missing-trust-labels — A2A messages without trust annotation
 * Rule 11: no-url-injection — URLs constructed from user input
 * Rule 12: no-unbounded-input — missing size/length limits
 *
 * @module @bic/claws-test/security/rules/input
 */

import ts from 'typescript';
import type { SecurityRule, SecurityFinding } from '../scanner.js';
import { getLineNumber, getCodeSnippet } from '../scanner.js';

/**
 * Rule 9: no-unvalidated-input — detect parameters named userInput/input
 * passed directly to known tool-call/exec patterns without validation.
 */
export const noUnvalidatedInput: SecurityRule = {
  id: 'no-unvalidated-input',
  category: 'input',
  check(sourceFile: ts.SourceFile, filePath: string): readonly SecurityFinding[] {
    const findings: SecurityFinding[] = [];
    const toolCallFunctions = new Set(['toolCall', 'invokeTool', 'callTool', 'execute', 'exec', 'run']);
    const inputNames = new Set(['userInput', 'rawInput', 'untrustedInput', 'unsanitizedInput']);

    function visit(node: ts.Node): void {
      if (ts.isCallExpression(node)) {
        let funcName = '';
        if (ts.isIdentifier(node.expression)) {
          funcName = node.expression.text;
        } else if (ts.isPropertyAccessExpression(node.expression) && ts.isIdentifier(node.expression.name)) {
          funcName = node.expression.name.text;
        }

        if (toolCallFunctions.has(funcName)) {
          for (const arg of node.arguments) {
            if (ts.isIdentifier(arg) && inputNames.has(arg.text)) {
              findings.push({
                rule: 'no-unvalidated-input',
                severity: 'high',
                file: filePath,
                line: getLineNumber(sourceFile, node),
                code: getCodeSnippet(sourceFile, node),
                remediation: 'Validate and sanitize user input before passing to tool calls. Use a Zod schema or similar.',
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
 * Rule 10: no-missing-trust-labels — detect sendMessage/delegate calls
 * without a trustLevel property in the argument.
 */
export const noMissingTrustLabels: SecurityRule = {
  id: 'no-missing-trust-labels',
  category: 'input',
  check(sourceFile: ts.SourceFile, filePath: string): readonly SecurityFinding[] {
    const findings: SecurityFinding[] = [];
    const messageFunctions = new Set(['sendMessage', 'delegateTo', 'sendToAgent']);

    function visit(node: ts.Node): void {
      if (ts.isCallExpression(node)) {
        let funcName = '';
        if (ts.isIdentifier(node.expression)) {
          funcName = node.expression.text;
        } else if (ts.isPropertyAccessExpression(node.expression) && ts.isIdentifier(node.expression.name)) {
          funcName = node.expression.name.text;
        }

        if (messageFunctions.has(funcName) && node.arguments.length > 0) {
          const lastArg = node.arguments[node.arguments.length - 1]!;
          let hasTrustLevel = false;
          if (ts.isObjectLiteralExpression(lastArg)) {
            hasTrustLevel = lastArg.properties.some(
              p => ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === 'trustLevel',
            );
          }
          if (!hasTrustLevel) {
            findings.push({
              rule: 'no-missing-trust-labels',
              severity: 'medium',
              file: filePath,
              line: getLineNumber(sourceFile, node),
              code: getCodeSnippet(sourceFile, node),
              remediation: 'Add a trustLevel property when sending messages to other agents.',
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
 * Rule 11: no-url-injection — detect URLs constructed with template literals
 * containing variable expressions in the protocol or host position.
 */
export const noUrlInjection: SecurityRule = {
  id: 'no-url-injection',
  category: 'input',
  check(sourceFile: ts.SourceFile, filePath: string): readonly SecurityFinding[] {
    const findings: SecurityFinding[] = [];

    function visit(node: ts.Node): void {
      if (ts.isTemplateExpression(node)) {
        const head = node.head.text;
        if (/^https?:\/\/$/.test(head) || head === 'http://' || head === 'https://') {
          findings.push({
            rule: 'no-url-injection',
            severity: 'high',
            file: filePath,
            line: getLineNumber(sourceFile, node),
            code: getCodeSnippet(sourceFile, node),
            remediation: 'Validate URLs against an allowlist of domains. Do not construct URLs from user input.',
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
 * Rule 12: no-unbounded-input — detect function parameters typed as string
 * without any length/size validation visible in the function body.
 */
export const noUnboundedInput: SecurityRule = {
  id: 'no-unbounded-input',
  category: 'input',
  check(sourceFile: ts.SourceFile, filePath: string): readonly SecurityFinding[] {
    const findings: SecurityFinding[] = [];

    function visit(node: ts.Node): void {
      if (
        ts.isFunctionDeclaration(node) &&
        node.name &&
        /handler|process|handle/i.test(node.name.text)
      ) {
        const hasStringParam = node.parameters.some(
          p => p.type && ts.isTypeReferenceNode(p.type) === false && p.type.getText(sourceFile) === 'string',
        );
        if (hasStringParam && node.body) {
          const bodyText = node.body.getText(sourceFile);
          const hasLengthCheck = /\.length\s*[<>=!]|\.slice\(|\.substring\(|maxLength|MAX_LENGTH/.test(bodyText);
          if (!hasLengthCheck) {
            findings.push({
              rule: 'no-unbounded-input',
              severity: 'medium',
              file: filePath,
              line: getLineNumber(sourceFile, node),
              code: getCodeSnippet(sourceFile, node),
              remediation: 'Add input length/size validation. Use .slice() or check .length before processing.',
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

export const inputRules: readonly SecurityRule[] = [
  noUnvalidatedInput,
  noMissingTrustLabels,
  noUrlInjection,
  noUnboundedInput,
];
