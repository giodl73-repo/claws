/**
 * Security-sim runner — parse + analyze with security focus.
 *
 * Asserts: attack_class, defense_layer, blocked, audit_event.
 *
 * @module claws-sdk/tests/accept/runners/security-sim
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
 * Map rule IDs to attack class categories for security assertion.
 * Exported for unit testing — not part of public API.
 */
export function ruleIdToAttackClass(ruleId: string): string {
  if (ruleId.startsWith('G-A2A')) return 'a2a';
  if (ruleId.startsWith('G-INPUT')) return 'injection';
  if (ruleId.startsWith('G-ELICIT')) return 'obo';
  if (ruleId.startsWith('G-SUPPLY')) return 'supply-chain';
  if (ruleId.startsWith('G-OUTPUT')) return 'output';
  if (ruleId.startsWith('G-BOUND')) return 'bounded-reasoning';
  if (ruleId.startsWith('G-DATA')) return 'data-exfil';
  if (ruleId.startsWith('G-CONTEXT')) return 'context-hijack';
  return 'general';
}

/**
 * Map rule IDs to defense layer names.
 * Exported for unit testing — not part of public API.
 */
export function ruleIdToDefenseLayer(ruleId: string): string {
  if (ruleId.startsWith('G-A2A')) return 'identity';
  if (ruleId.startsWith('G-INPUT')) return 'input-validation';
  if (ruleId.startsWith('G-ELICIT')) return 'elicitation-gate';
  if (ruleId.startsWith('G-SUPPLY')) return 'supply-chain-check';
  if (ruleId.startsWith('G-OUTPUT')) return 'output-guard';
  if (ruleId.startsWith('G-BOUND')) return 'reasoning-boundary';
  if (ruleId.startsWith('G-DATA')) return 'data-classification';
  if (ruleId.startsWith('G-CONTEXT')) return 'context-isolation';
  return 'general';
}

/**
 * Run security-sim: parse + analyze with security assertions.
 */
export async function runSecuritySim(
  scenarioDir: string,
  scenario: ScenarioYaml,
): Promise<RunnerResult> {
  const workspace = buildWorkspace(scenarioDir);
  if (!workspace) {
    return {
      passed: false,
      error: `No 00+workspace/ directory in ${scenarioDir}`,
    };
  }

  try {
    const parseResult = await parse(workspace.workspacePath);
    if (parseResult.shouldHalt) {
      return { passed: false, error: 'Parse phase halted' };
    }

    const intentResults = extractAllIntents(parseResult);
    const ast = buildGovernanceAST(intentResults);
    const parsedManifest = extract(ast);
    const capabilityManifest = buildCapabilityManifest(parsedManifest);

    const registry = createRegistry();
    registerAllRules(registry, parsedManifest);
    const ruleResults = registry.evaluate(capabilityManifest);
    const analysisResult = analyze(capabilityManifest, registry);

    const exp = scenario.expect;

    // Assert attack_class — at least one violation must match the expected class
    if (exp.attack_class !== undefined) {
      const detectedClasses = new Set(
        analysisResult.violations.map(v => ruleIdToAttackClass(v.ruleId)),
      );
      for (const result of ruleResults) {
        if (result.violations.length > 0) {
          detectedClasses.add(ruleIdToAttackClass(result.ruleId));
        }
      }

      if (!detectedClasses.has(exp.attack_class)) {
        // Only fail if the scenario expects blocking — clean workspaces
        // that pass security checks won't have violations
        if (exp.blocked === true) {
          return {
            passed: false,
            error: `Expected attack_class "${exp.attack_class}" not detected. Found: [${[...detectedClasses].join(', ')}]`,
            diagnostics: [
              `scenario: ${scenario.name}`,
              `violations: ${analysisResult.violations.map(v => v.ruleId).join(', ')}`,
            ],
          };
        }
      }
    }

    // Assert defense_layer — the expected layer must have activated
    if (exp.defense_layer !== undefined) {
      const activatedLayers = new Set(
        ruleResults
          .filter(r => r.violations.length > 0)
          .map(r => ruleIdToDefenseLayer(r.ruleId)),
      );

      if (exp.blocked === true && !activatedLayers.has(exp.defense_layer)) {
        return {
          passed: false,
          error: `Expected defense layer "${exp.defense_layer}" to activate. Active: [${[...activatedLayers].join(', ')}]`,
          diagnostics: [`scenario: ${scenario.name}`],
        };
      }
    }

    // Assert blocked — use significant violations only (filter infrastructure)
    if (exp.blocked !== undefined) {
      const significantViolations = analysisResult.violations.filter(
        v => !INFRASTRUCTURE_RULE_IDS.has(v.ruleId),
      );
      const hasSignificantViolations = significantViolations.length > 0;
      if (exp.blocked && !hasSignificantViolations) {
        return {
          passed: false,
          error: `Expected blocked=true (attack should be stopped), but no significant violations detected`,
          diagnostics: [
            `scenario: ${scenario.name}`,
            `attack_class: ${exp.attack_class}`,
          ],
        };
      }
      if (!exp.blocked && hasSignificantViolations) {
        return {
          passed: false,
          error: `Expected blocked=false, but ${significantViolations.length} significant violations detected`,
        };
      }
    }

    // Assert audit_event — at least one audit-worthy record must exist
    if (exp.audit_event !== undefined) {
      // Build audit records from violations + warnings.
      // Note: analyze() currently returns warnings:[] always, but the
      // warning path is kept for forward-compat when rules emit warnings.
      const auditRecords: Array<{ type: 'violation' | 'warning'; ruleId: string; level: number }> = [];
      for (const v of analysisResult.violations) {
        auditRecords.push({ type: 'violation', ruleId: v.ruleId, level: v.level });
      }
      for (const w of analysisResult.warnings) {
        auditRecords.push({ type: 'warning', ruleId: w.ruleId, level: w.level });
      }

      /* istanbul ignore next -- infrastructure rules always fire on parsed workspaces,
         so auditRecords is never empty; this guard handles future rule-less configs */
      if (auditRecords.length === 0) {
        return {
          passed: false,
          error: `Expected audit_event but no violations or warnings were produced`,
          diagnostics: [`scenario: ${scenario.name}`],
        };
      }
    }

    return { passed: true };
  } catch (e) {
    /* istanbul ignore next -- pipeline always throws Error instances; String(e) is defensive */
    const errorMsg = e instanceof Error ? e.message : String(e);
    /* istanbul ignore next -- pipeline always throws Error instances; stack fallback is defensive */
    const errorStack = e instanceof Error ? e.stack ?? '' : '';
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
