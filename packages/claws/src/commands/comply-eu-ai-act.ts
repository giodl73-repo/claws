/**
 * `claws comply eu-ai-act` command — produce EU AI Act assessment.
 *
 * Thin CLI adapter: reads governance config and analysis from disk,
 * builds EU AI Act assessment, renders results. No business logic lives here.
 *
 * @module claws-cli/commands/comply-eu-ai-act
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { CLAWS_SIDECAR_LAYOUT, CLAWS_CONFIG_FILE } from '@bic/claws-sdk/types';
import { buildEUAIActAssessment, type EUAIActConfig } from '@bic/claws-sdk/compliance';
import type { GovAnalysis } from '@bic/claws-sdk/ir';
import type { DomainMarker, EURiskTier } from '@bic/claws-sdk/compliance';

/**
 * Parsed EU AI Act fields from claws.json.
 */
interface EUConfigFromDisk {
  readonly declaredRiskTier: EURiskTier | undefined;
  readonly domainMarkers: DomainMarker[];
  readonly transparencyDeclared: boolean;
  readonly documentationDeclared: boolean;
  readonly explainabilityDeclared: boolean;
  readonly userNotificationDeclared: boolean;
  readonly humanOversightDeclared: boolean;
  readonly overrideMechanismDeclared: boolean;
  readonly fundamentalRightsAssessed: boolean;
  readonly impactedRights: string[];
  readonly mitigations: string[];
  readonly riskManagementDeclared: boolean;
  readonly dataGovernanceDeclared: boolean;
  readonly loggingEnabled: boolean;
  readonly accuracyRobustnessDeclared: boolean;
}

/**
 * Read claws.json config from disk and extract EU AI Act fields.
 */
async function readEUConfigFromDisk(workspaceRoot: string): Promise<EUConfigFromDisk> {
  const configPath = join(workspaceRoot, CLAWS_CONFIG_FILE);
  try {
    const content = await readFile(configPath, 'utf-8');
    const config = JSON.parse(content) as Record<string, unknown>;
    const euConfig = (config['euAiAct'] ?? config['eu_ai_act'] ?? {}) as Record<string, unknown>;

    return {
      declaredRiskTier: euConfig['riskTier'] as EURiskTier | undefined,
      domainMarkers: (euConfig['domainMarkers'] ?? []) as DomainMarker[],
      transparencyDeclared: euConfig['transparencyDeclared'] === true,
      documentationDeclared: euConfig['documentationDeclared'] === true,
      explainabilityDeclared: euConfig['explainabilityDeclared'] === true,
      userNotificationDeclared: euConfig['userNotificationDeclared'] === true,
      humanOversightDeclared: euConfig['humanOversightDeclared'] === true,
      overrideMechanismDeclared: euConfig['overrideMechanismDeclared'] === true,
      fundamentalRightsAssessed: euConfig['fundamentalRightsAssessed'] === true,
      impactedRights: (euConfig['impactedRights'] ?? []) as string[],
      mitigations: (euConfig['mitigations'] ?? []) as string[],
      riskManagementDeclared: euConfig['riskManagementDeclared'] === true,
      dataGovernanceDeclared: euConfig['dataGovernanceDeclared'] === true,
      loggingEnabled: euConfig['loggingEnabled'] === true,
      accuracyRobustnessDeclared: euConfig['accuracyRobustnessDeclared'] === true,
    };
  } catch {
    return {
      declaredRiskTier: undefined,
      domainMarkers: [],
      transparencyDeclared: false,
      documentationDeclared: false,
      explainabilityDeclared: false,
      userNotificationDeclared: false,
      humanOversightDeclared: false,
      overrideMechanismDeclared: false,
      fundamentalRightsAssessed: false,
      impactedRights: [],
      mitigations: [],
      riskManagementDeclared: false,
      dataGovernanceDeclared: false,
      loggingEnabled: false,
      accuracyRobustnessDeclared: false,
    };
  }
}

/**
 * Read GovAnalysis from the compiled governance IR on disk.
 */
async function readAnalysisFromDisk(workspaceRoot: string): Promise<GovAnalysis> {
  const irPath = join(workspaceRoot, CLAWS_SIDECAR_LAYOUT.compiled, 'governance-ir.json');
  try {
    const content = await readFile(irPath, 'utf-8');
    const ir = JSON.parse(content) as Record<string, unknown>;
    if (ir['analysis'] && typeof ir['analysis'] === 'object') {
      return ir['analysis'] as GovAnalysis;
    }
  } catch {
    // Fall through to empty analysis
  }

  return {
    violations: [],
    warnings: [],
    enforcementPlan: {
      blockedTools: [],
      requiredApprovals: [],
      auditOnlyRules: [],
      channelRedactions: [],
      ruleSuppressions: [],
    },
    reclassificationTable: [],
    effectiveR5Count: { derived: 0, overridden: 0, total: 0 },
  };
}

