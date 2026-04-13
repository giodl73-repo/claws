/**
 * Injection defense rules (4 rules).
 *
 * Rule 1: no-eval — detect eval() calls
 * Rule 2: no-function-constructor — detect new Function()
 * Rule 3: no-template-literal-injection — detect template literals in dangerous contexts
 * Rule 4: no-dynamic-import — detect import() with variable arguments
 *
 * @module @bic/claws-test/security/rules/injection
 */

import ts from 'typescript';
import type { SecurityRule, SecurityFinding } from '../scanner.js';
import { getLineNumber, getCodeSnippet } from '../scanner.js';

/**
 * Rule 1: no-eval — detect eval() calls.
 */
export const noEval: SecurityRule = {
  id: 'no-eval',
  category: 'injection',
  check(sourceFile: ts.SourceFile, filePath: string): readonly SecurityFinding[] {
    const findings: SecurityFinding[] = [];

    function visit(node: ts.Node): void {
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === 'eval'
      ) {
        findings.push({
          rule: 'no-eval',
          severity: 'critical',
          file: filePath,
          line: getLineNumber(sourceFile, node),
          code: getCodeSnippet(sourceFile, node),
          remediation: 'Remove eval() call. Use structured data parsing (JSON.parse) or a sandboxed evaluator instead.',
        });
      }
      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    return findings;
  },
};

/**
 * Rule 2: no-function-constructor — detect new Function().
 */
export const noFunctionConstructor: SecurityRule = {
  id: 'no-function-constructor',
  category: 'injection',
  check(sourceFile: ts.SourceFile, filePath: string): readonly SecurityFinding[] {
    const findings: SecurityFinding[] = [];

    function visit(node: ts.Node): void {
      if (
        ts.isNewExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === 'Function'
      ) {
        findings.push({
          rule: 'no-function-constructor',
          severity: 'critical',
          file: filePath,
          line: getLineNumber(sourceFile, node),
          code: getCodeSnippet(sourceFile, node),
          remediation: 'Remove new Function() call. Use predefined functions or a safe template engine.',
        });
      }
      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    return findings;
  },
};

/**
 * Rule 3: no-template-literal-injection — detect template literals
 * with variable expressions used in dangerous function call contexts.
 */
export const noTemplateLiteralInjection: SecurityRule = {
  id: 'no-template-literal-injection',
  category: 'injection',
  check(sourceFile: ts.SourceFile, filePath: string): readonly SecurityFinding[] {
    const findings: SecurityFinding[] = [];
    const dangerousFunctions = new Set(['exec', 'query', 'execute', 'run', 'spawn', 'execSync']);

    function visit(node: ts.Node): void {
      if (
        ts.isCallExpression(node) &&
        node.arguments.length > 0
      ) {
        // Get the function name
        let funcName = '';
        if (ts.isIdentifier(node.expression)) {
          funcName = node.expression.text;
        } else if (ts.isPropertyAccessExpression(node.expression) && ts.isIdentifier(node.expression.name)) {
          funcName = node.expression.name.text;
        }

        if (dangerousFunctions.has(funcName)) {
          for (const arg of node.arguments) {
            if (ts.isTemplateExpression(arg) && arg.templateSpans.length > 0) {
              findings.push({
                rule: 'no-template-literal-injection',
                severity: 'high',
                file: filePath,
                line: getLineNumber(sourceFile, node),
                code: getCodeSnippet(sourceFile, node),
                remediation: 'Use parameterized queries or escape user input before interpolation into exec/query contexts.',
              });
              break;
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
 * Rule 4: no-dynamic-import — detect import() with variable arguments.
 */
export const noDynamicImport: SecurityRule = {
  id: 'no-dynamic-import',
  category: 'injection',
  check(sourceFile: ts.SourceFile, filePath: string): readonly SecurityFinding[] {
    const findings: SecurityFinding[] = [];

    function visit(node: ts.Node): void {
      if (
        ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword &&
        node.arguments.length > 0
      ) {
        const arg = node.arguments[0]!;
        // Flag only when the argument is not a string literal
        if (!ts.isStringLiteral(arg) && !ts.isNoSubstitutionTemplateLiteral(arg)) {
          findings.push({
            rule: 'no-dynamic-import',
            severity: 'high',
            file: filePath,
            line: getLineNumber(sourceFile, node),
            code: getCodeSnippet(sourceFile, node),
            remediation: 'Use static import paths. If dynamic import is needed, validate the path against an allowlist.',
          });
        }
      }
      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    return findings;
  },
};

export const injectionRules: readonly SecurityRule[] = [
  noEval,
  noFunctionConstructor,
  noTemplateLiteralInjection,
  noDynamicImport,
];
