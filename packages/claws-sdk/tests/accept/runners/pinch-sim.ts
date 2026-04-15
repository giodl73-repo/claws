/**
 * Pinch-sim runner — governance check simulation.
 *
 * Parse + analyze only (no emit): parse() → extractAllIntents() →
 * buildGovernanceAST() → extract() → analyze()
 *
 * Asserts: rules_applied, violations, pass, severity.
 *
 * @module claws-sdk/tests/accept/runners/pinch-sim
 */

import { parse } from '@bic/claws-sdk/compile/parse.js';
import { extractAllIntents } from '@bic/claws-sdk/compile/intent/index.js';
import { buildGovernanceAST } from '@bic/claws-sdk/compile/governance-ast.js';
import { extract } from '@bic/claws-sdk/compile/extract.js';
import { buildCapabilityManifest } from '@bic/claws-sdk/compile/manifest.js';
import { createRegistry } from '@bic/claws-sdk/governance/rule-registry.js';
import { analyze } from '@bic/claws-sdk/compile/analyze.js';
import type { ScenarioYaml } from '../utils/scenario-loader.js';
import type { RunnerResult } from '../utils/manifest-runner.js';
import { buildWorkspace } from '../utils/workspace-builder.js';
import { INFRASTRUCTURE_RULE_IDS } from '../utils/expect-ir.js';
import { registerAllRules } from '../utils/register-rules.js';

/**
 * Run pinch-sim: parse + analyze only, assert rule application results.
 */
export async function runPinchSim(
  scenarioDir: string,
  scenario: ScenarioYaml,
): Promise<RunnerResult> {
  const workspace = buildWorkspace(scenarioDir);
  if (!workspace) {
    return {
      passed: false,
      error: `No 00+workspace/ directory in ${scenarioDir}`,
      diagnostics: [`scenario: ${scenario.name}`, `dir: ${scenarioDir}`],
    };
  }

  try {
    // Parse
    const parseResult = await parse(workspace.workspacePath);
    if (parseResult.shouldHalt) {
      return {
        passed: false,
        error: 'Parse phase halted — no workspace files found',
      };
    }

    // Intent extraction + AST
    const intentResults = extractAllIntents(parseResult);
    const ast = buildGovernanceAST(intentResults);
    const parsedManifest = extract(ast);
    const capabilityManifest = buildCapabilityManifest(parsedManifest);

    // Rule evaluation
    const registry = createRegistry();
    registerAllRules(registry, parsedManifest);
    const ruleResults = registry.evaluate(capabilityManifest);
    const analysisResult = analyze(capabilityManifest, registry);

    const exp = scenario.expect;

    // Assert rules_applied
    if (exp.rules_applied !== undefined) {
      const firedRules = ruleResults
        .filter(r => !r.passed || r.violations.length > 0)
        .map(r => r.ruleId);

      // rules_applied means these rules should have produced results
      // (the rule was evaluated — not necessarily violated)
      const allRuleIds = ruleResults.map(r => r.ruleId);
      for (const expectedRule of exp.rules_applied) {
        const found = allRuleIds.some(id =>
          id.startsWith(expectedRule) || id === expectedRule,
        );
        if (!found) {
          return {
            passed: false,
            error: `Expected rule "${expectedRule}" was not applied. Available: ${allRuleIds.join(', ')}`,
            diagnostics: [`scenario: ${scenario.name}`],
          };
        }
      }
    }

    // Filter out infrastructure violations that fire universally on fixtures
    const significantViolations = analysisResult.violations.filter(
      v => !INFRASTRUCTURE_RULE_IDS.has(v.ruleId),
    );

    // Assert violations
    if (exp.violations !== undefined) {
      const expViolations = exp.violations as unknown[];
      if (Array.isArray(expViolations) && expViolations.length === 0) {
        if (significantViolations.length > 0) {
          return {
            passed: false,
            error: `Expected zero significant violations, got ${significantViolations.length}: ${significantViolations.map(v => v.ruleId).join(', ')}`,
          };
        }
      } else {
        for (const expV of expViolations as Array<{ ruleId?: string; rule?: string }>) {
          const expectedId = expV.ruleId ?? expV.rule;
          if (expectedId) {
            const found = analysisResult.violations.some(v =>
              v.ruleId === expectedId || v.ruleId.startsWith(expectedId),
            );
            if (!found) {
              return {
                passed: false,
                error: `Expected violation "${expectedId}" not found in [${analysisResult.violations.map(v => v.ruleId).join(', ')}]`,
              };
            }
          }
        }
      }
    }

    // Assert pass/fail — when scenario expects failure (pass: false) and
    // explicitly tests specific rules, include those rule violations even
    // if they're in the infrastructure set
    if (exp.pass !== undefined && exp.pass !== null) {
      let passViolations = significantViolations;
      if (exp.pass === false) {
        const testedPrefixes = (exp.rules_applied as string[] | undefined) ?? [];
        if (testedPrefixes.length > 0) {
          passViolations = analysisResult.violations.filter(v =>
            testedPrefixes.some(p => v.ruleId.startsWith(p)) ||
            !INFRASTRUCTURE_RULE_IDS.has(v.ruleId),
          );
        }
      }
      const passed = passViolations.length === 0;
      if (passed !== exp.pass) {
        return {
          passed: false,
          error: `Expected pass=${exp.pass}, got pass=${passed} (${passViolations.length} significant violations: ${passViolations.map(v => v.ruleId).join(', ')})`,
        };
      }
    }

    // Assert severity — use significant violations only
    // The scenario specs use "error" which maps to high/critical in our system
    if (exp.severity !== undefined && exp.severity !== null) {
      const levels = significantViolations.length > 0
        ? significantViolations.map(v => v.level)
        : analysisResult.violations.map(v => v.level);
      const maxLevel = levels.length > 0 ? Math.max(...levels) : 0;
      const severityMap: Record<number, string> = {
        5: 'critical', 4: 'high', 3: 'medium', 2: 'low', 1: 'info',
      };
      const actualSeverity = severityMap[maxLevel] ?? 'none';

      // Scenario severity aliases: "error" → high/critical, "warning" → medium/low
      const severityAliases: Record<string, string[]> = {
        error: ['high', 'critical'],
        warning: ['medium', 'low'],
      };
      const expectedValues = severityAliases[exp.severity as string] ?? [exp.severity];
      if (!expectedValues.includes(actualSeverity)) {
        return {
          passed: false,
          error: `Expected severity="${exp.severity}", got severity="${actualSeverity}"`,
        };
      }
    }

    return { passed: true };
  } catch (e) {
    /* istanbul ignore next -- catch block is defensive; pipeline returns error objects, never throws */
    const errorMsg = e instanceof Error ? e.message : String(e);
    /* istanbul ignore next */
    const errorStack = e instanceof Error ? e.stack ?? '' : '';
    /* istanbul ignore next */
    return {
      passed: false,
      error: errorMsg,
      diagnostics: [
        `scenario: ${scenario.name}`,
        `specs: ${scenario.specs?.join(', ')}`,
        errorStack,
      ],
    };
  } finally {
    workspace.cleanup();
  }
}