/**
 * Run `claws comply eu-ai-act`.
 *
 * Reads config and governance analysis from disk, builds EU AI Act
 * assessment, and outputs the result.
 *
 * @returns exit code (0 = not blocked, 1 = blocked or unacceptable)
 */
export async function runComplyEUAIAct(
  workspaceRoot: string,
  options: { json: boolean },
): Promise<number> {
  const euConfig = await readEUConfigFromDisk(workspaceRoot);
  const analysis = await readAnalysisFromDisk(workspaceRoot);

  const base = {
    scope: workspaceRoot,
    domainMarkers: euConfig.domainMarkers,
    analysis,
    transparencyDeclared: euConfig.transparencyDeclared,
    documentationDeclared: euConfig.documentationDeclared,
    explainabilityDeclared: euConfig.explainabilityDeclared,
    userNotificationDeclared: euConfig.userNotificationDeclared,
    humanOversightDeclared: euConfig.humanOversightDeclared,
    overrideMechanismDeclared: euConfig.overrideMechanismDeclared,
    fundamentalRightsAssessed: euConfig.fundamentalRightsAssessed,
    impactedRights: euConfig.impactedRights,
    mitigations: euConfig.mitigations,
    riskManagementDeclared: euConfig.riskManagementDeclared,
    dataGovernanceDeclared: euConfig.dataGovernanceDeclared,
    loggingEnabled: euConfig.loggingEnabled,
    accuracyRobustnessDeclared: euConfig.accuracyRobustnessDeclared,
  };
  const config: EUAIActConfig = euConfig.declaredRiskTier !== undefined
    ? { ...base, declaredRiskTier: euConfig.declaredRiskTier }
    : base;

  const assessment = buildEUAIActAssessment(config);

  if (options.json) {
    console.log(JSON.stringify(assessment, null, 2));
  } else {
    console.log(`EU AI Act Assessment Report`);
    console.log(`${'='.repeat(40)}`);
    console.log(`Scope: ${assessment.scope}`);
    console.log(`Generated: ${assessment.generatedAt}`);
    console.log(`Risk tier: ${assessment.riskTier.toUpperCase()}`);
    if (assessment.annexIIICategory) {
      console.log(`Annex III category: ${assessment.annexIIICategory}`);
    }
    if (assessment.domainMarkers.length > 0) {
      console.log(`Domain markers: ${assessment.domainMarkers.join(', ')}`);
    }

    if (assessment.blocked) {
      console.log('');
      console.log(`BLOCKED: ${assessment.blockReason}`);
      console.log('Evidence generation is blocked for unacceptable-risk systems.');
    } else {
      console.log('');
      console.log(`Article 13 (Transparency): ${assessment.article13.status.toUpperCase()}`);
      console.log(`  Documentation: ${assessment.article13.documentationAdequate ? 'yes' : 'NO'}`);
      console.log(`  Explainability: ${assessment.article13.explainabilityProvided ? 'yes' : 'NO'}`);
      console.log(`  User notification: ${assessment.article13.userNotificationPresent ? 'yes' : 'NO'}`);

      console.log('');
      console.log(`Article 14 (Human Oversight): ${assessment.article14.status.toUpperCase()}`);
      console.log(`  HITL controls: ${assessment.article14.hitlControlsPresent ? 'yes' : 'NO'}`);
      console.log(`  Adequate for tier: ${assessment.article14.hitlAdequateForTier ? 'yes' : 'NO'}`);
      console.log(`  Override mechanism: ${assessment.article14.overrideMechanismPresent ? 'yes' : 'NO'}`);

      if (assessment.riskTier === 'high') {
        console.log('');
        console.log(`Fundamental Rights Impact: ${assessment.fundamentalRightsImpact.assessed ? 'assessed' : 'NOT ASSESSED'}`);
        if (assessment.fundamentalRightsImpact.impactedRights.length > 0) {
          console.log(`  Impacted rights: ${assessment.fundamentalRightsImpact.impactedRights.join(', ')}`);
        }
        if (assessment.fundamentalRightsImpact.mitigations.length > 0) {
          console.log(`  Mitigations: ${assessment.fundamentalRightsImpact.mitigations.join(', ')}`);
        }

        console.log('');
        console.log('Obligation Checklist:');
        for (const obl of assessment.obligationChecklist) {
          const status = obl.met ? 'MET' : 'NOT MET';
          console.log(`  ${obl.obligationId} ${obl.description}: ${status}`);
        }
      }
    }

    if (assessment.findings.length > 0) {
      console.log('');
      console.log('Findings:');
      for (const f of assessment.findings) {
        console.log(`  [${f.severity.toUpperCase()}] ${f.title}`);
      }
    }
  }

  return assessment.blocked ? 1 : 0;
}
